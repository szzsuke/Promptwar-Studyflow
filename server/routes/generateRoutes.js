const express = require('express');
const multer = require('multer');
const { extractTextFromBuffer } = require('../services/pdfService');
const aiService = require('../services/aiService');

const router = express.Router();

// Multer memory storage with 15MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
  fileFilter: (req, file, cb) => {
    const isPdf = file.originalname.toLowerCase().endsWith('.pdf') || file.mimetype === 'application/pdf';
    if (!isPdf) {
      const error = new Error('Invalid file type. Only .pdf files are accepted.');
      error.statusCode = 400;
      return cb(error, false);
    }
    cb(null, true);
  },
});

// POST /api/generate: Main end-to-end pipeline: PDF upload -> Extract -> AI Notes + Quiz
router.post('/', (req, res) => {
  upload.single('pdf')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File size exceeds the 15 MB limit. Please upload a smaller PDF.',
        });
      }
      return res.status(err.statusCode || 400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No lecture PDF was uploaded.' });
    }

    try {
      console.log(`[POST /api/generate] Received PDF: "${req.file.originalname}" (${req.file.size} bytes)`);

      // 1. Extract text from PDF buffer
      const extraction = await extractTextFromBuffer(req.file.buffer);
      console.log(`[POST /api/generate] Extracted ${extraction.numChars} chars across ${extraction.numPages} page(s).`);

      // 2. Pass extracted text to isolated AI service
      const aiResult = await aiService.generateStudyFlow(extraction.text);

      // 3. Return structured payload
      return res.json({
        success: true,
        filename: req.file.originalname,
        pageCount: extraction.numPages,
        charCount: extraction.numChars,
        notes: aiResult.notes,
        quiz: aiResult.quiz,
        meta: aiResult.meta,
      });
    } catch (pipelineErr) {
      console.error('[POST /api/generate] Pipeline error:', pipelineErr.message);
      const statusCode = pipelineErr.statusCode || 500;
      return res.status(statusCode).json({
        error: pipelineErr.message || 'An unexpected error occurred while processing the PDF.',
      });
    }
  });
});

module.exports = router;
