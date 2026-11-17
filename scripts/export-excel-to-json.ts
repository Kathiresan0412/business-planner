import fs from "node:fs/promises";
import path from "node:path";
import { readFile, utils } from "xlsx";

const PHASES = [
  "Research & Setup",
  "Build Presence",
  "First Samples/Launch",
  "Active Outreach",
  "First Customer",
  "Iterate & Improve",
  "Scale & Systems",
] as const;

const SLUGS_BY_NUMBER: Record<number, string> = {
  1: "content-writing",
  2: "social-media-management",
  3: "video-editing",
  4: "reselling",
  5: "online-tuition",
  6: "print-on-demand",
  7: "affiliate-marketing",
  8: "digital-products",
  9: "local-service-aggregator",
  10: "freelance-web-dev",
};

const FILE_NAME = "Full_90Day_Business_Plan.xlsx";
const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const EXCEL_PATH = path.join(DATA_DIR, FILE_NAME);
const TEMPLATE_PATH = path.join(DATA_DIR, "templates.json");
const TASKS_PATH = path.join(DATA_DIR, "tasks.json");

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

const normalizeCurrencyLabel = (value: string) => value.replace(/₹\s*/g, "LKR ");

const toNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const parseDaysToFirstIncome = (value: unknown) => {
  if (typeof value !== "string") {
    return 0;
  }

  const match = value.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 0;
};

const normalizePhase = (value: unknown) => {
  const text = String(value ?? "").trim();
  const phaseMatch = PHASES.find((phase) => phase.toLowerCase() === text.toLowerCase());
  if (phaseMatch) {
    return phaseMatch;
  }
  if (!text) {
    return "Research & Setup";
  }
  throw new Error(`Unknown plan phase "${text}".`);
};

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function readExcelRows(sheetName: string) {
  const workbook = readFile(EXCEL_PATH);
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" was not found in ${FILE_NAME}.`);
  }

  return utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, blankrows: false });
}

function getOverviewSheetName(workbook: ReturnType<typeof readFile>) {
  const sheetNames = workbook.SheetNames.map((name) => name.toLowerCase());
  const match = sheetNames.find((name) => name.includes("master") || name.includes("overview"));
  return match ? workbook.SheetNames[sheetNames.indexOf(match)] : workbook.SheetNames[0];
}

function getBusinessRows() {
  const workbook = readFile(EXCEL_PATH);
  const overviewSheetName = getOverviewSheetName(workbook);
  const rows = utils.sheet_to_json<string[]>(workbook.Sheets[overviewSheetName], {
    header: 1,
    raw: false,
    blankrows: false,
  });

  const entries: Array<Record<string, string>> = [];

  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 6) {
      continue;
    }

    const firstCell = String(row[0] ?? "").trim();
    const businessName = String(row[1] ?? "").trim();

    if (!/^\d+$/.test(firstCell) || !businessName) {
      continue;
    }

    entries.push({
      number: String(row[0] ?? "").trim(),
      name: businessName,
      investment: String(row[2] ?? "").trim(),
      incomePotential: String(row[3] ?? "").trim(),
      sheetName: String(row[4] ?? "").trim(),
      daysToFirstIncome: String(row[5] ?? "").trim(),
    });
  }

  if (!entries.length) {
    throw new Error("No business rows were found in the master overview sheet.");
  }

  return entries;
}

function extractTaskRows(sheetName: string) {
  const rows = readExcelRows(sheetName);
  const headerIndex = rows.findIndex((row) => {
    if (!Array.isArray(row)) {
      return false;
    }

    const values = row.map((cell) => String(cell ?? "").trim().toLowerCase());
    return values[0]?.includes("day") && values[3]?.includes("today") && values[4]?.includes("time");
  });

  if (headerIndex === -1) {
    throw new Error(`No task header row was found for sheet "${sheetName}".`);
  }

  const taskRows: Array<Record<string, string>> = [];

  for (const row of rows.slice(headerIndex + 1)) {
    if (!Array.isArray(row) || row.length === 0) {
      continue;
    }

    const dayValue = String(row[0] ?? "").trim();
    if (!dayValue || !/^\d+$/.test(dayValue)) {
      continue;
    }

    taskRows.push({
      day: String(row[0] ?? "").trim(),
      phase: String(row[2] ?? "").trim(),
      title: String(row[3] ?? "").trim(),
      hours: String(row[4] ?? "").trim(),
    });
  }

  return taskRows;
}

async function main() {
  await ensureDataDir();

  const businessRows = getBusinessRows();
  const templates = businessRows.map((entry, index) => {
    const sheetName = entry.sheetName || `0${index + 1}. ${entry.name}`;
    const number = Number.parseInt(entry.number, 10) || index + 1;
    const slug =
      SLUGS_BY_NUMBER[number] ??
      (slugify((entry.name || sheetName).replace(/\s*\&\s*/g, " and ")) || `business-${index + 1}`);

    return {
      slug,
      number,
      name: entry.name,
      investment: normalizeCurrencyLabel(entry.investment),
      incomePotential: normalizeCurrencyLabel(entry.incomePotential),
      daysToFirstIncome: parseDaysToFirstIncome(entry.daysToFirstIncome),
      sheetName,
      description: "",
      emoji: "",
    };
  });

  const tasks: Array<{
    templateSlug: string;
    day: number;
    phase: string;
    title: string;
    defaultHours: number;
  }> = [];

  const summary: Array<{ businessName: string; daysFound: number; emptyTitleDays: number }> = [];

  for (const template of templates) {
    const refSheet = String(template.sheetName || "").trim();
    const workbook = readFile(EXCEL_PATH);
    const matchingSheet = workbook.SheetNames.find((name) => {
      const normalizedName = name.toLowerCase();
      return normalizedName.includes(refSheet.toLowerCase()) || normalizedName.startsWith(String(template.number).padStart(2, "0"));
    });

    const sheetName = matchingSheet ?? workbook.SheetNames[templates.indexOf(template) + 1] ?? workbook.SheetNames[0];
    const rows = extractTaskRows(sheetName);

    let emptyTitleDays = 0;
    let foundDays = 0;

    for (const row of rows) {
      const day = Number.parseInt(row.day, 10);
      if (!day || day < 1 || day > 90) {
        continue;
      }

      foundDays += 1;
      const title = normalizeCurrencyLabel(String(row.title ?? "").trim());
      if (!title) {
        emptyTitleDays += 1;
      }

      tasks.push({
        templateSlug: template.slug,
        day,
        phase: normalizePhase(row.phase),
        title,
        defaultHours: toNumber(row.hours),
      });
    }

    summary.push({
      businessName: template.name,
      daysFound: foundDays,
      emptyTitleDays,
    });
  }

  const dedupedTasks = Array.from(
    new Map(tasks.map((task) => [`${task.templateSlug}:${task.day}`, task])).values(),
  ).sort((a, b) => a.templateSlug.localeCompare(b.templateSlug) || a.day - b.day);

  await fs.writeFile(TEMPLATE_PATH, `${JSON.stringify(templates, null, 2)}\n`, "utf8");
  await fs.writeFile(TASKS_PATH, `${JSON.stringify(dedupedTasks, null, 2)}\n`, "utf8");

  console.table(summary.map((item) => ({ businessName: item.businessName, daysFound: item.daysFound, emptyTitleDays: item.emptyTitleDays })));
  console.log(`Exported ${templates.length} templates and ${dedupedTasks.length} tasks to ${DATA_DIR}.`);
}

main().catch((error) => {
  console.error("Excel export failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
