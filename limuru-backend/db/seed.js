require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('./pool');

async function seed() {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      console.error('✖ Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before seeding.');
      process.exit(1);
    }

    const existing = await pool.query('SELECT id FROM admins WHERE email = $1', [email]);
    if (existing.rows.length === 0) {
      const hash = await bcrypt.hash(password, 12);
      await pool.query(
        `INSERT INTO admins (email, password_hash, name, role) VALUES ($1, $2, $3, 'super_admin')`,
        [email, hash, 'Site Admin']
      );
      console.log(`✔ Admin account created: ${email}`);
    } else {
      console.log('• Admin account already exists, skipping.');
    }

    const sampleProducts = [
      ['Fresh Whole Milk (500ml)', 'fresh-milk-500ml', 'Pasteurized whole milk, boxed the same day.', 60, 'Milk'],
      ['Natural Yoghurt (500g)', 'natural-yoghurt-500g', 'Slow-cultured, nothing added.', 150, 'Yoghurt'],
      ['Ghee (250g)', 'ghee-250g', 'Slow-clarified butterfat, hand jarred.', 450, 'Ghee'],
      ['Fresh Cream (250ml)', 'fresh-cream-250ml', 'Skimmed at the farm.', 180, 'Cream'],
    ];

    for (const [name, slug, description, price, category] of sampleProducts) {
      await pool.query(
        `INSERT INTO products (name, slug, description, price, category)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (slug) DO NOTHING`,
        [name, slug, description, price, category]
      );
    }
    console.log('✔ Sample products ensured.');
  } catch (err) {
    console.error('✖ Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
