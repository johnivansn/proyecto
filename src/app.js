const crypto = require('crypto');

const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');

const app = express();
const upload = multer();

app.use(express.json());

const useMemoryStore = process.env.NODE_ENV === 'test' || !process.env.DATABASE_URL;

let pool = null;
if (!useMemoryStore) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

const institutions = [];
const teachers = [];
const registrationSessions = [];
const notifications = [];
const excelValidationLogs = [];

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

async function listInstitutions() {
  if (useMemoryStore) {
    return institutions;
  }

  const result = await pool.query(
    'SELECT id, name, code, city, country, is_active FROM institution ORDER BY name ASC',
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    city: row.city,
    country: row.country,
    isActive: row.is_active,
  }));
}

async function createInstitution(payload) {
  const institution = buildInstitution(payload);

  if (useMemoryStore) {
    institutions.push(institution);
    return institution;
  }

  await pool.query(
    `INSERT INTO institution (id, name, code, city, country, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      institution.id,
      institution.name,
      institution.code,
      institution.city,
      institution.country,
      institution.isActive,
    ],
  );

  return institution;
}

async function findInstitutionById(id) {
  if (useMemoryStore) {
    return institutions.find((item) => item.id === id) || null;
  }

  const result = await pool.query(
    'SELECT id, name, code, city, country, is_active FROM institution WHERE id = $1',
    [id],
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    city: row.city,
    country: row.country,
    isActive: row.is_active,
  };
}

async function createTeacherRecord(payload) {
  if (useMemoryStore) {
    teachers.push(payload);
    return payload;
  }

  await pool.query(
    `INSERT INTO teacher (id, full_name, email, institution_id, is_verified)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      payload.id,
      payload.fullName,
      payload.email,
      payload.institutionId,
      payload.isVerified,
    ],
  );

  return payload;
}

async function createNotificationRecord(payload) {
  if (useMemoryStore) {
    notifications.push(payload);
    return payload;
  }

  await pool.query(
    `INSERT INTO notification (id, teacher_id, type, recipient_email, subject, body, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      payload.id,
      payload.teacherId,
      payload.type,
      payload.recipientEmail,
      payload.subject,
      payload.body,
      payload.status,
    ],
  );

  return payload;
}

async function createRegistrationSessionRecord(payload) {
  if (useMemoryStore) {
    registrationSessions.push(payload);
    return payload;
  }

  await pool.query(
    `INSERT INTO registration_session (id, teacher_id, status, error_message)
     VALUES ($1, $2, $3, $4)`,
    [payload.id, payload.teacherId, payload.status, payload.errorMessage || null],
  );

  return payload;
}

async function createExcelValidationLogs(sessionId, headers, receivedHeaders) {
  if (useMemoryStore) {
    headers.forEach((header) => {
      excelValidationLogs.push({
        id: crypto.randomUUID(),
        registrationSessionId: sessionId,
        columnName: header,
        isValid: receivedHeaders.includes(header),
        errorDetail: receivedHeaders.includes(header) ? null : 'missing_header',
      });
    });
    return;
  }

  const values = headers.map((header) => ({
    id: crypto.randomUUID(),
    columnName: header,
    isValid: receivedHeaders.includes(header),
    errorDetail: receivedHeaders.includes(header) ? null : 'missing_header',
  }));

  for (const item of values) {
    await pool.query(
      `INSERT INTO excel_validation_log (id, registration_session_id, column_name, is_valid, error_detail)
       VALUES ($1, $2, $3, $4, $5)`,
      [item.id, sessionId, item.columnName, item.isValid, item.errorDetail],
    );
  }
}

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Institutions
app.get('/api/institutions', async (req, res) => {
  const data = await listInstitutions();
  res.status(200).json(data);
});

app.post('/api/institutions', async (req, res) => {
  const { name, code, city, country } = req.body || {};

  if (!name) {
    return res.status(400).json({ error: 'validation_error' });
  }

  const institution = await createInstitution({ name, code, city, country });
  return res.status(201).json(institution);
});

// Teachers
app.post('/api/teachers', async (req, res) => {
  const { fullName, email, institution } = req.body || {};

  if (!fullName || !email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'validation_error', field: 'email' });
  }

  let institutionRecord = null;

  if (institution && institution.id) {
    institutionRecord = await findInstitutionById(institution.id);

    if (!institutionRecord) {
      return res.status(404).json({ error: 'institution_not_found' });
    }
  }

  if (!institutionRecord && institution && institution.name) {
    institutionRecord = await createInstitution(institution);
  }

  const teacher = {
    id: crypto.randomUUID(),
    fullName,
    email,
    institutionId: institutionRecord ? institutionRecord.id : crypto.randomUUID(),
    isVerified: false,
  };

  await createTeacherRecord(teacher);

  const notification = {
    id: crypto.randomUUID(),
    teacherId: teacher.id,
    type: 'registration_confirm',
    recipientEmail: email,
    subject: 'Confirmacion de registro',
    body: 'Tu registro fue recibido correctamente.',
    status: 'queued',
  };

  await createNotificationRecord(notification);

  return res.status(201).json({
    teacher,
    institution: institutionRecord || {
      id: teacher.institutionId,
      name: institution?.name || null,
    },
    notification: {
      id: notification.id,
      type: notification.type,
      status: notification.status,
    },
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

app.post('/api/registration-sessions', upload.single('file'), async (req, res) => {
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
    const session = {
      id: crypto.randomUUID(),
      teacherId: teacherId || null,
      status: 'failed',
      errorMessage: 'invalid_headers',
    };

    await createRegistrationSessionRecord(session);
    await createExcelValidationLogs(session.id, requiredHeaders, headers);

    return res.status(422).json({
      status: 'failed',
      error: 'invalid_headers',
      missingHeaders: requiredHeaders,
    });
  }

  const session = {
    id: crypto.randomUUID(),
    teacherId: teacherId || null,
    status: 'validating',
  };

  await createRegistrationSessionRecord(session);

  return res.status(201).json({
    id: session.id,
    status: session.status,
    teacherId,
  });
});

module.exports = app;
