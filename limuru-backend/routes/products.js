const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// PUBLIC — list products
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE in_stock = true ORDER BY category, name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch products.' });
  }
});

// PUBLIC — single product by slug
router.get('/:slug', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE slug = $1', [req.params.slug]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch product.' });
  }
});

// ADMIN — create product
router.post(
  '/',
  requireAdmin,
  [body('name').trim().notEmpty(), body('slug').trim().notEmpty(), body('price').isFloat({ min: 0 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, slug, description, price, currency, image_url, category, in_stock } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO products (name, slug, description, price, currency, image_url, category, in_stock)
         VALUES ($1,$2,$3,$4,COALESCE($5,'KES'),$6,$7,COALESCE($8,true)) RETURNING *`,
        [name, slug, description || null, price, currency, image_url || null, category || null, in_stock]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Could not create product (slug may already exist).' });
    }
  }
);

// ADMIN — update product
router.patch('/:id', requireAdmin, async (req, res) => {
  const { name, description, price, currency, image_url, category, in_stock } = req.body;
  try {
    const result = await pool.query(
      `UPDATE products SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        currency = COALESCE($4, currency),
        image_url = COALESCE($5, image_url),
        category = COALESCE($6, category),
        in_stock = COALESCE($7, in_stock)
       WHERE id = $8 RETURNING *`,
      [name, description, price, currency, image_url, category, in_stock, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Could not update product.' });
  }
});

// ADMIN — delete product
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Could not delete product.' });
  }
});

module.exports = router;
