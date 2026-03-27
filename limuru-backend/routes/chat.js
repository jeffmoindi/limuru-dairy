const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');
const { notifyStaff } = require('../utils/mailer');

const router = express.Router();

// PUBLIC — send a message
router.post(
  '/',
  [body('name').trim().notEmpty(), body('message').trim().notEmpty(), body('email').optional().isEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, message } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO chat_messages (name, email, message) VALUES ($1,$2,$3) RETURNING *`,
        [name, email || null, message]
      );
      notifyStaff('New chat message', `${name}: ${message}`);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Could not send message.' });
    }
  }
);

// ADMIN — list messages (optionally by status)
router.get('/', requireAdmin, async (req, res) => {
  const { status } = req.query;
  try {
    const result = status
      ? await pool.query('SELECT * FROM chat_messages WHERE status = $1 ORDER BY created_at DESC', [status])
      : await pool.query('SELECT * FROM chat_messages ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch messages.' });
  }
});

// ADMIN — reply to a message
router.patch('/:id', requireAdmin, async (req, res) => {
  const { reply, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE chat_messages SET
        reply = COALESCE($1, reply),
        status = COALESCE($2, status),
        replied_at = CASE WHEN $1 IS NOT NULL THEN now() ELSE replied_at END
       WHERE id = $3 RETURNING *`,
      [reply || null, status || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Message not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Could not update message.' });
  }
});

module.exports = router;
