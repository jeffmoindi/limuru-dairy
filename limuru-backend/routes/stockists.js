const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// PUBLIC — list stockists (for a "find near me" map)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM stockists ORDER BY area, name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch stockists.' });
  }
});

// ADMIN — add a stockist
router.post(
  '/',
  requireAdmin,
  [body('name').trim().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, area, address, latitude, longitude, phone } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO stockists (name, area, address, latitude, longitude, phone)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [name, area || null, address || null, latitude || null, longitude || null, phone || null]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Could not add stockist.' });
    }
  }
);

// ADMIN — delete a stockist
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM stockists WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Could not delete stockist.' });
  }
});

module.exports = router;
