# Contact Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static landing page with a Name/Email/Message contact form that POSTs to a small Node/Express backend, which validates and stores submissions in `submissions.json`.

**Architecture:** One Express server (`server.js`) serves the static `public/` frontend and exposes `POST /api/contact`. The frontend (`public/index.html` + `public/script.js`) submits via `fetch()` and shows an inline success/error message. Submissions are validated server-side and appended to a JSON file.

**Tech Stack:** Node.js, Express, `node:test` + `supertest` for backend tests. No frontend framework, no build step.

## Global Constraints
- No CORS config — frontend and API are same-origin (one server, one port).
- Server-side validation is mandatory even though the form also has client-side HTML5 validation (per spec: never trust client validation alone).
- Storage is a single `submissions.json` array of `{ name, email, message, submittedAt }`; it is created at runtime and gitignored.
- `server.js` must export an app factory (`createApp`) that accepts an injectable `submissionsFile` path, so tests never touch the real `submissions.json`.

---

### Task 1: Project setup + backend contact endpoint

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `server.js`
- Test: `test/server.test.js`

**Interfaces:**
- Produces: `createApp({ submissionsFile } = {})` exported from `server.js` — returns an Express app. Route `POST /api/contact` accepts JSON `{ name, email, message }`, returns `200 { ok: true }` on success, `400 { error: string }` on validation failure, `500 { error: string }` on storage failure.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "contact-landing-page",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "node server.js",
    "test": "node --test test/"
  },
  "dependencies": {
    "express": "^4.19.2"
  },
  "devDependencies": {
    "supertest": "^7.0.0"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
submissions.json
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, `package-lock.json` created, no errors.

- [ ] **Step 4: Write the failing tests**

Create `test/server.test.js`:

```javascript
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
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../server'` (server.js doesn't exist yet).

- [ ] **Step 6: Write `server.js`**

```javascript
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
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all 4 tests green.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json .gitignore server.js test/server.test.js
git commit -m "feat: add contact API endpoint with validation and JSON storage"
```

(Skip this step if the user opted out of git for this project — leave files staged/unstaged as-is.)

---

### Task 2: Static frontend markup and styling

**Files:**
- Create: `public/index.html`
- Create: `public/styles.css`

**Interfaces:**
- Consumes: nothing from Task 1 directly (static files only), but the form's `action`-equivalent (`fetch` target `/api/contact`) is wired in Task 3 against the endpoint Task 1 produced.
- Produces: a form with `id="contact-form"`, fields `name`, `email`, `message` (accessible via `form.name`, `form.email`, `form.message`), a submit button `id="submit-btn"`, and a status element `id="form-status"` — Task 3 depends on these exact ids/names.

- [ ] **Step 1: Create `public/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Business Name — Get in Touch</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="hero">
    <div class="container">
      <h1>Your Headline Goes Here</h1>
      <p class="subheadline">A short subheadline describing what you offer and why it matters. Replace this with your own copy.</p>
    </div>
  </header>

  <main class="container">
    <section class="contact" id="contact">
      <h2>Get in touch</h2>
      <p>Have a question or want to work together? Send us a message.</p>

      <form id="contact-form" novalidate>
        <div class="field">
          <label for="name">Name</label>
          <input type="text" id="name" name="name" required>
        </div>

        <div class="field">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required>
        </div>

        <div class="field">
          <label for="message">Message</label>
          <textarea id="message" name="message" rows="5" required></textarea>
        </div>

        <button type="submit" id="submit-btn">Send message</button>

        <p id="form-status" class="form-status" role="status" aria-live="polite"></p>
      </form>
    </section>
  </main>

  <footer class="container">
    <p>&copy; 2026 Your Business Name.</p>
  </footer>

  <script src="script.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `public/styles.css`**

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: #1a1a1a;
  line-height: 1.5;
}

.container {
  max-width: 640px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.hero {
  background: #1a1a2e;
  color: #fff;
  padding: 4rem 0 3rem;
  text-align: center;
}

.hero h1 {
  font-size: 2.25rem;
  margin: 0 0 0.75rem;
}

.hero .subheadline {
  font-size: 1.125rem;
  color: #c9c9d9;
  margin: 0;
}

.contact {
  padding: 3rem 0;
}

.contact h2 {
  margin-top: 0;
}

.field {
  margin-bottom: 1.25rem;
}

.field label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.375rem;
}

.field input,
.field textarea {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid #ccc;
  border-radius: 6px;
  font: inherit;
}

.field input:focus,
.field textarea:focus {
  outline: 2px solid #4a4ae0;
  outline-offset: 1px;
}

button[type="submit"] {
  background: #4a4ae0;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

button[type="submit"]:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-status {
  margin-top: 1rem;
  font-weight: 600;
}

.form-status--success {
  color: #1a7f37;
}

.form-status--error {
  color: #c62828;
}

footer {
  padding: 2rem 0;
  text-align: center;
  color: #666;
  font-size: 0.875rem;
}
```

- [ ] **Step 3: Verify markup renders**

Run: `npm start`, then open `http://localhost:3000` in a browser.
Expected: Hero section and contact form render; no console errors (the form won't submit successfully yet — that's Task 3).

- [ ] **Step 4: Commit**

```bash
git add public/index.html public/styles.css
git commit -m "feat: add static landing page markup and styles"
```

(Skip this step if the user opted out of git for this project.)

---

### Task 3: Frontend form submission logic + end-to-end verification

**Files:**
- Create: `public/script.js`

**Interfaces:**
- Consumes: `#contact-form` with `name`/`email`/`message` fields, `#submit-btn`, `#form-status` (from Task 2); `POST /api/contact` endpoint (from Task 1).

- [ ] **Step 1: Create `public/script.js`**

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  const submitBtn = document.getElementById('submit-btn');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      message: form.message.value.trim(),
    };

    submitBtn.disabled = true;
    status.textContent = '';
    status.classList.remove('form-status--error', 'form-status--success');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Request failed');
      }

      status.textContent = "Thanks, we got it! We'll be in touch soon.";
      status.classList.add('form-status--success');
      form.reset();
    } catch (err) {
      status.textContent = 'Something went wrong. Please try again.';
      status.classList.add('form-status--error');
    } finally {
      submitBtn.disabled = false;
    }
  });
});
```

- [ ] **Step 2: Verify the happy path in a browser**

Run: `npm start` (if not already running), open `http://localhost:3000`.
Fill in Name, Email, Message and click "Send message".
Expected: success message "Thanks, we got it! We'll be in touch soon." appears, form clears, and `submissions.json` at the project root now contains the new entry.

- [ ] **Step 3: Verify the validation path in a browser**

Leave the Email field empty or type an invalid email (e.g. `notanemail`) and click "Send message".
Expected: the browser's native validation bubble blocks submission (no network request sent) — confirm via the browser's Network tab that no `/api/contact` request fired.

- [ ] **Step 4: Verify the server-error path**

Stop the server (Ctrl+C) while the page is still open in the browser, then submit a valid form.
Expected: error message "Something went wrong. Please try again." appears, form values are preserved (not cleared). Restart the server afterward with `npm start`.

- [ ] **Step 5: Commit**

```bash
git add public/script.js
git commit -m "feat: wire contact form submission to the API"
```

(Skip this step if the user opted out of git for this project.)
