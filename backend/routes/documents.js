const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { extractAndChunk } = require('../services/pdfService');
const { generateEmbedding } = require('../services/aiService');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed.'));
    }
    cb(null, true);
  },
});

router.post('/upload', authMiddleware, upload.single('pdf'), async (req, res) => {
  const filePath = req.file?.path;

  try {
    const orgId = req.org.orgId;

    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded.' });
    }

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM documents WHERE org_id = $1',
      [orgId]
    );
    const docCount = parseInt(countResult.rows[0].count);
    if (docCount >= 10) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Maximum 10 PDFs allowed per organization.' });
    }

    const { pageCount, chunks } = await extractAndChunk(filePath);

    if (pageCount > 20) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        error: `PDF has ${pageCount} pages. Maximum 20 pages allowed.`,
      });
    }

    if (chunks.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Could not extract text from PDF.' });
    }

    const docResult = await pool.query(
      `INSERT INTO documents (org_id, filename, original_name, page_count, file_size)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [orgId, req.file.filename, req.file.originalname, pageCount, req.file.size]
    );
    const docId = docResult.rows[0].id;

    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk.content);
      const vectorStr = '[' + embedding.join(',') + ']';
      await pool.query(
        `INSERT INTO chunks (doc_id, org_id, content, page_number, embedding)
         VALUES ($1, $2, $3, $4, $5)`,
        [docId, orgId, chunk.content, chunk.pageNumber, vectorStr]
      );
    }

    res.status(201).json({
      message: 'PDF uploaded and processed successfully!',
      document: {
        id: docId,
        filename: req.file.originalname,
        pageCount,
        chunksCreated: chunks.length,
        fileSize: req.file.size,
      },
    });

  } catch (err) {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Internal server error.' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const orgId = req.org.orgId;

    const result = await pool.query(
      `SELECT id, original_name, page_count, file_size, created_at
       FROM documents
       WHERE org_id = $1
       ORDER BY created_at DESC`,
      [orgId]
    );

    const chunkCount = await pool.query(
      'SELECT COUNT(*) FROM chunks WHERE org_id = $1',
      [orgId]
    );

    res.json({
      documents: result.rows,
      totalDocuments: result.rows.length,
      totalChunks: parseInt(chunkCount.rows[0].count),
    });

  } catch (err) {
    console.error('Get documents error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const orgId = req.org.orgId;
    const docId = req.params.id;

    const doc = await pool.query(
      'SELECT * FROM documents WHERE id = $1 AND org_id = $2',
      [docId, orgId]
    );

    if (doc.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const filePath = path.join(__dirname, '../uploads', doc.rows[0].filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await pool.query('DELETE FROM documents WHERE id = $1', [docId]);

    res.json({ message: 'Document deleted successfully.' });

  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
