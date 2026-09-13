const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Normalizes and repairs potentially imperfect JSON returned by an LLM.
 * Handles markdown code fences, trailing commas, and boundary whitespace.
 * 
 * @param {string} rawOutput 
 * @returns {object}
 */
function parseAndRepairJSON(rawOutput) {
  if (!rawOutput || typeof rawOutput !== 'string') {
    throw new Error('AI service received an empty or non-string response.');
  }

  let cleaned = rawOutput.trim();

  // Strip markdown code fences (```json ... ``` or ``` ...)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
  }

  // If there's still enclosing brackets or extra text around JSON, locate the outer {...}
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (initialErr) {
    // Attempt basic trailing comma repairs before failing
    try {
      const sanitized = cleaned
        .replace(/,\s*([}\]])/g, '$1') // remove trailing commas before } or ]
        .replace(/[\u201C\u201D]/g, '"') // replace curly quotes
        .replace(/[\u2018\u2019]/g, "'");
      parsed = JSON.parse(sanitized);
    } catch (repairErr) {
      console.error('[aiService] Failed to parse raw LLM output as JSON:');
      console.error(rawOutput);
      throw new Error(`AI generated invalid JSON structure: ${initialErr.message}`);
    }
  }

  // Validate Schema Compliance
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI response is not a valid JSON object.');
  }

  if (!Array.isArray(parsed.notes) || parsed.notes.length === 0) {
    throw new Error('AI response missing valid "notes" array.');
  }

  // Ensure each note has a topic and string points
  parsed.notes = parsed.notes.map((note, idx) => {
    const topic = note.topic || note.subtopic || note.title || `Key Topic ${idx + 1}`;
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
        : ['Key conceptual takeaway from this section.'],
    };
  });

  if (!Array.isArray(parsed.quiz) || parsed.quiz.length === 0) {
    throw new Error('AI response missing valid "quiz" array.');
  }

  // Validate and format each quiz question
  parsed.quiz = parsed.quiz.map((q, idx) => {
    const questionText = q.question || `Question ${idx + 1}`;
    let options = Array.isArray(q.options) ? q.options.map((o) => String(o).trim()) : [];
    
    // Ensure exactly 4 options
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
 * Builds the strict academic synthesis prompt.
 * 
 * @param {string} lectureText 
 * @returns {string}
 */
function buildPrompt(lectureText) {
  return `You are an expert academic tutor. Analyze the following lecture text extracted from a PDF.
You must generate study material based SOLELY on the provided text. Do not invent external facts.

Return a single, valid JSON object with the following structure:
{
  "notes": [
    {
      "topic": "Sub-topic or Section Name",
      "points": [
        "Clear, high-yield bullet point explaining a key concept",
        "Another concise bullet point with definitions, formulas, or relationships"
      ]
    }
  ],
  "quiz": [
    {
      "id": 1,
      "question": "Conceptual question directly testing material from the lecture?",
      "options": [
        "Option A description",
        "Option B description",
        "Option C description",
        "Option D description"
      ],
      "correctAnswerIndex": 0,
      "explanation": "Direct explanation citing why Option A is correct based on the lecture content."
    }
  ]
}

Rules:
1. Notes MUST be organized as bullet points grouped under distinct sub-topics (NOT prose paragraphs or narrative summaries).
2. Quiz MUST contain exactly 5 questions.
3. Each quiz question MUST have exactly 4 options and a 0-indexed correctAnswerIndex (0 for A, 1 for B, 2 for C, 3 for D).
4. Include a concise, illuminating explanation for each question grounded in the lecture.
5. Output raw JSON only. Do not enclose in markdown blocks if possible.

LECTURE TEXT:
"""
${lectureText}
"""`;
}

/**
 * Core AI Pipeline: converts lecture text into structured notes and a 5-question quiz.
 * 
 * @param {string} lectureText - Raw extracted text from PDF
 * @returns {Promise<{ notes: Array, quiz: Array, meta: object }>}
 */
async function generateStudyFlow(lectureText) {
  if (!lectureText || lectureText.trim().length < 30) {
    throw new Error('Lecture text is too short or empty to generate notes and quiz.');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    const error = new Error(
      'GEMINI_API_KEY is not configured in .env. Please set a valid Gemini API key to generate notes and quiz.'
    );
    error.statusCode = 503;
    throw error;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Use gemini-3.6-flash or environment override
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  });

  const prompt = buildPrompt(lectureText);

  console.log(`[aiService] Calling model "${modelName}" with ${lectureText.length} characters of lecture text...`);
  const startTime = Date.now();

  let rawText = '';
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    rawText = response.text();
  } catch (apiErr) {
    console.error('[aiService] LLM API Call Error:', apiErr);
    const error = new Error(`AI generation failed: ${apiErr.message}`);
    error.statusCode = 502;
    throw error;
  }

  const elapsedMs = Date.now() - startTime;
  console.log(`[aiService] LLM responded in ${elapsedMs}ms. Raw output length: ${rawText.length}`);
  
  // Dev logging of raw output to ensure transparency
  if (process.env.NODE_ENV !== 'production') {
    console.log('--- [aiService RAW OUTPUT START] ---');
    console.log(rawText.substring(0, 500) + (rawText.length > 500 ? '\n...[truncated]' : ''));
    console.log('--- [aiService RAW OUTPUT END] ---');
  }

  const parsed = parseAndRepairJSON(rawText);

  return {
    notes: parsed.notes,
    quiz: parsed.quiz,
    meta: {
      model: modelName,
      elapsedMs,
      timestamp: new Date().toISOString(),
    },
  };
}

module.exports = {
  generateStudyFlow,
  parseAndRepairJSON,
  buildPrompt,
};
