const http = require('http');
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const app = require('../server');

async function testStep3b() {
  console.log('--- [Step 3b Test: PDF Text Extraction in Isolation] ---');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    const fixtureDir = path.join(__dirname, '../../test_files');

    // Helper to send multipart/form-data using standard FormData
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

    // 1. Test valid sample lecture PDF
    console.log('1. Uploading valid lecture PDF (sample_lecture.pdf)...');
    const validRes = await uploadFile('/api/extract-text', path.join(fixtureDir, 'sample_lecture.pdf'));
    if (validRes.status !== 200) {
      console.error('Extraction failed:', validRes.body);
    }
    assert.strictEqual(validRes.status, 200, `Expected status 200, got ${validRes.status}`);
    assert.strictEqual(validRes.body.success, true);
    assert(validRes.body.text.includes('Neural Networks'), 'Extracted text should contain "Neural Networks"');
    assert(validRes.body.text.includes('Activation Functions'), 'Extracted text should contain "Activation Functions"');
    assert(validRes.body.numChars > 100, `Expected > 100 chars, got ${validRes.body.numChars}`);
    console.log('   ✓ Extracted text successfully:');
    console.log(`     Pages: ${validRes.body.numPages}, Characters: ${validRes.body.numChars}`);
    console.log(`     Snippet: "${validRes.body.text.substring(0, 100)}..."`);

    // 2. Test invalid non-PDF file
    console.log('2. Uploading non-PDF file (invalid_notes.txt)...');
    const invalidRes = await uploadFile('/api/extract-text', path.join(fixtureDir, 'invalid_notes.txt'));
    assert.strictEqual(invalidRes.status, 400, `Expected status 400, got ${invalidRes.status}`);
    assert(invalidRes.body.error.includes('Only .pdf files are accepted'), 'Must reject non-PDF');
    console.log('   ✓ Rejected non-PDF with error:', invalidRes.body.error);

    // 3. Test empty PDF file
    console.log('3. Uploading empty PDF file (empty_lecture.pdf)...');
    const emptyRes = await uploadFile('/api/extract-text', path.join(fixtureDir, 'empty_lecture.pdf'));
    assert(emptyRes.status === 400 || emptyRes.status === 422, `Expected 400/422, got ${emptyRes.status}`);
    assert(emptyRes.body.error.length > 0, 'Must have error message for empty file');
    console.log('   ✓ Handled empty PDF with error:', emptyRes.body.error);

    console.log('--- [Step 3b Test] Extraction endpoint PASSED in isolation! ---\n');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

testStep3b().catch((err) => {
  console.error('--- [Step 3b Test] FAILED ---', err);
  process.exit(1);
});
