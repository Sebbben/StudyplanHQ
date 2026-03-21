ALTER TABLE "courses"
ALTER COLUMN "credits" TYPE double precision
USING "credits"::double precision;
