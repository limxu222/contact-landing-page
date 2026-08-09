const test = require('node:test');
const assert = require('node:assert/strict');
const { validateSubmission, buildSubmission } = require('../lib/contact-logic');

test('validateSubmission accepts a valid submission', () => {
  const error = validateSubmission({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    message: 'Hello there',
  });
  assert.equal(error, null);
});

test('validateSubmission rejects missing name', () => {
  const error = validateSubmission({ name: '', email: 'ada@example.com', message: 'Hello' });
  assert.match(error, /name/i);
});

test('validateSubmission rejects non-string name', () => {
  const error = validateSubmission({ name: { a: 1 }, email: 'ada@example.com', message: 'Hello' });
  assert.match(error, /name/i);
});

test('validateSubmission rejects invalid email', () => {
  const error = validateSubmission({ name: 'Ada', email: 'not-an-email', message: 'Hello' });
  assert.match(error, /email/i);
});

test('validateSubmission rejects missing message', () => {
  const error = validateSubmission({ name: 'Ada', email: 'ada@example.com', message: '' });
  assert.match(error, /message/i);
});

test('buildSubmission trims fields and adds a timestamp', () => {
  const submission = buildSubmission({
    name: '  Ada Lovelace  ',
    email: '  ada@example.com  ',
    message: '  Hello there  ',
  });
  assert.equal(submission.name, 'Ada Lovelace');
  assert.equal(submission.email, 'ada@example.com');
  assert.equal(submission.message, 'Hello there');
  assert.ok(submission.submittedAt);
  assert.ok(!Number.isNaN(Date.parse(submission.submittedAt)));
});
