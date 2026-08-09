const { Redis } = require('@upstash/redis');
const { validateSubmission, buildSubmission } = require('../lib/contact-logic');

const redis = Redis.fromEnv();

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const body = req.body || {};
  const validationError = validateSubmission(body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const submission = buildSubmission(body);

  try {
    await redis.rpush('submissions', JSON.stringify(submission));
    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save submission.' });
  }
};
