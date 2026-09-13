import JSZip from 'jszip';

export async function parseDocx(arrayBuffer, filename = 'document.docx') {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const docXml = await zip.file('word/document.xml')?.async('text');
  if (!docXml) {
    throw new Error('Invalid or corrupted Word (.docx) file.');
  }

  // Parse paragraphs
  const paragraphs = docXml.split(/<\/w:p>/);
  const extractedLines = [];

  for (const para of paragraphs) {
    const textMatches = para.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    const line = textMatches
      .map(t => t.replace(/<[^>]+>/g, ''))
      .join('')
      .trim();
    if (line) {
      extractedLines.push(line);
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
      text: words.slice(i, i + wordsPerPage).join(' ')
    });
  }

  return {
    filename,
    pages,
    fullText,
    totalPages: pages.length || 1,
    totalWords: words.length
  };
}

export async function parsePptx(arrayBuffer, filename = 'presentation.pptx') {
  const zip = await JSZip.loadAsync(arrayBuffer);
  
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

  for (const slide of slideFiles) {
    const xml = await zip.file(slide.path)?.async('text');
    if (!xml) continue;

    const textMatches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
    const slideText = textMatches
      .map(t => t.replace(/<[^>]+>/g, ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (slideText) {
      pages.push({
        page: slide.num,
        text: slideText
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
    totalWords: words.length
  };
}

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
      text: words.slice(i, i + wordsPerPage).join(' ')
    });
  }

  return {
    filename: file.name,
    pages,
    fullText: text,
    totalPages: pages.length || 1,
    totalWords: words.length
  };
}
