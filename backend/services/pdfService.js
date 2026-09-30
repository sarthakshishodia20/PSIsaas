const PDFParser = require('pdf2json');
const fs = require('fs');

function extractAndChunk(filePath) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on('pdfParser_dataError', (errData) => {
      reject(new Error(errData.parserError || 'Failed to parse PDF'));
    });

    pdfParser.on('pdfParser_dataReady', (pdfData) => {
      try {
        const pageCount = pdfData.Pages.length;
        const chunks = [];
        const CHUNK_SIZE = 500;
        const OVERLAP = 50;

        pdfData.Pages.forEach((page, pageIdx) => {
          const pageNumber = pageIdx + 1;
          let pageText = '';

          if (page.Texts && Array.isArray(page.Texts)) {
            for (const textItem of page.Texts) {
              if (textItem.R && Array.isArray(textItem.R)) {
                for (const r of textItem.R) {
                  try {
                    pageText += ' ' + decodeURIComponent(r.T);
                  } catch (e) {
                    pageText += ' ' + r.T;
                  }
                }
              }
            }
          }

          pageText = pageText.replace(/\s+/g, ' ').trim();
          if (!pageText) return;

          if (pageText.length <= CHUNK_SIZE) {
            chunks.push({ content: pageText, pageNumber });
          } else {
            let start = 0;
            while (start < pageText.length) {
              const end = Math.min(start + CHUNK_SIZE, pageText.length);
              const chunkContent = pageText.substring(start, end).trim();
              if (chunkContent.length > 20) {
                chunks.push({ content: chunkContent, pageNumber });
              }
              if (end === pageText.length) break;
              start += (CHUNK_SIZE - OVERLAP);
            }
          }
        });

        resolve({ pageCount, chunks });
      } catch (err) {
        reject(err);
      }
    });

    pdfParser.loadPDF(filePath);
  });
}

module.exports = { extractAndChunk };
