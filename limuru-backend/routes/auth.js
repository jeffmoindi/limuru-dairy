const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');

const router = express.Router();

router.post(
  '/login',
  [body('email').isEmail(), body('password').notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    try {
      const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
      const admin = result.rows[0];
      if (!admin) return res.status(401).json({ error: 'Invalid email or password.' });

      const match = await bcrypt.compare(password, admin.password_hash);
      if (!match) return res.status(401).json({ error: 'Invalid email or password.' });

      const token = jwt.sign(
        { id: admin.id, email: admin.email, role: admin.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
      );

      res.json({
        token,
        admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error during login.' });
    }
  }
);

module.exports = router;
