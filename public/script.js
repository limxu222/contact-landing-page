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
