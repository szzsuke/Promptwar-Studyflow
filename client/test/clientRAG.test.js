import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPDFChunks,
  findRelevantChunks,
  parseAndRepairJSON,
  getApiKey,
  setApiKey,
} from '../src/services/clientRAG.js';

describe('clientRAG: Chunking & Token Indexing', () => {
  it('creates sliding-window chunks with word overlap and precomputed wordSet', () => {
    const pages = [
      {
        page: 1,
        text: 'Virtual memory separates user logical memory from physical memory. This separation allows an extremely large virtual memory to be provided for programmers when only a smaller physical memory is available.',
      },
    ];

    const chunks = createPDFChunks(pages, 15, 5);
    assert.ok(Array.isArray(chunks));
    assert.ok(chunks.length > 0);
    assert.equal(chunks[0].page, 1);
    assert.ok(chunks[0].wordCount > 0);
    assert.ok(chunks[0].wordSet instanceof Set);
    assert.ok(chunks[0].wordSet.has('virtual'));
    assert.ok(chunks[0].wordSet.has('memory'));
  });

  it('handles empty pages gracefully', () => {
    const chunks = createPDFChunks([{ page: 1, text: '' }, { page: 2, text: '   ' }]);
    assert.equal(chunks.length, 0);
  });
});

describe('clientRAG: Lexical Retrieval & Relevance Ranking', () => {
  it('ranks chunks with matching keywords higher', () => {
    const chunks = [
      {
        index: 0,
        page: 1,
        text: 'The solar system contains eight planets orbiting the sun.',
        wordSet: new Set(['solar', 'system', 'contains', 'eight', 'planets', 'orbiting']),
      },
      {
        index: 1,
        page: 2,
        text: 'Photosynthesis is the process by which green plants synthesize nutrients from sunlight.',
        wordSet: new Set(['photosynthesis', 'process', 'green', 'plants', 'synthesize', 'nutrients', 'sunlight']),
      },
    ];

    const results = findRelevantChunks('photosynthesis sunlight plants', chunks, 2);
    assert.equal(results.length, 2);
    assert.equal(results[0].index, 1);
    assert.ok(results[0].similarity > results[1].similarity);
  });

  it('returns fallback chunks if query has only stop words', () => {
    const chunks = [
      { index: 0, page: 1, text: 'Operating systems manage hardware resources.', wordSet: new Set(['operating', 'systems', 'manage']) },
    ];
    const results = findRelevantChunks('what is the and of', chunks, 1);
    assert.equal(results.length, 1);
  });
});

describe('clientRAG: JSON Schema Normalization & Repair', () => {
  it('parses valid raw JSON payload', () => {
    const raw = JSON.stringify({
      notes: [
        { topic: 'Paging Mechanisms', points: ['Translates virtual to physical addresses.', 'Eliminates external fragmentation.'] },
      ],
      quiz: [
        {
          id: 1,
          question: 'What is the primary benefit of paging?',
          options: ['Contiguous memory allocation', 'Eliminates external fragmentation', 'Faster disk access', 'Direct hardware control'],
          correctAnswerIndex: 1,
          explanation: 'Paging allows non-contiguous physical memory frames.',
        },
      ],
    });

    const parsed = parseAndRepairJSON(raw);
    assert.equal(parsed.notes.length, 1);
    assert.equal(parsed.notes[0].topic, 'Paging Mechanisms');
    assert.equal(parsed.quiz.length, 1);
    assert.equal(parsed.quiz[0].correctAnswerIndex, 1);
  });

  it('repairs markdown fences and trailing commas', () => {
    const rawWithFences = '```json\n{\n  "notes": [\n    {\n      "topic": "Cache Hierarchy",\n      "points": ["L1 cache is fastest.",]\n    },\n  ],\n  "quiz": [\n    {\n      "question": "Which cache is fastest?",\n      "options": ["L1", "L2", "L3", "RAM"],\n      "correctAnswerIndex": 0,\n      "explanation": "L1 cache has lowest latency."\n    }\n  ]\n}\n```';
    const parsed = parseAndRepairJSON(rawWithFences);
    assert.equal(parsed.notes[0].topic, 'Cache Hierarchy');
    assert.equal(parsed.quiz[0].options.length, 4);
    assert.equal(parsed.quiz[0].correctAnswerIndex, 0);
  });

  it('throws on empty or non-JSON strings', () => {
    assert.throws(() => parseAndRepairJSON(''), /empty response/i);
    assert.throws(() => parseAndRepairJSON('No JSON here at all.'), /invalid JSON/i);
  });
});

describe('clientRAG: Key Configuration Management', () => {
  it('returns a string for getApiKey', () => {
    const key = getApiKey();
    assert.equal(typeof key, 'string');
  });
});
