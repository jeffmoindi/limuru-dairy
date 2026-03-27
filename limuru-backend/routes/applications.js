const express = require('express');
const path = require('path');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');
const { notifyStaff } = require('../utils/mailer');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ok = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.mimetype);
    cb(ok ? null : new Error('Only PDF or Word documents are allowed.'), ok);
  },
});

// PUBLIC — submit a job application (resume upload optional but recommended)
router.post(
  '/',
  upload.single('resume'),
  [
    body('applicant_name').trim().notEmpty(),
    body('email').isEmail(),
    body('job_id').optional().isInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { applicant_name, email, phone, cover_letter, job_id } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO applications (job_id, applicant_name, email, phone, cover_letter, resume_path)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [job_id || null, applicant_name, email, phone || null, cover_letter || null, req.file ? req.file.filename : null]
      );
      notifyStaff('New job application', `${applicant_name} applied for job #${job_id || 'general'}.`);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Could not submit application.' });
    }
  }
);

// ADMIN — list applications (optionally by job or status)
router.get('/', requireAdmin, async (req, res) => {
  const { job_id, status } = req.query;
  const clauses = [];
  const values = [];
  if (job_id) { values.push(job_id); clauses.push(`job_id = $${values.length}`); }
  if (status) { values.push(status); clauses.push(`status = $${values.length}`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  try {
    const result = await pool.query(`SELECT * FROM applications ${where} ORDER BY created_at DESC`, values);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch applications.' });
  }
});

// ADMIN — update application status
router.patch('/:id', requireAdmin, async (req, res) => {
  const allowed = ['submitted', 'reviewing', 'interview', 'rejected', 'hired'];
  const { status } = req.body;
  if (status && !allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
  }
  try {
    const result = await pool.query(
      'UPDATE applications SET status = COALESCE($1, status) WHERE id = $2 RETURNING *',
      [status || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Application not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Could not update application.' });
  }
});

module.exports = router;
