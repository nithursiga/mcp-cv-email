import fs from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const CV_TEXT_PATH = path.join(DATA_DIR, "resume.txt");

export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function saveResumeText(text: string) {
  ensureDataDir();
  fs.writeFileSync(CV_TEXT_PATH, text, "utf-8");
}

export function loadResumeText(): string | null {
  try {
    return fs.readFileSync(CV_TEXT_PATH, "utf-8");
  } catch {
    return null;
  }
}
