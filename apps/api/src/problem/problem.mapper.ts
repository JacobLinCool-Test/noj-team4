import type { Prisma } from '@prisma/client';

export const problemWithOwnerInclude = {
  owner: {
    select: { id: true, username: true, nickname: true },
  },
} satisfies Prisma.ProblemInclude;

export type ProblemWithOwner = Prisma.ProblemGetPayload<{
  include: typeof problemWithOwnerInclude;
}>;

export function mapProblemWithOwner(
  problem: ProblemWithOwner,
  currentUserId?: number | null,
) {
  const sampleCases = (problem.sampleInputs || []).map((input, idx) => ({
    input,
    output: problem.sampleOutputs?.[idx] ?? '',
  }));

  const isOwner =
    currentUserId !== undefined &&
    currentUserId !== null &&
    problem.ownerId === currentUserId;

  return {
    id: problem.id,
    displayId: problem.displayId,
    visibility: problem.visibility,
    difficulty: problem.difficulty,
    tags: problem.tags ?? [],
    allowedLanguages: problem.allowedLanguages,
    canViewStdout: problem.canViewStdout,
    title: problem.title,
    description: problem.description,
    input: problem.input,
    output: problem.output,
    hint: problem.hint,
    sampleCases,
    owner: problem.owner,
    createdAt: problem.createdAt,
    updatedAt: problem.updatedAt,
    canEdit: isOwner,
    canDelete: isOwner,
    // 雙語欄位
    titleZh: problem.titleZh,
    titleEn: problem.titleEn,
    descriptionZh: problem.descriptionZh,
    descriptionEn: problem.descriptionEn,
    inputZh: problem.inputZh,
    inputEn: problem.inputEn,
    outputZh: problem.outputZh,
    outputEn: problem.outputEn,
    hintZh: problem.hintZh,
    hintEn: problem.hintEn,
    tagsZh: problem.tagsZh ?? [],
    tagsEn: problem.tagsEn ?? [],
    // 翻譯狀態
    sourceLanguage: problem.sourceLanguage,
    translationStatus: problem.translationStatus,
    lastTranslatedAt: problem.lastTranslatedAt,
  };
}
