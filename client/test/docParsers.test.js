import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parsePlainText } from '../src/services/docParsers.js';

describe('docParsers: PlainText Ingestion', () => {
  it('parses a text file into virtual pages and word counts', async () => {
    const mockFile = {
      name: 'notes.txt',
      text: async () => `Operating Systems Concept Note:
      A thread is a basic unit of CPU utilization. It comprises a thread ID, a program counter, a register set, and a stack.
      It shares with other threads belonging to the same process its code section, data section, and other operating-system resources.
      Multithreaded programming provides high responsiveness, resource sharing, economy, and scalability for multicore architectures.`,
    };

    const doc = await parsePlainText(mockFile);
    assert.equal(doc.filename, 'notes.txt');
    assert.ok(doc.pages.length >= 1);
    assert.ok(doc.totalWords > 20);
    assert.ok(doc.fullText.includes('CPU utilization'));
  });

  it('rejects empty text files', async () => {
    const emptyFile = {
      name: 'empty.txt',
      text: async () => 'Short note',
    };

    await assert.rejects(
      async () => parsePlainText(emptyFile),
      /insufficient content/i
    );
  });
});
