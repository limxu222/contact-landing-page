# Contact Landing Page — Design

## Purpose
A landing page with a contact/lead form. Visitors submit Name, Email, and
Message; submissions are saved by a small custom backend (no third-party
form service).

## Architecture
Two parts, served together from one Node process:

- **Frontend** — static files: `public/index.html`, `public/styles.css`,
  `public/script.js`. Hero section with placeholder headline/copy (marked
  for later editing) plus the contact form.
- **Backend** — `server.js`, a Node.js + Express app that:
  - Serves the `public/` static files.
  - Exposes `POST /api/contact` accepting JSON `{ name, email, message }`.
  - Runs on one port (default 3000), so no CORS config is needed —
    frontend and API are same-origin.

## Data Flow
1. User fills out the form and submits.
2. `script.js` runs HTML5 validation, then does `fetch('/api/contact', { method: 'POST', body: JSON.stringify({...}) })`.
3. Server validates the payload again (required fields, basic email format).
4. On success, server appends a JSON line/object with a timestamp to
   `submissions.json` (created if missing) and responds `200`.
5. Frontend shows an inline "Thanks, we got it" message and clears the form.
6. On any non-2xx response, frontend shows a generic inline error message
   and leaves the form filled in so the user can retry.

## Storage
`submissions.json` at the project root, holding an array of objects:
```json
{ "name": "...", "email": "...", "message": "...", "submittedAt": "2026-08-09T12:00:00.000Z" }
```
Appends read-modify-write the whole array (simple, fine at this scale).

## Error Handling
- **Client-side:** required fields + native email format check before submit.
- **Server-side:** re-validates required fields and email format
  (never trust client validation alone). Missing/invalid fields → `400`
  with a JSON error message. File write failure → `500`.
- Frontend never assumes success; it only shows the success state after a
  `200` response.

## Project Structure
```
/
├── server.js
├── package.json
├── submissions.json      (created at runtime, gitignored)
└── public/
    ├── index.html
    ├── styles.css
    └── script.js
```

## Out of Scope
- Authentication, spam protection (e.g. captcha/rate limiting).
- Admin UI for viewing submissions (submissions.json can be opened directly).
- Deployment/hosting configuration.
