ALTER TABLE "User"
ADD COLUMN "profileSex" TEXT NOT NULL DEFAULT '';

UPDATE "User" AS user_profile
SET "profileSex" = CASE
  WHEN latest_symptoms."patientSex" = 'female' THEN 'F'
  WHEN latest_symptoms."patientSex" = 'male' THEN 'M'
  ELSE ''
END
FROM (
  SELECT DISTINCT ON ("userId") "userId", "patientSex"
  FROM "SymptomsRequest"
  WHERE "userId" IS NOT NULL
    AND "patientSex" IN ('female', 'male')
  ORDER BY "userId", "createdAt" DESC
) AS latest_symptoms
WHERE user_profile."id" = latest_symptoms."userId"
  AND user_profile."profileSex" = '';

UPDATE "User" AS user_profile
SET "profileSex" = latest_checkup."sex"
FROM (
  SELECT DISTINCT ON ("userId") "userId", "input"->>'sex' AS "sex"
  FROM "CheckupRequest"
  WHERE "userId" IS NOT NULL
    AND "input"->>'sex' IN ('M', 'F')
  ORDER BY "userId", "createdAt" DESC
) AS latest_checkup
WHERE user_profile."id" = latest_checkup."userId"
  AND user_profile."profileSex" = '';
