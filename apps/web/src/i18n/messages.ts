import type { Locale } from "./config";

export type Messages = {
  hello: string;
  helloCourses: string;
  helloProblems: string;
  languageSelectorLabel: string;
  switcherCurrent: string;
  brand: string;
  navHome: string;
  navCourses: string;
  navProblems: string;
  navSubmissions: string;
  navAdmin: string;
  navContest: string;
  login: string;
  signup: string;
  logout: string;
  logoutConfirm: string;
  headerLanguage: string;
  emailUnverified: string;
  navToggleLabel: string;
  loginTitle: string;
  registerTitle: string;
  identifierLabel: string;
  usernameLabel: string;
  usernameHint: string;
  emailLabel: string;
  passwordLabel: string;
  newPasswordLabel: string;
  confirmPasswordLabel: string;
  passwordMismatch: string;
  showPassword: string;
  hidePassword: string;
  submit: string;
  confirm: string;
  cancel: string;
  successLogin: string;
  successRegister: string;
  verificationEmailSent: string;
  errorGeneric: string;
  haveAccount: string;
  noAccount: string;
  goLogin: string;
  goRegister: string;
  emailNotVerified: string;
  goVerify: string;
  verifyTitle: string;
  verifyProcessing: string;
  verifySuccess: string;
  verifyFailed: string;
  resendVerification: string;
  resendAction: string;
  resendSuccess: string;
  resendInputPlaceholder: string;
  forgotPassword: string;
  forgotPasswordTitle: string;
  forgotPasswordDescription: string;
  forgotPasswordSuccess: string;
  resetPasswordTitle: string;
  resetPasswordDescription: string;
  resetPasswordSuccess: string;
  resetPasswordInvalid: string;
  resetPasswordMissingToken: string;
  coursesTitle: string;
  coursesSubtitle: string;
  coursesFilterStatus: string;
  coursesFilterActive: string;
  coursesFilterArchived: string;
  coursesFilterMine: string;
  coursesFilterTermPlaceholder: string;
  coursesLoginHint: string;
  coursesLoginRequired: string;
  coursesTabAll: string;
  coursesTabMine: string;
  coursesEnrollInvite: string;
  coursesEnrollByCode: string;
  coursesEnrollPublic: string;
  coursesMemberCount: string;
  coursesTeacherLabel: string;
  coursesJoinCode: string;
  coursesNoDescription: string;
  coursesNoTerm: string;
  coursesEmpty: string;
  coursesEmptyHint: string;
  coursesClearFilters: string;
  coursesError: string;
  retry: string;
  coursesCreateButton: string;
  courseCreateTitle: string;
  courseCreateSubtitle: string;
  courseCreateNameLabel: string;
  courseCreateNamePlaceholder: string;
  courseCreateTermLabel: string;
  courseCreateTermPlaceholder: string;
  courseCreateDescriptionLabel: string;
  courseCreateDescriptionPlaceholder: string;
  courseCreateEnrollmentTypeLabel: string;
  courseCreateJoinCodeLabel: string;
  courseCreateJoinCodePlaceholder: string;
  courseCreateJoinCodeHint: string;
  courseCreateSubmit: string;
  courseCreateSubmitHint: string;
  courseCreateSuccess: string;
  courseCreateError: string;
  courseCreateNameRequired: string;
  courseCreateLoginRequired: string;
  courseDetailStatusLabel: string;
  courseDetailMemberCount: string;
  courseDetailTeachers: string;
  courseDetailMyRole: string;
  courseDetailRoleTeacher: string;
  courseDetailRoleTA: string;
  courseDetailRoleStudent: string;
  courseDetailSummary: string;
  courseDetailHomeworkCount: string;
  courseDetailSubmissionCount: string;
  courseDetailDescription: string;
  courseDetailDescriptionEmpty: string;
  courseDetailNotFound: string;
  courseDetailNotLoggedIn: string;
  courseDetailJoinLoginHint: string;
  courseDetailLoginCta: string;
  courseDetailError: string;
  courseDetailNotEnrolledTitle: string;
  courseDetailNotEnrolled: string;
  courseDetailJoinToView: string;
  courseJoinTitle: string;
  courseJoinDescriptionByCode: string;
  courseJoinDescriptionPublic: string;
  courseJoinCodeLabel: string;
  courseJoinCodePlaceholder: string;
  courseJoinCodeRequired: string;
  courseJoinSubmit: string;
  courseJoinSubmitting: string;
  courseJoinError: string;
  courseLeaveButton: string;
  courseLeaveSubmitting: string;
  courseLeaveConfirm: string;
  courseLeaveError: string;
  courseLeaveLastTeacher: string;
  courseDetailAnnouncementsTitle: string;
  courseDetailAnnouncementsPlaceholder: string;
  courseDetailHomeworksTitle: string;
  courseDetailHomeworksPlaceholder: string;
  courseDetailViewAll: string;
  courseDetailEditButton: string;
  // Course Tabs
  courseTabOverview: string;
  courseTabAnnouncements: string;
  courseTabHomeworks: string;
  courseTabProblems: string;
  courseTabMembers: string;
  courseTabSettings: string;
  // Course Stats
  courseStatMembers: string;
  courseStatHomeworks: string;
  courseStatProblems: string;
  courseStatSubmissions: string;
  // Course Overview
  courseRecentAnnouncements: string;
  courseUpcomingDeadlines: string;
  courseRecentProblems: string;
  courseEditBackButton: string;
  courseEditTitle: string;
  courseEditSubtitle: string;
  courseEditNameLabel: string;
  courseEditNamePlaceholder: string;
  courseEditTermLabel: string;
  courseEditTermPlaceholder: string;
  courseEditDescriptionLabel: string;
  courseEditDescriptionPlaceholder: string;
  courseEditEnrollmentTypeLabel: string;
  courseEditJoinCodeLabel: string;
  courseEditJoinCodePlaceholder: string;
  courseEditJoinCodeHint: string;
  courseEditSubmit: string;
  courseEditSubmitHint: string;
  courseEditSuccess: string;
  courseEditError: string;
  courseEditNameRequired: string;
  courseEditLoginRequired: string;
  courseEditPermissionDenied: string;
  courseDeleteDangerTitle: string;
  courseDeleteDangerDescription: string;
  courseDeleteConfirmLabel: string;
  courseDeleteConfirmPlaceholder: string;
  courseDeleteButton: string;
  courseDeleteDeleting: string;
  courseDeleteNameMismatch: string;
  courseDeleteConfirmPrompt: string;
  courseDeleteError: string;
  homeworksTitle: string;
  homeworksNew: string;
  homeworksEdit: string;
  homeworksDelete: string;
  homeworksDeleteConfirm: string;
  homeworksStatusUpcoming: string;
  homeworksStatusOngoing: string;
  homeworksStatusEnded: string;
  homeworksFormTitle: string;
  homeworksFormDescription: string;
  homeworksFormStartAt: string;
  homeworksFormEndAt: string;
  homeworksFormWeightPercent: string;
  homeworksFormProblems: string;
  homeworksFormSelected: string;
  homeworksFormPoints: string;
  homeworksFormQuota: string;
  homeworksFormUnlimited: string;
  homeworksFormAllowedLanguages: string;
  homeworksFormAllowedLanguagesHint: string;
  homeworksFormAllowAiAssistant: string;
  homeworksFormSave: string;
  homeworksFormSaving: string;
  homeworksFormCancel: string;
  homeworksProblemSearchPlaceholder: string;
  homeworksError: string;
  homeworksEmpty: string;
  homeworksJoinCourseHint: string;
  homeworksProblemCount: string;
  homeworksCreatedBy: string;
  homeworksNotAllowed: string;
  homeworksErrorsMustSelectAtLeastOneProblem: string;
  homeworksErrorsInvalidTimeRange: string;
  homeworksErrorsLanguagesRequired: string;
  homeworksProblemBankTitle: string;
  homeworksProblemBankHint: string;
  homeworksProblemBankEmpty: string;
  homeworksProblemBankTabCourse: string;
  homeworksProblemBankTabPublic: string;
  homeworksProblemMissing: string;
  homeworksCourseProblemsTitle: string;
  homeworksCourseProblemsEmpty: string;
  homeworksPublicProblemsTitle: string;
  homeworksPublicProblemsHint: string;
  homeworksPublicProblemsEmpty: string;
  homeworksPublicProblemsError: string;
  homeworksExistingProblemsTitle: string;
  homeworksCourseProblemConfigHint: string;
  homeworksClonePublicProblem: string;
  homeworksClonePublicProblemHint: string;
  homeworksCloneSuccess: string;
  homeworksCloneError: string;
  homeworksCloning: string;
  courseProblemsAddTitle: string;
  courseProblemsAddPlaceholder: string;
  courseProblemsAddButton: string;
  courseProblemsAddHelp: string;
  courseProblemsAddSuccess: string;
  courseProblemsAddError: string;
  courseProblemsTitle: string;
  courseProblemsSubtitle: string;
  courseProblemsViewAll: string;
  courseProblemsNew: string;
  courseProblemsError: string;
  courseProblemsEmpty: string;
  courseProblemsVisibility: string;
  courseProblemsBackToCourse: string;
  courseProblemsBackToList: string;
  courseProblemsNoPermission: string;
  courseProblemCreateTitle: string;
  courseProblemCreateSubtitle: string;
  courseProblemEditTitle: string;
  courseProblemEditSubtitle: string;
  courseProblemFormCreate: string;
  courseProblemFormUpdate: string;
  courseProblemPublicLabel: string;
  courseProblemPublicAiHint: string;
  courseProblemQuotaInvalid: string;
  paginationPrev: string;
  paginationNext: string;
  paginationPage: string;
  paginationInfo: string;
  problemFormCourseAssignTitle: string;
  problemFormCourseAssignDescription: string;
  problemFormCourseAssignEmpty: string;
  problemFormCourseAssignHelp: string;
  problemFormCourseAssignPartialFailed: string;
  problemFormCourseAssignRequired: string;
  // Problems
  problemsTitle: string;
  problemsSubtitle: string;
  problemsPublicHint: string;
  problemsFilterDifficulty: string;
  problemsDifficultyAll: string;
  problemsDifficultyUnknown: string;
  problemsDifficultyEasy: string;
  problemsDifficultyMedium: string;
  problemsDifficultyHard: string;
  problemsSearchPlaceholder: string;
  problemsCreateButton: string;
  problemsTableId: string;
  problemsTableTitle: string;
  problemsTableCourses: string;
  problemsTableDifficulty: string;
  problemsTableCreatedAt: string;
  problemsTableCompleted: string;
  problemsTableTags: string;
  problemsFilterTags: string;
  problemsClearTags: string;
  problemFormTags: string;
  problemFormTagsPlaceholder: string;
  problemFormTagsHint: string;
  problemsEmpty: string;
  problemsEmptyHint: string;
  problemsClearFilters: string;
  problemsTotalCount: string;
  problemsError: string;
  problemBackToList: string;
  problemBackToDetail: string;
  problemOwner: string;
  problemEditButton: string;
  problemDeleteButton: string;
  problemDeleting: string;
  problemDeleteConfirm: string;
  problemDeleteError: string;
  problemsTabsPublic: string;
  problemsTabsCourses: string;
  problemsTabsMine: string;
  problemsLoginRequired: string;
  problemsNoCourses: string;
  problemsCourseSelect: string;
  problemsCourseEmpty: string;
  problemsNewProblem: string;
  problemsSectionCourse: string;
  problemsSectionPublic: string;
  problemsViewMine: string;
  problemsCourseFilterAll: string;
  problemsMineTitle: string;
  problemsMineSubtitle: string;
  problemsMineBackToList: string;
  problemsMineEmpty: string;
  problemsMineEmptyHint: string;
  problemsEdit: string;
  problemDescription: string;
  problemInput: string;
  problemOutput: string;
  problemHint: string;
  problemSampleIO: string;
  problemSampleInput: string;
  problemSampleOutput: string;
  problemCreateTitle: string;
  problemCreateSubtitle: string;
  problemCreateLoginRequired: string;
  problemEditTitle: string;
  problemEditSubtitle: string;
  problemEditLoginRequired: string;
  problemEditNoPermission: string;
  problemVisibilityPublic: string;
  problemVisibilityUnlisted: string;
  problemVisibilityPrivate: string;
  problemVisibilityCourseOnly: string; // deprecated, kept for compatibility
  problemVisibilityHidden: string; // deprecated, kept for compatibility
  problemFormTitle: string;
  problemFormTitlePlaceholder: string;
  problemFormTitleRequired: string;
  problemFormVisibility: string;
  problemFormDifficulty: string;
  problemFormLanguages: string;
  problemFormLanguagesRequired: string;
  problemFormQuota: string;
  problemFormQuotaHint: string;
  problemFormCanViewStdout: string;
  problemFormDescription: string;
  problemFormDescriptionPlaceholder: string;
  problemFormDescriptionRequired: string;
  problemFormInput: string;
  problemFormInputPlaceholder: string;
  problemFormOutput: string;
  problemFormOutputPlaceholder: string;
  problemFormHint: string;
  problemFormHintPlaceholder: string;
  problemFormSampleCases: string;
  problemFormAddSampleCase: string;
  problemFormRemove: string;
  problemFormCancel: string;
  problemFormSubmitting: string;
  problemFormCreate: string;
  problemFormUpdate: string;
  problemFormError: string;
  problemFormAiTitle: string;
  problemFormAiHint: string;
  problemFormAiEnabled: string;
  problemFormAiScopeProblem: string;
  problemFormAiScopeCode: string;
  problemFormAiScopeCompile: string;
  problemFormAiScopeJudge: string;
  // Translation
  problemFormAutoTranslate: string;
  problemFormAutoTranslateHint: string;
  problemTranslationPending: string;
  problemTranslationCompleted: string;
  problemTranslationFailed: string;
  adminAiTitle: string;
  adminAiSubtitle: string;
  adminAiGlobalSettings: string;
  adminAiActiveProvider: string;
  adminAiActiveProviderHint: string;
  adminAiForceDisable: string;
  adminAiForceDisableHint: string;
  adminAiProvider: string;
  adminAiModel: string;
  adminAiReasoningEffort: string;
  adminAiOpenAiModel: string;
  adminAiGeminiModel: string;
  adminAiMaxTokens: string;
  adminAiTemperature: string;
  adminAiEnabled: string;
  adminAiDisabled: string;
  adminAiSave: string;
  adminAiSaving: string;
  adminAiSaved: string;
  adminAiError: string;
  adminAiLoading: string;
  adminAiBack: string;
  aiAssistantButton: string;
  aiAssistantTitle: string;
  aiAssistantHint: string;
  aiAssistantClose: string;
  aiAssistantScopeTitle: string;
  aiAssistantScopeEmpty: string;
  aiAssistantScopeProblem: string;
  aiAssistantScopeCode: string;
  aiAssistantScopeCompile: string;
  aiAssistantScopeJudge: string;
  aiAssistantAttachSubmission: string;
  aiAssistantEmpty: string;
  aiAssistantEmptyGeneral: string;
  aiAssistantPlaceholder: string;
  aiAssistantPlaceholderGeneral: string;
  aiAssistantSend: string;
  aiAssistantSending: string;
  aiAssistantHintProblem: string;
  aiAssistantLoginRequired: string;
  aiAssistantLoginButton: string;
  aiAssistantError: string;
  aiAssistantErrorGeneric: string;
  aiAssistantErrorProviderNotReady: string;
  aiAssistantErrorProviderAuth: string;
  aiAssistantErrorRateLimit: string;
  aiAssistantErrorDisabled: string;
  aiAssistantErrorConversation: string;
  aiAssistantErrorEmpty: string;
  aiAssistantNewChat: string;
  aiAssistantNewChatConfirm: string;
  // AI Problem Creator
  aiProblemCreatorButton: string;
  aiProblemCreatorTitle: string;
  aiProblemCreatorSubtitle: string;
  aiProblemCreatorDescribeIdea: string;
  aiProblemCreatorReviewProblem: string;
  aiProblemCreatorEditDetails: string;
  aiProblemCreatorGeneratingTestdata: string;
  aiProblemCreatorReadyToPublish: string;
  aiProblemCreatorPublishing: string;
  aiProblemCreatorPublished: string;
  aiProblemCreatorViewProblem: string;
  aiProblemCreatorClose: string;
  aiProblemCreatorStartCreating: string;
  aiProblemCreatorLoginToUse: string;
  aiProblemCreatorPlaceholder: string;
  aiProblemCreatorQuickTemplates: string;
  aiProblemCreatorMath: string;
  aiProblemCreatorString: string;
  aiProblemCreatorDataStructure: string;
  aiProblemCreatorAlgorithm: string;
  aiProblemCreatorProblemReady: string;
  aiProblemCreatorGoToPreview: string;
  aiProblemCreatorSending: string;
  aiProblemCreatorError: string;
  // AI Problem Creator - Additional
  aiProblemCreatorRestoringProgress: string;
  aiProblemCreatorAiGenerating: string;
  aiProblemCreatorTimeout: string;
  aiProblemCreatorStartingAi: string;
  aiProblemCreatorAnalyzing: string;
  aiProblemCreatorUnderstanding: string;
  aiProblemCreatorDesigning: string;
  aiProblemCreatorGeneratingSolution: string;
  aiProblemCreatorGettingResult: string;
  aiProblemCreatorEditProblem: string;
  aiProblemCreatorAiCompleted: string;
  aiProblemCreatorEditContent: string;
  aiProblemCreatorPreviewAndPublish: string;
  aiProblemCreatorPublishingProblem: string;
  aiProblemCreatorPublishSuccess: string;
  aiProblemCreatorCreateNew: string;
  aiProblemCreatorTestCasesCount: string;
  aiProblemCreatorSampleCasesCount: string;
  aiProblemCreatorDescription: string;
  aiProblemCreatorInputFormat: string;
  aiProblemCreatorOutputFormat: string;
  aiProblemCreatorSampleTestcases: string;
  aiProblemCreatorConstraints: string;
  aiProblemCreatorTimeLimit: string;
  aiProblemCreatorMemoryLimit: string;
  aiProblemCreatorRestart: string;
  aiProblemCreatorPublishProblem: string;
  aiProblemCreatorAiHelpText: string;
  aiProblemCreatorPleaseWait: string;
  aiProblemCreatorCooldownRunning: string;
  aiProblemCreatorCooldownAbuse: string;
  aiProblemCreatorCooldownEnd: string;
  aiProblemCreatorTestdataCooldown: string;
  aiProblemCreatorGenerationFailed: string;
  aiProblemCreatorRetry: string;
  aiProblemCreatorAiCannotGenerate: string;
  aiProblemCreatorLoginRequired: string;
  aiProblemCreatorInput: string;
  aiProblemCreatorOutput: string;
  // AI Problem Creator - Editor
  aiProblemCreatorEditorTitle: string;
  aiProblemCreatorEditorDifficulty: string;
  aiProblemCreatorEditorTags: string;
  aiProblemCreatorEditorTagsPlaceholder: string;
  aiProblemCreatorEditorTimeLimitMs: string;
  aiProblemCreatorEditorMemoryLimitMb: string;
  aiProblemCreatorEditorAddSample: string;
  aiProblemCreatorEditorRemove: string;
  aiProblemCreatorEditorSample: string;
  aiProblemCreatorEditorCancel: string;
  aiProblemCreatorEditorSaveChanges: string;
  // AI Problem Creator - Modal & Chat
  aiProblemCreatorModalTitle: string;
  aiProblemCreatorModalDescribeIdea: string;
  aiProblemCreatorModalReviewProblem: string;
  aiProblemCreatorModalEditDetails: string;
  aiProblemCreatorModalGeneratingTestdata: string;
  aiProblemCreatorModalReadyToPublish: string;
  aiProblemCreatorModalPublishing: string;
  aiProblemCreatorModalPublished: string;
  aiProblemCreatorModalPublishingProblem: string;
  aiProblemCreatorModalProblemPublished: string;
  aiProblemCreatorModalProblemAvailable: string;
  aiProblemCreatorModalViewProblem: string;
  aiProblemCreatorModalClose: string;
  // AI Problem Creator - Chat Interface
  aiProblemCreatorChatStartTitle: string;
  aiProblemCreatorChatStartDesc: string;
  aiProblemCreatorChatTemplateArraySum: string;
  aiProblemCreatorChatTemplateArraySumDesc: string;
  aiProblemCreatorChatTemplatePalindrome: string;
  aiProblemCreatorChatTemplatePalindromeDesc: string;
  aiProblemCreatorChatTemplateBinarySearch: string;
  aiProblemCreatorChatTemplateBinarySearchDesc: string;
  aiProblemCreatorChatTemplatePrime: string;
  aiProblemCreatorChatTemplatePrimeDesc: string;
  aiProblemCreatorChatProblemReady: string;
  aiProblemCreatorChatProblemReadyDesc: string;
  aiProblemCreatorChatPreviewProblem: string;
  aiProblemCreatorChatPlaceholder: string;
  aiProblemCreatorChatHint: string;
  // AI Problem Creator - Preview
  aiProblemCreatorPreviewEdit: string;
  aiProblemCreatorPreviewSolutionCode: string;
  aiProblemCreatorPreviewSuggestedTestInputs: string;
  aiProblemCreatorPreviewSuggestedTestInputsDesc: string;
  aiProblemCreatorPreviewBackToChat: string;
  aiProblemCreatorPreviewGenerateTestData: string;
  aiProblemCreatorPreviewRequiredHint: string;
  // AI Problem Creator - Testdata Progress
  aiProblemCreatorTestdataGenerating: string;
  aiProblemCreatorTestdataGeneratingDesc: string;
  aiProblemCreatorTestdataProcessing: string;
  aiProblemCreatorTestdataGenerated: string;
  aiProblemCreatorTestdataPassed: string;
  aiProblemCreatorTestdataErrors: string;
  aiProblemCreatorTestdataTimeouts: string;
  aiProblemCreatorTestdataSampleCase: string;
  aiProblemCreatorTestdataTestCase: string;
  aiProblemCreatorTestdataExpectedOutput: string;
  aiProblemCreatorTestdataEmptyOutputError: string;
  aiProblemCreatorTestdataDockerNotAvailable: string;
  // AI Problem Creator - Publish Confirmation
  aiProblemCreatorPublishReady: string;
  aiProblemCreatorPublishProblemDetails: string;
  aiProblemCreatorPublishTestData: string;
  aiProblemCreatorPublishHiddenCases: string;
  aiProblemCreatorPublishTotal: string;
  aiProblemCreatorPublishStatus: string;
  aiProblemCreatorPublishAllPassed: string;
  aiProblemCreatorPublishSomeIssues: string;
  aiProblemCreatorPublishDescPreview: string;
  aiProblemCreatorPublishBeforePublishing: string;
  aiProblemCreatorPublishVisibilityNotice: string;
  aiProblemCreatorPublishBack: string;
  aiProblemCreatorPublishAutoTranslate: string;
  aiProblemCreatorPublishAutoTranslateDesc: string;
  // AI Testdata Generator
  aiTestdataGeneratorTitle: string;
  aiTestdataGeneratorSubtitle: string;
  aiTestdataGeneratorNumCases: string;
  aiTestdataGeneratorGenerate: string;
  aiTestdataGeneratorGenerating: string;
  aiTestdataGeneratorSuccess: string;
  aiTestdataGeneratorFailed: string;
  aiTestdataGeneratorUseTestdata: string;
  aiTestdataGeneratorRetry: string;
  aiTestdataGeneratorButton: string;
  aiTestdataReady: string;
  aiTestdataCount: string;
  // Homepage
  homepageTagline: string;
  homepageFeatureAiCreator: string;
  homepageFeatureAiCreatorDesc: string;
  homepageFeatureAiAssistant: string;
  homepageFeatureAiAssistantDesc: string;
  homepageFeatureJudge: string;
  homepageFeatureJudgeDesc: string;
  homepageFeatureCourse: string;
  homepageFeatureCourseDesc: string;
  homepageSectionTitle: string;
  homepageSectionSubtitle: string;
  homepageCtaTitle: string;
  homepageCtaSubtitle: string;
  homepageCtaBrowseProblems: string;
  homepageCtaViewCourses: string;
  homepageCtaRegister: string;
  homepageCtaLogin: string;
  homepageCtaFree: string;
  homepageCtaMultiLang: string;
  homepageCtaAiAssist: string;
  // Profile
  profileTitle: string;
  profileEditTitle: string;
  profileJoinedAt: string;
  profileEditButton: string;
  profileNicknameLabel: string;
  profileNicknamePlaceholder: string;
  profileBioLabel: string;
  profileBioPlaceholder: string;
  profileAvatarLabel: string;
  profileAvatarUpload: string;
  profileAvatarChange: string;
  profileAvatarRemove: string;
  profileAvatarCancel: string;
  profileAvatarDragHint: string;
  profileAvatarSizeHint: string;
  profileAvatarInvalidType: string;
  profileAvatarTooLarge: string;
  profileAvatarSelectedFile: string;
  profileSaveButton: string;
  profileSaving: string;
  profileCancelButton: string;
  profileUpdateSuccess: string;
  profileUpdateError: string;
  profileLoadError: string;
  profileUserNotFound: string;
  profileLoading: string;
  profileStatsTitle: string;
  profileStatsTotalSubmissions: string;
  profileStatsAcCount: string;
  profileStatsAcceptanceRate: string;
  profileRecentSubmissionsTitle: string;
  profileRecentSubmissionsEmpty: string;
  profileRecentSubmissionsViewAll: string;
  profileApiTokensButton: string;
  profileTimeMinutesAgo: string;
  profileTimeHoursAgo: string;
  profileTimeDaysAgo: string;
  profileUserNotFoundDescription: string;
  profileStartSolvingHint: string;
  // Submission
  submissionStatusPending: string;
  submissionStatusRunning: string;
  submissionStatusAC: string;
  submissionStatusPA: string;
  submissionStatusWA: string;
  submissionStatusCE: string;
  submissionStatusTLE: string;
  submissionStatusMLE: string;
  submissionStatusRE: string;
  submissionStatusOLE: string;
  submissionStatusSA: string;
  submissionStatusJudgeError: string;
  submissionScore: string;
  submissionLanguageC: string;
  submissionLanguageCPP: string;
  submissionLanguageJava: string;
  submissionLanguagePython: string;
  submissionLanguageAuto: string;
  submissionSubmit: string;
  submissionSubmitting: string;
  submissionSuccess: string;
  submissionErrorQuotaExceeded: string;
  submissionErrorLanguageNotAllowed: string;
  submissionErrorHomeworkNotStarted: string;
  submissionErrorHomeworkEnded: string;
  submissionErrorNotCourseMember: string;
  submissionErrorPermissionDenied: string;
  submissionListTitle: string;
  submissionDetailTitle: string;
  submissionCode: string;
  submissionResult: string;
  submissionTime: string;
  submissionMemory: string;
  submissionCases: string;
  // Test (Code Testing)
  testButton: string;
  testButtonTesting: string;
  testCustomInputShow: string;
  testCustomInputHide: string;
  testCustomInputLabel: string;
  testCustomInputPlaceholder: string;
  testResultsTitle: string;
  testResultCompileError: string;
  testResultOutput: string;
  testResultError: string;
  testResultPassed: string;
  testResultFailed: string;
  testErrorCodeRequired: string;
  testErrorGeneric: string;
  testdataUploadTitle: string;
  testdataUploadButton: string;
  testdataUploadSuccess: string;
  testdataUploadError: string;
  testdataVersionsTitle: string;
  testdataVersionLabel: string;
  testdataActiveLabel: string;
  testdataActivateButton: string;
  testdataActivateSuccess: string;
  testdataCaseCount: string;
  testdataUploadedBy: string;
  testdataUploadedAt: string;
  testdataErrorZipTooLarge: string;
  testdataErrorInvalidZip: string;
  testdataErrorManifestNotFound: string;
  testdataErrorManifestInvalid: string;
  testdataErrorPathTraversal: string;
  testdataErrorFileNotFound: string;
  testdataErrorForbidden: string;
  testdataErrorVersionNotFound: string;
  testdataTitle: string;
  testdataActiveVersion: string;
  testdataNoActive: string;
  testdataCases: string;
  testdataUploading: string;
  testdataUpload: string;
  testdataEmpty: string;
  testdataActive: string;
  testdataActivating: string;
  testdataSetActive: string;
  testdataHelp: string;
  inputMethodWarning: string;
  // Subtask and Testdata uploader
  subtaskTitle: string;
  subtaskAdd: string;
  subtaskRemove: string;
  subtaskCaseCount: string;
  subtaskPoints: string;
  subtaskTimeLimit: string;
  subtaskMemoryLimit: string;
  subtaskSample: string;
  subtaskTotalCases: string;
  subtaskTotalPoints: string;
  subtaskExpectedFiles: string;
  subtaskFormatHelp: string;
  subtaskUploadHint: string;
  subtaskDefaultTimeLimit: string;
  subtaskDefaultMemoryLimit: string;
  testdataFiles: string;
  testdataVersions: string;
  testdataNoVersions: string;
  testdataVersion: string;
  testdataDownload: string;
  testdataActivate: string;
  testdataMustBeZip: string;
  testdataCreateHint: string;
  testdataOptional: string;
  testdataDropOrClick: string;
  testdataZipFormat: string;
  testdataParsing: string;
  testdataNoSubtasksDetected: string;
  testdataParseError: string;
  testdataDetected: string;
  testdataPointsUnit: string;
  testdataShouldBe100: string;
  testdataAdvancedSettings: string;
  testdataPerSubtaskOverrides: string;
  testdataHelpButton: string;
  testdataHelpTitle: string;
  testdataHelpIntro: string;
  testdataHelpFormat: string;
  testdataHelpFormatDesc: string;
  testdataHelpExample: string;
  testdataHelpExampleDesc: string;
  testdataHelpSubtask0: string;
  testdataHelpSubtask1: string;
  testdataHelpNote: string;
  testdataHelpClose: string;
  // Copycat (Plagiarism Detection)
  copycatTitle: string;
  copycatBackToProblems: string;
  copycatProblemLabel: string;
  copycatCourseLabel: string;
  copycatLoginRequired: string;
  copycatLoginButton: string;
  copycatCourseNotFound: string;
  copycatNoPermission: string;
  copycatNoPermissionHint: string;
  copycatNoReport: string;
  copycatNoReportHint: string;
  copycatGenerateButton: string;
  copycatGenerating: string;
  copycatPreviousFailed: string;
  copycatRetryHint: string;
  copycatPending: string;
  copycatRunning: string;
  copycatAutoRefreshHint: string;
  copycatSummaryLanguages: string;
  copycatSummaryAvgSimilarity: string;
  copycatSummaryMaxSimilarity: string;
  copycatSummarySuspiciousPairs: string;
  copycatReportStudents: string;
  copycatReportSubmissions: string;
  copycatReportGenerated: string;
  copycatReportRequestedBy: string;
  copycatFilterMinSimilarity: string;
  copycatFilterLanguage: string;
  copycatFilterAll: string;
  copycatTableStudentA: string;
  copycatTableStudentB: string;
  copycatTableLanguage: string;
  copycatTableSimilarity: string;
  copycatTableRisk: string;
  copycatRiskHigh: string;
  copycatRiskMedium: string;
  copycatLoadingPairs: string;
  copycatNoPairs: string;
  copycatPaginationPrev: string;
  copycatPaginationNext: string;
  copycatPaginationPage: string;
  copycatDeleteReport: string;
  copycatRegenerateReport: string;
  copycatButtonLabel: string;
  copycatButtonTitle: string;
  copycatErrorNoSubmissions: string;
  copycatErrorAnalysisFailed: string;
  copycatCompareTitle: string;
  copycatCompareClose: string;
  copycatCompareLoading: string;
  copycatCompareClickHint: string;
  upload: string;
  uploading: string;
  loading: string;
  downloading: string;
  activating: string;
  editorFontSize: string;
  // Email Domain Management
  emailDomainsTitle: string;
  emailDomainsSubtitle: string;
  emailDomainsBackToAdmin: string;
  emailDomainsAllowedCount: string;
  emailDomainsBlockedCount: string;
  emailDomainsDisposableCount: string;
  emailDomainsHowItWorksTitle: string;
  emailDomainsHowItWorks1: string;
  emailDomainsHowItWorks2: string;
  emailDomainsHowItWorks3: string;
  emailDomainsHowItWorks4: string;
  emailDomainsTabAllowed: string;
  emailDomainsTabBlocked: string;
  emailDomainsAddAllowed: string;
  emailDomainsAddBlocked: string;
  emailDomainsDomainPlaceholder: string;
  emailDomainsNotePlaceholder: string;
  emailDomainsAdd: string;
  emailDomainsColDomain: string;
  emailDomainsColNote: string;
  emailDomainsColEnabled: string;
  emailDomainsColActions: string;
  emailDomainsEmpty: string;
  emailDomainsEdit: string;
  emailDomainsDelete: string;
  emailDomainsSave: string;
  emailDomainsCancel: string;
  emailDomainsDeleteConfirm: string;
  emailDomainsAddedSuccess: string;
  emailDomainsUpdatedSuccess: string;
  emailDomainsDeletedSuccess: string;
  emailDomainsShowing: string;
  emailDomainsAccessDenied: string;
  // Bulk Create Users
  bulkCreateUsersTitle: string;
  bulkCreateUsersSubtitle: string;
  bulkCreateUsersBackToAdmin: string;
  bulkCreateUsersAccessDenied: string;
  bulkCreateUsersEmailsLabel: string;
  bulkCreateUsersEmailCount: string;
  bulkCreateUsersEmailsPlaceholder: string;
  bulkCreateUsersEmailsHint: string;
  bulkCreateUsersAutoVerifyLabel: string;
  bulkCreateUsersAutoVerifyHint: string;
  bulkCreateUsersPasswordModeLabel: string;
  bulkCreateUsersPasswordRandom: string;
  bulkCreateUsersPasswordRandomHint: string;
  bulkCreateUsersPasswordSpecified: string;
  bulkCreateUsersPasswordSpecifiedHint: string;
  bulkCreateUsersPasswordLabel: string;
  bulkCreateUsersPasswordPlaceholder: string;
  bulkCreateUsersConfirmPasswordLabel: string;
  bulkCreateUsersConfirmPasswordPlaceholder: string;
  bulkCreateUsersCourseLabel: string;
  bulkCreateUsersNoCourse: string;
  bulkCreateUsersCourseHint: string;
  bulkCreateUsersSubmit: string;
  bulkCreateUsersSubmitting: string;
  bulkCreateUsersNoEmails: string;
  bulkCreateUsersPasswordTooShort: string;
  bulkCreateUsersPasswordMismatch: string;
  bulkCreateUsersSuccess: string;
  bulkCreateUsersCreatedTitle: string;
  bulkCreateUsersSkippedTitle: string;
  bulkCreateUsersErrorsTitle: string;
  bulkCreateUsersPasswordSent: string;
  bulkCreateUsersReasonEmailExists: string;
  // Blocked Submissions
  blockedSubmissionsTitle: string;
  blockedSubmissionsSubtitle: string;
  blockedSubmissionsBackToAdmin: string;
  blockedSubmissionsAccessDenied: string;
  blockedSubmissionsThreatType: string;
  blockedSubmissionsAllTypes: string;
  blockedSubmissionsClearFilters: string;
  blockedSubmissionsTime: string;
  blockedSubmissionsUser: string;
  blockedSubmissionsProblem: string;
  blockedSubmissionsType: string;
  blockedSubmissionsThreat: string;
  blockedSubmissionsLanguage: string;
  blockedSubmissionsActions: string;
  blockedSubmissionsEmpty: string;
  blockedSubmissionsViewDetail: string;
  blockedSubmissionsShowing: string;
  blockedSubmissionsOf: string;
  blockedSubmissionsPrev: string;
  blockedSubmissionsNext: string;
  blockedSubmissionsDetailTitle: string;
  blockedSubmissionsReason: string;
  blockedSubmissionsAnalysis: string;
  blockedSubmissionsSourceCode: string;
  blockedSubmissionsClose: string;
  // Demo Data Generator
  demoDataTitle: string;
  demoDataDescription: string;
  demoDataBackToAdmin: string;
  demoDataForbidden: string;
  demoDataCurrentStatus: string;
  demoDataAdminUser: string;
  demoDataDemoUsers: string;
  demoDataPublicProblems: string;
  demoDataCourses: string;
  demoDataGenerateButton: string;
  demoDataGenerating: string;
  demoDataClearButton: string;
  demoDataClearing: string;
  demoDataClearSuccess: string;
  demoDataUsersDeleted: string;
  demoDataProblemsDeleted: string;
  demoDataCoursesDeleted: string;
  demoDataGenerateSuccess: string;
  demoDataUsersCreated: string;
  demoDataProblemsCreated: string;
  demoDataCoursesCreated: string;
  demoDataSkipped: string;
  demoDataAdminUserCreated: string;
  demoDataDemoUsersCreated: string;
  demoDataPublicProblemsCreated: string;
  demoDataUsername: string;
  demoDataEmail: string;
  demoDataPassword: string;
  demoDataPasswordWarning: string;
  demoDataExists: string;
  demoDataProblems: string;
  demoDataMembers: string;
  demoDataHomeworks: string;
  demoDataAnnouncements: string;
  demoDataConfirmGenerate: string;
  demoDataConfirmGenerateMessage: string;
  demoDataConfirmClear: string;
  demoDataConfirmClearMessage: string;
  demoDataConfirmClearButton: string;
  // Footer
  footerBrand: string;
  footerTermsOfService: string;
  footerPrivacyPolicy: string;
  footerCopyright: string;
  // Terms of Service page
  termsOfServiceTitle: string;
  termsOfServiceLastUpdated: string;
  termsOfServiceContent: string;
  // Privacy Policy page
  privacyPolicyTitle: string;
  privacyPolicyLastUpdated: string;
  privacyPolicyContent: string;
};

export const messages: Record<Locale, Messages> = {
  "zh-TW": {
    hello: "哈囉，世界",
    helloCourses: "課程頁面好！",
    helloProblems: "題庫頁面好！",
    languageSelectorLabel: "介面語言",
    switcherCurrent: "目前：{lang}",
    brand: "NOJ Team4",
    navHome: "首頁",
    navCourses: "課程",
    navProblems: "題目",
    navSubmissions: "提交紀錄",
    navAdmin: "後台",
    navContest: "前往考試網站",
    login: "登入",
    signup: "註冊",
    logout: "登出",
    logoutConfirm: "確定要登出嗎？",
    headerLanguage: "語言",
    emailUnverified: "未驗證",
    navToggleLabel: "切換主選單",
    loginTitle: "登入帳號",
    registerTitle: "建立新帳號",
    identifierLabel: "帳號或 Email",
    usernameLabel: "帳號",
    usernameHint: "3-30 字元，可使用小寫英文、數字、底線、句點。",
    emailLabel: "Email",
    passwordLabel: "密碼",
    newPasswordLabel: "新密碼",
    confirmPasswordLabel: "確認新密碼",
    passwordMismatch: "兩次輸入的密碼不一致。",
    showPassword: "顯示密碼",
    hidePassword: "隱藏密碼",
    submit: "送出",
    confirm: "確認",
    cancel: "取消",
    successLogin: "登入成功，正在導向...",
    successRegister: "註冊成功，正在登入...",
    verificationEmailSent: "驗證信已寄出，請前往信箱查看。",
    errorGeneric: "發生錯誤，請稍後再試",
    haveAccount: "已經有帳號？",
    noAccount: "還沒有帳號？",
    goLogin: "前往登入",
    goRegister: "前往註冊",
    emailNotVerified: "帳號尚未完成信箱驗證，請先驗證後再登入。",
    goVerify: "前往驗證",
    verifyTitle: "驗證信箱",
    verifyProcessing: "正在驗證中...",
    verifySuccess: "驗證成功！請前往登入頁面。",
    verifyFailed: "驗證連結無效或已過期，請重新寄送驗證信。",
    resendVerification: "重新寄送驗證信",
    resendAction: "重新寄送",
    resendSuccess: "如果帳號存在且尚未驗證，我們已重新寄出驗證信。",
    resendInputPlaceholder: "輸入註冊的 Email 或帳號",
    forgotPassword: "忘記密碼？",
    forgotPasswordTitle: "重設密碼",
    forgotPasswordDescription: "輸入帳號或 Email，我們會寄送重設密碼連結到您的信箱。",
    forgotPasswordSuccess: "如果帳號存在，我們已寄出重設密碼的連結。",
    resetPasswordTitle: "設定新密碼",
    resetPasswordDescription: "請輸入新密碼。重設後，所有裝置將被登出，需重新登入。",
    resetPasswordSuccess: "密碼已更新，請使用新密碼重新登入。",
    resetPasswordInvalid: "重設連結已失效或錯誤，請重新申請。",
    resetPasswordMissingToken: "找不到重設密碼的連結參數，請重新申請。",
    coursesTitle: "課程列表",
    coursesSubtitle: "探索與瀏覽所有可用課程",
    coursesFilterStatus: "狀態",
    coursesFilterActive: "進行中",
    coursesFilterArchived: "已封存",
    coursesFilterMine: "只看我的",
    coursesFilterTermPlaceholder: "課程名稱",
    coursesLoginHint: "登入後啟用",
    coursesLoginRequired: "請先登入帳號。",
    coursesTabAll: "所有課程",
    coursesTabMine: "我的課程",
    coursesEnrollInvite: "邀請加入",
    coursesEnrollByCode: "加入碼",
    coursesEnrollPublic: "公開加入",
    coursesMemberCount: "成員 {count} 人",
    coursesTeacherLabel: "老師：",
    coursesJoinCode: "加入碼",
    coursesNoDescription: "尚未提供課程描述",
    coursesNoTerm: "未設定學期",
    coursesEmpty: "沒有符合條件的課程",
    coursesEmptyHint: "調整篩選條件或稍後再試。",
    coursesClearFilters: "清除所有篩選",
    coursesError: "載入課程時發生錯誤",
    retry: "重試",
    coursesCreateButton: "建立課程",
    courseCreateTitle: "建立課程",
    courseCreateSubtitle: "填寫以下資訊建立一門新課程。",
    courseCreateNameLabel: "課程名稱",
    courseCreateNamePlaceholder: "例如：程式設計（一）",
    courseCreateTermLabel: "學期（選填）",
    courseCreateTermPlaceholder: "例如：2025 Fall",
    courseCreateDescriptionLabel: "課程描述",
    courseCreateDescriptionPlaceholder: "簡短說明課程內容與目標",
    courseCreateEnrollmentTypeLabel: "加入方式",
    courseCreateJoinCodeLabel: "加入碼（選填）",
    courseCreateJoinCodePlaceholder: "未填則自動產生",
    courseCreateJoinCodeHint: "若使用加入碼模式，留空會自動產生不易猜測的代碼。",
    courseCreateSubmit: "建立課程",
    courseCreateSubmitHint: "建立後您會自動成為該課程的老師。",
    courseCreateSuccess: "課程建立成功。",
    courseCreateError: "建立課程失敗，請稍後再試。",
    courseCreateNameRequired: "課程名稱為必填欄位。",
    courseCreateLoginRequired: "請先登入後再建立課程。",
    courseDetailStatusLabel: "課程狀態",
    courseDetailMemberCount: "修課人數：{count}",
    courseDetailTeachers: "教師：",
    courseDetailMyRole: "我的身份：",
    courseDetailRoleTeacher: "教師",
    courseDetailRoleTA: "助教",
    courseDetailRoleStudent: "學生",
    courseDetailSummary: "進度摘要",
    courseDetailHomeworkCount: "總作業數",
    courseDetailSubmissionCount: "已繳交作業數",
    courseDetailDescription: "課程介紹",
    courseDetailDescriptionEmpty: "尚未提供課程介紹。",
    courseDetailNotFound: "找不到這門課程。",
    courseDetailNotLoggedIn: "請先登入以查看課程內容。",
    courseDetailJoinLoginHint: "登入後即可使用加入碼或公開加入課程。",
    courseDetailLoginCta: "前往登入",
    courseDetailError: "載入課程資訊時發生錯誤。",
    courseDetailNotEnrolledTitle: "尚未加入課程",
    courseDetailNotEnrolled: "你尚未加入這門課程。請透過加入碼或公開加入方式加入後，再查看公告與作業。",
    courseDetailJoinToView: "加入課程後，才能查看公告與作業。",
    courseJoinTitle: "加入課程",
    courseJoinDescriptionByCode: "此課程需要加入碼，請輸入後加入。",
    courseJoinDescriptionPublic: "此課程開放公開加入，點擊下方按鈕即可加入。",
    courseJoinCodeLabel: "加入碼",
    courseJoinCodePlaceholder: "輸入加入碼",
    courseJoinCodeRequired: "請輸入加入碼",
    courseJoinSubmit: "加入",
    courseJoinSubmitting: "加入中...",
    courseJoinError: "加入課程失敗，請稍後再試。",
    courseLeaveButton: "退出課程",
    courseLeaveSubmitting: "退出中...",
    courseLeaveConfirm: "確定要退出這門課程嗎？",
    courseLeaveError: "退出課程失敗，請稍後再試。",
    courseLeaveLastTeacher: "你是這門課的最後一位教師，無法退出。請先新增其他教師。",
    courseDetailAnnouncementsTitle: "公告",
    courseDetailAnnouncementsPlaceholder: "公告功能尚未實作。將來會在這裡顯示最近幾則公告。",
    courseDetailHomeworksTitle: "作業",
    courseDetailHomeworksPlaceholder: "查看課程作業列表與截止時間。",
    courseDetailViewAll: "查看全部",
    courseDetailEditButton: "編輯課程",
    // Course Tabs
    courseTabOverview: "概覽",
    courseTabAnnouncements: "公告",
    courseTabHomeworks: "作業",
    courseTabProblems: "題目",
    courseTabMembers: "成員",
    courseTabSettings: "設定",
    // Course Stats
    courseStatMembers: "成員",
    courseStatHomeworks: "作業",
    courseStatProblems: "題目",
    courseStatSubmissions: "提交",
    // Course Overview
    courseRecentAnnouncements: "最近公告",
    courseUpcomingDeadlines: "即將截止",
    courseRecentProblems: "課程題目",
    courseEditBackButton: "返回課程",
    courseEditTitle: "編輯課程",
    courseEditSubtitle: "修改課程資訊。",
    courseEditNameLabel: "課程名稱",
    courseEditNamePlaceholder: "例如：程式設計（一）",
    courseEditTermLabel: "學期（選填）",
    courseEditTermPlaceholder: "例如：2025 Fall",
    courseEditDescriptionLabel: "課程描述",
    courseEditDescriptionPlaceholder: "簡短說明課程內容與目標",
    courseEditEnrollmentTypeLabel: "加入方式",
    courseEditJoinCodeLabel: "加入碼（選填）",
    courseEditJoinCodePlaceholder: "留空表示不修改",
    courseEditJoinCodeHint: "若要修改加入碼，請輸入新的代碼。留空表示不修改現有加入碼。",
    courseEditSubmit: "儲存變更",
    courseEditSubmitHint: "修改後的課程資訊會立即生效。",
    courseEditSuccess: "課程更新成功。",
    courseEditError: "更新課程失敗，請稍後再試。",
    courseEditNameRequired: "課程名稱為必填欄位。",
    courseEditLoginRequired: "請先登入後再編輯課程。",
    courseEditPermissionDenied: "您沒有權限編輯這門課程。只有教師可以編輯課程。",
    courseDeleteDangerTitle: "危險操作：刪除課程",
    courseDeleteDangerDescription:
      "刪除課程後，課程將不再出現在列表中，且加入碼會被清除。此操作無法復原，請謹慎操作。",
    courseDeleteConfirmLabel: "請輸入課程名稱以確認刪除",
    courseDeleteConfirmPlaceholder: "輸入「{courseName}」",
    courseDeleteButton: "刪除課程",
    courseDeleteDeleting: "刪除中…",
    courseDeleteNameMismatch: "課程名稱不符，請輸入正確的課程名稱。",
    courseDeleteConfirmPrompt: "確定要刪除這門課程嗎？此操作無法復原。",
    courseDeleteError: "刪除課程失敗，請稍後再試。",
    homeworksTitle: "課程作業",
    homeworksNew: "新增作業",
    homeworksEdit: "編輯作業",
    homeworksDelete: "刪除作業",
    homeworksDeleteConfirm: "確定要刪除這份作業嗎？此操作無法復原。",
    homeworksStatusUpcoming: "未開始",
    homeworksStatusOngoing: "進行中",
    homeworksStatusEnded: "已截止",
    homeworksFormTitle: "作業名稱",
    homeworksFormDescription: "作業說明",
    homeworksFormStartAt: "開始時間",
    homeworksFormEndAt: "截止時間",
    homeworksFormWeightPercent: "作業佔比 (%)",
    homeworksFormProblems: "題目",
    homeworksFormSelected: "已選 {count} 題",
    homeworksFormPoints: "配分",
    homeworksFormQuota: "提交上限",
    homeworksFormUnlimited: "不限制",
    homeworksFormAllowedLanguages: "允許語言",
    homeworksFormAllowedLanguagesHint: "只能縮限題目本身允許的語言。",
    homeworksFormAllowAiAssistant: "允許使用 AI 助教",
    homeworksFormSave: "儲存",
    homeworksFormSaving: "儲存中...",
    homeworksFormCancel: "取消",
    homeworksProblemSearchPlaceholder: "搜尋題目名稱或題號",
    homeworksError: "載入作業時發生錯誤",
    homeworksEmpty: "目前沒有作業。",
    homeworksJoinCourseHint: "請先加入課程後，再查看作業列表。",
    homeworksProblemCount: "{count} 題",
    homeworksCreatedBy: "由 {name} 建立",
    homeworksNotAllowed: "你沒有權限操作作業。",
    homeworksErrorsMustSelectAtLeastOneProblem: "請至少選擇一題加入作業。",
    homeworksErrorsInvalidTimeRange: "開始時間必須早於截止時間，請重新確認。",
    homeworksErrorsLanguagesRequired: "每一題至少要允許一種語言。",
    homeworksProblemBankTitle: "題庫",
    homeworksProblemBankHint: "從課程題目中挑選加入作業。",
    homeworksProblemBankEmpty: "目前沒有可選擇的題目。",
    homeworksProblemBankTabCourse: "課程題目",
    homeworksProblemBankTabPublic: "公開題目",
    homeworksProblemMissing: "題目已被刪除或隱藏",
    homeworksCourseProblemsTitle: "課程已收錄題目",
    homeworksCourseProblemsEmpty: "此課程尚未收錄任何題目，可先將題目加入課程。",
    homeworksPublicProblemsTitle: "公開題目",
    homeworksPublicProblemsHint: "可直接加入公開題目，無需先收錄至課程。",
    homeworksPublicProblemsEmpty: "目前沒有可顯示的公開題目。",
    homeworksPublicProblemsError: "無法載入課程題目，請稍後再試。",
    homeworksExistingProblemsTitle: "目前作業的題目",
    homeworksCourseProblemConfigHint: "課程題目沿用課程設定。",
    homeworksClonePublicProblem: "複製到課程",
    homeworksClonePublicProblemHint: "選擇公開題目後，將建立該題的副本並加入課程。",
    homeworksCloneSuccess: "題目已成功複製至課程題目",
    homeworksCloneError: "複製題目時發生錯誤",
    homeworksCloning: "正在複製題目...",
    courseProblemsAddTitle: "加入已存在的題目",
    courseProblemsAddPlaceholder: "輸入題號或題目 ID",
    courseProblemsAddButton: "加入題目",
    courseProblemsAddHelp: "可輸入題目的顯示編號（如 a123）或系統 ID。",
    courseProblemsAddSuccess: "題目已加入課程。",
    courseProblemsAddError: "加入題目失敗，請確認題號是否正確。",
    courseProblemsTitle: "課程題庫",
    courseProblemsSubtitle: "這門課的題目列表",
    courseProblemsViewAll: "查看全部",
    courseProblemsNew: "新增題目",
    courseProblemsError: "無法載入課程題目",
    courseProblemsEmpty: "此課程尚無題目",
    courseProblemsVisibility: "可見性",
    courseProblemsBackToCourse: "返回課程",
    courseProblemsBackToList: "返回課程題庫",
    courseProblemsNoPermission: "你沒有權限新增課程題目。",
    courseProblemCreateTitle: "新增課程題目",
    courseProblemCreateSubtitle: "建立這門課的專屬題目。",
    courseProblemEditTitle: "編輯課程題目",
    courseProblemEditSubtitle: "編輯題目 [{displayId}]",
    courseProblemFormCreate: "建立課程題目",
    courseProblemFormUpdate: "更新課程題目",
    courseProblemPublicLabel: "對外公開（會出現在公開題目列表）",
    courseProblemPublicAiHint: "公開題目預設允許 AI 助教，僅可在作業中覆蓋。",
    courseProblemQuotaInvalid: "提交次數上限需為 -1 或非負整數。",
    paginationPrev: "上一頁",
    paginationNext: "下一頁",
    paginationPage: "{current} / {total}",
    paginationInfo: "第 {page} 頁，共 {totalPages} 頁（總共 {total} 筆）",
    problemFormCourseAssignTitle: "可見課程",
    problemFormCourseAssignDescription: "不公開題目只會顯示給這些課程的成員。",
    problemFormCourseAssignEmpty: "你目前沒有擔任教師或助教的課程。",
    problemFormCourseAssignHelp: "僅能選擇你擔任教師或助教的課程。",
    problemFormCourseAssignPartialFailed: "題目已建立，但有課程加入失敗。請到課程題目頁面重新加入。",
    problemFormCourseAssignRequired: "請至少選擇一門課程，以便收錄此題目。",
    // Problems
    problemsTitle: "題目列表",
    problemsSubtitle: "",
    problemsPublicHint: "查看所有公開題目。",
    problemsTabsPublic: "公開題目",
    problemsTabsCourses: "課程題目",
    problemsTabsMine: "我的題目",
    problemsLoginRequired: "請先登入以查看此內容。",
    problemsNoCourses: "你尚未加入任何課程。",
    problemsCourseSelect: "選擇課程",
    problemsCourseEmpty: "此課程尚未收錄任何題目。",
    problemsNewProblem: "新增題目",
    problemsSectionCourse: "課程題目",
    problemsSectionPublic: "公開題目",
    problemsViewMine: "我的題目",
    problemsCourseFilterAll: "全部課程",
    problemsMineTitle: "我建立的公開題目",
    problemsMineSubtitle: "管理你建立的公開題目",
    problemsMineBackToList: "返回題庫",
    problemsMineEmpty: "尚未建立任何題目",
    problemsMineEmptyHint: "點擊「新增公開題目」開始建立你的第一個題目",
    problemsEdit: "編輯",
    problemsFilterDifficulty: "難度",
    problemsDifficultyAll: "全部難度",
    problemsDifficultyUnknown: "未分類",
    problemsDifficultyEasy: "簡單",
    problemsDifficultyMedium: "中等",
    problemsDifficultyHard: "困難",
    problemsSearchPlaceholder: "搜尋題號、名稱或標籤",
    problemsCreateButton: "新增題目",
    problemsTableId: "題號",
    problemsTableTitle: "題名",
    problemsTableCourses: "課程",
    problemsTableDifficulty: "難度",
    problemsTableCreatedAt: "加入時間",
    problemsTableCompleted: "已完成",
    problemsTableTags: "標籤",
    problemsFilterTags: "篩選標籤",
    problemsClearTags: "清除篩選",
    problemFormTags: "標籤",
    problemFormTagsPlaceholder: "陣列, DP, 迴圈",
    problemFormTagsHint: "以逗號分隔多個標籤，例如：陣列, DP, 字串處理",
    problemsEmpty: "沒有符合條件的題目",
    problemsEmptyHint: "調整篩選條件或新增題目。",
    problemsClearFilters: "清除所有篩選",
    problemsTotalCount: "共 {count} 題",
    problemsError: "載入題目時發生錯誤",
    problemBackToList: "返回題目列表",
    problemBackToDetail: "返回題目詳情",
    problemOwner: "建立者",
    problemEditButton: "編輯",
    problemDeleteButton: "刪除",
    problemDeleting: "刪除中...",
    problemDeleteConfirm: "確定要刪除這道題目嗎？此操作無法復原。",
    problemDeleteError: "刪除題目失敗，請稍後再試。",
    problemDescription: "題目描述",
    problemInput: "輸入說明",
    problemOutput: "輸出說明",
    problemHint: "提示",
    problemSampleIO: "範例輸入/輸出",
    problemSampleInput: "範例輸入",
    problemSampleOutput: "範例輸出",
    problemCreateTitle: "新增公開題目",
    problemCreateSubtitle: "填寫以下資訊來建立一道公開題目。",
    problemCreateLoginRequired: "請先登入後再新增題目。",
    problemEditTitle: "編輯題目",
    problemEditSubtitle: "編輯題目 [{displayId}]",
    problemEditLoginRequired: "請先登入後再編輯題目。",
    problemEditNoPermission: "你沒有權限編輯此題目。",
    problemVisibilityPublic: "公開",
    problemVisibilityUnlisted: "不公開 (僅限特定課程)",
    problemVisibilityPrivate: "私人 (只有自己)",
    problemVisibilityCourseOnly: "課程限定", // deprecated
    problemVisibilityHidden: "隱藏", // deprecated
    problemFormTitle: "題名",
    problemFormTitlePlaceholder: "例如：A+B Problem",
    problemFormTitleRequired: "請輸入題目標題",
    problemFormVisibility: "可見性",
    problemFormDifficulty: "難度",
    problemFormLanguages: "使用的語言",
    problemFormLanguagesRequired: "請至少選擇一種語言",
    problemFormQuota: "提交次數上限",
    problemFormQuotaHint: "-1 表示不限制",
    problemFormCanViewStdout: "允許查看標準輸出",
    problemFormDescription: "題目描述",
    problemFormDescriptionPlaceholder: "描述題目的情境與要求",
    problemFormDescriptionRequired: "請輸入題目描述",
    problemFormInput: "輸入說明",
    problemFormInputPlaceholder: "說明輸入格式",
    problemFormOutput: "輸出說明",
    problemFormOutputPlaceholder: "說明輸出格式",
    problemFormHint: "提示（選填）",
    problemFormHintPlaceholder: "給予解題方向或注意事項",
    problemFormSampleCases: "範例輸入/輸出",
    problemFormAddSampleCase: "新增範例",
    problemFormRemove: "移除",
    problemFormCancel: "取消",
    problemFormSubmitting: "處理中...",
    problemFormCreate: "建立公開題目",
    problemFormUpdate: "更新題目",
    problemFormError: "操作失敗，請稍後再試。",
    problemFormAiTitle: "AI 助教設定",
    problemFormAiHint: "設定此題是否啟用 AI 助教與可讀範圍。",
    problemFormAiEnabled: "啟用 AI 助教",
    problemFormAiScopeProblem: "可讀題目敘述",
    problemFormAiScopeCode: "可讀學生程式碼",
    problemFormAiScopeCompile: "可讀編譯錯誤",
    problemFormAiScopeJudge: "可讀測試/提交摘要",
    // Translation
    problemFormAutoTranslate: "AI 自動翻譯（儲存後背景執行）",
    problemFormAutoTranslateHint: "勾選後，儲存時將自動翻譯題目內容為另一種語言",
    problemTranslationPending: "翻譯中...",
    problemTranslationCompleted: "翻譯完成",
    problemTranslationFailed: "翻譯失敗",
    adminAiTitle: "AI 功能設定",
    adminAiSubtitle: "為每個 AI 功能選擇要使用的模型與參數。",
    adminAiGlobalSettings: "全域設定",
    adminAiActiveProvider: "目前啟用的供應商",
    adminAiActiveProviderHint: "選擇要使用的 AI 服務供應商。系統會使用對應的模型名稱進行回應。",
    adminAiForceDisable: "強制暫停所有 AI 功能",
    adminAiForceDisableHint: "啟用後將暫停所有 AI 功能的 API 呼叫",
    adminAiProvider: "供應商",
    adminAiModel: "模型名稱",
    adminAiReasoningEffort: "推理強度",
    adminAiOpenAiModel: "OpenAI 模型名稱",
    adminAiGeminiModel: "Gemini 模型名稱",
    adminAiMaxTokens: "最大輸出 token",
    adminAiTemperature: "溫度 (temperature)",
    adminAiEnabled: "啟用",
    adminAiDisabled: "停用",
    adminAiSave: "儲存設定",
    adminAiSaving: "儲存中...",
    adminAiSaved: "已更新 AI 設定。",
    adminAiError: "更新失敗，請稍後再試。",
    adminAiLoading: "載入中…",
    adminAiBack: "返回管理首頁",
    aiAssistantButton: "問 AI 助教",
    aiAssistantTitle: "AI 助教",
    aiAssistantHint: "只提供提示與引導，不會給完整答案。",
    aiAssistantClose: "關閉",
    aiAssistantScopeTitle: "AI 可讀資訊",
    aiAssistantScopeEmpty: "未開放任何額外資訊",
    aiAssistantScopeProblem: "題目敘述",
    aiAssistantScopeCode: "學生程式碼",
    aiAssistantScopeCompile: "編譯錯誤",
    aiAssistantScopeJudge: "測試摘要",
    aiAssistantAttachSubmission: "附上最新提交",
    aiAssistantEmpty: "輸入你的問題，AI 會先釐清卡點再給提示。",
    aiAssistantEmptyGeneral: "有任何程式問題都可以問我！我可以解答程式語言、演算法、資料結構等相關問題。",
    aiAssistantPlaceholder: "描述你的卡點或貼出錯誤訊息…",
    aiAssistantPlaceholderGeneral: "問我任何程式相關問題…",
    aiAssistantSend: "送出",
    aiAssistantSending: "回覆中",
    aiAssistantHintProblem: "正在協助題目 {displayId}",
    aiAssistantLoginRequired: "登入後即可與 AI 助教對話",
    aiAssistantLoginButton: "登入",
    aiAssistantError: "目前無法取得回覆，請稍後再試。",
    aiAssistantErrorGeneric: "系統暫時無法處理，請稍後再試。",
    aiAssistantErrorProviderNotReady: "AI 服務尚未完成設定，請稍後再試。",
    aiAssistantErrorProviderAuth: "AI 服務授權失敗，請稍後再試。",
    aiAssistantErrorRateLimit: "使用次數已達上限，請稍後再試。",
    aiAssistantErrorDisabled: "此題目前未開放 AI 助教。",
    aiAssistantErrorConversation: "對話已失效，請重新開啟聊天。",
    aiAssistantErrorEmpty: "請先輸入你的問題。",
    aiAssistantNewChat: "開啟新對話",
    aiAssistantNewChatConfirm: "確定要開啟新對話嗎？目前的對話紀錄將被清除。",
    // AI Problem Creator
    aiProblemCreatorButton: "AI 題目創建",
    aiProblemCreatorTitle: "AI 題目創建",
    aiProblemCreatorSubtitle: "透過 AI 對話創建程式設計題目",
    aiProblemCreatorDescribeIdea: "描述你的題目想法",
    aiProblemCreatorReviewProblem: "預覽生成的題目",
    aiProblemCreatorEditDetails: "編輯題目詳情",
    aiProblemCreatorGeneratingTestdata: "正在生成測試資料...",
    aiProblemCreatorReadyToPublish: "準備發布",
    aiProblemCreatorPublishing: "發布中...",
    aiProblemCreatorPublished: "題目已發布！",
    aiProblemCreatorViewProblem: "查看題目",
    aiProblemCreatorClose: "關閉",
    aiProblemCreatorStartCreating: "開始創建",
    aiProblemCreatorLoginToUse: "登入使用",
    aiProblemCreatorPlaceholder: "描述你想要的程式設計題目...",
    aiProblemCreatorQuickTemplates: "快速範本",
    aiProblemCreatorMath: "數學計算",
    aiProblemCreatorString: "字串處理",
    aiProblemCreatorDataStructure: "資料結構",
    aiProblemCreatorAlgorithm: "演算法",
    aiProblemCreatorProblemReady: "題目已準備好！",
    aiProblemCreatorGoToPreview: "前往預覽",
    aiProblemCreatorSending: "傳送中...",
    aiProblemCreatorError: "發生錯誤",
    // AI Problem Creator - Additional
    aiProblemCreatorRestoringProgress: "正在恢復生成進度...",
    aiProblemCreatorAiGenerating: "AI 正在生成中，請稍候...",
    aiProblemCreatorTimeout: "生成超時，請重試",
    aiProblemCreatorStartingAi: "正在啟動 AI...",
    aiProblemCreatorAnalyzing: "AI 正在分析您的需求...",
    aiProblemCreatorUnderstanding: "理解題目概念中...",
    aiProblemCreatorDesigning: "設計題目結構中...",
    aiProblemCreatorGeneratingSolution: "生成解答與測資中...",
    aiProblemCreatorGettingResult: "正在取得生成結果...",
    aiProblemCreatorEditProblem: "編輯題目",
    aiProblemCreatorAiCompleted: "AI 生成完成",
    aiProblemCreatorEditContent: "修改題目內容",
    aiProblemCreatorPreviewAndPublish: "預覽並發布題目",
    aiProblemCreatorPublishingProblem: "正在發布題目...",
    aiProblemCreatorPublishSuccess: "題目已發布！",
    aiProblemCreatorCreateNew: "創建新題目",
    aiProblemCreatorTestCasesCount: "{count} 個測資",
    aiProblemCreatorSampleCasesCount: "{count} 個範例",
    aiProblemCreatorDescription: "題目描述",
    aiProblemCreatorInputFormat: "輸入格式",
    aiProblemCreatorOutputFormat: "輸出格式",
    aiProblemCreatorSampleTestcases: "範例測資",
    aiProblemCreatorConstraints: "限制",
    aiProblemCreatorTimeLimit: "時間限制：{ms} ms",
    aiProblemCreatorMemoryLimit: "記憶體限制：{mb} MB",
    aiProblemCreatorRestart: "重新開始",
    aiProblemCreatorPublishProblem: "發布題目",
    aiProblemCreatorAiHelpText: "AI 會自動生成完整題目與測資",
    aiProblemCreatorPleaseWait: "請稍候",
    aiProblemCreatorCooldownRunning: "上一次生成可能仍在進行中，或已完成但需要冷卻時間。",
    aiProblemCreatorCooldownAbuse: "為避免濫用，請等待冷卻時間結束。",
    aiProblemCreatorCooldownEnd: "冷卻結束後即可再次使用",
    aiProblemCreatorTestdataCooldown: "請等待 {seconds} 秒後再試",
    aiProblemCreatorGenerationFailed: "生成失敗",
    aiProblemCreatorRetry: "重試",
    aiProblemCreatorAiCannotGenerate: "AI 無法生成題目。請嘗試更詳細的描述，例如：「設計一個簡單的 Greedy 演算法題目，關於活動選擇問題」",
    aiProblemCreatorLoginRequired: "請先登入才能使用 AI 生成功能",
    aiProblemCreatorInput: "輸入",
    aiProblemCreatorOutput: "輸出",
    // AI Problem Creator - Editor
    aiProblemCreatorEditorTitle: "標題",
    aiProblemCreatorEditorDifficulty: "難度",
    aiProblemCreatorEditorTags: "標籤（以逗號分隔）",
    aiProblemCreatorEditorTagsPlaceholder: "陣列, 排序, ...",
    aiProblemCreatorEditorTimeLimitMs: "時間限制 (ms)",
    aiProblemCreatorEditorMemoryLimitMb: "記憶體限制 (MB)",
    aiProblemCreatorEditorAddSample: "+ 新增範例",
    aiProblemCreatorEditorRemove: "移除",
    aiProblemCreatorEditorSample: "範例",
    aiProblemCreatorEditorCancel: "取消",
    aiProblemCreatorEditorSaveChanges: "儲存變更",
    // AI Problem Creator - Modal & Chat
    aiProblemCreatorModalTitle: "AI 題目創建",
    aiProblemCreatorModalDescribeIdea: "描述你的題目想法",
    aiProblemCreatorModalReviewProblem: "預覽生成的題目",
    aiProblemCreatorModalEditDetails: "編輯題目詳情",
    aiProblemCreatorModalGeneratingTestdata: "正在生成測試資料...",
    aiProblemCreatorModalReadyToPublish: "準備發布",
    aiProblemCreatorModalPublishing: "發布中...",
    aiProblemCreatorModalPublished: "題目已發布！",
    aiProblemCreatorModalPublishingProblem: "正在發布題目...",
    aiProblemCreatorModalProblemPublished: "題目已發布！",
    aiProblemCreatorModalProblemAvailable: "你的題目「{title}」現已上線。",
    aiProblemCreatorModalViewProblem: "查看題目",
    aiProblemCreatorModalClose: "關閉",
    // AI Problem Creator - Chat Interface
    aiProblemCreatorChatStartTitle: "開始創建你的題目",
    aiProblemCreatorChatStartDesc: "描述你想創建的題目。我會幫助你定義題目說明、輸入輸出格式、範例，並生成測試資料。",
    aiProblemCreatorChatTemplateArraySum: "陣列加總",
    aiProblemCreatorChatTemplateArraySumDesc: "基礎陣列操作",
    aiProblemCreatorChatTemplatePalindrome: "迴文檢測",
    aiProblemCreatorChatTemplatePalindromeDesc: "字串操作",
    aiProblemCreatorChatTemplateBinarySearch: "二分搜尋",
    aiProblemCreatorChatTemplateBinarySearchDesc: "演算法練習",
    aiProblemCreatorChatTemplatePrime: "質數判斷",
    aiProblemCreatorChatTemplatePrimeDesc: "數論練習",
    aiProblemCreatorChatProblemReady: "題目已準備好！",
    aiProblemCreatorChatProblemReadyDesc: "點擊預覽並發布你的題目。",
    aiProblemCreatorChatPreviewProblem: "預覽題目",
    aiProblemCreatorChatPlaceholder: "描述你想創建的題目...",
    aiProblemCreatorChatHint: "按 Enter 送出，Shift+Enter 換行",
    // AI Problem Creator - Preview
    aiProblemCreatorPreviewEdit: "編輯",
    aiProblemCreatorPreviewSolutionCode: "解答程式碼",
    aiProblemCreatorPreviewSuggestedTestInputs: "建議測試輸入",
    aiProblemCreatorPreviewSuggestedTestInputsDesc: "這些輸入將用於生成測試資料以供評測。",
    aiProblemCreatorPreviewBackToChat: "返回聊天",
    aiProblemCreatorPreviewGenerateTestData: "生成測試資料",
    aiProblemCreatorPreviewRequiredHint: "需要解答程式碼和測試輸入。請返回聊天並請 AI 生成它們。",
    // AI Problem Creator - Testdata Progress
    aiProblemCreatorTestdataGenerating: "正在生成測試資料",
    aiProblemCreatorTestdataGeneratingDesc: "正在執行解答程式碼以生成每個測試輸入的預期輸出。這可能需要一些時間...",
    aiProblemCreatorTestdataProcessing: "處理中...",
    aiProblemCreatorTestdataGenerated: "測試資料已生成",
    aiProblemCreatorTestdataPassed: "{count} 通過",
    aiProblemCreatorTestdataErrors: "{count} 錯誤",
    aiProblemCreatorTestdataTimeouts: "{count} 逾時",
    aiProblemCreatorTestdataSampleCase: "範例測資",
    aiProblemCreatorTestdataTestCase: "測試資料",
    aiProblemCreatorTestdataExpectedOutput: "預期輸出",
    aiProblemCreatorTestdataEmptyOutputError: "解答程式碼執行成功但未產生輸出。請檢查解答程式碼是否正確處理所有測試輸入。",
    aiProblemCreatorTestdataDockerNotAvailable: "Docker 沙盒執行環境不可用。請確保 Docker 正在運行且 noj4-sandbox 映像已安裝。",
    // AI Problem Creator - Publish Confirmation
    aiProblemCreatorPublishReady: "準備發布",
    aiProblemCreatorPublishProblemDetails: "題目詳情",
    aiProblemCreatorPublishTestData: "測試資料",
    aiProblemCreatorPublishHiddenCases: "隱藏測資",
    aiProblemCreatorPublishTotal: "總計",
    aiProblemCreatorPublishStatus: "狀態",
    aiProblemCreatorPublishAllPassed: "全部通過",
    aiProblemCreatorPublishSomeIssues: "有些問題",
    aiProblemCreatorPublishDescPreview: "題目描述預覽",
    aiProblemCreatorPublishBeforePublishing: "發布前須知",
    aiProblemCreatorPublishVisibilityNotice: "發布後所有用戶都可以看到此題目。請確認所有細節正確後再繼續。",
    aiProblemCreatorPublishBack: "返回",
    aiProblemCreatorPublishAutoTranslate: "AI 自動翻譯",
    aiProblemCreatorPublishAutoTranslateDesc: "發布後自動將題目翻譯成另一種語言（中文 ↔ 英文）",
    // AI Testdata Generator
    aiTestdataGeneratorTitle: "AI 測資生成器",
    aiTestdataGeneratorSubtitle: "根據題目描述自動生成測試資料",
    aiTestdataGeneratorNumCases: "生成測資數量",
    aiTestdataGeneratorGenerate: "開始生成",
    aiTestdataGeneratorGenerating: "正在生成測資...",
    aiTestdataGeneratorSuccess: "測資生成完成！",
    aiTestdataGeneratorFailed: "生成失敗",
    aiTestdataGeneratorUseTestdata: "使用此測資",
    aiTestdataGeneratorRetry: "重試",
    aiTestdataGeneratorButton: "AI 生成測資",
    aiTestdataReady: "AI 測資已準備就緒",
    aiTestdataCount: "{count} 組測資",
    // Homepage
    homepageTagline: "用 AI 輕鬆創建程式設計題目，智能生成測資與解答",
    homepageFeatureAiCreator: "AI 題目創建",
    homepageFeatureAiCreatorDesc: "透過自然語言對話描述題目概念，AI 自動生成完整的程式設計題目、範例測資與標準答案。",
    homepageFeatureAiAssistant: "AI 程式助教",
    homepageFeatureAiAssistantDesc: "遇到解題困難？AI 助教隨時提供解題提示、觀念講解，幫助你突破學習瓶頸。",
    homepageFeatureJudge: "即時判題系統",
    homepageFeatureJudgeDesc: "安全隔離的 Docker 沙盒環境，支援多種程式語言，毫秒級回饋你的程式執行結果。",
    homepageFeatureCourse: "課程管理系統",
    homepageFeatureCourseDesc: "教師可輕鬆建立課程、發布作業、追蹤學生學習進度，打造完整的程式教學環境。",
    homepageSectionTitle: "為程式教學而生的平台",
    homepageSectionSubtitle: "結合 AI 智能技術與現代化判題系統，提供完整的程式設計教學與練習環境",
    homepageCtaTitle: "準備好開始了嗎？",
    homepageCtaSubtitle: "無論你是想要練習程式設計的學生，還是需要出題的教師，NOJ 都能滿足你的需求。",
    homepageCtaBrowseProblems: "瀏覽題目",
    homepageCtaViewCourses: "查看課程",
    homepageCtaRegister: "免費註冊",
    homepageCtaLogin: "登入帳號",
    homepageCtaFree: "完全免費",
    homepageCtaMultiLang: "支援多種語言",
    homepageCtaAiAssist: "AI 智能輔助",
    // Profile
    profileTitle: "個人檔案",
    profileEditTitle: "編輯個人檔案",
    profileJoinedAt: "加入時間",
    profileEditButton: "編輯個人檔案",
    profileNicknameLabel: "暱稱",
    profileNicknamePlaceholder: "輸入您的暱稱",
    profileBioLabel: "個人簡介",
    profileBioPlaceholder: "介紹一下自己",
    profileAvatarLabel: "頭像",
    profileAvatarUpload: "上傳頭像",
    profileAvatarChange: "更換頭像",
    profileAvatarRemove: "移除頭像",
    profileAvatarCancel: "取消選擇",
    profileAvatarDragHint: "點擊或拖曳圖片至此處。",
    profileAvatarSizeHint: "支援 JPG、PNG、GIF、WebP，最大 2MB。",
    profileAvatarInvalidType: "不支援的圖片格式，請上傳 JPG、PNG、GIF 或 WebP。",
    profileAvatarTooLarge: "檔案大小超過 2MB，請選擇較小的圖片。",
    profileAvatarSelectedFile: "已選擇",
    profileSaveButton: "儲存變更",
    profileSaving: "儲存中...",
    profileCancelButton: "取消",
    profileUpdateSuccess: "個人檔案更新成功",
    profileUpdateError: "更新個人檔案失敗",
    profileLoadError: "載入個人檔案時發生錯誤",
    profileUserNotFound: "找不到此使用者",
    profileLoading: "載入中...",
    profileStatsTitle: "解題統計",
    profileStatsTotalSubmissions: "總提交數",
    profileStatsAcCount: "AC 數",
    profileStatsAcceptanceRate: "通過率",
    profileRecentSubmissionsTitle: "最近提交",
    profileRecentSubmissionsEmpty: "尚無提交紀錄",
    profileRecentSubmissionsViewAll: "查看全部提交",
    profileApiTokensButton: "API 存取權杖",
    profileTimeMinutesAgo: "{n} 分鐘前",
    profileTimeHoursAgo: "{n} 小時前",
    profileTimeDaysAgo: "{n} 天前",
    profileUserNotFoundDescription: "您尋找的使用者不存在。",
    profileStartSolvingHint: "開始解題來查看您的提交紀錄！",
    // Submission
    submissionStatusPending: "等待評測",
    submissionStatusRunning: "評測中",
    submissionStatusAC: "答案正確",
    submissionStatusPA: "部分通過",
    submissionStatusWA: "答案錯誤",
    submissionStatusCE: "編譯錯誤",
    submissionStatusTLE: "執行超時",
    submissionStatusMLE: "記憶體超限",
    submissionStatusRE: "執行錯誤",
    submissionStatusOLE: "輸出超限",
    submissionStatusSA: "靜態分析失敗",
    submissionStatusJudgeError: "評測系統錯誤",
    submissionScore: "分數",
    submissionLanguageC: "C",
    submissionLanguageCPP: "C++",
    submissionLanguageJava: "Java",
    submissionLanguagePython: "Python",
    submissionLanguageAuto: "自動偵測",
    submissionSubmit: "提交程式碼",
    submissionSubmitting: "提交中...",
    submissionSuccess: "提交成功，正在評測...",
    submissionErrorQuotaExceeded: "已達提交次數上限",
    submissionErrorLanguageNotAllowed: "此題目不允許使用該程式語言",
    submissionErrorHomeworkNotStarted: "作業尚未開始",
    submissionErrorHomeworkEnded: "作業已截止",
    submissionErrorNotCourseMember: "你不是課程成員",
    submissionErrorPermissionDenied: "權限不足",
    submissionListTitle: "提交紀錄",
    submissionDetailTitle: "提交詳情",
    submissionCode: "程式碼",
    submissionResult: "結果",
    submissionTime: "時間",
    submissionMemory: "記憶體",
    submissionCases: "測試案例",
    // Test (Code Testing)
    testButton: "測試",
    testButtonTesting: "測試中...",
    testCustomInputShow: "› 使用自訂輸入",
    testCustomInputHide: "‹ 隱藏自訂輸入",
    testCustomInputLabel: "自訂輸入 (stdin)",
    testCustomInputPlaceholder: "在此輸入測試資料...",
    testResultsTitle: "測試結果",
    testResultCompileError: "編譯錯誤",
    testResultOutput: "輸出：",
    testResultError: "錯誤：",
    testResultPassed: "通過",
    testResultFailed: "失敗",
    testErrorCodeRequired: "請輸入程式碼",
    testErrorGeneric: "測試失敗",
    testdataUploadTitle: "上傳測資",
    testdataUploadButton: "選擇 ZIP 檔案",
    testdataUploadSuccess: "上傳成功！版本 v{version}，共 {caseCount} 筆測資",
    testdataUploadError: "測資上傳失敗",
    testdataVersionsTitle: "測資版本",
    testdataVersionLabel: "版本 {version}",
    testdataActiveLabel: "啟用中",
    testdataActivateButton: "設為啟用",
    testdataActivateSuccess: "測資版本已啟用",
    testdataCaseCount: "測資數",
    testdataUploadedBy: "上傳者",
    testdataUploadedAt: "上傳時間",
    testdataErrorZipTooLarge: "ZIP 檔案過大（最大 100MB）",
    testdataErrorInvalidZip: "無效的 ZIP 檔案",
    testdataErrorManifestNotFound: "找不到 manifest.json",
    testdataErrorManifestInvalid: "manifest.json 格式錯誤",
    testdataErrorPathTraversal: "偵測到路徑穿越攻擊",
    testdataErrorFileNotFound: "測資檔案不存在",
    testdataErrorForbidden: "您沒有權限執行此操作",
    testdataErrorVersionNotFound: "找不到指定的測資版本",
    testdataTitle: "測資",
    testdataActiveVersion: "啟用版本",
    testdataNoActive: "尚未設定啟用版本",
    testdataCases: "測試案例",
    testdataUploading: "上傳中...",
    testdataUpload: "上傳測資",
    testdataEmpty: "尚無測資",
    testdataActive: "啟用中",
    testdataActivating: "啟用中...",
    testdataSetActive: "設為啟用",
    testdataHelp: "上傳包含 manifest.json 的 ZIP 檔案",
    inputMethodWarning: "⚠️ 目前是中文輸入法，請切換至英文輸入",
    // Subtask and Testdata uploader
    subtaskTitle: "子任務配置",
    subtaskAdd: "新增子任務",
    subtaskRemove: "移除",
    subtaskCaseCount: "測資數",
    subtaskPoints: "配分",
    subtaskTimeLimit: "時限 (ms)",
    subtaskMemoryLimit: "記憶體 (KB)",
    subtaskSample: "範例",
    subtaskTotalCases: "總測資數: {count}",
    subtaskTotalPoints: "總分: {points}",
    subtaskExpectedFiles: "預期檔案",
    subtaskFormatHelp: "檔案格式：sstt.in / sstt.out（ss = 子任務編號，tt = 測資編號，從 00 開始）",
    subtaskUploadHint: "上傳包含測資的 ZIP 檔案，檔名格式為 sstt.in / sstt.out",
    subtaskDefaultTimeLimit: "預設時限 (ms)",
    subtaskDefaultMemoryLimit: "預設記憶體 (KB)",
    testdataFiles: "個檔案",
    testdataVersions: "測資版本",
    testdataNoVersions: "尚無測資版本",
    testdataVersion: "版本",
    testdataDownload: "下載",
    testdataActivate: "設為啟用",
    testdataMustBeZip: "請上傳 ZIP 檔案",
    testdataCreateHint: "設定測資結構並上傳測資檔案。建立題目後也可以在編輯頁面上傳。",
    testdataOptional: "測資為選填，可稍後於編輯頁面上傳",
    testdataDropOrClick: "拖曳檔案到此處，或點擊選擇檔案",
    testdataZipFormat: "支援 ZIP 格式，檔名格式：sstt.in / sstt.out",
    testdataParsing: "解析中...",
    testdataNoSubtasksDetected: "未偵測到子任務（請確認檔名格式為 sstt.in / sstt.out）",
    testdataParseError: "解析 ZIP 檔案失敗",
    testdataDetected: "偵測到 {subtasks} 個子任務，共 {cases} 筆測資，已自動配分",
    testdataPointsUnit: "分",
    testdataShouldBe100: "總分應為 100",
    testdataAdvancedSettings: "進階設定（時間/記憶體限制）",
    testdataPerSubtaskOverrides: "個別子任務覆寫（留空使用預設值）",
    testdataHelpButton: "檔案格式說明",
    testdataHelpTitle: "測資檔案格式說明",
    testdataHelpIntro: "測資檔案需打包成 ZIP 格式上傳，檔案命名需遵循以下規則：",
    testdataHelpFormat: "檔名格式",
    testdataHelpFormatDesc: "sstt.in 和 sstt.out，其中 ss 為子任務編號（00-99），tt 為測資編號（00-99）。",
    testdataHelpExample: "範例結構",
    testdataHelpExampleDesc: "假設有 2 個子任務，Subtask 0 有 2 筆範例測資，Subtask 1 有 3 筆正式測資：",
    testdataHelpSubtask0: "Subtask 0（範例，0 分）：0000.in, 0000.out, 0001.in, 0001.out",
    testdataHelpSubtask1: "Subtask 1（100 分）：0100.in, 0100.out, 0101.in, 0101.out, 0102.in, 0102.out",
    testdataHelpNote: "注意：Subtask 0 固定為範例測資（配分 0 分），會顯示在題目頁面供學生參考。",
    testdataHelpClose: "關閉",
    // Copycat (Plagiarism Detection)
    copycatTitle: "抄襲偵測",
    copycatBackToProblems: "返回題目列表",
    copycatProblemLabel: "題目",
    copycatCourseLabel: "課程",
    copycatLoginRequired: "請登入以查看此頁面。",
    copycatLoginButton: "登入",
    copycatCourseNotFound: "找不到課程。",
    copycatNoPermission: "您沒有權限查看此頁面。",
    copycatNoPermissionHint: "只有助教和教師可以使用抄襲偵測功能。",
    copycatNoReport: "目前沒有此題目的抄襲偵測報告。點擊下方按鈕產生報告。",
    copycatNoReportHint: "分析可能需要幾分鐘時間。",
    copycatGenerateButton: "產生報告",
    copycatGenerating: "產生中...",
    copycatPreviousFailed: "上次分析失敗：",
    copycatRetryHint: "點擊下方按鈕重試分析。",
    copycatPending: "排隊等待中...",
    copycatRunning: "正在分析提交...",
    copycatAutoRefreshHint: "分析可能需要幾分鐘。頁面將自動更新。",
    copycatSummaryLanguages: "程式語言",
    copycatSummaryAvgSimilarity: "平均相似度",
    copycatSummaryMaxSimilarity: "最高相似度",
    copycatSummarySuspiciousPairs: "可疑配對數",
    copycatReportStudents: "學生人數",
    copycatReportSubmissions: "提交數量",
    copycatReportGenerated: "產生時間",
    copycatReportRequestedBy: "請求者",
    copycatFilterMinSimilarity: "最低相似度：",
    copycatFilterLanguage: "程式語言：",
    copycatFilterAll: "全部",
    copycatTableStudentA: "學生 A",
    copycatTableStudentB: "學生 B",
    copycatTableLanguage: "語言",
    copycatTableSimilarity: "相似度",
    copycatTableRisk: "風險",
    copycatRiskHigh: "高風險",
    copycatRiskMedium: "中風險",
    copycatLoadingPairs: "載入配對中...",
    copycatNoPairs: "目前篩選條件下沒有配對。",
    copycatPaginationPrev: "上一頁",
    copycatPaginationNext: "下一頁",
    copycatPaginationPage: "第 {current} 頁，共 {total} 頁",
    copycatDeleteReport: "刪除報告",
    copycatRegenerateReport: "重新產生報告",
    copycatButtonLabel: "抄襲偵測",
    copycatButtonTitle: "抄襲偵測",
    copycatErrorNoSubmissions: "此題目尚無足夠的提交紀錄可供分析。需要至少 2 位不同學生的提交。",
    copycatErrorAnalysisFailed: "分析過程發生錯誤，請稍後再試。",
    copycatCompareTitle: "程式碼對比",
    copycatCompareClose: "關閉",
    copycatCompareLoading: "載入程式碼中...",
    copycatCompareClickHint: "點擊配對以查看程式碼對比",
    upload: "上傳",
    uploading: "上傳中...",
    loading: "載入中...",
    downloading: "下載中...",
    activating: "啟用中...",
    editorFontSize: "字型大小",
    // Email Domain Management
    emailDomainsTitle: "Email 網域管理",
    emailDomainsSubtitle: "管理使用者註冊時允許或封鎖的 Email 網域。",
    emailDomainsBackToAdmin: "返回管理後台",
    emailDomainsAllowedCount: "允許的網域",
    emailDomainsBlockedCount: "自訂封鎖網域",
    emailDomainsDisposableCount: "一次性網域（檔案）",
    emailDomainsHowItWorksTitle: "Email 驗證規則說明：",
    emailDomainsHowItWorks1: "首先檢查「允許清單」，若網域符合則允許註冊。",
    emailDomainsHowItWorks2: "支援萬用字元模式，例如 *.edu.tw 可匹配所有子網域（如 ntnu.edu.tw）。",
    emailDomainsHowItWorks3: "若不在允許清單中，則檢查「封鎖清單」（自訂 + 一次性網域檔案）。",
    emailDomainsHowItWorks4: "若不在任何允許清單中，註冊將被拒絕（白名單模式）。",
    emailDomainsTabAllowed: "允許的網域",
    emailDomainsTabBlocked: "封鎖的網域",
    emailDomainsAddAllowed: "新增允許的網域",
    emailDomainsAddBlocked: "新增封鎖的網域",
    emailDomainsDomainPlaceholder: "例如：gmail.com 或 *.edu.tw",
    emailDomainsNotePlaceholder: "備註（選填）",
    emailDomainsAdd: "新增",
    emailDomainsColDomain: "網域",
    emailDomainsColNote: "備註",
    emailDomainsColEnabled: "啟用",
    emailDomainsColActions: "操作",
    emailDomainsEmpty: "目前沒有網域。請在上方新增。",
    emailDomainsEdit: "編輯",
    emailDomainsDelete: "刪除",
    emailDomainsSave: "儲存",
    emailDomainsCancel: "取消",
    emailDomainsDeleteConfirm: "確定要刪除此網域嗎？",
    emailDomainsAddedSuccess: "網域已成功新增",
    emailDomainsUpdatedSuccess: "網域已成功更新",
    emailDomainsDeletedSuccess: "網域已成功刪除",
    emailDomainsShowing: "顯示 {count} 個，共 {total} 個網域",
    emailDomainsAccessDenied: "存取被拒絕。需要管理員權限。",
    // Bulk Create Users
    bulkCreateUsersTitle: "批量新增用戶",
    bulkCreateUsersSubtitle: "一次建立多個用戶帳號",
    bulkCreateUsersBackToAdmin: "返回管理後台",
    bulkCreateUsersAccessDenied: "存取被拒絕。需要管理員權限。",
    bulkCreateUsersEmailsLabel: "Email 地址",
    bulkCreateUsersEmailCount: "個 email",
    bulkCreateUsersEmailsPlaceholder: "每行輸入一個 email\nuser1@example.com\nuser2@example.com",
    bulkCreateUsersEmailsHint: "可用換行、逗號或分號分隔多個 email",
    bulkCreateUsersAutoVerifyLabel: "自動驗證 Email",
    bulkCreateUsersAutoVerifyHint: "跳過 email 驗證步驟",
    bulkCreateUsersPasswordModeLabel: "密碼設定",
    bulkCreateUsersPasswordRandom: "產生隨機密碼",
    bulkCreateUsersPasswordRandomHint: "每個用戶將收到一組隨機密碼的 email",
    bulkCreateUsersPasswordSpecified: "使用指定密碼",
    bulkCreateUsersPasswordSpecifiedHint: "所有用戶將使用相同的初始密碼",
    bulkCreateUsersPasswordLabel: "密碼",
    bulkCreateUsersPasswordPlaceholder: "輸入密碼（至少 8 個字元）",
    bulkCreateUsersConfirmPasswordLabel: "確認密碼",
    bulkCreateUsersConfirmPasswordPlaceholder: "再次輸入密碼",
    bulkCreateUsersCourseLabel: "加入課程（選填）",
    bulkCreateUsersNoCourse: "-- 不加入任何課程 --",
    bulkCreateUsersCourseHint: "用戶將以學生身分加入所選課程",
    bulkCreateUsersSubmit: "建立 {count} 個用戶",
    bulkCreateUsersSubmitting: "正在建立用戶...",
    bulkCreateUsersNoEmails: "請輸入至少一個有效的 email 地址",
    bulkCreateUsersPasswordTooShort: "密碼至少需要 8 個字元",
    bulkCreateUsersPasswordMismatch: "兩次輸入的密碼不一致",
    bulkCreateUsersSuccess: "成功建立 {count} 個用戶",
    bulkCreateUsersCreatedTitle: "成功建立",
    bulkCreateUsersSkippedTitle: "已略過",
    bulkCreateUsersErrorsTitle: "錯誤",
    bulkCreateUsersPasswordSent: "密碼已寄出",
    bulkCreateUsersReasonEmailExists: "email 已存在",
    // Blocked Submissions
    blockedSubmissionsTitle: "被封鎖的提交",
    blockedSubmissionsSubtitle: "被 AI 安全檢查封鎖的程式碼提交",
    blockedSubmissionsBackToAdmin: "返回管理後台",
    blockedSubmissionsAccessDenied: "存取被拒絕。需要管理員權限。",
    blockedSubmissionsThreatType: "威脅類型",
    blockedSubmissionsAllTypes: "全部類型",
    blockedSubmissionsClearFilters: "清除篩選",
    blockedSubmissionsTime: "時間",
    blockedSubmissionsUser: "用戶",
    blockedSubmissionsProblem: "題目",
    blockedSubmissionsType: "類型",
    blockedSubmissionsThreat: "威脅",
    blockedSubmissionsLanguage: "語言",
    blockedSubmissionsActions: "操作",
    blockedSubmissionsEmpty: "沒有被封鎖的提交",
    blockedSubmissionsViewDetail: "檢視",
    blockedSubmissionsShowing: "顯示",
    blockedSubmissionsOf: "共",
    blockedSubmissionsPrev: "上一頁",
    blockedSubmissionsNext: "下一頁",
    blockedSubmissionsDetailTitle: "封鎖詳情",
    blockedSubmissionsReason: "原因（給用戶看）",
    blockedSubmissionsAnalysis: "AI 分析（僅管理員）",
    blockedSubmissionsSourceCode: "原始碼",
    blockedSubmissionsClose: "關閉",
    // Demo Data Generator
    demoDataTitle: "Demo 資料生成器",
    demoDataDescription:
      "生成或清除測試用的 Demo 資料，包含用戶、題目、課程等。",
    demoDataBackToAdmin: "返回管理後台",
    demoDataForbidden: "存取被拒絕。需要管理員權限。",
    demoDataCurrentStatus: "目前狀態",
    demoDataAdminUser: "Admin 帳號",
    demoDataDemoUsers: "Demo 用戶",
    demoDataPublicProblems: "公開題目",
    demoDataCourses: "課程",
    demoDataGenerateButton: "生成 Demo 資料",
    demoDataGenerating: "生成中...",
    demoDataClearButton: "清除 Demo 資料",
    demoDataClearing: "清除中...",
    demoDataClearSuccess: "Demo 資料已成功清除",
    demoDataUsersDeleted: "已刪除用戶",
    demoDataProblemsDeleted: "已刪除題目",
    demoDataCoursesDeleted: "已刪除課程",
    demoDataGenerateSuccess: "Demo 資料已成功生成",
    demoDataUsersCreated: "已建立用戶",
    demoDataProblemsCreated: "已建立題目",
    demoDataCoursesCreated: "已建立課程",
    demoDataSkipped: "已略過",
    demoDataAdminUserCreated: "Admin 帳號已建立",
    demoDataDemoUsersCreated: "Demo 用戶已建立",
    demoDataPublicProblemsCreated: "公開題目",
    demoDataUsername: "用戶名",
    demoDataEmail: "Email",
    demoDataPassword: "密碼",
    demoDataPasswordWarning: "這些密碼只會顯示一次，請立即儲存。",
    demoDataExists: "已存在",
    demoDataProblems: "題目",
    demoDataMembers: "成員",
    demoDataHomeworks: "作業",
    demoDataAnnouncements: "公告",
    demoDataConfirmGenerate: "確認生成 Demo 資料",
    demoDataConfirmGenerateMessage:
      "這將會建立 Demo 用戶、題目、課程等資料。已存在的資料將會被略過。確定要繼續嗎？",
    demoDataConfirmClear: "確認清除 Demo 資料",
    demoDataConfirmClearMessage:
      "這將會永久刪除所有 Demo 用戶、題目和課程。此操作無法復原。確定要繼續嗎？",
    demoDataConfirmClearButton: "是的，全部清除",
    // Footer
    footerBrand: "NOJ Team4 線上程式解題平台",
    footerTermsOfService: "服務條款",
    footerPrivacyPolicy: "隱私權政策",
    footerCopyright: "© {year} NOJ Team4. 保留所有權利。",
    // Terms of Service page
    termsOfServiceTitle: "服務條款",
    termsOfServiceLastUpdated: "最後更新日期：2025 年 12 月 27 日",
    termsOfServiceContent: `歡迎使用 **NOJ Team4 線上程式解題平台**（以下簡稱「本平台」）。當您存取或使用本平台時，即表示您同意遵守本服務條款。請在使用前詳閱以下內容。

---

## 服務說明

本平台提供以下服務：

- **線上程式解題**：提供各類程式設計題目供使用者練習
- **課程管理**：支援教師建立課程、指派作業與考試
- **程式碼評測**：自動化測試與即時回饋系統
- **學習紀錄**：追蹤解題進度與提交歷史

---

## 使用者責任

使用本平台時，您同意：

1. **帳號管理**
   - 提供真實、正確的個人資訊進行註冊
   - 妥善保管您的帳號密碼，不與他人分享
   - 對於使用您帳號進行的所有活動負責

2. **行為規範**
   - 不利用本平台從事任何違法行為
   - 不上傳含有惡意程式、病毒或有害內容的程式碼
   - 不嘗試破壞、干擾或非法存取本平台系統
   - 尊重其他使用者，不進行騷擾或不當行為

3. **學術誠信**
   - 獨立完成作業與考試，除非明確允許合作
   - 不抄襲或分享他人的解答

---

## 智慧財產權

- 本平台上的題目、測試資料、系統介面及相關內容均受著作權法保護，未經授權不得複製或散布。
- 使用者提交的程式碼著作權歸使用者所有。但您同意授權本平台於以下目的使用您的程式碼：
  - 執行評測與提供回饋
  - 教學研究與統計分析（去識別化處理）
  - 系統維護與改善

---

## 服務變更與終止

- 本平台保留隨時修改、暫停或終止全部或部分服務的權利，恕不另行通知。
- 若您違反本條款，本平台有權暫停或終止您的帳號。

---

## 免責聲明

- 本平台以「現況」提供服務，不保證服務不會中斷或完全無錯誤。
- 對於因使用本平台所造成的任何直接或間接損失，本平台不負賠償責任。
- 本平台不對使用者提交的內容負責。

---

## 條款修訂

本平台保留隨時修訂本條款的權利。修訂後的條款將公布於本頁面，並更新「最後更新日期」。繼續使用本平台即表示您接受修訂後的條款。

---

如您對本服務條款有任何疑問，歡迎與我們聯繫。`,
    // Privacy Policy page
    privacyPolicyTitle: "隱私權政策",
    privacyPolicyLastUpdated: "最後更新日期：2025 年 12 月 27 日",
    privacyPolicyContent: `**NOJ Team4 線上程式解題平台**（以下簡稱「本平台」）非常重視您的隱私權。本隱私權政策說明我們如何蒐集、使用、保護及處理您的個人資料。

---

## 資料蒐集

當您使用本平台時，我們可能蒐集以下類型的資訊：

### 您主動提供的資料

| 資料類型 | 說明 |
|---------|------|
| **帳號資料** | 使用者名稱、電子郵件地址、密碼（經加密儲存） |
| **個人檔案** | 頭像、個人簡介（選填） |
| **提交內容** | 您提交的程式碼與解答 |

### 自動蒐集的資料

| 資料類型 | 說明 |
|---------|------|
| **使用紀錄** | 解題紀錄、提交歷史、課程參與紀錄 |
| **技術資訊** | IP 位址、瀏覽器類型、作業系統、裝置資訊 |
| **登入資訊** | 登入時間、登入地點 |

---

## 資料使用

我們使用蒐集的資料用於以下目的：

- **服務提供**：執行程式碼評測、顯示解題結果、管理課程
- **帳號管理**：驗證身分、處理密碼重設、發送重要通知
- **服務改善**：分析使用模式、優化平台效能、修復錯誤
- **教學研究**：進行去識別化的統計分析與學術研究
- **安全維護**：偵測異常活動、防止濫用與未授權存取

---

## 資料保護

我們採取多項措施保護您的個人資料：

- **加密儲存**：密碼使用業界標準的雜湊演算法加密，無法被還原
- **安全傳輸**：所有資料傳輸均透過 HTTPS 加密連線
- **存取控制**：僅經授權的人員可存取個人資料
- **定期審查**：定期檢視安全措施並進行必要更新

---

## 資料分享

我們 **不會出售** 您的個人資料予第三方。僅在以下情況可能分享您的資料：

- **取得您的同意**：經您明確同意後分享
- **課程相關**：與課程教師分享您的學習紀錄與成績（若您為課程學員）
- **法律要求**：配合法律規定或司法機關的調查要求
- **服務提供商**：與協助我們營運平台的服務提供商分享（例如：雲端服務），這些提供商受合約約束保護您的資料

---

## Cookie 使用

本平台使用 Cookie 以：

- 維持您的登入狀態
- 記住您的偏好設定（如語言選擇）
- 改善使用者體驗

您可以透過瀏覽器設定管理或停用 Cookie，但這可能影響部分功能的正常運作。

---

## 您的權利

根據適用的隱私權法規，您享有以下權利：

- **存取權**：要求取得我們持有的您的個人資料副本
- **更正權**：要求更正不正確或不完整的個人資料
- **刪除權**：要求刪除您的個人資料
- **資料可攜權**：要求以可機讀格式取得您的資料

如需行使上述權利，請透過平台設定或聯繫我們提出請求。

---

## 兒童隱私

本平台不針對 13 歲以下兒童提供服務。若我們發現不慎蒐集了兒童的個人資料，將立即刪除。

---

## 政策變更

本隱私權政策可能不定期更新。重大變更時，我們會透過平台公告或電子郵件通知您。更新後的政策將公布於本頁面，並更新「最後更新日期」。

---

如您對本隱私權政策有任何疑問，歡迎與我們聯繫。`,
  },
  en: {
    hello: "Hello World",
    helloCourses: "Hello Courses",
    helloProblems: "Hello Problems",
    languageSelectorLabel: "Interface Language",
    switcherCurrent: "Current: {lang}",
    brand: "NOJ Team4",
    navHome: "Home",
    navCourses: "Courses",
    navProblems: "Problems",
    navSubmissions: "Submissions",
    navAdmin: "Admin",
    navContest: "Go to Exam Site",
    login: "Log in",
    signup: "Sign up",
    logout: "Log out",
    logoutConfirm: "Are you sure you want to log out?",
    headerLanguage: "Language",
    emailUnverified: "Unverified",
    navToggleLabel: "Toggle navigation menu",
    loginTitle: "Log in",
    registerTitle: "Create an account",
    identifierLabel: "Username or email",
    usernameLabel: "Username",
    usernameHint: "3-30 characters, lowercase letters, numbers, underscores, periods.",
    emailLabel: "Email",
    passwordLabel: "Password",
    newPasswordLabel: "New password",
    confirmPasswordLabel: "Confirm new password",
    passwordMismatch: "Passwords do not match.",
    showPassword: "Show password",
    hidePassword: "Hide password",
    submit: "Submit",
    confirm: "Confirm",
    cancel: "Cancel",
    successLogin: "Logged in. Redirecting...",
    successRegister: "Registered successfully. Signing you in...",
    verificationEmailSent: "Verification email sent. Please check your inbox.",
    errorGeneric: "Something went wrong. Please try again.",
    haveAccount: "Already have an account?",
    noAccount: "Don't have an account?",
    goLogin: "Go to login",
    goRegister: "Create an account",
    emailNotVerified: "Your email is not verified yet. Please verify before logging in.",
    goVerify: "Verify now",
    verifyTitle: "Email verification",
    verifyProcessing: "Verifying your link...",
    verifySuccess: "Verification successful! Please go to the login page.",
    verifyFailed: "Verification link is invalid or expired. Please resend the email.",
    resendVerification: "Resend verification email",
    resendAction: "Resend",
    resendSuccess: "If the account exists and is unverified, we just sent a new email.",
    resendInputPlaceholder: "Enter your email or username",
    forgotPassword: "Forgot password?",
    forgotPasswordTitle: "Reset password",
    forgotPasswordDescription: "Enter your username or email. We'll send you a reset link.",
    forgotPasswordSuccess: "If the account exists, we just sent a reset link.",
    resetPasswordTitle: "Set a new password",
    resetPasswordDescription: "Enter a new password. All devices will be signed out after reset.",
    resetPasswordSuccess: "Password updated. Please log in with your new password.",
    resetPasswordInvalid: "The reset link is invalid or expired. Please request a new one.",
    resetPasswordMissingToken: "Missing reset token. Please request a new reset link.",
    coursesTitle: "Courses",
    coursesSubtitle: "Explore and browse all available courses",
    coursesFilterStatus: "Status",
    coursesFilterActive: "Active",
    coursesFilterArchived: "Archived",
    coursesFilterMine: "My courses only",
    coursesFilterTermPlaceholder: "Course name",
    coursesLoginHint: "login required",
    coursesLoginRequired: "Please sign in first.",
    coursesTabAll: "All courses",
    coursesTabMine: "My courses",
    coursesEnrollInvite: "Invite only",
    coursesEnrollByCode: "Join code",
    coursesEnrollPublic: "Open enrollment",
    coursesMemberCount: "{count} members",
    coursesTeacherLabel: "Teacher:",
    coursesJoinCode: "Join code",
    coursesNoDescription: "No description yet",
    coursesNoTerm: "No term set",
    coursesEmpty: "No courses found",
    coursesEmptyHint: "Try adjusting filters or check back later.",
    coursesClearFilters: "Clear all filters",
    coursesError: "Failed to load courses",
    retry: "Retry",
    coursesCreateButton: "Create course",
    courseCreateTitle: "Create course",
    courseCreateSubtitle: "Fill in the details to create a new course.",
    courseCreateNameLabel: "Course name",
    courseCreateNamePlaceholder: "e.g. Introduction to Programming",
    courseCreateTermLabel: "Term (optional)",
    courseCreateTermPlaceholder: "e.g. 2025 Fall",
    courseCreateDescriptionLabel: "Description",
    courseCreateDescriptionPlaceholder: "Briefly describe the course",
    courseCreateEnrollmentTypeLabel: "Enrollment type",
    courseCreateJoinCodeLabel: "Join code (optional)",
    courseCreateJoinCodePlaceholder: "Leave empty to auto-generate",
    courseCreateJoinCodeHint: "If you choose join code, we will generate a secure code when left empty.",
    courseCreateSubmit: "Create course",
    courseCreateSubmitHint: "You will be added as the teacher automatically.",
    courseCreateSuccess: "Course created successfully.",
    courseCreateError: "Failed to create course.",
    courseCreateNameRequired: "Course name is required.",
    courseCreateLoginRequired: "Please sign in to create a course.",
    courseDetailStatusLabel: "Course Status",
    courseDetailMemberCount: "Members: {count}",
    courseDetailTeachers: "Teachers: ",
    courseDetailMyRole: "Your identity: ",
    courseDetailRoleTeacher: "Teacher",
    courseDetailRoleTA: "TA",
    courseDetailRoleStudent: "Student",
    courseDetailSummary: "Progress Summary",
    courseDetailHomeworkCount: "Total Homeworks",
    courseDetailSubmissionCount: "Submitted Homeworks",
    courseDetailDescription: "Course Description",
    courseDetailDescriptionEmpty: "No course description yet.",
    courseDetailNotFound: "Course not found.",
    courseDetailNotLoggedIn: "Please sign in to view this course.",
    courseDetailJoinLoginHint: "Sign in to join this course via code or public enrollment.",
    courseDetailLoginCta: "Go to login",
    courseDetailError: "Failed to load course info.",
    courseDetailNotEnrolledTitle: "Not enrolled yet",
    courseDetailNotEnrolled:
      "You have not joined this course. Join via code or public enrollment to view announcements and assignments.",
    courseDetailJoinToView: "Join the course to unlock announcements and assignments.",
    courseJoinTitle: "Join this course",
    courseJoinDescriptionByCode: "This course requires a join code. Enter it below to join.",
    courseJoinDescriptionPublic: "This course is open for public enrollment. Click the button to join.",
    courseJoinCodeLabel: "Join code",
    courseJoinCodePlaceholder: "Enter join code",
    courseJoinCodeRequired: "Please enter the join code",
    courseJoinSubmit: "Join",
    courseJoinSubmitting: "Joining...",
    courseJoinError: "Failed to join the course. Please try again.",
    courseLeaveButton: "Leave course",
    courseLeaveSubmitting: "Leaving...",
    courseLeaveConfirm: "Are you sure you want to leave this course?",
    courseLeaveError: "Failed to leave the course. Please try again.",
    courseLeaveLastTeacher: "You are the last teacher in this course and cannot leave. Add another teacher first.",
    courseDetailAnnouncementsTitle: "Announcements",
    courseDetailAnnouncementsPlaceholder:
      "Announcements are not implemented yet. Recent announcements will appear here in the future.",
    courseDetailHomeworksTitle: "Homeworks",
    courseDetailHomeworksPlaceholder: "Browse homework list and deadlines.",
    courseDetailViewAll: "View all",
    courseDetailEditButton: "Edit course",
    // Course Tabs
    courseTabOverview: "Overview",
    courseTabAnnouncements: "Announcements",
    courseTabHomeworks: "Homeworks",
    courseTabProblems: "Problems",
    courseTabMembers: "Members",
    courseTabSettings: "Settings",
    // Course Stats
    courseStatMembers: "Members",
    courseStatHomeworks: "Homeworks",
    courseStatProblems: "Problems",
    courseStatSubmissions: "Submissions",
    // Course Overview
    courseRecentAnnouncements: "Recent Announcements",
    courseUpcomingDeadlines: "Upcoming Deadlines",
    courseRecentProblems: "Course Problems",
    courseEditBackButton: "Back to course",
    courseEditTitle: "Edit course",
    courseEditSubtitle: "Update course information.",
    courseEditNameLabel: "Course name",
    courseEditNamePlaceholder: "e.g. Introduction to Programming",
    courseEditTermLabel: "Term (optional)",
    courseEditTermPlaceholder: "e.g. 2025 Fall",
    courseEditDescriptionLabel: "Description",
    courseEditDescriptionPlaceholder: "Briefly describe the course",
    courseEditEnrollmentTypeLabel: "Enrollment type",
    courseEditJoinCodeLabel: "Join code (optional)",
    courseEditJoinCodePlaceholder: "Leave empty to keep current",
    courseEditJoinCodeHint: "To change the join code, enter a new one. Leave empty to keep the existing code.",
    courseEditSubmit: "Save changes",
    courseEditSubmitHint: "Changes will take effect immediately.",
    courseEditSuccess: "Course updated successfully.",
    courseEditError: "Failed to update course.",
    courseEditNameRequired: "Course name is required.",
    courseEditLoginRequired: "Please sign in to edit the course.",
    courseEditPermissionDenied: "You don't have permission to edit this course. Only teachers can edit courses.",
    courseDeleteDangerTitle: "Danger zone: delete course",
    courseDeleteDangerDescription:
      "Deleting a course removes it from the course list and clears its join code. This action cannot be undone.",
    courseDeleteConfirmLabel: "Type the course name to confirm",
    courseDeleteConfirmPlaceholder: 'Type "{courseName}"',
    courseDeleteButton: "Delete course",
    courseDeleteDeleting: "Deleting...",
    courseDeleteNameMismatch: "Course name does not match. Please type the exact course name.",
    courseDeleteConfirmPrompt: "Are you sure you want to delete this course? This action cannot be undone.",
    courseDeleteError: "Failed to delete the course. Please try again.",
    homeworksTitle: "Homeworks",
    homeworksNew: "New Homework",
    homeworksEdit: "Edit Homework",
    homeworksDelete: "Delete",
    homeworksDeleteConfirm: "Are you sure you want to delete this homework? This action cannot be undone.",
    homeworksStatusUpcoming: "Upcoming",
    homeworksStatusOngoing: "Ongoing",
    homeworksStatusEnded: "Ended",
    homeworksFormTitle: "Title",
    homeworksFormDescription: "Description",
    homeworksFormStartAt: "Start At",
    homeworksFormEndAt: "End At",
    homeworksFormWeightPercent: "Weight (%)",
    homeworksFormProblems: "Problems",
    homeworksFormSelected: "{count} selected",
    homeworksFormPoints: "Points",
    homeworksFormQuota: "Quota",
    homeworksFormUnlimited: "Unlimited",
    homeworksFormAllowedLanguages: "Allowed languages",
    homeworksFormAllowedLanguagesHint: "You can only narrow down the languages allowed by the problem.",
    homeworksFormAllowAiAssistant: "Allow AI assistant",
    homeworksFormSave: "Save",
    homeworksFormSaving: "Saving...",
    homeworksFormCancel: "Cancel",
    homeworksProblemSearchPlaceholder: "Search by title or ID",
    homeworksError: "Failed to load homeworks",
    homeworksEmpty: "No homework yet.",
    homeworksJoinCourseHint: "Join the course to view the homework list.",
    homeworksProblemCount: "{count} problems",
    homeworksCreatedBy: "Created by {name}",
    homeworksNotAllowed: "You do not have permission to manage this homework.",
    homeworksErrorsMustSelectAtLeastOneProblem: "Please select at least one problem.",
    homeworksErrorsInvalidTimeRange: "Start time must be earlier than end time. Please check again.",
    homeworksErrorsLanguagesRequired: "Each problem must allow at least one language.",
    homeworksProblemBankTitle: "Problem bank",
    homeworksProblemBankHint: "Pick from course problems.",
    homeworksProblemBankEmpty: "No problems available.",
    homeworksProblemBankTabCourse: "Course problems",
    homeworksProblemBankTabPublic: "Public problems",
    homeworksProblemMissing: "Problem deleted or hidden",
    homeworksCourseProblemsTitle: "Problems in this course",
    homeworksCourseProblemsEmpty: "No problems have been added to this course yet.",
    homeworksPublicProblemsTitle: "Public problems",
    homeworksPublicProblemsHint: "You can attach any public problem directly without pre-adding it to the course.",
    homeworksPublicProblemsEmpty: "No public problems available.",
    homeworksPublicProblemsError: "Failed to load course problems. Please try again later.",
    homeworksExistingProblemsTitle: "Problems already in this homework",
    homeworksCourseProblemConfigHint: "Course problems use the course-level settings.",
    homeworksClonePublicProblem: "Clone to course",
    homeworksClonePublicProblemHint: "Selecting a public problem will create a copy and add it to the course.",
    homeworksCloneSuccess: "Problem cloned to course successfully",
    homeworksCloneError: "Failed to clone problem",
    homeworksCloning: "Cloning problem...",
    courseProblemsAddTitle: "Add an existing problem",
    courseProblemsAddPlaceholder: "Enter display ID or problem ID",
    courseProblemsAddButton: "Add problem",
    courseProblemsAddHelp: "You can type the display ID (e.g. a123) or the internal problem ID.",
    courseProblemsAddSuccess: "Problem added to the course.",
    courseProblemsAddError: "Failed to add problem. Please verify the identifier.",
    courseProblemsTitle: "Course Problem Bank",
    courseProblemsSubtitle: "Problems created in this course",
    courseProblemsViewAll: "View all",
    courseProblemsNew: "New problem",
    courseProblemsError: "Failed to load course problems.",
    courseProblemsEmpty: "No problems in this course yet.",
    courseProblemsVisibility: "Visibility",
    courseProblemsBackToCourse: "Back to course",
    courseProblemsBackToList: "Back to course problems",
    courseProblemsNoPermission: "You don't have permission to create course problems.",
    courseProblemCreateTitle: "New Course Problem",
    courseProblemCreateSubtitle: "Create a problem for this course.",
    courseProblemEditTitle: "Edit Course Problem",
    courseProblemEditSubtitle: "Edit problem [{displayId}]",
    courseProblemFormCreate: "Create course problem",
    courseProblemFormUpdate: "Update course problem",
    courseProblemPublicLabel: "Make public (listed in the public problem bank)",
    courseProblemPublicAiHint: "Public problems always allow AI; override only in assignments.",
    courseProblemQuotaInvalid: "Submission limit must be -1 or a non-negative integer.",
    paginationPrev: "Previous",
    paginationNext: "Next",
    paginationPage: "{current} / {total}",
    paginationInfo: "Page {page} of {totalPages} ({total} total)",
    problemFormCourseAssignTitle: "Visible courses",
    problemFormCourseAssignDescription: "Unlisted problems are visible to members of the selected courses only.",
    problemFormCourseAssignEmpty: "You are not a teacher or TA of any course yet.",
    problemFormCourseAssignHelp: "Only courses where you are a teacher or TA can be selected.",
    problemFormCourseAssignPartialFailed: "Problem created, but adding to some courses failed. Please add it from the course page.",
    problemFormCourseAssignRequired: "Please select at least one course for course-only problems.",
    // Problems
    problemsTitle: "Problem List",
    problemsSubtitle: "",
    problemsPublicHint: "Browse all public problems here.",
    problemsTabsPublic: "Public",
    problemsTabsCourses: "Courses",
    problemsTabsMine: "My Problems",
    problemsLoginRequired: "Please sign in to view this section.",
    problemsNoCourses: "You haven't joined any courses yet.",
    problemsCourseSelect: "Select a course",
    problemsCourseEmpty: "No problems in this course yet.",
    problemsNewProblem: "New Problem",
    problemsSectionCourse: "Course Problems",
    problemsSectionPublic: "Public Problems",
    problemsViewMine: "My Problems",
    problemsCourseFilterAll: "All Courses",
    problemsMineTitle: "My Public Problems",
    problemsMineSubtitle: "Manage your public problems",
    problemsMineBackToList: "Back to Problems",
    problemsMineEmpty: "No problems created yet",
    problemsMineEmptyHint: "Click 'New Public Problem' to create your first problem",
    problemsEdit: "Edit",
    problemsFilterDifficulty: "Difficulty",
    problemsDifficultyAll: "All difficulties",
    problemsDifficultyUnknown: "Unknown",
    problemsDifficultyEasy: "Easy",
    problemsDifficultyMedium: "Medium",
    problemsDifficultyHard: "Hard",
    problemsSearchPlaceholder: "Search by ID, title, or tags",
    problemsCreateButton: "Create Problem",
    problemsTableId: "ID",
    problemsTableTitle: "Title",
    problemsTableCourses: "Courses",
    problemsTableDifficulty: "Difficulty",
    problemsTableCreatedAt: "Added At",
    problemsTableCompleted: "Completed",
    problemsTableTags: "Tags",
    problemsFilterTags: "Filter by Tags",
    problemsClearTags: "Clear filter",
    problemFormTags: "Tags",
    problemFormTagsPlaceholder: "Array, DP, Loop",
    problemFormTagsHint: "Separate multiple tags with commas, e.g.: Array, DP, String",
    problemsEmpty: "No problems found",
    problemsEmptyHint: "Try adjusting filters or create a new problem.",
    problemsClearFilters: "Clear all filters",
    problemsTotalCount: "{count} total",
    problemsError: "Failed to load problems",
    problemBackToList: "Back to problems",
    problemBackToDetail: "Back to problem",
    problemOwner: "Owner",
    problemEditButton: "Edit",
    problemDeleteButton: "Delete",
    problemDeleting: "Deleting...",
    problemDeleteConfirm: "Are you sure you want to delete this problem? This action cannot be undone.",
    problemDeleteError: "Failed to delete problem. Please try again.",
    problemDescription: "Description",
    problemInput: "Input",
    problemOutput: "Output",
    problemHint: "Hint",
    problemSampleIO: "Sample I/O",
    problemSampleInput: "Sample Input",
    problemSampleOutput: "Sample Output",
    problemCreateTitle: "Create Public Problem",
    problemCreateSubtitle: "Fill in the details to create a public problem.",
    problemCreateLoginRequired: "Please sign in to create a problem.",
    problemEditTitle: "Edit Problem",
    problemEditSubtitle: "Editing problem [{displayId}]",
    problemEditLoginRequired: "Please sign in to edit this problem.",
    problemEditNoPermission: "You don't have permission to edit this problem.",
    problemVisibilityPublic: "Public",
    problemVisibilityUnlisted: "Unlisted (Course only)",
    problemVisibilityPrivate: "Private (Only me)",
    problemVisibilityCourseOnly: "Course only", // deprecated
    problemVisibilityHidden: "Hidden", // deprecated
    problemFormTitle: "Title",
    problemFormTitlePlaceholder: "e.g. A+B Problem",
    problemFormTitleRequired: "Title is required",
    problemFormVisibility: "Visibility",
    problemFormDifficulty: "Difficulty",
    problemFormLanguages: "Allowed Languages",
    problemFormLanguagesRequired: "Please select at least one language",
    problemFormQuota: "Submission Quota",
    problemFormQuotaHint: "-1 means unlimited",
    problemFormCanViewStdout: "Allow viewing stdout",
    problemFormDescription: "Description",
    problemFormDescriptionPlaceholder: "Describe the problem scenario and requirements",
    problemFormDescriptionRequired: "Description is required",
    problemFormInput: "Input",
    problemFormInputPlaceholder: "Describe the input format",
    problemFormOutput: "Output",
    problemFormOutputPlaceholder: "Describe the output format",
    problemFormHint: "Hint (optional)",
    problemFormHintPlaceholder: "Provide hints or tips for solving",
    problemFormSampleCases: "Sample Cases",
    problemFormAddSampleCase: "Add sample",
    problemFormRemove: "Remove",
    problemFormCancel: "Cancel",
    problemFormSubmitting: "Submitting...",
    problemFormCreate: "Create Public Problem",
    problemFormUpdate: "Update Problem",
    problemFormError: "Operation failed. Please try again.",
    problemFormAiTitle: "AI Assistant Settings",
    problemFormAiHint: "Control whether AI is enabled and what it can read.",
    problemFormAiEnabled: "Enable AI assistant",
    problemFormAiScopeProblem: "Allow problem statement",
    problemFormAiScopeCode: "Allow student code",
    problemFormAiScopeCompile: "Allow compile error",
    problemFormAiScopeJudge: "Allow judge summary",
    // Translation
    problemFormAutoTranslate: "AI Auto-translate (runs after save)",
    problemFormAutoTranslateHint: "When checked, problem content will be auto-translated to another language after saving",
    problemTranslationPending: "Translating...",
    problemTranslationCompleted: "Translation completed",
    problemTranslationFailed: "Translation failed",
    adminAiTitle: "AI Feature Settings",
    adminAiSubtitle: "Configure the model and parameters for each AI feature.",
    adminAiGlobalSettings: "Global Settings",
    adminAiActiveProvider: "Active Provider",
    adminAiActiveProviderHint: "Select which AI service to use. The system will use the corresponding model name.",
    adminAiForceDisable: "Force pause all AI features",
    adminAiForceDisableHint: "When enabled, all AI features will be paused",
    adminAiProvider: "Provider",
    adminAiModel: "Model name",
    adminAiReasoningEffort: "Reasoning effort",
    adminAiOpenAiModel: "OpenAI model name",
    adminAiGeminiModel: "Gemini model name",
    adminAiMaxTokens: "Max output tokens",
    adminAiTemperature: "Temperature",
    adminAiEnabled: "Enabled",
    adminAiDisabled: "Disabled",
    adminAiSave: "Save settings",
    adminAiSaving: "Saving...",
    adminAiSaved: "AI settings updated.",
    adminAiError: "Failed to update settings.",
    adminAiLoading: "Loading...",
    adminAiBack: "Back to admin",
    aiAssistantButton: "Ask AI TA",
    aiAssistantTitle: "AI Assistant",
    aiAssistantHint: "Provides hints and guidance, not full answers.",
    aiAssistantClose: "Close",
    aiAssistantScopeTitle: "AI visibility",
    aiAssistantScopeEmpty: "No extra context enabled",
    aiAssistantScopeProblem: "Problem statement",
    aiAssistantScopeCode: "Student code",
    aiAssistantScopeCompile: "Compile error",
    aiAssistantScopeJudge: "Judge summary",
    aiAssistantAttachSubmission: "Attach latest submission",
    aiAssistantEmpty: "Ask a question and the AI will guide you step by step.",
    aiAssistantEmptyGeneral: "Ask me anything about programming! I can help with languages, algorithms, data structures, and more.",
    aiAssistantPlaceholder: "Describe your issue or paste the error message...",
    aiAssistantPlaceholderGeneral: "Ask me any programming question...",
    aiAssistantSend: "Send",
    aiAssistantSending: "Replying",
    aiAssistantHintProblem: "Helping with problem {displayId}",
    aiAssistantLoginRequired: "Sign in to chat with the AI assistant",
    aiAssistantLoginButton: "Sign in",
    aiAssistantError: "Unable to get a reply right now. Please try again.",
    aiAssistantErrorGeneric: "We couldn't process your request. Please try again.",
    aiAssistantErrorProviderNotReady: "AI service is not configured yet.",
    aiAssistantErrorProviderAuth: "AI service authorization failed.",
    aiAssistantErrorRateLimit: "Rate limit reached. Please try again later.",
    aiAssistantErrorDisabled: "AI assistant is disabled for this problem.",
    aiAssistantErrorConversation: "Chat session expired. Please reopen the chat.",
    aiAssistantErrorEmpty: "Please enter your question first.",
    aiAssistantNewChat: "New Chat",
    aiAssistantNewChatConfirm: "Start a new conversation? Current chat history will be cleared.",
    // AI Problem Creator
    aiProblemCreatorButton: "AI Problem Creator",
    aiProblemCreatorTitle: "AI Problem Creator",
    aiProblemCreatorSubtitle: "Create programming problems through AI conversation",
    aiProblemCreatorDescribeIdea: "Describe your problem idea",
    aiProblemCreatorReviewProblem: "Review generated problem",
    aiProblemCreatorEditDetails: "Edit problem details",
    aiProblemCreatorGeneratingTestdata: "Generating test data...",
    aiProblemCreatorReadyToPublish: "Ready to publish",
    aiProblemCreatorPublishing: "Publishing...",
    aiProblemCreatorPublished: "Problem published!",
    aiProblemCreatorViewProblem: "View Problem",
    aiProblemCreatorClose: "Close",
    aiProblemCreatorStartCreating: "Start Creating",
    aiProblemCreatorLoginToUse: "Login to Use",
    aiProblemCreatorPlaceholder: "Describe the programming problem you want to create...",
    aiProblemCreatorQuickTemplates: "Quick Templates",
    aiProblemCreatorMath: "Mathematics",
    aiProblemCreatorString: "String Processing",
    aiProblemCreatorDataStructure: "Data Structures",
    aiProblemCreatorAlgorithm: "Algorithms",
    aiProblemCreatorProblemReady: "Problem is ready!",
    aiProblemCreatorGoToPreview: "Go to Preview",
    aiProblemCreatorSending: "Sending...",
    aiProblemCreatorError: "An error occurred",
    // AI Problem Creator - Additional
    aiProblemCreatorRestoringProgress: "Restoring generation progress...",
    aiProblemCreatorAiGenerating: "AI is generating, please wait...",
    aiProblemCreatorTimeout: "Generation timed out, please try again",
    aiProblemCreatorStartingAi: "Starting AI...",
    aiProblemCreatorAnalyzing: "AI is analyzing your request...",
    aiProblemCreatorUnderstanding: "Understanding problem concept...",
    aiProblemCreatorDesigning: "Designing problem structure...",
    aiProblemCreatorGeneratingSolution: "Generating solution and test data...",
    aiProblemCreatorGettingResult: "Retrieving generation result...",
    aiProblemCreatorEditProblem: "Edit Problem",
    aiProblemCreatorAiCompleted: "AI Generation Complete",
    aiProblemCreatorEditContent: "Edit problem content",
    aiProblemCreatorPreviewAndPublish: "Preview and publish problem",
    aiProblemCreatorPublishingProblem: "Publishing problem...",
    aiProblemCreatorPublishSuccess: "Problem published!",
    aiProblemCreatorCreateNew: "Create New Problem",
    aiProblemCreatorTestCasesCount: "{count} test cases",
    aiProblemCreatorSampleCasesCount: "{count} samples",
    aiProblemCreatorDescription: "Problem Description",
    aiProblemCreatorInputFormat: "Input Format",
    aiProblemCreatorOutputFormat: "Output Format",
    aiProblemCreatorSampleTestcases: "Sample Test Cases",
    aiProblemCreatorConstraints: "Constraints",
    aiProblemCreatorTimeLimit: "Time Limit: {ms} ms",
    aiProblemCreatorMemoryLimit: "Memory Limit: {mb} MB",
    aiProblemCreatorRestart: "Start Over",
    aiProblemCreatorPublishProblem: "Publish Problem",
    aiProblemCreatorAiHelpText: "AI will automatically generate complete problem and test data",
    aiProblemCreatorPleaseWait: "Please Wait",
    aiProblemCreatorCooldownRunning: "Previous generation may still be in progress, or requires cooldown time.",
    aiProblemCreatorCooldownAbuse: "To prevent abuse, please wait for cooldown to end.",
    aiProblemCreatorCooldownEnd: "You can use again after cooldown ends",
    aiProblemCreatorTestdataCooldown: "Please wait {seconds} seconds",
    aiProblemCreatorGenerationFailed: "Generation Failed",
    aiProblemCreatorRetry: "Retry",
    aiProblemCreatorAiCannotGenerate: "AI could not generate the problem. Please try a more detailed description, e.g.: \"Design a simple Greedy algorithm problem about activity selection\"",
    aiProblemCreatorLoginRequired: "Please login to use AI generation feature",
    aiProblemCreatorInput: "Input",
    aiProblemCreatorOutput: "Output",
    // AI Problem Creator - Editor
    aiProblemCreatorEditorTitle: "Title",
    aiProblemCreatorEditorDifficulty: "Difficulty",
    aiProblemCreatorEditorTags: "Tags (comma separated)",
    aiProblemCreatorEditorTagsPlaceholder: "array, sorting, ...",
    aiProblemCreatorEditorTimeLimitMs: "Time Limit (ms)",
    aiProblemCreatorEditorMemoryLimitMb: "Memory Limit (MB)",
    aiProblemCreatorEditorAddSample: "+ Add Sample",
    aiProblemCreatorEditorRemove: "Remove",
    aiProblemCreatorEditorSample: "Sample",
    aiProblemCreatorEditorCancel: "Cancel",
    aiProblemCreatorEditorSaveChanges: "Save Changes",
    // AI Problem Creator - Modal & Chat
    aiProblemCreatorModalTitle: "AI Problem Creator",
    aiProblemCreatorModalDescribeIdea: "Describe your problem idea",
    aiProblemCreatorModalReviewProblem: "Review generated problem",
    aiProblemCreatorModalEditDetails: "Edit problem details",
    aiProblemCreatorModalGeneratingTestdata: "Generating test data...",
    aiProblemCreatorModalReadyToPublish: "Ready to publish",
    aiProblemCreatorModalPublishing: "Publishing...",
    aiProblemCreatorModalPublished: "Problem published!",
    aiProblemCreatorModalPublishingProblem: "Publishing problem...",
    aiProblemCreatorModalProblemPublished: "Problem Published!",
    aiProblemCreatorModalProblemAvailable: "Your problem \"{title}\" is now available.",
    aiProblemCreatorModalViewProblem: "View Problem",
    aiProblemCreatorModalClose: "Close",
    // AI Problem Creator - Chat Interface
    aiProblemCreatorChatStartTitle: "Start Creating Your Problem",
    aiProblemCreatorChatStartDesc: "Describe the problem you want to create. I'll help you define the problem statement, input/output format, examples, and generate test cases.",
    aiProblemCreatorChatTemplateArraySum: "Array Sum",
    aiProblemCreatorChatTemplateArraySumDesc: "Basic array operation",
    aiProblemCreatorChatTemplatePalindrome: "Palindrome Check",
    aiProblemCreatorChatTemplatePalindromeDesc: "String manipulation",
    aiProblemCreatorChatTemplateBinarySearch: "Binary Search",
    aiProblemCreatorChatTemplateBinarySearchDesc: "Algorithm practice",
    aiProblemCreatorChatTemplatePrime: "Prime Numbers",
    aiProblemCreatorChatTemplatePrimeDesc: "Number theory",
    aiProblemCreatorChatProblemReady: "Problem Ready!",
    aiProblemCreatorChatProblemReadyDesc: "Click to preview and publish your problem.",
    aiProblemCreatorChatPreviewProblem: "Preview Problem",
    aiProblemCreatorChatPlaceholder: "Describe the problem you want to create...",
    aiProblemCreatorChatHint: "Press Enter to send, Shift+Enter for new line",
    // AI Problem Creator - Preview
    aiProblemCreatorPreviewEdit: "Edit",
    aiProblemCreatorPreviewSolutionCode: "Solution Code",
    aiProblemCreatorPreviewSuggestedTestInputs: "Suggested Test Inputs",
    aiProblemCreatorPreviewSuggestedTestInputsDesc: "These inputs will be used to generate test data for judging.",
    aiProblemCreatorPreviewBackToChat: "Back to Chat",
    aiProblemCreatorPreviewGenerateTestData: "Generate Test Data",
    aiProblemCreatorPreviewRequiredHint: "Solution code and test inputs are required. Go back to chat and ask AI to generate them.",
    // AI Problem Creator - Testdata Progress
    aiProblemCreatorTestdataGenerating: "Generating Test Data",
    aiProblemCreatorTestdataGeneratingDesc: "Running the solution code to generate expected outputs for each test input. This may take a moment...",
    aiProblemCreatorTestdataProcessing: "Processing...",
    aiProblemCreatorTestdataGenerated: "Test Data Generated",
    aiProblemCreatorTestdataPassed: "{count} Passed",
    aiProblemCreatorTestdataErrors: "{count} Errors",
    aiProblemCreatorTestdataTimeouts: "{count} Timeouts",
    aiProblemCreatorTestdataSampleCase: "Sample Case",
    aiProblemCreatorTestdataTestCase: "Test Case",
    aiProblemCreatorTestdataExpectedOutput: "Expected Output",
    aiProblemCreatorTestdataEmptyOutputError: "Solution code executed successfully but produced no output. Please check that the solution handles all test inputs correctly.",
    aiProblemCreatorTestdataDockerNotAvailable: "Docker sandbox environment is not available. Please ensure Docker is running and the noj4-sandbox image is installed.",
    // AI Problem Creator - Publish Confirmation
    aiProblemCreatorPublishReady: "Ready to Publish",
    aiProblemCreatorPublishProblemDetails: "Problem Details",
    aiProblemCreatorPublishTestData: "Test Data",
    aiProblemCreatorPublishHiddenCases: "Hidden Cases",
    aiProblemCreatorPublishTotal: "Total",
    aiProblemCreatorPublishStatus: "Status",
    aiProblemCreatorPublishAllPassed: "All Passed",
    aiProblemCreatorPublishSomeIssues: "Some Issues",
    aiProblemCreatorPublishDescPreview: "Description Preview",
    aiProblemCreatorPublishBeforePublishing: "Before Publishing",
    aiProblemCreatorPublishVisibilityNotice: "The problem will be visible to all users once published. Make sure all details are correct before proceeding.",
    aiProblemCreatorPublishBack: "Back",
    aiProblemCreatorPublishAutoTranslate: "AI Auto-Translate",
    aiProblemCreatorPublishAutoTranslateDesc: "Automatically translate the problem to another language after publishing (Chinese ↔ English)",
    // AI Testdata Generator
    aiTestdataGeneratorTitle: "AI Testdata Generator",
    aiTestdataGeneratorSubtitle: "Automatically generate test data from problem description",
    aiTestdataGeneratorNumCases: "Number of test cases",
    aiTestdataGeneratorGenerate: "Generate",
    aiTestdataGeneratorGenerating: "Generating test data...",
    aiTestdataGeneratorSuccess: "Test data generated successfully!",
    aiTestdataGeneratorFailed: "Generation failed",
    aiTestdataGeneratorUseTestdata: "Use this test data",
    aiTestdataGeneratorRetry: "Retry",
    aiTestdataGeneratorButton: "AI Generate Testdata",
    aiTestdataReady: "AI test data is ready",
    aiTestdataCount: "{count} test cases",
    // Homepage
    homepageTagline: "Create programming problems with AI, automatically generate test data and solutions",
    homepageFeatureAiCreator: "AI Problem Creator",
    homepageFeatureAiCreatorDesc: "Describe your problem concept in natural language, and AI will automatically generate complete programming problems with sample test cases and solutions.",
    homepageFeatureAiAssistant: "AI Coding Assistant",
    homepageFeatureAiAssistantDesc: "Stuck on a problem? AI assistant provides hints, explains concepts, and helps you break through learning barriers.",
    homepageFeatureJudge: "Real-time Judge System",
    homepageFeatureJudgeDesc: "Secure Docker sandbox environment supporting multiple programming languages with millisecond-level feedback on your code execution.",
    homepageFeatureCourse: "Course Management System",
    homepageFeatureCourseDesc: "Teachers can easily create courses, publish assignments, and track student progress to build a complete programming education environment.",
    homepageSectionTitle: "A Platform Built for Programming Education",
    homepageSectionSubtitle: "Combining AI technology with modern judging systems for a complete programming education and practice environment",
    homepageCtaTitle: "Ready to get started?",
    homepageCtaSubtitle: "Whether you're a student looking to practice programming or a teacher who needs to create problems, NOJ has you covered.",
    homepageCtaBrowseProblems: "Browse Problems",
    homepageCtaViewCourses: "View Courses",
    homepageCtaRegister: "Register Free",
    homepageCtaLogin: "Login",
    homepageCtaFree: "Completely Free",
    homepageCtaMultiLang: "Multiple Languages",
    homepageCtaAiAssist: "AI Assistance",
    // Profile
    profileTitle: "User Profile",
    profileEditTitle: "Edit Profile",
    profileJoinedAt: "Joined",
    profileEditButton: "Edit Profile",
    profileNicknameLabel: "Nickname",
    profileNicknamePlaceholder: "Enter your nickname",
    profileBioLabel: "Bio",
    profileBioPlaceholder: "Tell us about yourself",
    profileAvatarLabel: "Avatar",
    profileAvatarUpload: "Upload Avatar",
    profileAvatarChange: "Change Avatar",
    profileAvatarRemove: "Remove Avatar",
    profileAvatarCancel: "Cancel Selection",
    profileAvatarDragHint: "Click or drag an image here.",
    profileAvatarSizeHint: "JPG, PNG, GIF, WebP supported. Max 2MB.",
    profileAvatarInvalidType: "Unsupported image format. Please upload JPG, PNG, GIF or WebP.",
    profileAvatarTooLarge: "File size exceeds 2MB. Please choose a smaller image.",
    profileAvatarSelectedFile: "Selected",
    profileSaveButton: "Save Changes",
    profileSaving: "Saving...",
    profileCancelButton: "Cancel",
    profileUpdateSuccess: "Profile updated successfully",
    profileUpdateError: "Failed to update profile",
    profileLoadError: "Error loading profile",
    profileUserNotFound: "User not found",
    profileLoading: "Loading...",
    profileStatsTitle: "Submission Statistics",
    profileStatsTotalSubmissions: "Total Submissions",
    profileStatsAcCount: "Accepted",
    profileStatsAcceptanceRate: "Acceptance Rate",
    profileRecentSubmissionsTitle: "Recent Submissions",
    profileRecentSubmissionsEmpty: "No submissions yet",
    profileRecentSubmissionsViewAll: "View all submissions",
    profileApiTokensButton: "API Tokens",
    profileTimeMinutesAgo: "{n} min ago",
    profileTimeHoursAgo: "{n}h ago",
    profileTimeDaysAgo: "{n}d ago",
    profileUserNotFoundDescription: "The user you're looking for doesn't exist.",
    profileStartSolvingHint: "Start solving problems to see your submissions here!",
    // Submission
    submissionStatusPending: "Pending",
    submissionStatusRunning: "Running",
    submissionStatusAC: "Accepted",
    submissionStatusPA: "Partially Accepted",
    submissionStatusWA: "Wrong Answer",
    submissionStatusCE: "Compilation Error",
    submissionStatusTLE: "Time Limit Exceeded",
    submissionStatusMLE: "Memory Limit Exceeded",
    submissionStatusRE: "Runtime Error",
    submissionStatusOLE: "Output Limit Exceeded",
    submissionStatusSA: "Static Analysis Failed",
    submissionStatusJudgeError: "Judge Error",
    submissionScore: "Score",
    submissionLanguageC: "C",
    submissionLanguageCPP: "C++",
    submissionLanguageJava: "Java",
    submissionLanguagePython: "Python",
    submissionLanguageAuto: "Auto Detect",
    submissionSubmit: "Submit Code",
    submissionSubmitting: "Submitting...",
    submissionSuccess: "Submitted successfully, judging...",
    submissionErrorQuotaExceeded: "Submission quota exceeded",
    submissionErrorLanguageNotAllowed: "Language not allowed for this problem",
    submissionErrorHomeworkNotStarted: "Homework not started yet",
    submissionErrorHomeworkEnded: "Homework has ended",
    submissionErrorNotCourseMember: "You are not a course member",
    submissionErrorPermissionDenied: "Permission denied",
    submissionListTitle: "Submissions",
    submissionDetailTitle: "Submission Detail",
    submissionCode: "Code",
    submissionResult: "Result",
    submissionTime: "Time",
    submissionMemory: "Memory",
    submissionCases: "Test Cases",
    // Test (Code Testing)
    testButton: "Test",
    testButtonTesting: "Testing...",
    testCustomInputShow: "› Use Custom Input",
    testCustomInputHide: "‹ Hide Custom Input",
    testCustomInputLabel: "Custom Input (stdin)",
    testCustomInputPlaceholder: "Enter custom input here...",
    testResultsTitle: "Test Results",
    testResultCompileError: "Compile Error",
    testResultOutput: "Output:",
    testResultError: "Error:",
    testResultPassed: "Passed",
    testResultFailed: "Failed",
    testErrorCodeRequired: "Please enter your code",
    testErrorGeneric: "Test failed",
    testdataUploadTitle: "Upload Testdata",
    testdataUploadButton: "Select ZIP File",
    testdataUploadSuccess: "Upload successful! Version v{version}, {caseCount} test cases",
    testdataUploadError: "Failed to upload testdata",
    testdataVersionsTitle: "Testdata Versions",
    testdataVersionLabel: "Version {version}",
    testdataActiveLabel: "Active",
    testdataActivateButton: "Set as Active",
    testdataActivateSuccess: "Testdata version activated",
    testdataCaseCount: "Cases",
    testdataUploadedBy: "Uploaded by",
    testdataUploadedAt: "Uploaded at",
    testdataErrorZipTooLarge: "ZIP file too large (max 100MB)",
    testdataErrorInvalidZip: "Invalid ZIP file",
    testdataErrorManifestNotFound: "manifest.json not found",
    testdataErrorManifestInvalid: "Invalid manifest.json format",
    testdataErrorPathTraversal: "Path traversal attack detected",
    testdataErrorFileNotFound: "Testdata file not found",
    testdataErrorForbidden: "You don't have permission to perform this action",
    testdataErrorVersionNotFound: "Testdata version not found",
    testdataTitle: "Test Data",
    testdataActiveVersion: "Active Version",
    testdataNoActive: "No active version set",
    testdataCases: "Test Cases",
    testdataUploading: "Uploading...",
    testdataUpload: "Upload Testdata",
    testdataEmpty: "No testdata available",
    testdataActive: "Active",
    testdataActivating: "Activating...",
    testdataSetActive: "Set as Active",
    testdataHelp: "Upload a ZIP file containing manifest.json",
    inputMethodWarning: "⚠️ Chinese input method detected. Please switch to English input",
    // Subtask and Testdata uploader
    subtaskTitle: "Subtask Configuration",
    subtaskAdd: "Add Subtask",
    subtaskRemove: "Remove",
    subtaskCaseCount: "Cases",
    subtaskPoints: "Points",
    subtaskTimeLimit: "Time (ms)",
    subtaskMemoryLimit: "Memory (KB)",
    subtaskSample: "Sample",
    subtaskTotalCases: "Total Cases: {count}",
    subtaskTotalPoints: "Total Points: {points}",
    subtaskExpectedFiles: "Expected Files",
    subtaskFormatHelp: "File format: sstt.in / sstt.out (ss = subtask number, tt = case number, starting from 00)",
    subtaskUploadHint: "Upload a ZIP file with testdata files named sstt.in / sstt.out",
    subtaskDefaultTimeLimit: "Default Time Limit (ms)",
    subtaskDefaultMemoryLimit: "Default Memory Limit (KB)",
    testdataFiles: "files",
    testdataVersions: "Testdata Versions",
    testdataNoVersions: "No testdata versions available",
    testdataVersion: "Version",
    testdataDownload: "Download",
    testdataActivate: "Set as Active",
    testdataMustBeZip: "Please upload a ZIP file",
    testdataCreateHint: "Configure testdata structure and upload testdata files. You can also upload later on the edit page.",
    testdataOptional: "Testdata is optional, you can upload later on the edit page",
    testdataDropOrClick: "Drop file here, or click to select",
    testdataZipFormat: "ZIP format supported, filename: sstt.in / sstt.out",
    testdataParsing: "Parsing...",
    testdataNoSubtasksDetected: "No subtasks detected (ensure filename format is sstt.in / sstt.out)",
    testdataParseError: "Failed to parse ZIP file",
    testdataDetected: "Detected {subtasks} subtasks with {cases} test cases, auto-scored",
    testdataPointsUnit: "pts",
    testdataShouldBe100: "total should be 100",
    testdataAdvancedSettings: "Advanced settings (time/memory limits)",
    testdataPerSubtaskOverrides: "Per-subtask overrides (leave empty for defaults)",
    testdataHelpButton: "File format help",
    testdataHelpTitle: "Test Data File Format",
    testdataHelpIntro: "Test data must be uploaded as a ZIP file. File naming must follow these rules:",
    testdataHelpFormat: "Filename Format",
    testdataHelpFormatDesc: "sstt.in and sstt.out, where ss is the subtask number (00-99) and tt is the test case number (00-99).",
    testdataHelpExample: "Example Structure",
    testdataHelpExampleDesc: "For 2 subtasks, with Subtask 0 having 2 sample cases and Subtask 1 having 3 test cases:",
    testdataHelpSubtask0: "Subtask 0 (sample, 0 pts): 0000.in, 0000.out, 0001.in, 0001.out",
    testdataHelpSubtask1: "Subtask 1 (100 pts): 0100.in, 0100.out, 0101.in, 0101.out, 0102.in, 0102.out",
    testdataHelpNote: "Note: Subtask 0 is reserved for sample test cases (0 points) and will be shown on the problem page for students to reference.",
    testdataHelpClose: "Close",
    // Copycat (Plagiarism Detection)
    copycatTitle: "Plagiarism Detection",
    copycatBackToProblems: "Back to Problems",
    copycatProblemLabel: "Problem",
    copycatCourseLabel: "Course",
    copycatLoginRequired: "Please log in to view this page.",
    copycatLoginButton: "Log In",
    copycatCourseNotFound: "Course not found.",
    copycatNoPermission: "You do not have permission to view this page.",
    copycatNoPermissionHint: "Only TAs and Teachers can access plagiarism detection.",
    copycatNoReport: "No plagiarism report exists for this problem. Click below to generate one.",
    copycatNoReportHint: "The analysis may take a few minutes.",
    copycatGenerateButton: "Generate Report",
    copycatGenerating: "Generating...",
    copycatPreviousFailed: "Previous analysis failed:",
    copycatRetryHint: "Click below to retry the analysis.",
    copycatPending: "Waiting in queue...",
    copycatRunning: "Analyzing submissions...",
    copycatAutoRefreshHint: "This may take a few minutes. The page will refresh automatically.",
    copycatSummaryLanguages: "Languages",
    copycatSummaryAvgSimilarity: "Avg Similarity",
    copycatSummaryMaxSimilarity: "Max Similarity",
    copycatSummarySuspiciousPairs: "Suspicious Pairs",
    copycatReportStudents: "Students",
    copycatReportSubmissions: "Submissions",
    copycatReportGenerated: "Generated",
    copycatReportRequestedBy: "Requested by",
    copycatFilterMinSimilarity: "Min Similarity:",
    copycatFilterLanguage: "Language:",
    copycatFilterAll: "All",
    copycatTableStudentA: "Student A",
    copycatTableStudentB: "Student B",
    copycatTableLanguage: "Language",
    copycatTableSimilarity: "Similarity",
    copycatTableRisk: "Risk",
    copycatRiskHigh: "High Risk",
    copycatRiskMedium: "Medium Risk",
    copycatLoadingPairs: "Loading pairs...",
    copycatNoPairs: "No pairs found with the current filters.",
    copycatPaginationPrev: "Previous",
    copycatPaginationNext: "Next",
    copycatPaginationPage: "Page {current} of {total}",
    copycatDeleteReport: "Delete Report",
    copycatRegenerateReport: "Regenerate Report",
    copycatButtonLabel: "Copycat",
    copycatButtonTitle: "Plagiarism Detection",
    copycatErrorNoSubmissions: "No submissions available for analysis. At least 2 different students' submissions are required.",
    copycatErrorAnalysisFailed: "Analysis failed. Please try again later.",
    copycatCompareTitle: "Code Comparison",
    copycatCompareClose: "Close",
    copycatCompareLoading: "Loading code...",
    copycatCompareClickHint: "Click on a pair to view code comparison",
    upload: "Upload",
    uploading: "Uploading...",
    loading: "Loading...",
    downloading: "Downloading...",
    activating: "Activating...",
    editorFontSize: "Font Size",
    // Email Domain Management
    emailDomainsTitle: "Email Domain Management",
    emailDomainsSubtitle: "Manage allowed and blocked email domains for user registration.",
    emailDomainsBackToAdmin: "Back to Admin",
    emailDomainsAllowedCount: "Allowed Domains",
    emailDomainsBlockedCount: "Custom Blocked Domains",
    emailDomainsDisposableCount: "Disposable Domains (File)",
    emailDomainsHowItWorksTitle: "How email validation works:",
    emailDomainsHowItWorks1: "Allowed list is checked first. If the domain matches, registration is allowed.",
    emailDomainsHowItWorks2: "Patterns like *.edu.tw match any subdomain (e.g., ntnu.edu.tw).",
    emailDomainsHowItWorks3: "If not in allowed list, blocked list is checked (custom + disposable file).",
    emailDomainsHowItWorks4: "If not in any allowed list, registration is blocked by default (whitelist mode).",
    emailDomainsTabAllowed: "Allowed Domains",
    emailDomainsTabBlocked: "Blocked Domains",
    emailDomainsAddAllowed: "Add Allowed Domain",
    emailDomainsAddBlocked: "Add Blocked Domain",
    emailDomainsDomainPlaceholder: "e.g., gmail.com or *.edu.tw",
    emailDomainsNotePlaceholder: "Note (optional)",
    emailDomainsAdd: "Add",
    emailDomainsColDomain: "Domain",
    emailDomainsColNote: "Note",
    emailDomainsColEnabled: "Enabled",
    emailDomainsColActions: "Actions",
    emailDomainsEmpty: "No domains found. Add one above.",
    emailDomainsEdit: "Edit",
    emailDomainsDelete: "Delete",
    emailDomainsSave: "Save",
    emailDomainsCancel: "Cancel",
    emailDomainsDeleteConfirm: "Are you sure you want to delete this domain?",
    emailDomainsAddedSuccess: "Domain added successfully",
    emailDomainsUpdatedSuccess: "Domain updated successfully",
    emailDomainsDeletedSuccess: "Domain deleted successfully",
    emailDomainsShowing: "Showing {count} of {total} domains",
    emailDomainsAccessDenied: "Access denied. Admin privileges required.",
    // Bulk Create Users
    bulkCreateUsersTitle: "Bulk Create Users",
    bulkCreateUsersSubtitle: "Create multiple user accounts at once",
    bulkCreateUsersBackToAdmin: "Back to Admin",
    bulkCreateUsersAccessDenied: "Access denied. Admin privileges required.",
    bulkCreateUsersEmailsLabel: "Email Addresses",
    bulkCreateUsersEmailCount: "email(s)",
    bulkCreateUsersEmailsPlaceholder: "Enter one email per line\nuser1@example.com\nuser2@example.com",
    bulkCreateUsersEmailsHint: "Separate emails by new lines, commas, or semicolons",
    bulkCreateUsersAutoVerifyLabel: "Auto-verify Email",
    bulkCreateUsersAutoVerifyHint: "Skip email verification step for created accounts",
    bulkCreateUsersPasswordModeLabel: "Password Setting",
    bulkCreateUsersPasswordRandom: "Generate random passwords",
    bulkCreateUsersPasswordRandomHint: "Each user will receive a unique random password via email",
    bulkCreateUsersPasswordSpecified: "Use specified password",
    bulkCreateUsersPasswordSpecifiedHint: "All users will have the same initial password",
    bulkCreateUsersPasswordLabel: "Password",
    bulkCreateUsersPasswordPlaceholder: "Enter password (min 8 characters)",
    bulkCreateUsersConfirmPasswordLabel: "Confirm Password",
    bulkCreateUsersConfirmPasswordPlaceholder: "Re-enter password",
    bulkCreateUsersCourseLabel: "Add to Course (Optional)",
    bulkCreateUsersNoCourse: "-- Don't add to any course --",
    bulkCreateUsersCourseHint: "Users will be added as students to the selected course",
    bulkCreateUsersSubmit: "Create {count} User(s)",
    bulkCreateUsersSubmitting: "Creating users...",
    bulkCreateUsersNoEmails: "Please enter at least one valid email address",
    bulkCreateUsersPasswordTooShort: "Password must be at least 8 characters",
    bulkCreateUsersPasswordMismatch: "Passwords do not match",
    bulkCreateUsersSuccess: "{count} user(s) created successfully",
    bulkCreateUsersCreatedTitle: "Successfully Created",
    bulkCreateUsersSkippedTitle: "Skipped",
    bulkCreateUsersErrorsTitle: "Errors",
    bulkCreateUsersPasswordSent: "password sent",
    bulkCreateUsersReasonEmailExists: "email already exists",
    // Blocked Submissions
    blockedSubmissionsTitle: "Blocked Submissions",
    blockedSubmissionsSubtitle: "Code submissions blocked by AI safety check",
    blockedSubmissionsBackToAdmin: "Back to Admin",
    blockedSubmissionsAccessDenied: "Access denied. Admin privileges required.",
    blockedSubmissionsThreatType: "Threat Type",
    blockedSubmissionsAllTypes: "All Types",
    blockedSubmissionsClearFilters: "Clear Filters",
    blockedSubmissionsTime: "Time",
    blockedSubmissionsUser: "User",
    blockedSubmissionsProblem: "Problem",
    blockedSubmissionsType: "Type",
    blockedSubmissionsThreat: "Threat",
    blockedSubmissionsLanguage: "Language",
    blockedSubmissionsActions: "Actions",
    blockedSubmissionsEmpty: "No blocked submissions found",
    blockedSubmissionsViewDetail: "View",
    blockedSubmissionsShowing: "Showing",
    blockedSubmissionsOf: "of",
    blockedSubmissionsPrev: "Previous",
    blockedSubmissionsNext: "Next",
    blockedSubmissionsDetailTitle: "Blocked Submission Detail",
    blockedSubmissionsReason: "Reason (shown to user)",
    blockedSubmissionsAnalysis: "AI Analysis (admin only)",
    blockedSubmissionsSourceCode: "Source Code",
    blockedSubmissionsClose: "Close",
    // Demo Data Generator
    demoDataTitle: "Demo Data Generator",
    demoDataDescription:
      "Generate or clear demo data for testing purposes. This includes users, problems, courses, and more.",
    demoDataBackToAdmin: "Back to Admin",
    demoDataForbidden: "Access denied. Admin only.",
    demoDataCurrentStatus: "Current Status",
    demoDataAdminUser: "Admin User",
    demoDataDemoUsers: "Demo Users",
    demoDataPublicProblems: "Public Problems",
    demoDataCourses: "Courses",
    demoDataGenerateButton: "Generate Demo Data",
    demoDataGenerating: "Generating...",
    demoDataClearButton: "Clear Demo Data",
    demoDataClearing: "Clearing...",
    demoDataClearSuccess: "Demo Data Cleared Successfully",
    demoDataUsersDeleted: "Users deleted",
    demoDataProblemsDeleted: "Problems deleted",
    demoDataCoursesDeleted: "Courses deleted",
    demoDataGenerateSuccess: "Demo Data Generated Successfully",
    demoDataUsersCreated: "Users created",
    demoDataProblemsCreated: "Problems created",
    demoDataCoursesCreated: "Courses created",
    demoDataSkipped: "skipped",
    demoDataAdminUserCreated: "Admin User Created",
    demoDataDemoUsersCreated: "Demo Users Created",
    demoDataPublicProblemsCreated: "Public Problems",
    demoDataUsername: "Username",
    demoDataEmail: "Email",
    demoDataPassword: "Password",
    demoDataPasswordWarning:
      "These passwords will only be shown once. Please save them now.",
    demoDataExists: "exists",
    demoDataProblems: "Problems",
    demoDataMembers: "Members",
    demoDataHomeworks: "Homeworks",
    demoDataAnnouncements: "Announcements",
    demoDataConfirmGenerate: "Confirm Generate Demo Data",
    demoDataConfirmGenerateMessage:
      "This will create demo users, problems, courses, and other data. Existing demo data will be skipped. Are you sure?",
    demoDataConfirmClear: "Confirm Clear Demo Data",
    demoDataConfirmClearMessage:
      "This will permanently delete all demo users, problems, and courses. This action cannot be undone. Are you sure?",
    demoDataConfirmClearButton: "Yes, Clear All",
    // Footer
    footerBrand: "NOJ Team4 Online Judge Platform",
    footerTermsOfService: "Terms of Service",
    footerPrivacyPolicy: "Privacy Policy",
    footerCopyright: "© {year} NOJ Team4. All rights reserved.",
    // Terms of Service page
    termsOfServiceTitle: "Terms of Service",
    termsOfServiceLastUpdated: "Last updated: December 27, 2025",
    termsOfServiceContent: `Welcome to **NOJ Team4 Online Judge Platform** (hereinafter referred to as "the Platform"). By accessing or using the Platform, you agree to be bound by these Terms of Service. Please read the following carefully before use.

---

## Description of Service

The Platform provides the following services:

- **Online Problem Solving**: Various programming problems for practice
- **Course Management**: Support for instructors to create courses, assign homework and exams
- **Code Evaluation**: Automated testing and real-time feedback system
- **Learning Records**: Track problem-solving progress and submission history

---

## User Responsibilities

By using the Platform, you agree to:

1. **Account Management**
   - Provide accurate and truthful personal information during registration
   - Keep your account credentials secure and not share them with others
   - Be responsible for all activities conducted through your account

2. **Code of Conduct**
   - Not use the Platform for any illegal activities
   - Not upload code containing malicious programs, viruses, or harmful content
   - Not attempt to damage, interfere with, or gain unauthorized access to Platform systems
   - Respect other users and refrain from harassment or inappropriate behavior

3. **Academic Integrity**
   - Complete assignments and exams independently unless collaboration is explicitly permitted
   - Not plagiarize or share solutions with others

---

## Intellectual Property

- Problems, test data, system interfaces, and related content on the Platform are protected by copyright law and may not be copied or distributed without authorization.
- Copyright of code submitted by users belongs to the users. However, you agree to grant the Platform license to use your code for the following purposes:
  - Executing evaluations and providing feedback
  - Educational research and statistical analysis (de-identified)
  - System maintenance and improvement

---

## Service Changes and Termination

- The Platform reserves the right to modify, suspend, or terminate all or part of the services at any time without prior notice.
- If you violate these terms, the Platform has the right to suspend or terminate your account.

---

## Disclaimer

- The Platform provides services on an "as-is" basis and does not guarantee uninterrupted or completely error-free service.
- The Platform is not liable for any direct or indirect damages resulting from the use of the Platform.
- The Platform is not responsible for content submitted by users.

---

## Terms Revision

The Platform reserves the right to revise these terms at any time. Revised terms will be posted on this page with an updated "Last Updated" date. Continued use of the Platform constitutes acceptance of the revised terms.

---

If you have any questions about these Terms of Service, please contact us.`,
    // Privacy Policy page
    privacyPolicyTitle: "Privacy Policy",
    privacyPolicyLastUpdated: "Last updated: December 27, 2025",
    privacyPolicyContent: `**NOJ Team4 Online Judge Platform** (hereinafter referred to as "the Platform") highly values your privacy. This Privacy Policy explains how we collect, use, protect, and handle your personal data.

---

## Data Collection

When you use the Platform, we may collect the following types of information:

### Data You Provide

| Data Type | Description |
|-----------|-------------|
| **Account Data** | Username, email address, password (stored encrypted) |
| **Profile Data** | Avatar, bio (optional) |
| **Submitted Content** | Code and solutions you submit |

### Automatically Collected Data

| Data Type | Description |
|-----------|-------------|
| **Usage Records** | Problem-solving records, submission history, course participation |
| **Technical Information** | IP address, browser type, operating system, device information |
| **Login Information** | Login times, login locations |

---

## Data Usage

We use collected data for the following purposes:

- **Service Provision**: Execute code evaluation, display results, manage courses
- **Account Management**: Verify identity, process password resets, send important notifications
- **Service Improvement**: Analyze usage patterns, optimize platform performance, fix bugs
- **Educational Research**: Conduct de-identified statistical analysis and academic research
- **Security Maintenance**: Detect anomalous activity, prevent abuse and unauthorized access

---

## Data Protection

We take multiple measures to protect your personal data:

- **Encrypted Storage**: Passwords are encrypted using industry-standard hashing algorithms and cannot be recovered
- **Secure Transmission**: All data transmission uses HTTPS encrypted connections
- **Access Control**: Only authorized personnel can access personal data
- **Regular Review**: Security measures are regularly reviewed and updated as necessary

---

## Data Sharing

We **do not sell** your personal data to third parties. We may share your data only in the following circumstances:

- **With Your Consent**: Sharing after obtaining your explicit consent
- **Course-Related**: Sharing your learning records and grades with course instructors (if you are a course participant)
- **Legal Requirements**: Complying with legal requirements or judicial investigations
- **Service Providers**: Sharing with service providers who help us operate the Platform (e.g., cloud services), who are contractually bound to protect your data

---

## Cookie Usage

The Platform uses cookies to:

- Maintain your login status
- Remember your preference settings (e.g., language selection)
- Improve user experience

You can manage or disable cookies through your browser settings, but this may affect the normal operation of some features.

---

## Your Rights

Under applicable privacy regulations, you have the following rights:

- **Right to Access**: Request a copy of your personal data that we hold
- **Right to Rectification**: Request correction of inaccurate or incomplete personal data
- **Right to Erasure**: Request deletion of your personal data
- **Right to Data Portability**: Request your data in a machine-readable format

To exercise these rights, please submit a request through Platform settings or contact us.

---

## Children's Privacy

The Platform is not intended for children under 13 years of age. If we discover that we have inadvertently collected personal data from a child, we will delete it immediately.

---

## Policy Changes

This Privacy Policy may be updated periodically. For significant changes, we will notify you through Platform announcements or email. Updated policies will be posted on this page with an updated "Last Updated" date.

---

If you have any questions about this Privacy Policy, please contact us.`,
  },
};

export const LANGUAGE_LABEL: Record<Locale, string> = {
  "zh-TW": "繁體中文",
  en: "English",
};
