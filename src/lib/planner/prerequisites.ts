function normalizeConnector(value: string) {
  return value
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isAlternativeConnector(value: string) {
  const normalized = normalizeConnector(value);

  if (!normalized) {
    return false;
  }

  if (/\bog\b|\band\b/.test(normalized)) {
    return false;
  }

  return normalized.includes("/") || /\beller\b|\bor\b/.test(normalized);
}

export function derivePrerequisiteGroups(
  prerequisiteText: string | null,
  prerequisiteCourses: string[],
) {
  if (prerequisiteCourses.length === 0) {
    return [];
  }

  if (!prerequisiteText) {
    return prerequisiteCourses.map((courseCode) => [courseCode]);
  }

  const orderedCourses = Array.from(
    prerequisiteText.matchAll(/\b[A-Z]{2,}(?:-[A-Z]+)?\d{3,4}[A-Z0-9-]*\b/g),
    (match) => ({
      code: match[0],
      index: match.index ?? 0,
    }),
  ).filter(({ code }) => prerequisiteCourses.includes(code));

  if (orderedCourses.length === 0) {
    return prerequisiteCourses.map((courseCode) => [courseCode]);
  }

  const groups: string[][] = [[orderedCourses[0].code]];

  for (let index = 1; index < orderedCourses.length; index += 1) {
    const current = orderedCourses[index];
    const previous = orderedCourses[index - 1];
    const between = prerequisiteText.slice(previous.index + previous.code.length, current.index);

    if (isAlternativeConnector(between)) {
      groups.at(-1)?.push(current.code);
      continue;
    }

    groups.push([current.code]);
  }

  return groups.map((group) => Array.from(new Set(group)));
}
