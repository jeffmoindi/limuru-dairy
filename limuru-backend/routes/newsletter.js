const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// PUBLIC — subscribe
router.post('/', [body('email').isEmail()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const result = await pool.query(
      `INSERT INTO newsletter_subscribers (email) VALUES ($1)
       ON CONFLICT (email) DO UPDATE SET active = true
       RETURNING *`,
      [req.body.email]
    );
    res.status(201).json({ message: "You're on the list.", subscriber: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Could not subscribe.' });
  }
});

// PUBLIC — unsubscribe
router.post('/unsubscribe', [body('email').isEmail()], async (req, res) => {
  try {
    await pool.query('UPDATE newsletter_subscribers SET active = false WHERE email = $1', [req.body.email]);
    res.json({ message: 'You have been unsubscribed.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not unsubscribe.' });
  }
});

// ADMIN — export subscriber list
router.get('/', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM newsletter_subscribers WHERE active = true ORDER BY subscribed_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch subscribers.' });
  }
});

module.exports = router;
