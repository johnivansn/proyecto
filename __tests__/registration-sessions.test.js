const request = require('supertest');
const XLSX = require('xlsx');

const app = require('../src/app');

function buildWorkbook(headers) {
  const workbook = XLSX.utils.book_new();
  const rows = [headers, ['Ana', 'Ruiz', 'primaria', 1, '2012-01-01']];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

describe('Registration sessions API', () => {
  const requiredHeaders = [
    'Nombres estudiante',
    'Apellidos estudiante',
    'Primaria/secundaria',
    'Curso (numeral 1 a 6)',
    'Fecha de nacimiento',
  ];

  it('POST /api/registration-sessions should reject when file is missing', async () => {
    const res = await request(app)
      .post('/api/registration-sessions')
      .field('teacherId', '11111111-1111-1111-1111-111111111111');

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        error: 'file_required',
      }),
    );
  });

  it('POST /api/registration-sessions should reject invalid headers', async () => {
    const invalidHeaders = [
      'Nombres estudiante',
      'Apellidos estudiante',
      'Nivel',
      'Curso',
      'Fecha de nacimiento',
    ];

    const buffer = buildWorkbook(invalidHeaders);

    const res = await request(app)
      .post('/api/registration-sessions')
      .field('teacherId', '11111111-1111-1111-1111-111111111111')
      .attach('file', buffer, 'alumnos.xlsx');

    expect(res.status).toBe(422);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'failed',
        error: 'invalid_headers',
        missingHeaders: expect.arrayContaining(requiredHeaders),
      }),
    );
  });

  it('POST /api/registration-sessions should accept valid headers', async () => {
    const buffer = buildWorkbook(requiredHeaders);

    const res = await request(app)
      .post('/api/registration-sessions')
      .field('teacherId', '11111111-1111-1111-1111-111111111111')
      .attach('file', buffer, 'alumnos.xlsx');

    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        status: 'validating',
        teacherId: '11111111-1111-1111-1111-111111111111',
      }),
    );
  });
});
