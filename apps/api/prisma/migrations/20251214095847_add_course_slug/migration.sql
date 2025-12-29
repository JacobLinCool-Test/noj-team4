-- AlterTable
ALTER TABLE "Course" ADD COLUMN "slug" TEXT;

-- Generate slugs for existing courses
-- Format: {code}-{term} converted to lowercase and URL-safe
UPDATE "Course"
SET "slug" = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      CONCAT(code, '-', term),
      '[^a-zA-Z0-9-]',
      '-',
      'g'
    ),
    '-+',
    '-',
    'g'
  )
)
WHERE "slug" IS NULL;

-- Handle potential duplicates by appending ID
UPDATE "Course" c1
SET "slug" = CONCAT(c1."slug", '-', c1.id)
WHERE EXISTS (
  SELECT 1 FROM "Course" c2
  WHERE c2."slug" = c1."slug" AND c2.id < c1.id
);

-- CreateIndex
CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");

-- CreateIndex
CREATE INDEX "Course_slug_idx" ON "Course"("slug");
