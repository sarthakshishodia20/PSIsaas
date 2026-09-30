const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }

    const existing = await pool.query(
      'SELECT id FROM organizations WHERE email = $1',
      [email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO organizations (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name, email, passwordHash]
    );

    const org = result.rows[0];
    const token = uuidv4().replace(/-/g, '');

    await pool.query(
      'INSERT INTO assistants (org_id, token) VALUES ($1, $2)',
      [org.id, token]
    );

    const jwtToken = jwt.sign(
      { orgId: org.id, name: org.name, email: org.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Organization registered successfully!',
      token: jwtToken,
      org: {
        id: org.id,
        name: org.name,
        email: org.email,
      },
      assistantToken: token,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await pool.query(
      'SELECT * FROM organizations WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const org = result.rows[0];
    const isValid = await bcrypt.compare(password, org.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const assistantResult = await pool.query(
      'SELECT token FROM assistants WHERE org_id = $1',
      [org.id]
    );
    const assistantToken = assistantResult.rows[0]?.token;

    const jwtToken = jwt.sign(
      { orgId: org.id, name: org.name, email: org.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful!',
      token: jwtToken,
      org: {
        id: org.id,
        name: org.name,
        email: org.email,
      },
      assistantToken,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
