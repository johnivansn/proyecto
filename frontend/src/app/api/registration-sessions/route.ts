const apiBase = process.env.API_BASE_URL || 'http://localhost:3001';

export async function POST(request: Request) {
  const formData = await request.formData();

  const response = await fetch(`${apiBase}/api/registration-sessions`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json().catch(() => ({}));

  return Response.json(data, { status: response.status });
}
