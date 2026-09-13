const { spawnSync } = require('child_process');
const path = require('path');

console.log('================================================================');
console.log('          STUDYFLOW COMPREHENSIVE REGRESSION SUITE              ');
console.log('================================================================\n');

const testFiles = [
  'smoke.test.js',
  'step_3a_validation.test.js',
  'step_3b_extract.test.js',
  'step_3c_ai.test.js',
  'step_3d_generate.test.js',
  'step_3efg_ui_and_errors.test.js',
];

let failed = 0;

for (const file of testFiles) {
  const filePath = path.join(__dirname, file);
  console.log(`▶ Running ${file}...`);
  const result = spawnSync(process.execPath, [filePath], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..', '..'),
    env: { ...process.env }
  });

  if (result.status !== 0) {
    console.error(`❌ ${file} FAILED with exit code ${result.status}\n`);
    failed++;
  } else {
    console.log(`✔ ${file} PASSED\n`);
  }
}

if (failed > 0) {
  console.error(`💥 Comprehensive Regression Test FAILED: ${failed} file(s) failed.`);
  process.exit(1);
} else {
  console.log('🎉 ALL BACKEND & ISOLATION TESTS PASSED (6/6)!');
}
