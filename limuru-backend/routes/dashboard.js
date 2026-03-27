const express = require('express');
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ADMIN — one-shot summary for a dashboard homepage
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [appointments, applications, messages, subscribers, orders, revenue] = await Promise.all([
      pool.query(`SELECT count(*)::int AS n FROM appointments WHERE status = 'pending'`),
      pool.query(`SELECT count(*)::int AS n FROM applications WHERE status = 'submitted'`),
      pool.query(`SELECT count(*)::int AS n FROM chat_messages WHERE status = 'open'`),
      pool.query(`SELECT count(*)::int AS n FROM newsletter_subscribers WHERE active = true`),
      pool.query(`SELECT count(*)::int AS n FROM orders WHERE status = 'pending'`),
      pool.query(`SELECT COALESCE(sum(total),0)::float AS total FROM orders WHERE status != 'cancelled' AND created_at > now() - interval '30 days'`),
    ]);

    res.json({
      pending_appointments: appointments.rows[0].n,
      new_applications: applications.rows[0].n,
      open_chat_messages: messages.rows[0].n,
      active_subscribers: subscribers.rows[0].n,
      pending_orders: orders.rows[0].n,
      revenue_last_30_days: revenue.rows[0].total,
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not build dashboard summary.' });
  }
});

module.exports = router;
