const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');
const { notifyStaff } = require('../utils/mailer');

const router = express.Router();

// PUBLIC — place an order
// body: { customer_name, email, phone, delivery_address, items: [{ product_id, quantity }] }
router.post(
  '/',
  [
    body('customer_name').trim().notEmpty(),
    body('email').isEmail(),
    body('phone').trim().notEmpty(),
    body('delivery_address').trim().notEmpty(),
    body('items').isArray({ min: 1 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { customer_name, email, phone, delivery_address, items } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let total = 0;
      const resolvedItems = [];
      for (const item of items) {
        const productResult = await client.query('SELECT * FROM products WHERE id = $1 AND in_stock = true', [item.product_id]);
        const product = productResult.rows[0];
        if (!product) throw new Error(`Product ${item.product_id} is unavailable.`);
        const quantity = Math.max(1, parseInt(item.quantity, 10) || 1);
        total += Number(product.price) * quantity;
        resolvedItems.push({ product_id: product.id, quantity, unit_price: product.price });
      }

      const orderResult = await client.query(
        `INSERT INTO orders (customer_name, email, phone, delivery_address, total)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [customer_name, email, phone, delivery_address, total]
      );
      const order = orderResult.rows[0];

      for (const item of resolvedItems) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1,$2,$3,$4)`,
          [order.id, item.product_id, item.quantity, item.unit_price]
        );
      }

      await client.query('COMMIT');
      notifyStaff('New order placed', `${customer_name} placed an order totalling KES ${total}.`);
      res.status(201).json({ ...order, items: resolvedItems });
    } catch (err) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: err.message || 'Could not place order.' });
    } finally {
      client.release();
    }
  }
);

// ADMIN — list orders with their items
router.get('/', requireAdmin, async (req, res) => {
  const { status } = req.query;
  try {
    const ordersResult = status
      ? await pool.query('SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC', [status])
      : await pool.query('SELECT * FROM orders ORDER BY created_at DESC');

    const orders = ordersResult.rows;
    const ids = orders.map((o) => o.id);
    let itemsByOrder = {};
    if (ids.length) {
      const itemsResult = await pool.query(
        `SELECT oi.*, p.name AS product_name FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ANY($1)`,
        [ids]
      );
      itemsByOrder = itemsResult.rows.reduce((acc, row) => {
        (acc[row.order_id] ||= []).push(row);
        return acc;
      }, {});
    }

    res.json(orders.map((o) => ({ ...o, items: itemsByOrder[o.id] || [] })));
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch orders.' });
  }
});

// ADMIN — update order status
router.patch('/:id', requireAdmin, async (req, res) => {
  const allowed = ['pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'];
  const { status } = req.body;
  if (status && !allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }
  try {
    const result = await pool.query(
      'UPDATE orders SET status = COALESCE($1, status) WHERE id = $2 RETURNING *',
      [status || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Could not update order.' });
  }
});

module.exports = router;
