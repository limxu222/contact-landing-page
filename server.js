const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createApp({ submissionsFile = path.join(__dirname, 'submissions.json') } = {}) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body || {};

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Name is required.' });
    }
    if (!email || !EMAIL_RE.test(String(email).trim())) {
      return res.status(400).json({ error: 'A valid email is required.' });
    }
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    const submission = {
      name: String(name).trim(),
      email: String(email).trim(),
      message: String(message).trim(),
      submittedAt: new Date().toISOString(),
    };

    try {
      let submissions = [];
      try {
        const existing = await fs.readFile(submissionsFile, 'utf8');
        submissions = JSON.parse(existing);
      } catch (err) {
        if (err.code !== 'ENOENT') throw err;
      }
      submissions.push(submission);
      await fs.writeFile(submissionsFile, JSON.stringify(submissions, null, 2));
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save submission.' });
    }
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Listening on http://localhost:${port}`));
}

module.exports = { createApp };
