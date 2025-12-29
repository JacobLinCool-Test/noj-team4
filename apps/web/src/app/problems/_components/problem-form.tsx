'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n/useI18n";
import { useAuth } from "@/providers/AuthProvider";
import { useCourses } from "@/hooks/useCourses";
import {
  createProblem,
  updateProblem,
  uploadTestdataWithSubtasks,
  linkAiTestdata,
  triggerTranslation,
  getTranslationStatus,
  type Problem,
  type ProblemVisibility,
  type ProblemDifficulty,
  type ProgrammingLanguage,
  type ProblemSampleCase,
  type TranslationStatus,
} from "@/lib/api/problem";
import { AiTestdataGeneratorModal } from "@/components/ai-problem-creator/AiTestdataGeneratorModal";
import type { TestCaseResult } from "@/lib/api/ai-problem-creator";
import {
  createCourseProblem,
  updateCourseProblem,
} from "@/lib/api/course-problem";
import { updatePipelineConfig, uploadChecker, uploadTemplate, uploadMakefile, type SubmissionType } from "@/lib/api/pipeline";
import type { SubtaskConfig } from "./subtask-config-editor";
import {
  StageList,
  AddStageButton,
  type PipelineStageConfig,
  type PipelineStageType,
} from "../[displayId]/_components/stage-list";
import { StageConfigModal } from "../[displayId]/_components/stage-config-modal";
import { CollapsibleSection } from "./collapsible-section";

interface DetectedSubtask {
  index: number;
  caseCount: number;
  points: number;
  timeLimitMs?: number;
  memoryLimitKb?: number;
}

async function parseZipForSubtasks(file: File): Promise<DetectedSubtask[]> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);

  const filenames = Object.keys(zip.files).filter(name => !zip.files[name].dir);
  const inFiles = filenames.filter(name => name.endsWith('.in'));

  const subtaskCases: Map<number, Set<number>> = new Map();

  for (const filename of inFiles) {
    const basename = filename.split('/').pop() || filename;
    const match = basename.match(/^(\d{2})(\d{2})\.in$/);
    if (match) {
      const subtaskIndex = parseInt(match[1], 10);
      const caseIndex = parseInt(match[2], 10);

      if (!subtaskCases.has(subtaskIndex)) {
        subtaskCases.set(subtaskIndex, new Set());
      }
      subtaskCases.get(subtaskIndex)!.add(caseIndex);
    }
  }

  if (subtaskCases.size === 0) {
    return [];
  }

  const sortedIndices = Array.from(subtaskCases.keys()).sort((a, b) => a - b);
  const subtasks: DetectedSubtask[] = [];

  const nonSampleCount = sortedIndices.filter(i => i > 0).length;
  const pointsPerSubtask = nonSampleCount > 0 ? Math.floor(100 / nonSampleCount) : 0;
  let remainingPoints = nonSampleCount > 0 ? 100 - pointsPerSubtask * nonSampleCount : 0;

  for (const subtaskIndex of sortedIndices) {
    const cases = subtaskCases.get(subtaskIndex)!;
    let points = 0;

    if (subtaskIndex > 0) {
      points = pointsPerSubtask;
      if (remainingPoints > 0) {
        points += 1;
        remainingPoints -= 1;
      }
    }

    subtasks.push({
      index: subtaskIndex,
      caseCount: cases.size,
      points,
    });
  }

  return subtasks;
}

type CourseSettings = {
  quota?: number;
};

type ProblemFormProps = {
  mode: "create" | "edit";
  context?: "public" | "course";
  initialData?: Problem;
  variant?: "public" | "default";
  courseSlug?: string;
  courseSettings?: CourseSettings;
};

const VISIBILITY_OPTIONS: ProblemVisibility[] = ["PUBLIC", "UNLISTED", "PRIVATE"];
const DIFFICULTY_OPTIONS: ProblemDifficulty[] = ["UNKNOWN", "EASY", "MEDIUM", "HARD"];
const LANGUAGE_OPTIONS: ProgrammingLanguage[] = ["C", "CPP", "JAVA", "PYTHON"];

export function ProblemForm({
  mode,
  context = "public",
  initialData,
  variant = "default",
  courseSlug,
  courseSettings,
}: ProblemFormProps) {
  const router = useRouter();
  const { messages } = useI18n();
  const { accessToken, loading: authLoading } = useAuth();
  const { data: courseList, loading: courseLoading } = useCourses({ mine: true, accessToken, authLoading });

  const isCourseContext = context === "course";
  const isPublicContext = context === "public";
  const isPublicVariant = variant === "public";
  const [visibility, setVisibility] = useState<ProblemVisibility>(
    isPublicVariant ? "PUBLIC" : initialData?.visibility || "PUBLIC"
  );
  const [difficulty, setDifficulty] = useState<ProblemDifficulty>(initialData?.difficulty || "UNKNOWN");
  const [allowedLanguages, setAllowedLanguages] = useState<ProgrammingLanguage[]>(
    initialData?.allowedLanguages || ["C", "CPP", "JAVA", "PYTHON"]
  );
  const [canViewStdout, setCanViewStdout] = useState(initialData?.canViewStdout ?? true);
  // Language tab state
  type LanguageTab = "zh" | "en";
  const [activeLanguageTab, setActiveLanguageTab] = useState<LanguageTab>("zh");

  // Bilingual fields - Chinese
  const [titleZh, setTitleZh] = useState(initialData?.titleZh || initialData?.title || "");
  const [descriptionZh, setDescriptionZh] = useState(initialData?.descriptionZh || initialData?.description || "");
  const [inputZh, setInputZh] = useState(initialData?.inputZh || initialData?.input || "");
  const [outputZh, setOutputZh] = useState(initialData?.outputZh || initialData?.output || "");
  const [hintZh, setHintZh] = useState(initialData?.hintZh || initialData?.hint || "");
  const [tagsInputZh, setTagsInputZh] = useState(initialData?.tagsZh?.join(", ") ?? initialData?.tags?.join(", ") ?? "");

  // Bilingual fields - English
  const [titleEn, setTitleEn] = useState(initialData?.titleEn || "");
  const [descriptionEn, setDescriptionEn] = useState(initialData?.descriptionEn || "");
  const [inputEn, setInputEn] = useState(initialData?.inputEn || "");
  const [outputEn, setOutputEn] = useState(initialData?.outputEn || "");
  const [hintEn, setHintEn] = useState(initialData?.hintEn || "");
  const [tagsInputEn, setTagsInputEn] = useState(initialData?.tagsEn?.join(", ") ?? "");

  // Auto translate option
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [translationStatus, setTranslationStatus] = useState<TranslationStatus>(
    initialData?.translationStatus || "NONE"
  );
  const [translationPolling, setTranslationPolling] = useState(false);

  // Legacy single-language fields (derived from active tab for compatibility)
  const title = activeLanguageTab === "zh" ? titleZh : titleEn;
  const setTitle = activeLanguageTab === "zh" ? setTitleZh : setTitleEn;
  const description = activeLanguageTab === "zh" ? descriptionZh : descriptionEn;
  const setDescription = activeLanguageTab === "zh" ? setDescriptionZh : setDescriptionEn;
  const input = activeLanguageTab === "zh" ? inputZh : inputEn;
  const setInput = activeLanguageTab === "zh" ? setInputZh : setInputEn;
  const output = activeLanguageTab === "zh" ? outputZh : outputEn;
  const setOutput = activeLanguageTab === "zh" ? setOutputZh : setOutputEn;
  const hint = activeLanguageTab === "zh" ? hintZh : hintEn;
  const setHint = activeLanguageTab === "zh" ? setHintZh : setHintEn;
  const tagsInput = activeLanguageTab === "zh" ? tagsInputZh : tagsInputEn;
  const setTagsInput = activeLanguageTab === "zh" ? setTagsInputZh : setTagsInputEn;
  const [sampleCases, setSampleCases] = useState<ProblemSampleCase[]>(
    initialData?.sampleCases?.length ? initialData.sampleCases : [{ input: "", output: "" }]
  );
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>(
    initialData?.courseIds ?? []
  );
  // Course-specific fields
  const [quota, setQuota] = useState(
    courseSettings?.quota !== undefined ? String(courseSettings.quota) : "-1"
  );

  // Testdata configuration - simplified
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [testdataFile, setTestdataFile] = useState<File | null>(null);
  const [detectedSubtasks, setDetectedSubtasks] = useState<DetectedSubtask[]>([]);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [defaultTimeLimitMs, setDefaultTimeLimitMs] = useState(1000);
  const [defaultMemoryLimitKb, setDefaultMemoryLimitKb] = useState(262144);

  // AI Testdata Generator state
  const [showAiTestdataModal, setShowAiTestdataModal] = useState(false);
  const [aiTestdataKey, setAiTestdataKey] = useState<string | null>(null);
  const [aiTestCases, setAiTestCases] = useState<TestCaseResult[]>([]);

  // Pipeline configuration (for create mode)
  const DEFAULT_PIPELINE_STAGES: PipelineStageConfig[] = [
    { type: "COMPILE", config: {}, enabled: true },
    { type: "EXECUTE", config: { useTestdata: true }, enabled: true },
    { type: "CHECK", config: { mode: "diff", ignoreWhitespace: true, caseSensitive: true }, enabled: true },
  ];
  const [pipelineStages, setPipelineStages] = useState<PipelineStageConfig[]>(DEFAULT_PIPELINE_STAGES);
  const [pipelineSubmissionType, setPipelineSubmissionType] = useState<SubmissionType>("SINGLE_FILE");
  const [editingStageIndex, setEditingStageIndex] = useState<number | null>(null);
  const [checkerFile, setCheckerFile] = useState<File | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [makefileFile, setMakefileFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const manageableCourses = (courseList ?? []).filter(
    (course) => course.myRole === "TEACHER" || course.myRole === "TA",
  );
  // Only show visibility for public context (not course problems) and when not in public variant mode
  const showVisibility = isPublicContext && !isPublicVariant;
  const showCourseAssign = showVisibility && visibility === "UNLISTED";

  // Calculate totals from detected subtasks
  const totalCases = useMemo(
    () => detectedSubtasks.reduce((sum, s) => sum + s.caseCount, 0),
    [detectedSubtasks],
  );

  const totalPoints = useMemo(
    () => detectedSubtasks.reduce((sum, s) => sum + s.points, 0),
    [detectedSubtasks],
  );

  // Handle testdata file change with auto-detection
  const handleTestdataFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.zip')) {
      setParseError(messages.testdataMustBeZip);
      setTestdataFile(null);
      setDetectedSubtasks([]);
      return;
    }

    setTestdataFile(selectedFile);
    setParseError(null);
    setError(null);
    setParsing(true);

    try {
      const subtasks = await parseZipForSubtasks(selectedFile);
      if (subtasks.length === 0) {
        setParseError(messages.testdataNoSubtasksDetected);
        setDetectedSubtasks([]);
      } else {
        setDetectedSubtasks(subtasks);
      }
    } catch {
      setParseError(messages.testdataParseError);
      setDetectedSubtasks([]);
    } finally {
      setParsing(false);
    }
  }, [messages]);

  const updateSubtaskPoints = useCallback((index: number, points: number) => {
    setDetectedSubtasks(prev =>
      prev.map((s, i) => i === index ? { ...s, points } : s)
    );
  }, []);

  const updateSubtaskTimeLimit = useCallback((index: number, timeLimitMs: number | undefined) => {
    setDetectedSubtasks(prev =>
      prev.map((s, i) => i === index ? { ...s, timeLimitMs } : s)
    );
  }, []);

  const updateSubtaskMemoryLimit = useCallback((index: number, memoryLimitKb: number | undefined) => {
    setDetectedSubtasks(prev =>
      prev.map((s, i) => i === index ? { ...s, memoryLimitKb } : s)
    );
  }, []);

  // Translation status polling (only in edit mode when status is PENDING)
  useEffect(() => {
    if (mode !== "edit" || translationStatus !== "PENDING" || !initialData?.displayId || !accessToken) {
      return;
    }

    setTranslationPolling(true);
    const intervalId = setInterval(async () => {
      try {
        const result = await getTranslationStatus(initialData.displayId, accessToken);
        setTranslationStatus(result.status);

        if (result.status !== "PENDING") {
          setTranslationPolling(false);
          clearInterval(intervalId);

          // If translation completed, refresh the page to get updated data
          if (result.status === "COMPLETED") {
            router.refresh();
          }
        }
      } catch (err) {
        console.error("Failed to get translation status:", err);
      }
    }, 5000); // Poll every 5 seconds

    return () => {
      clearInterval(intervalId);
      setTranslationPolling(false);
    };
  }, [mode, translationStatus, initialData?.displayId, accessToken, router]);

  const clearTestdataFile = () => {
    setTestdataFile(null);
    setDetectedSubtasks([]);
    setParseError(null);
    setAiTestdataKey(null);
    setAiTestCases([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAiTestdataGenerated = useCallback((result: {
    testdataKey: string;
    testCases: TestCaseResult[];
  }) => {
    setAiTestdataKey(result.testdataKey);
    setAiTestCases(result.testCases);
    // Clear file upload state since we're using AI testdata
    setTestdataFile(null);
    setDetectedSubtasks([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const clearAiTestdata = () => {
    setAiTestdataKey(null);
    setAiTestCases([]);
  };

  // Pipeline stage management
  const getDefaultConfig = (type: PipelineStageType): Record<string, any> => {
    switch (type) {
      case "COMPILE":
        return { timeout: 30000 };
      case "STATIC_ANALYSIS":
        return { rules: [], failOnError: true };
      case "EXECUTE":
        return { useTestdata: true, timeLimitMs: 1000, memoryLimitKb: 262144 };
      case "CHECK":
        return { mode: "diff", ignoreWhitespace: true, caseSensitive: true };
      case "SCORING":
        return { mode: "sum", penaltyRules: [] };
      case "INTERACTIVE":
        return { interactorLanguage: "PYTHON", interactionTimeoutMs: 10000 };
      default:
        return {};
    }
  };

  const handleAddStage = (type: PipelineStageType) => {
    const newStage: PipelineStageConfig = {
      type,
      config: getDefaultConfig(type),
      enabled: true,
    };
    setPipelineStages([...pipelineStages, newStage]);
  };

  const handleSaveStageConfig = (config: Record<string, any>) => {
    if (editingStageIndex === null) return;
    const newStages = [...pipelineStages];
    newStages[editingStageIndex] = {
      ...newStages[editingStageIndex],
      config,
    };
    setPipelineStages(newStages);
    setEditingStageIndex(null);
  };

  const handleLanguageToggle = (lang: ProgrammingLanguage) => {
    setAllowedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const handleSampleCaseChange = (index: number, field: "input" | "output", value: string) => {
    setSampleCases((prev) =>
      prev.map((sample, i) => (i === index ? { ...sample, [field]: value } : sample))
    );
  };

  const addSampleCase = () => {
    setSampleCases((prev) => [...prev, { input: "", output: "" }]);
  };

  const removeSampleCase = (index: number) => {
    if (sampleCases.length <= 1) return;
    setSampleCases((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate Chinese fields (primary language)
    if (!titleZh.trim()) {
      setError(messages.problemFormTitleRequired);
      return;
    }
    if (!descriptionZh.trim()) {
      setError(messages.problemFormDescriptionRequired);
      return;
    }
    if (allowedLanguages.length === 0) {
      setError(messages.problemFormLanguagesRequired);
      return;
    }
    if (isPublicContext && showCourseAssign && selectedCourseIds.length === 0) {
      setError(messages.problemFormCourseAssignRequired);
      return;
    }

    // Validate quota for course context
    if (isCourseContext) {
      const quotaValue = Number(quota);
      if (!Number.isFinite(quotaValue) || quotaValue < -1) {
        setError(messages.courseProblemQuotaInvalid || "Invalid quota value");
        return;
      }
    }

    setSubmitting(true);

    try {
      // Parse comma-separated tags into array for both languages
      const parsedTagsZh = tagsInputZh
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      const parsedTagsEn = tagsInputEn
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      // Build base payload with bilingual fields
      const basePayload = {
        difficulty,
        tags: parsedTagsZh, // Primary tags (Chinese)
        allowedLanguages,
        canViewStdout,
        title: titleZh.trim(),
        description: descriptionZh.trim(),
        input: inputZh.trim(),
        output: outputZh.trim(),
        hint: hintZh.trim() || undefined,
        sampleCases: sampleCases.filter((s) => s.input.trim() || s.output.trim()),
        // Bilingual fields
        titleZh: titleZh.trim(),
        titleEn: titleEn.trim() || undefined,
        descriptionZh: descriptionZh.trim(),
        descriptionEn: descriptionEn.trim() || undefined,
        inputZh: inputZh.trim(),
        inputEn: inputEn.trim() || undefined,
        outputZh: outputZh.trim(),
        outputEn: outputEn.trim() || undefined,
        hintZh: hintZh.trim() || undefined,
        hintEn: hintEn.trim() || undefined,
        tagsZh: parsedTagsZh,
        tagsEn: parsedTagsEn.length > 0 ? parsedTagsEn : undefined,
        // Auto translate option
        autoTranslate,
      };

      let resultDisplayId: string;
      let resultCourseId: number | undefined;

      if (isCourseContext && courseSlug) {
        // Course problem API
        const coursePayload = {
          ...basePayload,
          quota: Number(quota),
        };

        if (mode === "create") {
          const result = await createCourseProblem(courseSlug, coursePayload, accessToken);
          resultDisplayId = result.problem.displayId;
          resultCourseId = result.course.id;

          // Upload testdata if file is provided and subtasks detected
          if (testdataFile && detectedSubtasks.length > 0) {
            try {
              const subtasks: SubtaskConfig[] = detectedSubtasks.map(s => ({
                caseCount: s.caseCount,
                points: s.points,
                timeLimitMs: s.timeLimitMs,
                memoryLimitKb: s.memoryLimitKb,
              }));

              await uploadTestdataWithSubtasks(
                resultDisplayId,
                testdataFile,
                {
                  subtasks,
                  defaultTimeLimitMs,
                  defaultMemoryLimitKb,
                },
                accessToken,
              );
            } catch (testdataErr) {
              console.error('Testdata upload failed:', testdataErr);
              router.push(`/courses/${courseSlug}/problems/${resultDisplayId}/edit?testdataError=1`);
              return;
            }
          } else if (aiTestdataKey) {
            // Link AI-generated testdata
            try {
              await linkAiTestdata(resultDisplayId, aiTestdataKey, accessToken);
            } catch (testdataErr) {
              console.error('AI testdata link failed:', testdataErr);
              router.push(`/courses/${courseSlug}/problems/${resultDisplayId}/edit?testdataError=1`);
              return;
            }
          }

          // Save pipeline config
          try {
            await updatePipelineConfig(
              resultDisplayId,
              {
                submissionType: pipelineSubmissionType,
                pipelineConfig: { stages: pipelineStages },
              },
              accessToken,
            );
          } catch (pipelineErr) {
            console.error('Pipeline config update failed:', pipelineErr);
          }

          // Upload checker if provided
          if (checkerFile) {
            try {
              await uploadChecker(resultDisplayId, checkerFile, accessToken);
            } catch (checkerErr) {
              console.error('Checker upload failed:', checkerErr);
            }
          }

          // Upload template if provided (for FUNCTION_ONLY mode)
          if (templateFile && pipelineSubmissionType === "FUNCTION_ONLY") {
            try {
              await uploadTemplate(resultDisplayId, templateFile, accessToken);
            } catch (templateErr) {
              console.error('Template upload failed:', templateErr);
            }
          }

          // Upload Makefile if provided (for MULTI_FILE mode)
          if (makefileFile && pipelineSubmissionType === "MULTI_FILE") {
            try {
              await uploadMakefile(resultDisplayId, makefileFile, accessToken);
            } catch (makefileErr) {
              console.error('Makefile upload failed:', makefileErr);
            }
          }
        } else {
          const result = await updateCourseProblem(courseSlug, initialData!.displayId, coursePayload, accessToken);
          resultDisplayId = result.problem.displayId;
          resultCourseId = result.course.id;
        }

        router.push(`/courses/${courseSlug}/problems/${resultDisplayId}`);
      } else {
        // Public problem API
        const publicPayload = {
          ...basePayload,
          visibility: isPublicVariant ? "PUBLIC" as const : visibility,
          courseIds: showCourseAssign ? selectedCourseIds : undefined,
        };

        if (mode === "create") {
          const result = await createProblem(publicPayload, accessToken);
          resultDisplayId = result.displayId;

          // Upload testdata if file is provided and subtasks detected
          if (testdataFile && detectedSubtasks.length > 0) {
            try {
              const subtasks: SubtaskConfig[] = detectedSubtasks.map(s => ({
                caseCount: s.caseCount,
                points: s.points,
                timeLimitMs: s.timeLimitMs,
                memoryLimitKb: s.memoryLimitKb,
              }));

              await uploadTestdataWithSubtasks(
                resultDisplayId,
                testdataFile,
                {
                  subtasks,
                  defaultTimeLimitMs,
                  defaultMemoryLimitKb,
                },
                accessToken,
              );
            } catch (testdataErr) {
              console.error('Testdata upload failed:', testdataErr);
              router.push(`/problems/${resultDisplayId}/edit?testdataError=1`);
              return;
            }
          } else if (aiTestdataKey) {
            // Link AI-generated testdata
            try {
              await linkAiTestdata(resultDisplayId, aiTestdataKey, accessToken);
            } catch (testdataErr) {
              console.error('AI testdata link failed:', testdataErr);
              router.push(`/problems/${resultDisplayId}/edit?testdataError=1`);
              return;
            }
          }

          // Save pipeline config
          try {
            await updatePipelineConfig(
              resultDisplayId,
              {
                submissionType: pipelineSubmissionType,
                pipelineConfig: { stages: pipelineStages },
              },
              accessToken,
            );
          } catch (pipelineErr) {
            console.error('Pipeline config update failed:', pipelineErr);
          }

          // Upload checker if provided
          if (checkerFile) {
            try {
              await uploadChecker(resultDisplayId, checkerFile, accessToken);
            } catch (checkerErr) {
              console.error('Checker upload failed:', checkerErr);
            }
          }

          // Upload template if provided (for FUNCTION_ONLY mode)
          if (templateFile && pipelineSubmissionType === "FUNCTION_ONLY") {
            try {
              await uploadTemplate(resultDisplayId, templateFile, accessToken);
            } catch (templateErr) {
              console.error('Template upload failed:', templateErr);
            }
          }

          // Upload Makefile if provided (for MULTI_FILE mode)
          if (makefileFile && pipelineSubmissionType === "MULTI_FILE") {
            try {
              await uploadMakefile(resultDisplayId, makefileFile, accessToken);
            } catch (makefileErr) {
              console.error('Makefile upload failed:', makefileErr);
            }
          }
        } else {
          const result = await updateProblem(initialData!.id, publicPayload, accessToken);
          resultDisplayId = result.displayId;
        }

        router.push(`/problems/${resultDisplayId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : messages.problemFormError);
      setSubmitting(false);
    }
  };

  const getVisibilityLabel = (v: ProblemVisibility) => {
    const labels: Record<ProblemVisibility, string> = {
      PUBLIC: messages.problemVisibilityPublic,
      UNLISTED: messages.problemVisibilityUnlisted,
      PRIVATE: messages.problemVisibilityPrivate,
    };
    return labels[v];
  };

  const getDifficultyLabel = (d: ProblemDifficulty) => {
    const labels: Record<ProblemDifficulty, string> = {
      UNKNOWN: messages.problemsDifficultyUnknown,
      EASY: messages.problemsDifficultyEasy,
      MEDIUM: messages.problemsDifficultyMedium,
      HARD: messages.problemsDifficultyHard,
    };
    return labels[d];
  };

  const getLanguageLabel = (lang: ProgrammingLanguage) => {
    const labels: Record<ProgrammingLanguage, string> = {
      C: "C",
      CPP: "C++",
      JAVA: "Java",
      PYTHON: "Python",
    };
    return labels[lang];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Language Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            type="button"
            onClick={() => setActiveLanguageTab("zh")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeLanguageTab === "zh"
                ? "border-[#003865] text-[#003865]"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            繁體中文
          </button>
          <button
            type="button"
            onClick={() => setActiveLanguageTab("en")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeLanguageTab === "en"
                ? "border-[#003865] text-[#003865]"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            English
          </button>
        </div>
      </div>

      {/* Translation Status (only in edit mode) */}
      {mode === "edit" && translationStatus !== "NONE" && (
        <div className={`flex items-center gap-2 rounded-md p-3 text-sm ${
          translationStatus === "COMPLETED"
            ? "bg-green-50 text-green-700 border border-green-200"
            : translationStatus === "PENDING"
            ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {translationStatus === "PENDING" && (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>{messages.problemTranslationPending || "翻譯中..."}</span>
            </>
          )}
          {translationStatus === "COMPLETED" && (
            <>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{messages.problemTranslationCompleted || "翻譯完成"}</span>
            </>
          )}
          {translationStatus === "FAILED" && (
            <>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{messages.problemTranslationFailed || "翻譯失敗"}</span>
            </>
          )}
        </div>
      )}

      {/* Title */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {messages.problemFormTitle} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={messages.problemFormTitlePlaceholder}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none"
          maxLength={200}
        />
      </div>

      {/* Difficulty & Languages */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {messages.problemFormDifficulty}
          </label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as ProblemDifficulty)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none"
          >
            {DIFFICULTY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {getDifficultyLabel(d)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {messages.problemFormLanguages} <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2 pt-2">
            {LANGUAGE_OPTIONS.map((lang) => (
              <label key={lang} className="inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={allowedLanguages.includes(lang)}
                  onChange={() => handleLanguageToggle(lang)}
                  className="mr-2 rounded border-gray-300 text-[#003865] focus:ring-[#1e5d8f]"
                />
                <span className="text-sm text-gray-700">{getLanguageLabel(lang)}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {messages.problemFormTags}
        </label>
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder={messages.problemFormTagsPlaceholder}
          disabled={submitting}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none"
        />
        <p className="mt-1 text-xs text-gray-500">{messages.problemFormTagsHint}</p>
      </div>

      {/* Visibility (only for non-public variant) */}
      {showVisibility && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {messages.problemFormVisibility}
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as ProblemVisibility)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none"
            >
              {VISIBILITY_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {getVisibilityLabel(v)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center pt-6">
            <label className="inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={canViewStdout}
                onChange={(e) => setCanViewStdout(e.target.checked)}
                className="mr-2 rounded border-gray-300 text-[#003865] focus:ring-[#1e5d8f]"
              />
              <span className="text-sm text-gray-700">{messages.problemFormCanViewStdout}</span>
            </label>
          </div>
        </div>
      )}

      {/* Course Assignment (when UNLISTED visibility) */}
      {showCourseAssign && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-gray-800">{messages.problemFormCourseAssignTitle}</p>
              <p className="text-xs text-gray-600">{messages.problemFormCourseAssignDescription}</p>
            </div>
            {courseLoading ? (
              <p className="text-xs text-gray-500">{messages.problemFormSubmitting}</p>
            ) : manageableCourses.length === 0 ? (
              <p className="text-xs text-gray-500">{messages.problemFormCourseAssignEmpty}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {manageableCourses.map((course) => (
                  <label key={course.id} className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedCourseIds.includes(course.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectedCourseIds((prev) =>
                          checked ? [...prev, course.id] : prev.filter((id) => id !== course.id)
                        );
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-[#003865] focus:ring-[#1e5d8f]"
                    />
                    <span>{course.name}</span>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500">{messages.problemFormCourseAssignHelp}</p>
          </div>
        </div>
      )}

      {/* Quota (only for course context) */}
      {isCourseContext && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            繳交次數限制
          </label>
          <input
            type="number"
            value={quota}
            onChange={(e) => setQuota(e.target.value)}
            min={-1}
            disabled={submitting}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none disabled:bg-gray-100"
          />
          <p className="mt-1 text-xs text-gray-500">
            設為 -1 表示無限制
          </p>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {messages.problemFormDescription} <span className="text-red-500">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={messages.problemFormDescriptionPlaceholder}
          rows={6}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none"
        />
      </div>

      {/* Input/Output Format */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {messages.problemFormInput}
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={messages.problemFormInputPlaceholder}
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {messages.problemFormOutput}
          </label>
          <textarea
            value={output}
            onChange={(e) => setOutput(e.target.value)}
            placeholder={messages.problemFormOutputPlaceholder}
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none"
          />
        </div>
      </div>

      {/* Sample Cases */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            {messages.problemFormSampleCases}
          </label>
          <button
            type="button"
            onClick={addSampleCase}
            className="text-sm text-[#003865] hover:underline"
          >
            + {messages.problemFormAddSampleCase}
          </button>
        </div>
        <div className="space-y-4">
          {sampleCases.map((sample, idx) => (
            <div key={idx} className="rounded-md border border-gray-200 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  {messages.problemSampleIO} #{idx + 1}
                </span>
                {sampleCases.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSampleCase(idx)}
                    className="text-sm text-red-500 hover:underline"
                  >
                    {messages.problemFormRemove}
                  </button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    {messages.problemSampleInput}
                  </label>
                  <textarea
                    value={sample.input}
                    onChange={(e) => handleSampleCaseChange(idx, "input", e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-[#1e5d8f] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    {messages.problemSampleOutput}
                  </label>
                  <textarea
                    value={sample.output}
                    onChange={(e) => handleSampleCaseChange(idx, "output", e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-[#1e5d8f] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hint (moved after sample cases) */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {messages.problemFormHint}
        </label>
        <textarea
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder={messages.problemFormHintPlaceholder}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#1e5d8f] focus:outline-none"
        />
      </div>

      {/* Submission Type - only in create mode */}
      {mode === "create" && (
        <CollapsibleSection title="繳交形式">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                提交類型
              </label>
              <select
                value={pipelineSubmissionType}
                onChange={(e) => setPipelineSubmissionType(e.target.value as SubmissionType)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#003865] focus:outline-none focus:ring-1 focus:ring-[#003865]"
              >
                <option value="SINGLE_FILE">單一檔案</option>
                <option value="MULTI_FILE">多檔案專案 (ZIP)</option>
                <option value="FUNCTION_ONLY">僅實作函式</option>
              </select>
              <p className="mt-1 text-sm text-gray-500">
                {pipelineSubmissionType === "FUNCTION_ONLY" && "學生只需提交函式，系統會自動合併模板"}
                {pipelineSubmissionType === "MULTI_FILE" && "學生需要上傳 ZIP 壓縮檔"}
                {pipelineSubmissionType === "SINGLE_FILE" && "學生提交單一程式碼檔案（預設）"}
              </p>
            </div>

            {/* Template Upload (only for FUNCTION_ONLY mode) */}
            {pipelineSubmissionType === "FUNCTION_ONLY" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  函式模板檔案 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".cpp,.c,.java,.py"
                    onChange={(e) => setTemplateFile(e.target.files?.[0] || null)}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
                  />
                  {templateFile && (
                    <button
                      type="button"
                      onClick={() => setTemplateFile(null)}
                      className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {templateFile && (
                  <p className="mt-1 text-sm text-green-600">
                    ✓ 已選擇: {templateFile.name}
                  </p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  模板中需包含 <code className="rounded bg-gray-100 px-1">// STUDENT_CODE_HERE</code> 標記
                </p>
              </div>
            )}

            {/* Makefile Upload (only for MULTI_FILE mode) */}
            {pipelineSubmissionType === "MULTI_FILE" && (
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  老師提供的 Makefile <span className="text-gray-400">(選填)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="Makefile,makefile"
                    onChange={(e) => setMakefileFile(e.target.files?.[0] || null)}
                    className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
                  />
                  {makefileFile && (
                    <button
                      type="button"
                      onClick={() => setMakefileFile(null)}
                      className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {makefileFile && (
                  <p className="mt-1 text-sm text-green-600">
                    ✓ 已選擇: {makefileFile.name}
                  </p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  如果提供 Makefile，系統將使用此 Makefile 編譯學生的程式碼。
                </p>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Pipeline Config - only in create mode */}
      {mode === "create" && (
        <CollapsibleSection title="評測 Pipeline">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-gray-600">
              拖曳調整階段順序，點擊「配置」設定詳細參數。
            </p>
            <button
              type="button"
              onClick={() => setPipelineStages(DEFAULT_PIPELINE_STAGES)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              重設為預設
            </button>
          </div>

          <StageList
            stages={pipelineStages}
            onChange={setPipelineStages}
            onEditStage={setEditingStageIndex}
          />

          <div className="mt-4">
            <AddStageButton
              onAdd={handleAddStage}
              existingTypes={pipelineStages.map(s => s.type)}
            />
          </div>

          <hr className="my-4 border-gray-200" />

          {/* Checker Upload */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              自訂 Checker 腳本 (選填)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".py,.cpp,.c,.java"
                onChange={(e) => setCheckerFile(e.target.files?.[0] || null)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
              />
              {checkerFile && (
                <button
                  type="button"
                  onClick={() => setCheckerFile(null)}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {checkerFile && (
              <p className="mt-1 text-sm text-green-600">
                ✓ 已選擇: {checkerFile.name}
              </p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              支援 Python (.py), C++ (.cpp), C (.c), Java (.java)。Checker 會收到 input.txt, output.txt, answer.txt 三個參數。
            </p>
          </div>
        </CollapsibleSection>
      )}

      {/* Stage Config Modal */}
      {editingStageIndex !== null && (
        <StageConfigModal
          stage={pipelineStages[editingStageIndex]}
          onSave={handleSaveStageConfig}
          onClose={() => setEditingStageIndex(null)}
        />
      )}

      {/* Testdata Upload - only in create mode */}
      {mode === "create" && (
        <CollapsibleSection title={messages.testdataTitle} defaultOpen>
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowAiTestdataModal(true)}
              disabled={!description.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:from-purple-700 hover:to-indigo-700 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              {messages.aiTestdataGeneratorButton || "AI 生成測資"}
            </button>
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {messages.testdataHelpButton}
            </button>
          </div>

          {/* AI Testdata Result */}
          {aiTestdataKey && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-green-800">{messages.aiTestdataReady || "AI 測資已準備就緒"}</p>
                    <p className="text-sm text-green-600">
                      {messages.aiTestdataCount?.replace("{count}", String(aiTestCases.length)) || `${aiTestCases.length} 組測資`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearAiTestdata}
                  className="rounded-full p-1.5 text-green-600 hover:bg-green-100"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* Show sample test cases */}
              {aiTestCases.length > 0 && (
                <div className="mt-3 max-h-32 overflow-y-auto rounded border border-green-200 bg-white divide-y divide-green-100">
                  {aiTestCases.slice(0, 3).map((tc, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="text-green-700">
                        {tc.isSample ? "範例" : `測資 ${tc.index + 1}`}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${
                        tc.status === "SUCCESS" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {tc.status === "SUCCESS" ? "成功" : "失敗"}
                      </span>
                    </div>
                  ))}
                  {aiTestCases.length > 3 && (
                    <div className="px-3 py-2 text-center text-xs text-green-600">
                      還有 {aiTestCases.length - 3} 組測資...
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Simple Upload Area - only show if no file and no AI testdata */}
          {!testdataFile && !aiTestdataKey && (
            <div
              className="relative rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-[#003865] transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const droppedFile = e.dataTransfer.files[0];
                if (droppedFile && fileInputRef.current) {
                  const dt = new DataTransfer();
                  dt.items.add(droppedFile);
                  fileInputRef.current.files = dt.files;
                  fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleTestdataFileChange}
                disabled={submitting}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">{messages.testdataDropOrClick}</p>
              <p className="mt-1 text-xs text-gray-500">{messages.testdataZipFormat}</p>
            </div>
          )}

          {/* File info - only show when testdataFile is set */}
          {testdataFile && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="h-8 w-8 text-[#003865]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <p className="font-medium text-gray-900">{testdataFile.name}</p>
                    <p className="text-sm text-gray-500">{(testdataFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearTestdataFile}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Parsing indicator */}
              {parsing && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {messages.testdataParsing}
                </div>
              )}

              {/* Parse error */}
              {parseError && (
                <p className="mt-3 text-sm text-red-600">{parseError}</p>
              )}

              {/* Detection result */}
              {detectedSubtasks.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 text-sm text-green-600 mb-3">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {messages.testdataDetected
                      .replace('{subtasks}', String(detectedSubtasks.length))
                      .replace('{cases}', String(totalCases))}
                  </div>

                  {/* Subtask summary with score inputs */}
                  <div className="space-y-2">
                    {detectedSubtasks.map((subtask, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm">
                        <span className="w-24 text-gray-600">
                          {subtask.index === 0 ? (
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                              {messages.subtaskSample}
                            </span>
                          ) : (
                            `Subtask ${subtask.index}`
                          )}
                        </span>
                        <span className="text-gray-500">
                          {subtask.caseCount} {messages.testdataCases}
                        </span>
                        <span className="text-gray-400">→</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={subtask.points}
                          onChange={(e) => updateSubtaskPoints(idx, parseInt(e.target.value) || 0)}
                          disabled={submitting}
                          className="w-16 rounded border border-gray-300 px-2 py-1 text-sm focus:border-[#003865] focus:outline-none disabled:bg-gray-100"
                        />
                        <span className="text-gray-500">{messages.testdataPointsUnit}</span>
                      </div>
                    ))}
                  </div>

                  {/* Total points warning */}
                  <div className={`mt-3 text-sm ${totalPoints !== 100 ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                    {messages.subtaskTotalPoints.replace('{points}', String(totalPoints))}
                    {totalPoints !== 100 && ` (${messages.testdataShouldBe100})`}
                  </div>

                  {/* Advanced settings toggle */}
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="mt-4 flex items-center gap-2 text-sm text-[#003865] hover:underline"
                  >
                    <svg
                      className={`h-4 w-4 transform transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {messages.testdataAdvancedSettings}
                  </button>

                  {/* Advanced settings panel */}
                  {showAdvanced && (
                    <div className="mt-3 rounded-md bg-gray-50 border border-gray-200 p-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {messages.subtaskDefaultTimeLimit}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={100}
                              max={60000}
                              value={defaultTimeLimitMs}
                              onChange={(e) => setDefaultTimeLimitMs(parseInt(e.target.value) || 1000)}
                              disabled={submitting}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#003865] focus:outline-none disabled:bg-gray-100"
                            />
                            <span className="text-sm text-gray-500">ms</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {messages.subtaskDefaultMemoryLimit}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1024}
                              max={1048576}
                              value={defaultMemoryLimitKb}
                              onChange={(e) => setDefaultMemoryLimitKb(parseInt(e.target.value) || 262144)}
                              disabled={submitting}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#003865] focus:outline-none disabled:bg-gray-100"
                            />
                            <span className="text-sm text-gray-500">KB</span>
                          </div>
                        </div>
                      </div>

                      {/* Per-subtask overrides */}
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">{messages.testdataPerSubtaskOverrides}</p>
                        <div className="space-y-2">
                          {detectedSubtasks.map((subtask, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-sm">
                              <span className="w-20 text-gray-600">
                                {subtask.index === 0 ? messages.subtaskSample : `Subtask ${subtask.index}`}
                              </span>
                              <input
                                type="number"
                                min={100}
                                max={60000}
                                placeholder={String(defaultTimeLimitMs)}
                                value={subtask.timeLimitMs ?? ''}
                                onChange={(e) => updateSubtaskTimeLimit(idx, e.target.value ? parseInt(e.target.value) : undefined)}
                                disabled={submitting}
                                className="w-24 rounded border border-gray-300 px-2 py-1 text-sm focus:border-[#003865] focus:outline-none disabled:bg-gray-100"
                              />
                              <span className="text-gray-500">ms</span>
                              <input
                                type="number"
                                min={1024}
                                max={1048576}
                                placeholder={String(defaultMemoryLimitKb)}
                                value={subtask.memoryLimitKb ?? ''}
                                onChange={(e) => updateSubtaskMemoryLimit(idx, e.target.value ? parseInt(e.target.value) : undefined)}
                                disabled={submitting}
                                className="w-28 rounded border border-gray-300 px-2 py-1 text-sm focus:border-[#003865] focus:outline-none disabled:bg-gray-100"
                              />
                              <span className="text-gray-500">KB</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* AI Auto Translate Option */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoTranslate}
            onChange={(e) => setAutoTranslate(e.target.checked)}
            disabled={submitting || translationStatus === "PENDING"}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#003865] focus:ring-[#1e5d8f]"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">
              {messages.problemFormAutoTranslate || "AI 自動翻譯（儲存後背景執行）"}
            </span>
            <p className="text-xs text-gray-500 mt-0.5">
              {messages.problemFormAutoTranslateHint || "勾選後，儲存時將自動翻譯題目內容為另一種語言"}
            </p>
          </div>
        </label>
      </div>

      <div className="flex justify-end gap-3 border-t border-gray-200 pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {messages.problemFormCancel}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-[#003865] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e5d8f] disabled:opacity-50"
        >
          {submitting
            ? messages.problemFormSubmitting
            : mode === "create"
              ? messages.problemFormCreate
              : messages.problemFormUpdate}
        </button>
      </div>

      {/* Help Modal - use portal for proper full-screen overlay */}
      {showHelpModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20"
            onClick={() => setShowHelpModal(false)}
          />
          {/* Modal */}
          <div className="relative z-10 w-full max-w-lg rounded-lg bg-white p-6 shadow-xl mx-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {messages.testdataHelpTitle}
              </h3>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-sm text-gray-700">
              <p>{messages.testdataHelpIntro}</p>

              <div>
                <h4 className="font-medium text-gray-900">{messages.testdataHelpFormat}</h4>
                <p className="mt-1 text-gray-600">{messages.testdataHelpFormatDesc}</p>
                <div className="mt-2 rounded bg-gray-100 p-2 font-mono text-xs">
                  <span className="text-blue-600">ss</span>
                  <span className="text-green-600">tt</span>
                  <span>.in / </span>
                  <span className="text-blue-600">ss</span>
                  <span className="text-green-600">tt</span>
                  <span>.out</span>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">{messages.testdataHelpExample}</h4>
                <p className="mt-1 text-gray-600">{messages.testdataHelpExampleDesc}</p>
                <div className="mt-2 space-y-1 rounded bg-gray-100 p-3 font-mono text-xs">
                  <div>
                    <span className="text-blue-600">Subtask 0</span>
                    <span className="text-gray-500"> (範例): </span>
                    <span className="text-gray-700">0000.in, 0000.out, 0001.in, 0001.out</span>
                  </div>
                  <div>
                    <span className="text-green-600">Subtask 1</span>
                    <span className="text-gray-500">: </span>
                    <span className="text-gray-700">0100.in, 0100.out, 0101.in, 0101.out, 0102.in, 0102.out</span>
                  </div>
                </div>
              </div>

              <div className="rounded-md bg-amber-50 p-3 text-amber-800">
                <div className="flex gap-2">
                  <svg className="h-5 w-5 flex-shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p>{messages.testdataHelpNote}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="rounded-md bg-[#003865] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e5d8f]"
              >
                {messages.testdataHelpClose}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* AI Testdata Generator Modal */}
      <AiTestdataGeneratorModal
        isOpen={showAiTestdataModal}
        onClose={() => setShowAiTestdataModal(false)}
        problemDescription={description}
        inputFormat={input}
        outputFormat={output}
        sampleCases={sampleCases.filter(s => s.input.trim() || s.output.trim())}
        onTestdataGenerated={handleAiTestdataGenerated}
      />
    </form>
  );
}
