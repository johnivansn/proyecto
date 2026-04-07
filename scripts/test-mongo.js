const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

function loadEnvValue(key) {
  const envPath = path.resolve(__dirname, '..', '.env');
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const k = trimmed.slice(0, idx).trim();
    const v = trimmed.slice(idx + 1).trim();
    if (k === key) return v;
  }
  return undefined;
}

(async () => {
  try {
    const uri = process.env.MONGO_URI || loadEnvValue('MONGO_URI');
    if (!uri) {
      throw new Error('MONGO_URI no definido en el entorno ni en .env');
    }

    const client = new MongoClient(uri);
    await client.connect();
    console.log('OK: conectado a MongoDB');
    await client.close();
  } catch (err) {
    console.error('FAIL:', err.message);
    process.exitCode = 1;
  }
})();
