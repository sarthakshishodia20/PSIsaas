const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { generateEmbedding, generateAnswer } = require('../services/aiService');

const router = express.Router();

router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const result = await pool.query(
      `SELECT a.token, o.id as org_id, o.name as org_name
       FROM assistants a
       JOIN organizations o ON a.org_id = o.id
       WHERE a.token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assistant not found or invalid token.' });
    }

    const { org_name, token: assistantToken } = result.rows[0];

    res.json({
      success: true,
      orgName: org_name,
      token: assistantToken,
      welcomeMessage: `Welcome! I am the AI Knowledge Assistant for ${org_name}. How can I assist you today?`,
    });
  } catch (error) {
    console.error('Error fetching assistant info:', error);
    res.status(500).json({ error: 'Failed to retrieve assistant info.' });
  }
});

router.post('/:token/query', async (req, res) => {
  try {
    const { token } = req.params;
    const { question } = req.body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({ error: 'Question is required.' });
    }

    const assistantResult = await pool.query(
      `SELECT a.token, o.id as org_id, o.name as org_name
       FROM assistants a
       JOIN organizations o ON a.org_id = o.id
       WHERE a.token = $1`,
      [token]
    );

    if (assistantResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or inactive assistant token.' });
    }

    const org = assistantResult.rows[0];
    const orgId = org.org_id;
    const orgName = org.org_name;

    const queryEmbedding = await generateEmbedding(question);
    const vectorStr = '[' + queryEmbedding.join(',') + ']';

    const searchResult = await pool.query(
      `SELECT c.id, c.content, c.page_number, d.original_name as doc_name,
              1 - (c.embedding <=> $1) as similarity
       FROM chunks c
       JOIN documents d ON c.doc_id = d.id
       WHERE c.org_id = $2 AND c.embedding IS NOT NULL
       ORDER BY c.embedding <=> $1
       LIMIT 5`,
      [vectorStr, orgId]
    );

    const relevantChunks = searchResult.rows;
    const SIMILARITY_THRESHOLD = 0.25;
    const bestMatch = relevantChunks.length > 0 ? relevantChunks[0].similarity : 0;

    let answer = '';
    let sources = [];

    if (relevantChunks.length === 0 || bestMatch < SIMILARITY_THRESHOLD) {
      answer = `I could not find information regarding this in the uploaded documents for ${orgName}. Please contact the administration or check official channels for further details.`;
      sources = [];
    } else {
      answer = await generateAnswer(question, relevantChunks, orgName);

      const sourceMap = new Map();
      relevantChunks.forEach((chunk) => {
        const key = `${chunk.doc_name}-p${chunk.page_number}`;
        if (!sourceMap.has(key)) {
          sourceMap.set(key, {
            document: chunk.doc_name,
            page: chunk.page_number,
          });
        }
      });
      sources = Array.from(sourceMap.values());
    }

    try {
      await pool.query(
        `INSERT INTO conversations (org_id, user_query, ai_response, sources)
         VALUES ($1, $2, $3, $4)`,
        [orgId, question, answer, JSON.stringify(sources)]
      );
    } catch (dbErr) {
      console.error('Failed to log conversation:', dbErr.message);
    }

    res.json({
      success: true,
      answer,
      sources,
      matchedChunks: relevantChunks.length,
    });
  } catch (error) {
    console.error('Query processing error:', error);
    res.status(500).json({ error: error.message || 'Internal server error while answering query.' });
  }
});

router.get('/analytics/history', authMiddleware, async (req, res) => {
  try {
    const orgId = req.org.orgId;

    const result = await pool.query(
      `SELECT id, user_query, ai_response, sources, created_at
       FROM conversations
       WHERE org_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [orgId]
    );

    res.json({
      success: true,
      conversations: result.rows,
    });
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    res.status(500).json({ error: 'Failed to retrieve conversation history.' });
  }
});

module.exports = router;
