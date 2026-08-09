const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const request = require('supertest');
const { createApp } = require('../server');

async function tempFile() {
  return path.join(
    os.tmpdir(),
    `submissions-test-${Date.now()}-${Math.random().toString(16).slice(2)}.json`
  );
}

test('POST /api/contact saves a valid submission', async () => {
  const submissionsFile = await tempFile();
  const app = createApp({ submissionsFile });

  const res = await request(app)
    .post('/api/contact')
    .send({ name: 'Ada Lovelace', email: 'ada@example.com', message: 'Hello there' });

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });

  const saved = JSON.parse(await fs.readFile(submissionsFile, 'utf8'));
  assert.equal(saved.length, 1);
  assert.equal(saved[0].name, 'Ada Lovelace');
  assert.equal(saved[0].email, 'ada@example.com');
  assert.equal(saved[0].message, 'Hello there');
  assert.ok(saved[0].submittedAt);

  await fs.unlink(submissionsFile);
});

test('POST /api/contact rejects missing name with 400', async () => {
  const submissionsFile = await tempFile();
  const app = createApp({ submissionsFile });

  const res = await request(app)
    .post('/api/contact')
    .send({ name: '', email: 'ada@example.com', message: 'Hello' });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /name/i);
});

test('POST /api/contact rejects invalid email with 400', async () => {
  const submissionsFile = await tempFile();
  const app = createApp({ submissionsFile });

  const res = await request(app)
    .post('/api/contact')
    .send({ name: 'Ada', email: 'not-an-email', message: 'Hello' });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /email/i);
});

test('POST /api/contact rejects missing message with 400', async () => {
  const submissionsFile = await tempFile();
  const app = createApp({ submissionsFile });

  const res = await request(app)
    .post('/api/contact')
    .send({ name: 'Ada', email: 'ada@example.com', message: '' });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /message/i);
});
