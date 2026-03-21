const termOrder = {
  spring: 0,
  autumn: 1,
} as const;

export type TermSeason = keyof typeof termOrder;

export function parseTermKey(termKey: string) {
  const [yearValue, season] = termKey.split("-");
  const year = Number(yearValue);

  if (!Number.isInteger(year) || !(season in termOrder)) {
    throw new Error(`Invalid term key: ${termKey}`);
  }

  return {
    year,
    season: season as TermSeason,
  };
}

export function compareTermKeys(left: string, right: string) {
  const leftTerm = parseTermKey(left);
  const rightTerm = parseTermKey(right);

  if (leftTerm.year !== rightTerm.year) {
    return leftTerm.year - rightTerm.year;
  }

  return termOrder[leftTerm.season] - termOrder[rightTerm.season];
}

export function termLabel(termKey: string) {
  const { year, season } = parseTermKey(termKey);
  return `${season === "autumn" ? "Autumn" : "Spring"} ${year}`;
}

export function buildSequentialTerms(startTerm: string, count = 6) {
  const terms: string[] = [];
  let { year, season } = parseTermKey(startTerm);

  for (let index = 0; index < count; index += 1) {
    terms.push(`${year}-${season}`);
    if (season === "autumn") {
      year += 1;
      season = "spring";
    } else {
      season = "autumn";
    }
  }

  return terms;
}

export function shiftTermKey(termKey: string, offset: number) {
  if (offset === 0) {
    return termKey;
  }

  let { year, season } = parseTermKey(termKey);
  const step = offset > 0 ? 1 : -1;

  for (let index = 0; index < Math.abs(offset); index += 1) {
    if (step > 0) {
      if (season === "autumn") {
        year += 1;
        season = "spring";
      } else {
        season = "autumn";
      }
    } else if (season === "spring") {
      year -= 1;
      season = "autumn";
    } else {
      season = "spring";
    }
  }

  return `${year}-${season}`;
}
