// server/src/cv.ts

// --- Lazy import for pdf-parse (avoids ENOENT on Windows) ---
async function pdfParse(buf: Buffer) {
  const mod: any =
    (await import("pdf-parse/lib/pdf-parse.js").catch(() => null)) ??
    (await import("pdf-parse"));
  const pdf = (mod.default ?? mod) as (b: Buffer) => Promise<{ text: string }>;
  return pdf(buf);
}

// --- natural is CommonJS; use a namespace-style access instead of destructuring ---
import natural from "natural";
import { saveResumeText, loadResumeText } from "./storage.js";

// Treat as 'any' to avoid ESM/CJS typing edge cases
const N: any = (natural as any);

// Try to construct tokenizer; if anything is off, we’ll fall back
const tokenizer =
  N && typeof N.WordTokenizer === "function"
    ? new N.WordTokenizer()
    : null;

// Fallback tokenizer (simple, Unicode-aware word split)
function simpleTokenize(s: string): string[] {
  return (s.toLowerCase().match(/\p{L}+\p{M}*|\p{N}+/gu) ?? []);
}

function clean(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export async function parseResumeFromBuffer(
  buf: Buffer,
  mime = "application/pdf"
) {
  let text = "";
  if (mime.includes("pdf")) {
    const res = await pdfParse(buf);
    text = res.text;
  } else {
    // Fallback: treat as utf-8 text
    text = buf.toString("utf-8");
  }
  text = clean(text);
  saveResumeText(text);
  return { ok: true, chars: text.length };
}

export function getResumeTextOrThrow() {
  const txt = loadResumeText();
  if (!txt || !txt.trim()) {
    throw new Error("No résumé loaded yet. Use load_resume first.");
  }
  return txt;
}

export function answerResumeQuestion(question: string | null | undefined) {
  const text = getResumeTextOrThrow();

  // Very naive sentence split
  const sentences = text.split(/(?<=[\.!\?])\s+(?=[A-Z0-9])/g);

  // Build TF-IDF index over sentences using natural's TfIdf
  const TfIdfCtor = N?.TfIdf;
  const tfidf = TfIdfCtor ? new TfIdfCtor() : null;

  // If natural.TfIdf isn't available for some reason, just return a generic message
  if (!tfidf) {
    return {
      answer:
        "Resume loaded, but the NLP library didn’t initialize. Try asking more specific questions, or restart after reinstalling dependencies.",
      evidence: [],
      lastRoleHint: undefined,
    };
  }

  sentences.forEach((s: string) => tfidf.addDocument(s));

  // Tokenize query safely
  const q = (question ?? "").toLowerCase();
  const rawTokens =
    tokenizer && typeof tokenizer.tokenize === "function"
      ? (tokenizer.tokenize(q) as string[])
      : simpleTokenize(q);

  // Stem tokens if available, else keep raw tokens
  const stemmer = N?.PorterStemmer;
  const queryTokens = stemmer
    ? rawTokens.map((t) => stemmer.stem(t))
    : rawTokens;

  // Score sentences
  const scores = sentences.map((s: string, i: number) => {
    let score = 0;
    for (const t of queryTokens) {
      score += tfidf.tfidf(t, i);
    }
    return { i, s, score };
  });

  scores.sort((a, b) => b.score - a.score);
  const top = scores.slice(0, 3).filter((x) => x.score > 0);

  const short =
    top.length > 0
      ? top[0].s
      : "I couldn’t find a direct answer. Try asking with specific role, company, or dates.";

  // Tiny heuristic for “last role”
  const lastRoleMatch = text.match(
    /(?:Experience|Work|Employment)[\s\S]{0,200}?\n([\s\S]+?)(?:\n\n|$)/i
  );
  const lastRoleHint = lastRoleMatch?.[1]
    ? clean(lastRoleMatch[1]).split("\n")[0]
    : null;

  return {
    answer: short,
    evidence: top.map((t) => t.s).slice(0, 3),
    lastRoleHint: lastRoleHint || undefined,
  };
}
