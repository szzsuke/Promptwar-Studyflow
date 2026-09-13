const http = require('http');
const app = require('../server');

async function runSmokeTest() {
  console.log('--- [StudyFlow Smoke Test] Starting ---');

  // 1. Verify required backend dependencies can be loaded
  console.log('1. Checking core dependency resolution...');
  require('express');
  require('cors');
  require('multer');
  console.log('   Dependencies resolved cleanly.');

  // 2. Start temporary server on an ephemeral port to verify route handling
  console.log('2. Verifying /api/health endpoint...');
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  try {
    const res = await fetch(`http://localhost:${port}/api/health`);
    if (!res.ok) {
      throw new Error(`Health check returned status ${res.status}`);
    }
    const data = await res.json();
    if (data.status !== 'ok') {
      throw new Error(`Expected status 'ok', got: ${JSON.stringify(data)}`);
    }
    console.log('   /api/health responded with OK:', data);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('--- [StudyFlow Smoke Test] PASSED successfully! ---\n');
}

runSmokeTest().catch((err) => {
  console.error('--- [StudyFlow Smoke Test] FAILED ---', err);
  process.exit(1);
});
