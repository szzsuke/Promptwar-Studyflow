import { test, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateMarkdownContent, generatePlainTextContent } from '../src/services/exportGenerators.js';

describe('ExportModal: Format Generators', () => {
  const sampleData = {
    filename: 'cs101_lecture.pdf',
    notes: [
      {
        topic: 'Process Scheduling',
        points: [
          'Preemptive scheduling can interrupt executing tasks.',
          'Round-robin uses a fixed time quantum to balance fairness.',
        ],
      },
    ],
    quiz: [
      {
        id: 1,
        question: 'Which scheduling algorithm uses time slices?',
        options: ['FCFS', 'Round-Robin', 'Priority Scheduling', 'Shortest Job First'],
        correctAnswerIndex: 1,
        explanation: 'Round-robin allocates a fixed time slice per process.',
      },
    ],
    meta: {
      totalPages: 12,
      totalWords: 3400,
      chunksCount: 15,
      modelUsed: 'gemini-2.0-flash',
      personalization: {
        subject: 'Operating Systems',
        academicLevel: 'Undergraduate',
        focus: 'High-Yield Exam Cram',
      },
    },
  };

  it('generates markdown guide with personalizations, notes, quiz, and answer key', () => {
    const md = generateMarkdownContent(sampleData);
    assert.ok(md.includes('# StudyFlow Revision Guide: cs101_lecture.pdf'));
    assert.ok(md.includes('Operating Systems'));
    assert.ok(md.includes('Process Scheduling'));
    assert.ok(md.includes('Round-Robin'));
    assert.ok(md.includes('Option **[B]**'));
  });

  it('generates plain text study sheet with formatted sections', () => {
    const txt = generatePlainTextContent(sampleData);
    assert.ok(txt.includes('STUDYFLOW ACADEMIC REVISION SHEET'));
    assert.ok(txt.includes('SECTION 1: PROCESS SCHEDULING'));
    assert.ok(txt.includes('[B] Round-Robin'));
    assert.ok(txt.includes('Q1 Answer: [B]'));
  });
});
