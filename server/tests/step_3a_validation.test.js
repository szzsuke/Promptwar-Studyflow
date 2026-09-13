const assert = require('assert');

// Test file validation logic used in UploadZone
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

function validateFile(file) {
  if (!file) return { valid: false, error: 'No file provided' };

  const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
  if (!isPdf) {
    return { valid: false, error: `"${file.name}" is not a PDF. Please upload a .pdf lecture file.` };
  }

  if (file.size === 0) {
    return { valid: false, error: 'The selected PDF file is empty (0 bytes). Please upload a valid document.' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `File size (${sizeMB} MB) exceeds the 15 MB limit. Please upload a smaller PDF.` };
  }

  return { valid: true, error: null };
}

console.log('--- [Step 3a Test: Upload UI & File Validation] ---');

// Test 1: Reject non-PDF file (.txt)
const invalidTextFile = { name: 'notes.txt', size: 1024, type: 'text/plain' };
const res1 = validateFile(invalidTextFile);
assert.strictEqual(res1.valid, false, 'Non-PDF file should be rejected');
assert(res1.error.includes('not a PDF'), 'Error must mention not a PDF');
console.log('✓ Test 1: Non-PDF rejected properly:', res1.error);

// Test 2: Reject empty file (0 bytes)
const emptyPdf = { name: 'empty_lecture.pdf', size: 0, type: 'application/pdf' };
const res2 = validateFile(emptyPdf);
assert.strictEqual(res2.valid, false, '0-byte PDF should be rejected');
assert(res2.error.includes('empty'), 'Error must mention empty file');
console.log('✓ Test 2: Empty PDF rejected properly:', res2.error);

// Test 3: Reject oversized file (> 15MB)
const oversizedPdf = { name: 'huge_book.pdf', size: 16 * 1024 * 1024, type: 'application/pdf' };
const res3 = validateFile(oversizedPdf);
assert.strictEqual(res3.valid, false, 'File > 15MB should be rejected');
assert(res3.error.includes('exceeds the 15 MB limit'), 'Error must mention 15MB limit');
console.log('✓ Test 3: Oversized PDF rejected properly:', res3.error);

// Test 4: Accept valid PDF
const validPdf = { name: 'lecture_ai.pdf', size: 2 * 1024 * 1024, type: 'application/pdf' };
const res4 = validateFile(validPdf);
assert.strictEqual(res4.valid, true, 'Valid PDF should be accepted');
console.log('✓ Test 4: Valid PDF accepted successfully!');

console.log('--- [Step 3a Test] All validation tests PASSED! ---\n');
