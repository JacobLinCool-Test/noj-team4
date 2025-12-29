-- AlterTable
ALTER TABLE "HomeworkProblem" ADD COLUMN "allowedLanguagesOverride" "ProgrammingLanguage"[] NOT NULL DEFAULT '{}'::"ProgrammingLanguage"[];
