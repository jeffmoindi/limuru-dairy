const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// PUBLIC — list open roles
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM careers WHERE status = 'open' ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch job listings.' });
  }
});

// PUBLIC — single job detail
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM careers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Job not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch job.' });
  }
});

// ADMIN — create a job posting
router.post(
  '/',
  requireAdmin,
  [body('title').trim().notEmpty(), body('description').trim().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { title, department, location, employment_type, description } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO careers (title, department, location, employment_type, description)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [title, department || null, location || null, employment_type || 'Full-time', description]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Could not create job posting.' });
    }
  }
);

// ADMIN — update / close a job posting
router.patch('/:id', requireAdmin, async (req, res) => {
  const { title, department, location, employment_type, description, status } = req.body;
  try {
    const result = await pool.query(
      `UPDATE careers SET
        title = COALESCE($1, title),
        department = COALESCE($2, department),
        location = COALESCE($3, location),
        employment_type = COALESCE($4, employment_type),
        description = COALESCE($5, description),
        status = COALESCE($6, status)
       WHERE id = $7 RETURNING *`,
      [title, department, location, employment_type, description, status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Job not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Could not update job.' });
  }
});

// ADMIN — delete a job posting
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM careers WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Could not delete job.' });
  }
});

module.exports = router;
