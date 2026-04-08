const request = require('supertest');

const app = require('../src/app');

describe('Teachers API', () => {
  it('POST /api/teachers should register a teacher and queue notification', async () => {
    const payload = {
      fullName: 'Ana Ruiz',
      email: 'ana.ruiz@example.com',
      institution: {
        name: 'Colegio Central',
        code: 'CC-01',
        city: 'La Paz',
        country: 'Bolivia',
      },
    };

    const res = await request(app).post('/api/teachers').send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        teacher: expect.objectContaining({
          id: expect.any(String),
          fullName: payload.fullName,
          email: payload.email,
          institutionId: expect.any(String),
          isVerified: false,
        }),
        institution: expect.objectContaining({
          id: expect.any(String),
          name: payload.institution.name,
        }),
        notification: expect.objectContaining({
          id: expect.any(String),
          type: 'registration_confirm',
          status: 'queued',
        }),
      }),
    );
  });

  it('POST /api/teachers should reject invalid email', async () => {
    const payload = {
      fullName: 'Ana Ruiz',
      email: 'ana.ruiz@',
      institution: {
        name: 'Colegio Central',
      },
    };

    const res = await request(app).post('/api/teachers').send(payload);

    expect(res.status).toBe(400);
    expect(res.body).toEqual(
      expect.objectContaining({
        error: 'validation_error',
        field: 'email',
      }),
    );
  });

  it('POST /api/teachers should reject unknown institution id', async () => {
    const payload = {
      fullName: 'Ana Ruiz',
      email: 'ana.ruiz@example.com',
      institution: {
        id: '00000000-0000-0000-0000-000000000000',
      },
    };

    const res = await request(app).post('/api/teachers').send(payload);

    expect(res.status).toBe(404);
    expect(res.body).toEqual(
      expect.objectContaining({
        error: 'institution_not_found',
      }),
    );
  });
});
