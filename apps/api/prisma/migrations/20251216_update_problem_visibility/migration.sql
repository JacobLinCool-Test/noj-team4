-- UpdateProblemVisibility: 移除 COURSE_ONLY，簡化可見性邏輯
-- 將所有 COURSE_ONLY 的題目改為 PRIVATE

-- Step 1: 將現有的 COURSE_ONLY 題目改為 PRIVATE (如果存在的話)
-- 使用 DO 區塊來處理可能不存在 COURSE_ONLY 值的情況
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'COURSE_ONLY'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ProblemVisibility')
    ) THEN
        UPDATE "Problem" SET "visibility" = 'PRIVATE' WHERE "visibility" = 'COURSE_ONLY';
    END IF;
END $$;

-- Step 2: 移除枚舉中的 COURSE_ONLY 值
-- 先建立新的枚舉類型
CREATE TYPE "ProblemVisibility_new" AS ENUM ('PUBLIC', 'PRIVATE', 'HIDDEN');

-- 將欄位改為使用新的枚舉類型
ALTER TABLE "Problem" ALTER COLUMN "visibility" DROP DEFAULT;
ALTER TABLE "Problem" ALTER COLUMN "visibility" TYPE "ProblemVisibility_new" USING (
    CASE
        WHEN "visibility"::text = 'COURSE_ONLY' THEN 'PRIVATE'::"ProblemVisibility_new"
        ELSE "visibility"::text::"ProblemVisibility_new"
    END
);
ALTER TABLE "Problem" ALTER COLUMN "visibility" SET DEFAULT 'PUBLIC';

-- 刪除舊的枚舉類型
DROP TYPE "ProblemVisibility";

-- 重新命名新的枚舉類型
ALTER TYPE "ProblemVisibility_new" RENAME TO "ProblemVisibility";
