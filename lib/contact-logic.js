const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSubmission({ name, email, message } = {}) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return 'Name is required.';
  }
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return 'A valid email is required.';
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    return 'Message is required.';
  }
  return null;
}

function buildSubmission({ name, email, message }) {
  return {
    name: name.trim(),
    email: email.trim(),
    message: message.trim(),
    submittedAt: new Date().toISOString(),
  };
}

module.exports = { validateSubmission, buildSubmission };
