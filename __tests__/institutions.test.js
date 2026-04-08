const request = require('supertest');

const app = require('../src/app');

describe('Institutions API', () => {
  it('GET /api/institutions should return a list', async () => {
    const res = await request(app).get('/api/institutions');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/institutions should create a new institution', async () => {
    const payload = {
      name: 'Colegio Central',
      code: 'CC-01',
      city: 'La Paz',
      country: 'Bolivia',
    };

    const res = await request(app).post('/api/institutions').send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        name: payload.name,
        code: payload.code,
        city: payload.city,
        country: payload.country,
        isActive: true,
      }),
    );
  });

  it('POST /api/institutions should reject missing name', async () => {
    const res = await request(app).post('/api/institutions').send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        error: 'validation_error',
      }),
    );
  });
});
