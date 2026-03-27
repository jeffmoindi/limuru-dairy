const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');
const { notifyStaff } = require('../utils/mailer');

const router = express.Router();

// PUBLIC — submit a booking request
router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('email').isEmail(),
    body('preferred_date').isISO8601(),
    body('phone').optional().trim(),
    body('purpose').optional().trim(),
    body('preferred_time').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, phone, purpose, preferred_date, preferred_time } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO appointments (name, email, phone, purpose, preferred_date, preferred_time)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [name, email, phone || null, purpose || null, preferred_date, preferred_time || null]
      );
      notifyStaff('New appointment request', `${name} requested an appointment on ${preferred_date}.`);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Could not save appointment.' });
    }
  }
);

// ADMIN — list all appointments (optionally filter by status)
router.get('/', requireAdmin, async (req, res) => {
  const { status } = req.query;
  try {
    const result = status
      ? await pool.query('SELECT * FROM appointments WHERE status = $1 ORDER BY preferred_date', [status])
      : await pool.query('SELECT * FROM appointments ORDER BY preferred_date');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch appointments.' });
  }
});

// ADMIN — update status (confirm / decline / complete)
router.patch('/:id', requireAdmin, async (req, res) => {
  const { status, notes } = req.body;
  const allowed = ['pending', 'confirmed', 'declined', 'completed'];
  if (status && !allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }
  try {
    const result = await pool.query(
      `UPDATE appointments SET status = COALESCE($1, status), notes = COALESCE($2, notes) WHERE id = $3 RETURNING *`,
      [status || null, notes || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Appointment not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Could not update appointment.' });
  }
});

module.exports = router;
