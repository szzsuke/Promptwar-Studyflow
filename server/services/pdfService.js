const pdfParse = require('pdf-parse');

/**
 * Extracts clean text from an in-memory PDF Buffer.
 * Wraps data into a typed array payload to ensure PDFJS uses in-memory LocalPdfManager.
 * 
 * @param {Buffer} buffer - Raw file buffer from multer.
 * @returns {Promise<{ text: string, numPages: number, numChars: number }>}
 */
async function extractTextFromBuffer(buffer) {
  if (!buffer || buffer.length === 0) {
    const error = new Error('Uploaded file is empty (0 bytes).');
    error.statusCode = 400;
    throw error;
  }

  // Convert buffer to pure zero-offset Uint8Array passed as { data: typedArray }
  const uint8Data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  let pdfData;
  try {
    // Pass as explicit parameter object { data: Uint8Array } to guarantee direct in-memory parsing
    pdfData = await pdfParse({ data: uint8Data });
  } catch (err) {
    const error = new Error(`Failed to parse PDF document: ${err.message}`);
    error.statusCode = 422;
    throw error;
  }

  const rawText = pdfData.text || '';
  // Normalize whitespace
  const cleanedText = rawText.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();

  // Guard against scanned/image-only PDFs with no extractable text
  if (!cleanedText || cleanedText.length < 30) {
    const error = new Error(
      'No readable text could be extracted from this PDF. It may be a scanned image or empty. Please provide a document with selectable text.'
    );
    error.statusCode = 422;
    throw error;
  }

  return {
    text: cleanedText,
    numPages: pdfData.numpages || 1,
    numChars: cleanedText.length,
  };
}

module.exports = {
  extractTextFromBuffer,
};
