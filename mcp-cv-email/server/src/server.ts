import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import multer from "multer";
import { sendEmail } from "./email.js";
import { parseResumeFromBuffer, answerResumeQuestion } from "./cv.js";

const PORT = Number(process.env.PORT || 8787);
const upload = multer();
const app = express();

app.use(bodyParser.json({ limit: "10mb" }));

// Upload and parse résumé (PDF or TXT)
app.post("/api/load-resume", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Upload `file`" });
    const mime = req.file.mimetype || "application/pdf";
    const result = await parseResumeFromBuffer(req.file.buffer, mime);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Ask a question about the résumé
app.post("/api/ask", async (req, res) => {
  try {
    const { question } = req.body || {};
    if (!question) return res.status(400).json({ error: "Missing `question`" });
    const result = answerResumeQuestion(question);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Send an email
app.post("/api/email", async (req, res) => {
  try {
    const { to, subject, html } = req.body || {};
    if (!to || !subject || !html)
      return res.status(400).json({ error: "to/subject/html required" });
    const result = await sendEmail({ to, subject, html });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`[HTTP] listening on http://localhost:${PORT}`);
});
