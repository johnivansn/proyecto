const crypto = require('crypto');

const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');

const app = express();
const upload = multer();

app.use(express.json());

const institutions = [];

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildInstitution(payload) {
  return {
    id: crypto.randomUUID(),
    name: payload.name,
    code: payload.code || null,
    city: payload.city || null,
    country: payload.country || 'Mexico',
    isActive: true,
  };
}

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Institutions
app.get('/api/institutions', (req, res) => {
  res.status(200).json(institutions);
});

app.post('/api/institutions', (req, res) => {
  const { name, code, city, country } = req.body || {};

  if (!name) {
    return res.status(400).json({ error: 'validation_error' });
  }

  const institution = buildInstitution({ name, code, city, country });
  institutions.push(institution);
  return res.status(201).json(institution);
});

// Teachers
app.post('/api/teachers', (req, res) => {
  const { fullName, email, institution } = req.body || {};

  if (!fullName || !email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'validation_error', field: 'email' });
  }

  if (institution && institution.id === '00000000-0000-0000-0000-000000000000') {
    return res.status(404).json({ error: 'institution_not_found' });
  }

  let institutionRecord = null;
  if (institution && institution.name) {
    institutionRecord = buildInstitution(institution);
    institutions.push(institutionRecord);
  }

  const teacher = {
    id: crypto.randomUUID(),
    fullName,
    email,
    institutionId: institutionRecord ? institutionRecord.id : crypto.randomUUID(),
    isVerified: false,
  };

  const notification = {
    id: crypto.randomUUID(),
    type: 'registration_confirm',
    status: 'queued',
  };

  return res.status(201).json({
    teacher,
    institution: institutionRecord || {
      id: teacher.institutionId,
      name: institution?.name || null,
    },
    notification,
  });
});

// Registration sessions
const requiredHeaders = [
  'Nombres estudiante',
  'Apellidos estudiante',
  'Primaria/secundaria',
  'Curso (numeral 1 a 6)',
  'Fecha de nacimiento',
];

app.post('/api/registration-sessions', upload.single('file'), (req, res) => {
  const { teacherId } = req.body || {};

  if (!req.file) {
    return res.status(400).json({ error: 'file_required' });
  }

  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const headers = rows[0] || [];

  const headersMatch =
    headers.length === requiredHeaders.length &&
    requiredHeaders.every((header, index) => headers[index] === header);

  if (!headersMatch) {
    return res.status(422).json({
      status: 'failed',
      error: 'invalid_headers',
      missingHeaders: requiredHeaders,
    });
  }

  return res.status(201).json({
    id: crypto.randomUUID(),
    status: 'validating',
    teacherId,
  });
});

module.exports = app;
