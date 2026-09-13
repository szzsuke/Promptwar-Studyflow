import JSZip from 'jszip';

/**
 * Decodes XML entities safely without external libraries.
 */
function decodeXmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Extracts text from Word (.docx) documents in-browser using DOMParser.
 * 
 * @param {ArrayBuffer} arrayBuffer 
 * @param {string} [filename] 
 * @returns {Promise<{ filename: string, pages: Array<{page: number, text: string}>, fullText: string, totalPages: number, totalWords: number }>}
 */
export async function parseDocx(arrayBuffer, filename = 'document.docx') {
  let zip = null;
  try {
    zip = await JSZip.loadAsync(arrayBuffer);
    const docXml = await zip.file('word/document.xml')?.async('text');
    if (!docXml) {
      throw new Error('Invalid or corrupted Word (.docx) file.');
    }

    const extractedLines = [];

    // Use browser-native DOMParser for fast, safe XML tree traversal
    if (typeof window !== 'undefined' && window.DOMParser) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(docXml, 'application/xml');
      const paragraphs = xmlDoc.getElementsByTagName('w:p');

      for (let i = 0; i < paragraphs.length; i++) {
        const textNodes = paragraphs[i].getElementsByTagName('w:t');
        let line = '';
        for (let j = 0; j < textNodes.length; j++) {
          line += textNodes[j].textContent || '';
        }
        line = line.trim();
        if (line) {
          extractedLines.push(line);
        }
      }
    } else {
      // Fallback regex for non-DOM environments with entity decoding
      const paragraphs = docXml.split(/<\/w:p>/);
      for (const para of paragraphs) {
        const textMatches = para.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
        const line = textMatches
          .map((t) => decodeXmlEntities(t.replace(/<[^>]+>/g, '')))
          .join('')
          .trim();
        if (line) {
          extractedLines.push(line);
        }
      }
    }

    const fullText = extractedLines.join('\n\n');
    if (fullText.trim().length < 20) {
      throw new Error('No readable text found in this Word document.');
    }

    // Create virtual pages of ~350 words each for chunking
    const words = fullText.split(/\s+/).filter(Boolean);
    const wordsPerPage = 350;
    const pages = [];
    for (let i = 0; i < words.length; i += wordsPerPage) {
      pages.push({
        page: Math.floor(i / wordsPerPage) + 1,
        text: words.slice(i, i + wordsPerPage).join(' '),
      });
    }

    return {
      filename,
      pages,
      fullText,
      totalPages: pages.length || 1,
      totalWords: words.length,
    };
  } finally {
    zip = null; // Explicitly release reference to allow GC
  }
}

/**
 * Extracts text from PowerPoint (.pptx) slides in-browser using DOMParser.
 * 
 * @param {ArrayBuffer} arrayBuffer 
 * @param {string} [filename] 
 * @returns {Promise<{ filename: string, pages: Array<{page: number, text: string}>, fullText: string, totalPages: number, totalWords: number }>}
 */
export async function parsePptx(arrayBuffer, filename = 'presentation.pptx') {
  let zip = null;
  try {
    zip = await JSZip.loadAsync(arrayBuffer);

    // Find all slide files
    const slideFiles = [];
    zip.forEach((relativePath) => {
      const match = relativePath.match(/^ppt\/slides\/slide(\d+)\.xml$/);
      if (match) {
        slideFiles.push({ path: relativePath, num: parseInt(match[1], 10) });
      }
    });

    slideFiles.sort((a, b) => a.num - b.num);

    if (slideFiles.length === 0) {
      throw new Error('No slides found in this PowerPoint (.pptx) file.');
    }

    const pages = [];
    let fullText = '';
    const parser = typeof window !== 'undefined' && window.DOMParser ? new DOMParser() : null;

    for (const slide of slideFiles) {
      const xml = await zip.file(slide.path)?.async('text');
      if (!xml) continue;

      let slideText = '';

      if (parser) {
        const xmlDoc = parser.parseFromString(xml, 'application/xml');
        const textNodes = xmlDoc.getElementsByTagName('a:t');
        const lines = [];
        for (let i = 0; i < textNodes.length; i++) {
          const t = (textNodes[i].textContent || '').trim();
          if (t) lines.push(t);
        }
        slideText = lines.join(' ').replace(/\s+/g, ' ').trim();
      } else {
        const textMatches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
        slideText = textMatches
          .map((t) => decodeXmlEntities(t.replace(/<[^>]+>/g, '')))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      if (slideText) {
        pages.push({
          page: slide.num,
          text: slideText,
        });
        fullText += `--- Slide ${slide.num} ---\n${slideText}\n\n`;
      }
    }

    const words = fullText.split(/\s+/).filter(Boolean);

    if (fullText.trim().length < 20) {
      throw new Error('No readable text found across the slides in this presentation.');
    }

    return {
      filename,
      pages,
      fullText,
      totalPages: slideFiles.length,
      totalWords: words.length,
    };
  } finally {
    zip = null; // Explicitly release reference to allow GC
  }
}

/**
 * Parses plain text or markdown documents in-browser.
 * 
 * @param {File} file 
 * @returns {Promise<{ filename: string, pages: Array<{page: number, text: string}>, fullText: string, totalPages: number, totalWords: number }>}
 */
export async function parsePlainText(file) {
  const text = await file.text();
  if (text.trim().length < 20) {
    throw new Error('The text file is empty or contains insufficient content.');
  }

  const words = text.split(/\s+/).filter(Boolean);
  const wordsPerPage = 350;
  const pages = [];
  for (let i = 0; i < words.length; i += wordsPerPage) {
    pages.push({
      page: Math.floor(i / wordsPerPage) + 1,
      text: words.slice(i, i + wordsPerPage).join(' '),
    });
  }

  return {
    filename: file.name,
    pages,
    fullText: text,
    totalPages: pages.length || 1,
    totalWords: words.length,
  };
}

