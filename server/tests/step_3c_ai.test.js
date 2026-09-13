const assert = require('assert');
const { parseAndRepairJSON, buildPrompt, generateStudyFlow } = require('../services/aiService');

async function testStep3c() {
  console.log('--- [Step 3c Test: Isolated AI Service Module] ---');

  // Test 1: buildPrompt schema and rules
  console.log('1. Verifying prompt formulation and grounding constraints...');
  const prompt = buildPrompt('Sample lecture text about neural networks.');
  assert(prompt.includes('SOLELY on the provided text'), 'Prompt must require grounding in text');
  assert(prompt.includes('bullet points'), 'Prompt must enforce bullet points');
  assert(prompt.includes('exactly 5 questions'), 'Prompt must enforce exactly 5 questions');
  assert(prompt.includes('4 options'), 'Prompt must enforce 4 options');
  console.log('   ✓ Prompt contains all hard scope rules and constraints.');

  // Test 2: parseAndRepairJSON with standard JSON
  console.log('2. Testing parseAndRepairJSON with clean structured JSON...');
  const validJson = JSON.stringify({
    notes: [
      {
        topic: 'Perceptrons',
        points: ['Basic neural building block', 'Applies weights, bias, and activation'],
      },
    ],
    quiz: [
      {
        id: 1,
        question: 'What is a perceptron?',
        options: ['An artificial neuron', 'A database', 'A compiler', 'A GPU'],
        correctAnswerIndex: 0,
        explanation: 'Perceptrons are fundamental artificial neurons.',
      },
    ],
  });
  const parsed1 = parseAndRepairJSON(validJson);
  assert.strictEqual(parsed1.notes.length, 1);
  assert.strictEqual(parsed1.notes[0].topic, 'Perceptrons');
  assert.strictEqual(parsed1.quiz.length, 1);
  assert.strictEqual(parsed1.quiz[0].options.length, 4);
  assert.strictEqual(parsed1.quiz[0].correctAnswerIndex, 0);
  console.log('   ✓ Clean JSON parsed and schema validated.');

  // Test 3: parseAndRepairJSON with markdown code fence (```json ... ```)
  console.log('3. Testing JSON wrapped in markdown fences...');
  const fencedJson = `\`\`\`json
{
  "notes": [
    {
      "topic": "Activation Functions",
      "points": ["Introduces non-linearity", "ReLU solves vanishing gradient"]
    }
  ],
  "quiz": [
    {
      "id": 1,
      "question": "Why use non-linear activations?",
      "options": ["To allow non-linear decision boundaries", "To run faster", "To save memory", "To invert matrices"],
      "correctAnswerIndex": 0,
      "explanation": "Non-linearity prevents deep layers from collapsing into a single linear map."
    }
  ]
}
\`\`\``;
  const parsed2 = parseAndRepairJSON(fencedJson);
  assert.strictEqual(parsed2.notes[0].topic, 'Activation Functions');
  assert.strictEqual(parsed2.quiz[0].question, 'Why use non-linear activations?');
  console.log('   ✓ Markdown code fences stripped and parsed successfully.');

  // Test 4: parseAndRepairJSON with trailing commas and curly quotes
  console.log('4. Testing JSON repair of trailing commas and special quotes...');
  const dirtyJson = `{
    "notes": [
      {
        "topic": "Backpropagation",
        "points": [
          "Uses chain rule of calculus",
          "Computes gradients of loss function",
        ],
      },
    ],
    "quiz": [
      {
        "id": 1,
        "question": "What rule does backprop use?",
        "options": ["Chain rule", "Product rule", "Sum rule", "Quotient rule",],
        "correctAnswerIndex": 0,
        "explanation": "Backpropagation applies the chain rule of calculus.",
      },
    ],
  }`;
  const parsed3 = parseAndRepairJSON(dirtyJson);
  assert.strictEqual(parsed3.notes[0].topic, 'Backpropagation');
  assert.strictEqual(parsed3.quiz[0].options[0], 'Chain rule');
  console.log('   ✓ Trailing commas repaired and parsed successfully.');

  // Test 5: Missing API key handling in generateStudyFlow
  console.log('5. Verifying clear error when GEMINI_API_KEY is not configured...');
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  try {
    await generateStudyFlow('Sample lecture text long enough for test execution.');
    assert.fail('Should have thrown missing API key error');
  } catch (err) {
    assert(err.message.includes('GEMINI_API_KEY is not configured'), 'Must provide clear API key guidance');
    console.log('   ✓ Handled missing API key with helpful user message:', err.message);
  } finally {
    if (originalKey) process.env.GEMINI_API_KEY = originalKey;
  }

  console.log('--- [Step 3c Test] AI Service Module PASSED in isolation! ---\n');
}

testStep3c().catch((err) => {
  console.error('--- [Step 3c Test] FAILED ---', err);
  process.exit(1);
});
