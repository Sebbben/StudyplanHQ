import type { PlannerCourse } from "@/lib/planner/types";

const DEFAULT_BASE_URL = "https://www.uio.no";
const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};
const KNOWN_DEPARTMENT_LABELS: Record<string, string> = {
  ifi: "Informatics",
  fys: "Physics",
  math: "Mathematics, Mechanics and Statistics",
};

export type ImportedCourseRow = PlannerCourse & {
  metadata: Record<string, string | string[] | number | null>;
};

export type CourseDiscoveryItem = {
  code: string;
  credits: number;
  department?: string;
  title: string;
  url: string;
};

export type CourseListingPage = {
  courses: CourseDiscoveryItem[];
  paginationUrls: string[];
};

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, token: string) => {
    const normalizedToken = token.toLowerCase();

    if (normalizedToken.startsWith("#x")) {
      const codePoint = Number.parseInt(normalizedToken.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }

    if (normalizedToken.startsWith("#")) {
      const codePoint = Number.parseInt(normalizedToken.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }

    return HTML_ENTITY_MAP[normalizedToken] ?? entity;
  });
}

function stripTags(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h2|h3|h4)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
}

function normalizeWhitespace(value: string) {
  return decodeHtmlEntities(stripTags(value))
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function toAbsoluteUrl(url: string, baseUrl: string) {
  return new URL(decodeHtmlEntities(url), baseUrl).toString();
}

function humanizeSlug(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function findHeadingSection(html: string, headingPattern: RegExp) {
  const headingMatch = headingPattern.exec(html);
  if (!headingMatch || headingMatch.index === undefined) {
    return null;
  }

  const afterHeading = html.slice(headingMatch.index + headingMatch[0].length);
  const nextHeadingMatch = /<h[23][^>]*>/i.exec(afterHeading);
  return nextHeadingMatch ? afterHeading.slice(0, nextHeadingMatch.index) : afterHeading;
}

function findFirstHeadingSection(html: string, headingPatterns: RegExp[]) {
  for (const pattern of headingPatterns) {
    const section = findHeadingSection(html, pattern);
    if (section) {
      return section;
    }
  }

  return null;
}

function parseFacts(html: string) {
  const factsMatch = html.match(
    /<div class="[^"]*vrtx-(?:facts|frontpage-box)[^"]*"[\s\S]*?<h2>\s*(?:Fakta om emnet|Course facts|Facts about this course)\s*<\/h2>[\s\S]*?<dl>([\s\S]*?)<\/dl>/i,
  );
  if (!factsMatch) {
    return new Map<string, string>();
  }

  const facts = new Map<string, string>();
  const entryPattern = /<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/gi;

  for (const match of factsMatch[1].matchAll(entryPattern)) {
    const term = normalizeWhitespace(match[1]);
    const definition = normalizeWhitespace(match[2]);

    if (term && definition) {
      facts.set(term, definition);
    }
  }

  return facts;
}

function parseCredits(value: string) {
  const normalized = value.replace(",", ".").match(/\d+(?:\.\d+)?/);
  if (!normalized) {
    throw new Error(`Could not parse credits from "${value}".`);
  }

  return Number(normalized[0]);
}

function parseOfferedTerms(value: string) {
  const normalized = value.toLowerCase();
  const terms: Array<"spring" | "autumn"> = [];

  if (normalized.includes("vår") || normalized.includes("spring")) {
    terms.push("spring");
  }

  if (normalized.includes("høst") || normalized.includes("autumn") || normalized.includes("fall")) {
    terms.push("autumn");
  }

  return terms;
}

function parseLanguage(value: string) {
  const normalized = value.toLowerCase();

  if (!normalized) {
    return "Unknown";
  }

  if (normalized.includes("norsk") && normalized.includes("engelsk")) {
    return "Norwegian and English";
  }

  if (normalized.includes("norwegian") && normalized.includes("english")) {
    return "Norwegian and English";
  }

  if (normalized.includes("norsk")) {
    return "Norwegian";
  }

  if (normalized.includes("norwegian")) {
    return "Norwegian";
  }

  if (normalized.includes("engelsk")) {
    return "English";
  }

  if (normalized.includes("english")) {
    return "English";
  }

  return value;
}

function parseDepartment(html: string) {
  const contactMatch = html.match(/<h2>\s*(?:Kontakt|Contact)\s*<\/h2>[\s\S]*?<p>([\s\S]*?)<\/p>/i);
  const contactText = contactMatch ? normalizeWhitespace(contactMatch[1]) : "";

  if (/institutt for informatikk/i.test(contactText)) {
    return "Informatics";
  }

  if (!contactText || contactText.includes("@")) {
    return "";
  }

  return contactText;
}

function parseDepartmentFromBreadcrumb(html: string) {
  const breadcrumbMatches = Array.from(
    html.matchAll(
      /<span class="vrtx-breadcrumb-level[\s\S]*?<a [^>]*>(?:<span>)?([\s\S]*?)(?:<\/span>)?<\/a>/gi,
    ),
    (match) => normalizeWhitespace(match[1]),
  ).filter(Boolean);

  return breadcrumbMatches.at(-1) ?? null;
}

export function inferDepartmentNameFromListing(html: string, url: string) {
  const urlObject = new URL(url);
  const headingMatch = html.match(/<h1>\s*([\s\S]*?)\s*<\/h1>/i);
  const heading = headingMatch ? normalizeWhitespace(headingMatch[1]) : "";

  if (heading) {
    const normalizedHeading = heading
      .replace(/^Emner innen\s+/i, "")
      .replace(/^Courses within\s+/i, "")
      .trim();

    if (normalizedHeading) {
      return normalizedHeading.charAt(0).toUpperCase() + normalizedHeading.slice(1);
    }
  }

  const slug = urlObject.pathname.split("/").filter(Boolean).at(-1) ?? "courses";
  if (slug === "courses") {
    const penultimateSlug = urlObject.pathname.split("/").filter(Boolean).at(-2);
    if (penultimateSlug) {
      return KNOWN_DEPARTMENT_LABELS[penultimateSlug] ?? humanizeSlug(penultimateSlug);
    }
  }

  return KNOWN_DEPARTMENT_LABELS[slug] ?? humanizeSlug(slug);
}

export function extractCourseCodes(value: string) {
  return Array.from(
    new Set(value.match(/\b[A-Z]{2,}(?:-[A-Z]+)?\d{3,4}[A-Z0-9-]*\b/g) ?? []),
  );
}

function parseListingPaginationUrls(html: string, baseUrl: string) {
  const paginationUrls = new Set<string>();
  const paginationPattern =
    /<a href="([^"]+)" class="vrtx-(?:page-number|next)"(?:[^>]*rel="next")?[^>]*>/gi;

  for (const match of html.matchAll(paginationPattern)) {
    paginationUrls.add(toAbsoluteUrl(match[1], baseUrl));
  }

  return Array.from(paginationUrls);
}

export function parseCourseDiscoveryListing(
  html: string,
  baseUrl = DEFAULT_BASE_URL,
): CourseListingPage {
  const results: CourseDiscoveryItem[] = [];
  const seenCodes = new Set<string>();
  const inferredDepartment = inferDepartmentNameFromListing(html, baseUrl);
  const tableRowPattern =
    /<td class="vrtx-course-description-name"><a href="([^"]+)">([^<]+?)\s+[–-]\s+([^<]+)<\/a>[\s\S]*?<\/td>\s*<td class="vrtx-course-description-credits">([\d.,]+)<\/td>/gi;
  const listItemPattern =
    /<li>\s*<a href="([^"]+)">([^<]+?)\s+[–-]\s+([^<]+)<\/a>\s*\(([\d.,]+)\s+studiepoeng[^)]*\)<\/li>/gi;

  for (const match of html.matchAll(tableRowPattern)) {
    const [, href, rawCode, rawTitle, rawCredits] = match;
    const code = normalizeWhitespace(rawCode);

    if (!code || seenCodes.has(code)) {
      continue;
    }

    seenCodes.add(code);
    results.push({
      code,
      credits: parseCredits(rawCredits),
      department: inferredDepartment,
      title: normalizeWhitespace(rawTitle),
      url: toAbsoluteUrl(href, baseUrl),
    });
  }

  for (const match of html.matchAll(listItemPattern)) {
    const [, href, rawCode, rawTitle, rawCredits] = match;
    const code = normalizeWhitespace(rawCode);

    if (!code || seenCodes.has(code)) {
      continue;
    }

    seenCodes.add(code);
    results.push({
      code,
      credits: parseCredits(rawCredits),
      department: inferredDepartment,
      title: normalizeWhitespace(rawTitle),
      url: toAbsoluteUrl(href, baseUrl),
    });
  }

  return {
    courses: results,
    paginationUrls: parseListingPaginationUrls(html, baseUrl),
  };
}

export function parseCourseDiscoveryPage(html: string, baseUrl = DEFAULT_BASE_URL): CourseDiscoveryItem[] {
  return parseCourseDiscoveryListing(html, baseUrl).courses;
}

export function parseCoursePage(
  html: string,
  url: string,
  fallback?: Partial<Pick<CourseDiscoveryItem, "code" | "credits" | "department" | "title">>,
): ImportedCourseRow {
  const headingMatch = html.match(/<h1>\s*([\s\S]*?)\s+[–-]\s+([\s\S]*?)\s*<\/h1>/i);
  if (!headingMatch && (!fallback?.code || !fallback?.title)) {
    throw new Error(`Could not parse course title from ${url}.`);
  }

  const code = normalizeWhitespace(headingMatch?.[1] ?? fallback?.code ?? "");
  const title = normalizeWhitespace(headingMatch?.[2] ?? fallback?.title ?? "");
  const facts = parseFacts(html);
  const creditsValue = facts.get("Studiepoeng") ?? facts.get("Credits");
  const credits = creditsValue ? parseCredits(creditsValue) : fallback?.credits;

  if (credits == null) {
    throw new Error(`Could not parse credits from ${url}.`);
  }

  const level = facts.get("Nivå") ?? facts.get("Level") ?? "Unknown";
  const offeredTermsRaw = facts.get("Undervisning") ?? facts.get("Teaching") ?? "";
  const languageRaw = facts.get("Undervisningsspråk") ?? facts.get("Teaching language") ?? "";
  const mandatoryPrerequisiteSection = findFirstHeadingSection(html, [
    /<h[23][^>]*>\s*Obligatoriske\s*forkunnskaper\s*<\/h[23]>/i,
    /<h[23][^>]*>\s*Previous knowledge required\s*<\/h[23]>/i,
  ]);
  const recommendedPrerequisiteSection = findFirstHeadingSection(html, [
    /<h[23][^>]*>\s*Anbefalte\s*forkunnskaper\s*<\/h[23]>/i,
    /<h[23][^>]*>\s*Recommended previous knowledge\s*<\/h[23]>/i,
  ]);
  const prerequisiteText = mandatoryPrerequisiteSection ? normalizeWhitespace(mandatoryPrerequisiteSection) : null;
  const recommendedPrerequisiteText = recommendedPrerequisiteSection
    ? normalizeWhitespace(recommendedPrerequisiteSection)
    : null;
  const sourceUpdatedAtMatch = html.match(
    /<span class="last-updated-label"[\s\S]*?<\/span>\s*<span class="last-updated">\s*([\s\S]*?)\s*<\/span>/i,
  );

  return {
    code,
    title,
    credits,
    offeredTerms: parseOfferedTerms(offeredTermsRaw),
    language: parseLanguage(languageRaw),
    level: normalizeWhitespace(level),
    department: fallback?.department || parseDepartment(html) || parseDepartmentFromBreadcrumb(html) || "Unknown",
    officialUrl: url.replace(/\/index\.html$/, "/"),
    prerequisiteText,
    prerequisiteCourses: prerequisiteText
      ? extractCourseCodes(prerequisiteText).filter((courseCode) => courseCode !== code)
      : [],
    tags: [],
    metadata: {
      sourceUrl: url,
      sourceUpdatedAt: sourceUpdatedAtMatch ? normalizeWhitespace(sourceUpdatedAtMatch[1]) : null,
      sourceOfferedTerms: offeredTermsRaw || null,
      sourceLanguage: languageRaw || null,
      recommendedPrerequisiteText,
    },
  };
}
