# StudyFlow: Standalone AI Learning Workbench

StudyFlow is a local-first, serverless AI study workbench designed with the **DeepStudent** visual system. Students upload a lecture PDF and immediately receive:
1. **Condensed Revision Notes** structured into high-yield bullet points organized by sub-topic.
2. **An Interactive 5-Question Multiple-Choice Quiz** with instant right/wrong evaluation, correct answer highlights, and grounded explanations.

> 🚀 **Live Demo**: [https://studyflow-buddy.vercel.app](https://studyflow-buddy.vercel.app) (Mirror: [https://studyflow-workbench.vercel.app](https://studyflow-workbench.vercel.app))

---

## 100% Client-Side Architecture (No Backend Required)

StudyFlow runs **entirely in your browser without requiring a backend server**:
- **Multi-Format Ingestion**: Parses PDFs (`pdfjs-dist`), Word docs (`.docx`), PowerPoint slide decks (`.pptx`), and text files directly in memory.
- **Sliding-Window RAG Chunking**: Splits document pages into 300-word windows with 50-word overlaps, preserving exact page numbers.
- **Lexical Relevance Retrieval**: Ranks chunks based on query density and semantic content.
- **Direct Gemini Flash Synthesis**: Interacts directly with Google Generative Language REST APIs.
- **Resilient JSON Normalization**: Validates schema and auto-repairs code fences and trailing commas.

---

## Prerequisites
- **Node.js**: v18 or later
- **Google Gemini API Key**: Free from [Google AI Studio](https://aistudio.google.com/)

---

## Quickstart

1. **Install Dependencies**:
   ```bash
   npm --prefix client install
   ```

2. **Configure API Key (Optional)**:
   Add your key to `client/.env`:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *You can also paste or change your API key directly in the top bar within the browser.*

3. **Start the Workbench**:
   ```bash
   npm run dev
   ```
   Open **`http://localhost:5173`** in your browser. No backend server needed.

---

## Verification & Builds

To build the client bundle for production:
```bash
npm run build
```
Builds the standalone static application to `client/dist/`.
