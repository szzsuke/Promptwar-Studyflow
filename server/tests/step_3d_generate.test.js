const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const app = require('../server');
const aiService = require('../services/aiService');

async function testStep3d() {
  console.log('--- [Step 3d Test: Wired End-to-End Extraction + AI Endpoint] ---');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    const fixtureDir = path.join(__dirname, '../../test_files');

    async function uploadFile(endpoint, filePath, fieldName = 'pdf') {
      const fileBuffer = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      const blob = new Blob([fileBuffer], { type: fileName.endsWith('.pdf') ? 'application/pdf' : 'text/plain' });
      const formData = new FormData();
      formData.append(fieldName, blob, fileName);

      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      const body = await res.json().catch(() => null);
      return { status: res.status, body };
    }

    // 1. Test POST /api/generate rejecting non-PDF file
    console.log('1. Testing non-PDF rejection on /api/generate...');
    const nonPdfRes = await uploadFile('/api/generate', path.join(fixtureDir, 'invalid_notes.txt'));
    assert.strictEqual(nonPdfRes.status, 400);
    assert(nonPdfRes.body.error.includes('Only .pdf files are accepted'));
    console.log('   ✓ Rejected non-PDF with 400.');

    // 2. Test POST /api/generate rejecting empty file
    console.log('2. Testing empty file rejection on /api/generate...');
    const emptyRes = await uploadFile('/api/generate', path.join(fixtureDir, 'empty_lecture.pdf'));
    assert(emptyRes.status === 400 || emptyRes.status === 422);
    assert(emptyRes.body.error.includes('empty'));
    console.log('   ✓ Rejected empty PDF with appropriate error code.');

    // 3. Test POST /api/generate full pipeline with simulated AI synthesis
    console.log('3. Testing full end-to-end pipeline (Upload -> Extract -> Synthesize)...');
    // Temporarily mock generateStudyFlow to verify wiring regardless of live API key
    const originalGenerate = aiService.generateStudyFlow;
    aiService.generateStudyFlow = async (text) => {
      assert(text.includes('Neural Networks'), 'AI service must receive extracted lecture text');
      return {
        notes: [
          {
            topic: 'Fundamentals of Artificial Neural Networks',
            points: [
              'Perceptrons form the basic computational units inspired by biological neurons.',
              'Inputs are multiplied by weights, added to a bias, and passed to an activation function.',
            ],
          },
          {
            topic: 'Role of Activation Functions',
            points: [
              'Non-linear activation functions prevent multi-layer models from collapsing into a single linear map.',
              'Common functions: Sigmoid, ReLU (max(0, x)), and Softmax for multi-class classification.',
            ],
          },
        ],
        quiz: [
          {
            id: 1,
            question: 'Why are non-linear activation functions necessary in neural networks?',
            options: [
              'To prevent the network from collapsing into a single linear transformation',
              'To speed up disk read times',
              'To reduce training set size',
              'To convert weights into binary values',
            ],
            correctAnswerIndex: 0,
            explanation: 'Without non-linearity, multiple stacked layers collapse into a single linear model.',
          },
          {
            id: 2,
            question: 'What is the primary role of backpropagation?',
            options: [
              'To initialize random weights',
              'To compute partial derivatives of loss with respect to weights using the chain rule',
              'To normalize features between 0 and 1',
              'To select learning rate automatically',
            ],
            correctAnswerIndex: 1,
            explanation: 'Backpropagation computes the gradients of the loss function using the chain rule.',
          },
          {
            id: 3,
            question: 'Which activation function maps any real value between 0 and 1?',
            options: ['Sigmoid', 'ReLU', 'Linear', 'Tanh'],
            correctAnswerIndex: 0,
            explanation: 'Sigmoid squashes inputs into the [0, 1] range, useful for probability outputs.',
          },
          {
            id: 4,
            question: 'What optimization algorithm updates weights in the opposite direction of the gradient?',
            options: ['Gradient Descent', 'K-Means', 'Principal Component Analysis', 'Decision Trees'],
            correctAnswerIndex: 0,
            explanation: 'Gradient descent minimizes the objective function by stepping opposite to the gradient vector.',
          },
          {
            id: 5,
            question: 'Which technique helps prevent neural network overfitting?',
            options: ['Dropout', 'Increasing learning rate indefinitely', 'Removing biases', 'Disabling layers'],
            correctAnswerIndex: 0,
            explanation: 'Dropout randomly deactivates neurons during training to prevent co-adaptation.',
          },
        ],
        meta: {
          model: 'mock-model-test',
          elapsedMs: 120,
          timestamp: new Date().toISOString(),
        },
      };
    };

    try {
      const generateRes = await uploadFile('/api/generate', path.join(fixtureDir, 'sample_lecture.pdf'));
      assert.strictEqual(generateRes.status, 200, `Expected 200, got ${generateRes.status}`);
      assert.strictEqual(generateRes.body.success, true);
      assert.strictEqual(generateRes.body.filename, 'sample_lecture.pdf');
      assert.strictEqual(generateRes.body.pageCount, 1);
      assert(generateRes.body.charCount > 100);
      assert.strictEqual(generateRes.body.notes.length, 2);
      assert.strictEqual(generateRes.body.quiz.length, 5);
      assert.strictEqual(generateRes.body.quiz[0].options.length, 4);
      assert(generateRes.body.quiz[0].explanation.length > 10);
      console.log('   ✓ Full pipeline responded with HTTP 200 and valid structured JSON:');
      console.log(`     Notes count: ${generateRes.body.notes.length} topics`);
      console.log(`     Quiz count: ${generateRes.body.quiz.length} questions with 4 options and explanations`);
    } finally {
      aiService.generateStudyFlow = originalGenerate;
    }

    console.log('--- [Step 3d Test] Wired Endpoint PASSED successfully! ---\n');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

testStep3d().catch((err) => {
  console.error('--- [Step 3d Test] FAILED ---', err);
  process.exit(1);
});
