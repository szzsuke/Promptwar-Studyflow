const express = require('express');
const multer = require('multer');
const { extractTextFromBuffer } = require('../services/pdfService');

const router = express.Router();

// Configure multer with in-memory storage and 15MB limit
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

// POST /api/extract-text - Extract raw text from uploaded PDF
router.post('/', (req, res, next) => {
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
      return res.status(400).json({ error: 'No PDF file was provided.' });
    }

    try {
      const result = await extractTextFromBuffer(req.file.buffer);
      return res.json({
        success: true,
        filename: req.file.originalname,
        numPages: result.numPages,
        numChars: result.numChars,
        text: result.text,
      });
    } catch (extractErr) {
      return res.status(extractErr.statusCode || 500).json({
        error: extractErr.message,
      });
    }
  });
});

module.exports = router;
