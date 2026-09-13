ALTER TABLE "MedicalPortalUser"
ADD COLUMN "firstName" TEXT NOT NULL DEFAULT '',
ADD COLUMN "paternalSurname" TEXT NOT NULL DEFAULT '',
ADD COLUMN "maternalSurname" TEXT NOT NULL DEFAULT '',
ADD COLUMN "specialty" TEXT;

WITH parsed_names AS (
  SELECT
    "id",
    regexp_split_to_array(btrim("name"), E'\\s+') AS parts
  FROM "MedicalPortalUser"
), normalized_names AS (
  SELECT
    "id",
    parts,
    cardinality(parts) AS part_count
  FROM parsed_names
)
UPDATE "MedicalPortalUser" AS medical_user
SET
  "firstName" = CASE
    WHEN normalized_names.part_count <= 1 THEN COALESCE(normalized_names.parts[1], '')
    WHEN normalized_names.part_count = 2 THEN normalized_names.parts[1]
    ELSE array_to_string(normalized_names.parts[1:normalized_names.part_count - 2], ' ')
  END,
  "paternalSurname" = CASE
    WHEN normalized_names.part_count = 2 THEN normalized_names.parts[2]
    WHEN normalized_names.part_count >= 3 THEN normalized_names.parts[normalized_names.part_count - 1]
    ELSE ''
  END,
  "maternalSurname" = CASE
    WHEN normalized_names.part_count >= 3 THEN normalized_names.parts[normalized_names.part_count]
    ELSE ''
  END
FROM normalized_names
WHERE medical_user."id" = normalized_names."id";
