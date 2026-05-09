import mammoth from "mammoth";

/**
 * Parse .docx file into array of question objects.
 * Expected Word format:
 *
 * SAFETY
 *
 * 1. Pertanyaan di sini?
 * A. Pilihan A
 * B. Pilihan B
 * C. Pilihan C
 * D. Pilihan D
 * JAWABAN: B
 *
 * TEKNIS
 *
 * 2. Pertanyaan teknis?
 * ...
 */
export async function parseWordFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value;
  return parseText(text);
}

export function parseText(text) {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const questions = [];
  let currentType = "safety";
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect category header
    if (/^SAFETY$/i.test(line)) {
      currentType = "safety";
      i++;
      continue;
    }
    if (/^TEKNIS$/i.test(line)) {
      currentType = "teknis";
      i++;
      continue;
    }

    // Detect question line: starts with number + dot, e.g. "1. Pertanyaan?"
    const qMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (qMatch) {
      const questionText = qMatch[2].trim();
      const options = [];
      let answerLetter = null;
      i++;

      // Read options A. B. C. D.
      while (i < lines.length) {
        const ol = lines[i];
        const optMatch = ol.match(/^([A-D])\.\s+(.+)$/i);
        const jawMatch = ol.match(/^JAWABAN\s*:\s*([A-D])$/i);

        if (optMatch) {
          options.push(optMatch[2].trim());
          i++;
        } else if (jawMatch) {
          answerLetter = jawMatch[1].toUpperCase();
          i++;
          break;
        } else {
          // Next question or category — stop
          break;
        }
      }

      // Only add if we have 4 options and a valid answer
      if (options.length === 4 && answerLetter) {
        const answerIndex = "ABCD".indexOf(answerLetter);
        if (answerIndex !== -1) {
          questions.push({
            question: questionText,
            type: currentType,
            options,
            answer: answerIndex,
          });
        }
      }
      continue;
    }

    i++;
  }

  return questions;
}

/** Validate parsed questions, return { valid, errors } */
export function validateQuestions(questions) {
  const errors = [];
  if (questions.length === 0) {
    errors.push("Tidak ada soal yang berhasil dibaca. Periksa format file Word.");
  }
  const safetyCount = questions.filter(q => q.type === "safety").length;
  const teknisCount = questions.filter(q => q.type === "teknis").length;
  if (safetyCount === 0) errors.push("Tidak ada soal Safety ditemukan.");
  if (teknisCount === 0) errors.push("Tidak ada soal Teknis ditemukan.");
  return { valid: errors.length === 0, errors, safetyCount, teknisCount };
}
