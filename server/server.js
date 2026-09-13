const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
const extractRoutes = require('./routes/extractRoutes');
const generateRoutes = require('./routes/generateRoutes');
app.use('/api/extract-text', extractRoutes);
app.use('/api/generate', generateRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'StudyFlow API', timestamp: new Date().toISOString() });
});

// Start server if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[StudyFlow Server] Listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
