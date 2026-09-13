/**
 * clientRAG.js
 * 
 * Standalone, 100% Client-Side RAG & AI Synthesis Engine for StudyFlow.
 * Eliminates any backend requirement by performing:
 * 1. In-browser PDF extraction using pdfjs-dist.
 * 2. Sliding-window RAG chunking adapted from antter-ui/AI-Student-Buddy.
 * 3. Relevance ranking & structured context injection.
 * 4. Direct browser REST invocation of Google Gemini Flash (3.6 -> 2.5 -> 1.5 fallback cascade).
 * 5. Resilient JSON schema validation and repair.
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { parseDocx, parsePptx, parsePlainText } from './docParsers';

// Configure worker using Vite resolved asset URL with fallback
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl || `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
}

const STORAGE_KEY = 'studyflow_gemini_key';

/**
 * Resolves the active Gemini API Key from localStorage or Vite env.
 */
export function getApiKey() {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored.trim().length > 0) return stored.trim();
  }
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && envKey.trim().length > 0) return envKey.trim();
  return '';
}

/**
 * Updates the user's custom API Key in localStorage.
 */
export function setApiKey(key) {
  if (typeof window !== 'undefined') {
    if (!key || key.trim() === '') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, key.trim());
    }
  }
}

/**
 * Extracts text and page structures from a PDF File or Blob directly in the browser.
 * Adapted from antter-ui/AI-Student-Buddy client PDF reader.
 * 
 * @param {File|Blob} file 
 * @param {Function} [onProgress] 
 * @returns {Promise<{ pages: Array<{page: number, text: string}>, fullText: string, totalPages: number, totalWords: number, filename: string }>}
 */
export async function extractPdfFromBlob(file, onProgress = null) {
  if (!file) {
    throw new Error('No PDF file provided for extraction.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const totalPages = pdf.numPages;
  const pages = [];
  let fullText = '';

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    if (onProgress) {
      onProgress({ stage: 'EXTRACTING', current: pageNum, total: totalPages, label: `Extracting page ${pageNum} of ${totalPages}...` });
    }

    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageRawText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    pages.push({
      page: pageNum,
      text: pageRawText,
    });

    if (pageRawText) {
      fullText += `--- Page ${pageNum} ---\n${pageRawText}\n\n`;
    }
  }

  const totalWords = fullText.split(/\s+/).filter(Boolean).length;

  if (fullText.trim().length < 30) {
    throw new Error(
      'No selectable text found in this PDF. It may be a scanned image or photograph. Please upload a PDF containing digital text.'
    );
  }

  return {
    filename: file.name || 'document.pdf',
    pages,
    fullText,
    totalPages,
    totalWords,
  };
}

/**
 * Unified Multi-Format In-Browser Document Extractor.
 * Supports PDF, Word (.docx), PowerPoint (.pptx), and plain text (.txt, .md).
 * 
 * @param {File} file 
 * @param {Function} [onProgress] 
 * @returns {Promise<{ pages: Array<{page: number, text: string}>, fullText: string, totalPages: number, totalWords: number, filename: string }>}
 */
export async function extractDocument(file, onProgress = null) {
  if (!file) {
    throw new Error('No document provided.');
  }

  const name = file.name || 'document';
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';

  if (ext === 'pdf' || file.type === 'application/pdf') {
    if (onProgress) onProgress({ stage: 'EXTRACTING', step: 1, label: 'Reading PDF in browser with PDF.js...' });
    return extractPdfFromBlob(file, onProgress);
  }

  if (ext === 'docx' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    if (onProgress) onProgress({ stage: 'EXTRACTING', step: 1, label: 'Parsing Word (.docx) document...' });
    const buffer = await file.arrayBuffer();
    return parseDocx(buffer, name);
  }

  if (ext === 'pptx' || file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    if (onProgress) onProgress({ stage: 'EXTRACTING', step: 1, label: 'Parsing PowerPoint (.pptx) presentation slides...' });
    const buffer = await file.arrayBuffer();
    return parsePptx(buffer, name);
  }

  if (['txt', 'md', 'text', 'markdown', 'csv'].includes(ext) || file.type.startsWith('text/')) {
    if (onProgress) onProgress({ stage: 'EXTRACTING', step: 1, label: 'Reading plain text notes...' });
    return parsePlainText(file);
  }

  if (ext === 'doc' || ext === 'ppt') {
    throw new Error(`Legacy .${ext} files use proprietary binary formats. Please resave the file as modern .${ext}x or export to PDF.`);
  }

  // Fallback attempt: try PDF parser, then plain text
  try {
    return await extractPdfFromBlob(file, onProgress);
  } catch (pdfErr) {
    return await parsePlainText(file);
  }
}

/**
 * Sliding-window RAG Chunking.
 * Ported faithfully from antter-ui/AI-Student-Buddy (lines 67-95).
 * 
 * @param {Array<{page: number, text: string}>} pages 
 * @param {number} chunkSize 
 * @param {number} overlap 
 * @returns {Array<{index: number, text: string, page: number, wordCount: number}>}
 */
export function createPDFChunks(pages, chunkSize = 300, overlap = 50) {
  const chunks = [];
  const step = Math.max(1, chunkSize - overlap);

  pages.forEach((pageData) => {
    const words = pageData.text
      .split(/\s+/)
      .filter((word) => word.trim() !== '');

    for (let i = 0; i < words.length; i += step) {
      const chunkWords = words.slice(i, i + chunkSize);
      const chunkText = chunkWords.join(' ');

      if (chunkText.trim() !== '') {
        chunks.push({
          index: chunks.length,
          text: chunkText,
          page: pageData.page,
          wordCount: chunkWords.length,
        });
      }
    }
  });

  return chunks;
}

/**
 * Lexical / keyword similarity scoring for RAG chunk retrieval.
 * Ported from antter-ui/AI-Student-Buddy (lines 417-515).
 * 
 * @param {string} query 
 * @param {Array<object>} chunks 
 * @param {number} maxChunks 
 * @returns {Array<object>}
 */
export function findRelevantChunks(query, chunks, maxChunks = 5) {
  if (!query || typeof query !== 'string' || !Array.isArray(chunks) || chunks.length === 0) {
    return [];
  }

  const stopWords = new Set([
    'what', 'is', 'the', 'a', 'an', 'of', 'and', 'to', 'in', 'for', 'on', 'with',
    'how', 'why', 'when', 'where', 'who', 'which', 'are', 'was', 'were', 'be',
    'this', 'that', 'these', 'those', 'from', 'at', 'by', 'as', 'into', 'about'
  ]);

  const queryWords = query
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  if (queryWords.length === 0) {
    return chunks.slice(0, maxChunks);
  }

  const scored = chunks.map((chunk) => {
    const chunkWords = chunk.text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2);

    let matches = 0;
    queryWords.forEach((qw) => {
      if (chunkWords.includes(qw)) matches++;
    });

    const similarity = matches / queryWords.length;
    return {
      ...chunk,
      matches,
      similarity,
    };
  });

  scored.sort((a, b) => b.similarity - a.similarity || a.page - b.page);
  return scored.slice(0, maxChunks);
}

/**
 * Normalizes and repairs JSON from LLM output.
 * Strips markdown code blocks, normalizes smart quotes, handles trailing commas.
 * 
 * @param {string} rawOutput 
 * @returns {object}
 */
export function parseAndRepairJSON(rawOutput) {
  if (!rawOutput || typeof rawOutput !== 'string') {
    throw new Error('AI returned an empty response.');
  }

  let cleaned = rawOutput.trim();

  // Strip ```json ... ``` fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  }

  // Find outer JSON braces
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (initialErr) {
    try {
      const sanitized = cleaned
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'");
      parsed = JSON.parse(sanitized);
    } catch (repairErr) {
      console.error('[clientRAG] Failed to parse raw LLM JSON:', rawOutput);
      throw new Error(`AI generated invalid JSON structure: ${initialErr.message}`);
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI response is not a valid JSON object.');
  }

  if (!Array.isArray(parsed.notes) || parsed.notes.length === 0) {
    throw new Error('AI response missing valid notes array.');
  }

  // Normalize notes
  parsed.notes = parsed.notes.map((note, idx) => {
    const topic = note.topic || note.subtopic || note.title || `Core Topic ${idx + 1}`;
    const rawPoints = Array.isArray(note.points)
      ? note.points
      : Array.isArray(note.bullets)
      ? note.bullets
      : Array.isArray(note.keyPoints)
      ? note.keyPoints
      : [];
    return {
      topic,
      points: rawPoints.length > 0
        ? rawPoints.map((p) => String(p).trim()).filter(Boolean)
        : ['Essential lecture takeaway for this section.'],
    };
  });

  if (!Array.isArray(parsed.quiz) || parsed.quiz.length === 0) {
    throw new Error('AI response missing valid quiz array.');
  }

  // Normalize quiz
  parsed.quiz = parsed.quiz.map((q, idx) => {
    const questionText = q.question || `Question ${idx + 1}`;
    let options = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()) : [];
    while (options.length < 4) {
      options.push(`Option ${String.fromCharCode(65 + options.length)}`);
    }
    if (options.length > 4) {
      options = options.slice(0, 4);
    }

    let correctIndex = Number.isInteger(q.correctAnswerIndex) ? q.correctAnswerIndex : 0;
    if (correctIndex < 0 || correctIndex > 3) {
      correctIndex = 0;
    }

    const explanation = q.explanation || 'Refer to the lecture notes for detailed context.';

    return {
      id: q.id || idx + 1,
      question: questionText,
      options,
      correctAnswerIndex: correctIndex,
      explanation,
    };
  });

  return parsed;
}

/**
 * Builds grounded academic synthesis prompt using RAG chunks or extracted text.
 * Enforces deep, exhaustive academic notes with 4-6 detailed points per topic section.
 * Injects subject, academic level, and study focus personalization when specified.
 * 
 * @param {string} contextText 
 * @param {object} [personalization]
 * @returns {string}
 */
function buildSynthesisPrompt(contextText, personalization = null) {
  let personalizationBlock = '';
  if (personalization) {
    const { subject, academicLevel, focus } = personalization;
    const parts = [];
    if (subject && subject.trim()) parts.push(`Target Subject / Course: ${subject.trim()}`);
    if (academicLevel && academicLevel.trim()) parts.push(`Academic Target Level: ${academicLevel.trim()}`);
    if (focus && focus.trim()) parts.push(`Study Focus Objective: ${focus.trim()}`);

    if (parts.length > 0) {
      personalizationBlock = `\n--- COURSE & LEARNING PERSONALIZATION ---
${parts.join('\n')}
CRITICAL: Calibrate terminology depth, mathematical/conceptual rigor, contextual examples, and quiz challenge specifically to match this targeted course and academic profile.
--- END PERSONALIZATION ---\n`;
    }
  }

  return `You are an expert academic professor and master tutor. Analyze the following study material extracted from a document (PDF, Word, Presentation Slides, or Notes).
You must generate comprehensive, high-yield study material based SOLELY on the provided text. Do not invent external facts.
${personalizationBlock}
Return a single, valid JSON object with the following structure:
{
  "notes": [
    {
      "topic": "Comprehensive Sub-topic or Section Name",
      "points": [
        "Rigorous, detailed explanation of foundational principle, definition, or primary mechanism.",
        "Mathematical formulation, algorithmic steps, or structural components detailed in the lecture.",
        "Critical operational details, trade-offs, edge conditions, or contrasting behaviors.",
        "Concrete practical example, implementation nuance, or key takeaway emphasized in the text."
      ]
    }
  ],
  "quiz": [
    {
      "id": 1,
      "question": "Clear, challenging conceptual multiple-choice question directly testing material from the lecture?",
      "options": [
        "Option A description",
        "Option B description",
        "Option C description",
        "Option D description"
      ],
      "correctAnswerIndex": 0,
      "explanation": "Detailed pedagogical explanation citing specific concepts and principles from the lecture text explaining why this option is correct and why the alternatives are incorrect."
    }
  ]
}

CRITICAL RULES:
1. DETAILED & EXHAUSTIVE NOTES:
   - Identify every major concept, architecture, framework, process, and formula in the material.
   - For EVERY topic section, provide 4 to 6 substantial, thorough bullet points.
   - Each bullet point must be detailed, informative, and complete (avoid brief 1-sentence generalities). Explain the 'how' and 'why', specific terminology, sequential steps, equations/variables, and key trade-offs.
   - Cover multiple distinct topic areas (aim for 4 to 8 distinct topic sections to cover the full depth of the document).
2. CARD-STYLE INTERACTIVE QUIZ:
   - Provide exactly 5 distinct multiple-choice questions testing core concepts.
   - Exactly 4 options per question.
   - correctAnswerIndex must be 0, 1, 2, or 3.
   - Provide a rich, explanatory rationalization in "explanation" citing the document.
3. STRICT GROUNDING:
   - Base all content SOLELY on the provided context below.
4. Output raw JSON only.

--- DOCUMENT CONTEXT ---
${contextText}
--- END DOCUMENT CONTEXT ---`;
}

/**
 * Directly invokes Google Gemini REST API from the browser.
 * Implements an automatic model fallback cascade (3.6-flash -> 2.5-flash -> 1.5-flash).
 * 
 * @param {string} prompt 
 * @param {string} apiKey 
 * @returns {Promise<{ rawText: string, modelUsed: string }>}
 */
async function callGeminiRest(prompt, apiKey) {
  const models = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastError = null;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      console.log(`[clientRAG] Invoking Gemini model "${model}"...`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || `HTTP ${response.status} from ${model}`;
        console.warn(`[clientRAG] Model ${model} returned error: ${errorMsg}`);
        lastError = new Error(errorMsg);
        continue;
      }

      const candidate = data.candidates?.[0];
      const part = candidate?.content?.parts?.[0];
      const rawText = part?.text;

      if (!rawText) {
        throw new Error(`Empty response returned by ${model}.`);
      }

      console.log(`[clientRAG] Synthesis successful with ${model}.`);
      return { rawText, modelUsed: model };
    } catch (err) {
      console.warn(`[clientRAG] Attempt with ${model} failed:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to generate study flow with available Gemini models.');
}

/**
 * Master end-to-end processing pipeline:
 * Multi-Format Document -> In-browser text extraction -> RAG Chunking -> Gemini Flash direct call -> Schema Repair.
 * 
 * @param {File} file 
 * @param {object|Function} [optionsOrProgress] 
 * @param {Function} [onProgress] 
 * @returns {Promise<object>}
 */
export async function processAndGenerate(file, optionsOrProgress = {}, onProgress = null) {
  let options = {};
  let progressCb = onProgress;

  if (typeof optionsOrProgress === 'function') {
    progressCb = optionsOrProgress;
    options = {};
  } else if (optionsOrProgress && typeof optionsOrProgress === 'object') {
    options = optionsOrProgress;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('No Gemini API key found. Please set your API key in the top bar.');
  }

  // Stage 1: In-browser Multi-format extraction
  const docData = await extractDocument(file, progressCb);

  // Stage 2: RAG Chunking & Context Indexing
  if (progressCb) progressCb({ stage: 'CHUNKING', step: 2, label: 'Indexing document & creating RAG sliding-window chunks...' });
  const chunks = createPDFChunks(docData.pages, 300, 50);
  console.log(`[clientRAG] Created ${chunks.length} chunks across ${docData.totalPages} pages/slides.`);

  // Prepare grounded context:
  let contextForPrompt = '';
  if (docData.fullText.length <= 60000) {
    contextForPrompt = docData.fullText;
  } else {
    const maxChunksToInclude = 40;
    const stride = Math.max(1, Math.floor(chunks.length / maxChunksToInclude));
    const selected = [];
    for (let i = 0; i < chunks.length && selected.length < maxChunksToInclude; i += stride) {
      selected.push(chunks[i]);
    }
    contextForPrompt = selected
      .map((c) => `[Page/Slide ${c.page} Chunk ${c.index}]\n${c.text}`)
      .join('\n\n');
  }

  // Stage 3: Direct AI Synthesis with Personalization
  if (progressCb) progressCb({ stage: 'SYNTHESIZING', step: 3, label: 'Synthesizing tailored notes & quiz via Gemini Flash...' });
  const prompt = buildSynthesisPrompt(contextForPrompt, options.personalization);
  const { rawText, modelUsed } = await callGeminiRest(prompt, apiKey);

  // Stage 4: Parse and validate JSON schema
  const parsedData = parseAndRepairJSON(rawText);

  return {
    success: true,
    filename: docData.filename,
    notes: parsedData.notes,
    quiz: parsedData.quiz,
    meta: {
      totalPages: docData.totalPages,
      totalWords: docData.totalWords,
      chunksCount: chunks.length,
      modelUsed,
      personalization: options.personalization || null,
      format: (docData.filename.split('.').pop() || 'PDF').toUpperCase(),
    },
  };
}

