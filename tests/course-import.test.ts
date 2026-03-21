import { describe, expect, test } from "bun:test";

import {
  extractCourseCodes,
  inferDepartmentNameFromListing,
  parseCourseDiscoveryListing,
  parseCourseDiscoveryPage,
  parseCoursePage,
} from "@/lib/courses/import";

const indexFixture = `
  <table id="vrtx-course-description-listing-results">
    <tbody>
      <tr>
        <td class="vrtx-course-description-name"><a href="/studier/emner/matnat/ifi/IN1000/index.html">IN1000 – Introduksjon til objektorientert programmering</a></td>
        <td class="vrtx-course-description-credits">10</td>
      </tr>
      <tr>
        <td class="vrtx-course-description-name"><a href="/studier/emner/matnat/ifi/IN2000/index.html">IN2000 – Software Engineering med prosjektarbeid</a></td>
        <td class="vrtx-course-description-credits">20</td>
      </tr>
    </tbody>
  </table>
`;

const paginatedIndexFixture = `
  <h1>Emner innen humanistiske fag</h1>
  <table id="vrtx-course-description-listing-results">
    <tbody>
      <tr>
        <td class="vrtx-course-description-name"><a href="/studier/emner/hf/ifikk/FIL1001/index.html">FIL1001 – Examen philosophicum</a></td>
        <td class="vrtx-course-description-credits">10</td>
      </tr>
    </tbody>
  </table>
  <nav class="vrtx-pagination-wrapper">
    <a href="https://www.uio.no/studier/emner/hf/?page=2&amp;u-page=2" class="vrtx-page-number">2</a>
    <a href="https://www.uio.no/studier/emner/hf/?page=3&amp;u-page=3" class="vrtx-page-number">3</a>
    <a href="https://www.uio.no/studier/emner/hf/?page=2&amp;u-page=2" class="vrtx-next" rel="next">Neste side</a>
  </nav>
`;

const listIndexFixture = `
  <h1>Norwegian for Academics (NORA)</h1>
  <ul>
    <li><a href="https://www.uio.no/studier/emner/iss/nora-sommerskolen/NORA0110/index.html">NORA0110 – Elementary Norwegian Level I</a> (15 studiepoeng, A2)</li>
    <li><a href="https://www.uio.no/studier/emner/iss/nora-sommerskolen/NORA0120/index.html">NORA0120 – Intermediate Norwegian Level 2</a> (15 studiepoeng, B1)</li>
  </ul>
`;

const courseFixture = `
  <div id="vrtx-main-content">
    <h1>IN1010 – Objektorientert programmering</h1>
    <h3 id="prerequisite-knowledge">Obligatoriske forkunnskaper</h3>
    <p>Du må ha fullført IN1000 eller tilsvarende. IN1900 kan også godkjennes.</p>
    <h3 id="recommended-knowledge">Anbefalte forkunnskaper</h3>
    <p>Det er nyttig å ha sett MAT1100.</p>
    <h2 id="teaching">Undervisning</h2>
    <p>Undervisningen går om våren.</p>
  </div>
  <div class="vrtx-date-info">
    <span class="last-updated-label">Sist hentet fra FS (Felles studentsystem)</span>
    <span class="last-updated">21. mars 2026 04:13:03</span>
  </div>
  <div class="vrtx-facts vrtx-distach-bottom">
    <h2>Fakta om emnet</h2>
    <dl>
      <dt>Nivå</dt>
      <dd>Bachelor</dd>
      <dt>Studiepoeng</dt>
      <dd>10</dd>
      <dt>Undervisning</dt>
      <dd>Vår</dd>
      <dt>Undervisningsspråk</dt>
      <dd>Norsk</dd>
    </dl>
  </div>
  <div class="vrtx-frontpage-box">
    <h2>Kontakt</h2>
    <p><a href="http://www.mn.uio.no/ifi/studier/kontakt/">Institutt for informatikk</a></p>
  </div>
`;

const decimalCreditsFixture = `
  <div id="vrtx-main-content">
    <h1>ITEVU4120 – Verdien av data i beslutningsprosesser</h1>
  </div>
  <div class="vrtx-facts vrtx-distach-bottom">
    <h2>Fakta om emnet</h2>
    <dl>
      <dt>Nivå</dt>
      <dd>Master</dd>
      <dt>Studiepoeng</dt>
      <dd>2.5</dd>
      <dt>Undervisning</dt>
      <dd>Høst</dd>
      <dt>Undervisningsspråk</dt>
      <dd>Engelsk</dd>
    </dl>
  </div>
  <div class="vrtx-frontpage-box">
    <h2>Kontakt</h2>
    <p><a href="http://www.mn.uio.no/ifi/studier/kontakt/">Institutt for informatikk</a></p>
  </div>
`;

const englishFactsFixture = `
  <div id="vrtx-main-content">
    <h1>IN3210 – Human-computer interaction</h1>
  </div>
  <div class="vrtx-facts vrtx-distach-bottom">
    <h2>Course facts</h2>
    <dl>
      <dt>Level</dt>
      <dd>Master</dd>
      <dt>Credits</dt>
      <dd>10</dd>
      <dt>Teaching</dt>
      <dd>Spring</dd>
      <dt>Teaching language</dt>
      <dd>English</dd>
    </dl>
  </div>
  <div class="vrtx-frontpage-box">
    <h2>Kontakt</h2>
    <p><a href="http://www.mn.uio.no/ifi/studier/kontakt/">Institutt for informatikk</a></p>
  </div>
`;

const alternateFactsFixture = `
  <div id="vrtx-main-content">
    <h1>ITLED5930 – Masteroppgave i digitalisering og ledelse</h1>
  </div>
  <div class="vrtx-frontpage-box vrtx-distach-bottom">
    <h2>Fakta om emnet</h2>
    <dl>
      <dt>Studiepoeng</dt>
      <dd>30</dd>
      <dt>Nivå</dt>
      <dd>Master</dd>
      <dt>Undervisning</dt>
      <dd>Vår og høst</dd>
      <dt>Undervisningsspråk</dt>
      <dd>Norsk</dd>
    </dl>
  </div>
  <div class="vrtx-frontpage-box">
    <h2>Kontakt</h2>
    <p><a href="mailto:evustudier@ifi.uio.no">evustudier@ifi.uio.no</a></p>
  </div>
`;

const englishFactsAboutCourseFixture = `
  <div id="vrtx-main-content">
    <h1>IN3210 – Network and Communications Security</h1>
    <h3 id="recommended-knowledge">Recommended previous knowledge</h3>
    <p>General knowledge about networking and computer security, e.g. IN2140 and IN2120.</p>
  </div>
  <div class="vrtx-frontpage-box vrtx-distach-bottom">
    <h2>Facts about this course</h2>
    <dl>
      <dt>Level</dt>
      <dd>Master</dd>
      <dt>Credits</dt>
      <dd>10</dd>
      <dt>Teaching</dt>
      <dd>Spring</dd>
      <dt>Teaching language</dt>
      <dd>English</dd>
    </dl>
  </div>
`;

describe("course import parsing", () => {
  test("extracts course discovery rows from the IFI listing page", () => {
    const results = parseCourseDiscoveryPage(indexFixture, "https://www.uio.no/studier/emner/matnat/ifi/");

    expect(results).toEqual([
      {
        code: "IN1000",
        credits: 10,
        department: "Informatics",
        title: "Introduksjon til objektorientert programmering",
        url: "https://www.uio.no/studier/emner/matnat/ifi/IN1000/index.html",
      },
      {
        code: "IN2000",
        credits: 20,
        department: "Informatics",
        title: "Software Engineering med prosjektarbeid",
        url: "https://www.uio.no/studier/emner/matnat/ifi/IN2000/index.html",
      },
    ]);
  });

  test("extracts pagination links from listing pages", () => {
    const results = parseCourseDiscoveryListing(
      paginatedIndexFixture,
      "https://www.uio.no/studier/emner/hf/",
    );

    expect(results.courses).toEqual([
      {
        code: "FIL1001",
        credits: 10,
        department: "Humanistiske fag",
        title: "Examen philosophicum",
        url: "https://www.uio.no/studier/emner/hf/ifikk/FIL1001/index.html",
      },
    ]);
    expect(results.paginationUrls).toEqual([
      "https://www.uio.no/studier/emner/hf/?page=2&u-page=2",
      "https://www.uio.no/studier/emner/hf/?page=3&u-page=3",
    ]);
  });

  test("extracts discovery rows from list-based course overviews", () => {
    const results = parseCourseDiscoveryPage(
      listIndexFixture,
      "https://www.uio.no/studier/emner/norskkurs/nora/",
    );

    expect(results).toEqual([
      {
        code: "NORA0110",
        credits: 15,
        department: "Norwegian for Academics (NORA)",
        title: "Elementary Norwegian Level I",
        url: "https://www.uio.no/studier/emner/iss/nora-sommerskolen/NORA0110/index.html",
      },
      {
        code: "NORA0120",
        credits: 15,
        department: "Norwegian for Academics (NORA)",
        title: "Intermediate Norwegian Level 2",
        url: "https://www.uio.no/studier/emner/iss/nora-sommerskolen/NORA0120/index.html",
      },
    ]);
  });

  test("infers department names from non-IFI listing pages", () => {
    expect(
      inferDepartmentNameFromListing(
        "<h1>Emner innen matematikk, mekanikk og statistikk</h1>",
        "https://www.uio.no/studier/emner/matnat/math/",
      ),
    ).toBe("Matematikk, mekanikk og statistikk");
  });

  test("parses a course page into the import shape", () => {
    const course = parseCoursePage(
      courseFixture,
      "https://www.uio.no/studier/emner/matnat/ifi/IN1010/index.html",
    );

    expect(course.code).toBe("IN1010");
    expect(course.title).toBe("Objektorientert programmering");
    expect(course.credits).toBe(10);
    expect(course.offeredTerms).toEqual(["spring"]);
    expect(course.language).toBe("Norwegian");
    expect(course.level).toBe("Bachelor");
    expect(course.department).toBe("Informatics");
    expect(course.prerequisiteText).toContain("IN1000");
    expect(course.prerequisiteCourses).toEqual(["IN1000", "IN1900"]);
    expect(course.prerequisiteCourses).not.toContain("MAT1100");
    expect(course.metadata.recommendedPrerequisiteText).toContain("MAT1100");
    expect(course.metadata.sourceUpdatedAt).toBe("21. mars 2026 04:13:03");
  });

  test("preserves decimal credits for imported courses", () => {
    const course = parseCoursePage(
      decimalCreditsFixture,
      "https://www.uio.no/studier/emner/matnat/ifi/ITEVU4120/index.html",
    );

    expect(course.credits).toBe(2.5);
    expect(course.offeredTerms).toEqual(["autumn"]);
    expect(course.language).toBe("English");
  });

  test("supports course pages with English fact labels", () => {
    const course = parseCoursePage(
      englishFactsFixture,
      "https://www.uio.no/studier/emner/matnat/ifi/IN3210/index-eng.html",
    );

    expect(course.code).toBe("IN3210");
    expect(course.level).toBe("Master");
    expect(course.credits).toBe(10);
    expect(course.offeredTerms).toEqual(["spring"]);
    expect(course.language).toBe("English");
  });

  test("falls back to listing credits when the course facts block is incomplete", () => {
    const course = parseCoursePage(
      `
        <div id="vrtx-main-content">
          <h1>ITLED5930 – Masteroppgave i digitalisering og ledelse</h1>
        </div>
      `,
      "https://www.uio.no/studier/emner/matnat/ifi/ITLED5930/index.html",
      {
        code: "ITLED5930",
        title: "Masteroppgave i digitalisering og ledelse",
        credits: 30,
      },
    );

    expect(course.credits).toBe(30);
    expect(course.code).toBe("ITLED5930");
  });

  test("supports alternate facts containers and ignores email-only contact blocks", () => {
    const course = parseCoursePage(
      alternateFactsFixture,
      "https://www.uio.no/studier/emner/matnat/ifi/ITLED5930/index.html",
      { department: "Informatics" },
    );

    expect(course.credits).toBe(30);
    expect(course.level).toBe("Master");
    expect(course.offeredTerms).toEqual(["spring", "autumn"]);
    expect(course.language).toBe("Norwegian");
    expect(course.department).toBe("Informatics");
  });

  test("supports english pages using the 'Facts about this course' heading", () => {
    const course = parseCoursePage(
      englishFactsAboutCourseFixture,
      "https://www.uio.no/studier/emner/matnat/ifi/IN3210/index.html",
    );

    expect(course.level).toBe("Master");
    expect(course.credits).toBe(10);
    expect(course.offeredTerms).toEqual(["spring"]);
    expect(course.language).toBe("English");
    expect(course.prerequisiteCourses).toEqual([]);
    expect(course.metadata.recommendedPrerequisiteText).toContain("IN2140");
  });

  test("does not turn recommended knowledge into mandatory prerequisite warnings", () => {
    const course = parseCoursePage(
      `
        <div id="vrtx-main-content">
          <h1>IN5000 – Qualitative Research Methods</h1>
          <h3 id="recommended-knowledge">Recommended previous knowledge</h3>
          <p>IN1010 and IN2010 are recommended.</p>
        </div>
        <div class="vrtx-frontpage-box vrtx-distach-bottom">
          <h2>Facts about this course</h2>
          <dl>
            <dt>Level</dt>
            <dd>Master</dd>
            <dt>Credits</dt>
            <dd>10</dd>
            <dt>Teaching</dt>
            <dd>Autumn</dd>
            <dt>Teaching language</dt>
            <dd>English</dd>
          </dl>
        </div>
      `,
      "https://www.uio.no/studier/emner/matnat/ifi/IN5000/index.html",
    );

    expect(course.prerequisiteText).toBeNull();
    expect(course.prerequisiteCourses).toEqual([]);
    expect(course.metadata.recommendedPrerequisiteText).toContain("IN1010");
  });

  test("extracts unique prerequisite codes from free text", () => {
    expect(extractCourseCodes("Krever IN1000, IN1000 og IN-GEO1900 eller IN4260MCT.")).toEqual([
      "IN1000",
      "IN-GEO1900",
      "IN4260MCT",
    ]);
  });
});
