Exit code: 0
Wall time: 1.6 seconds
Output:
const form = document.querySelector('#creator-application');
const message = document.querySelector('#message');
const config = window.RELVIA_SUPABASE_CONFIG;

function showMessage(text, type) {
  message.textContent = text;
  message.className = `message ${type}`;
  message.style.display = 'block';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = form.querySelector('button[type="submit"]');
  if (!config?.url || config.url.includes('YOUR-PROJECT') || !config?.anonKey || config.anonKey.includes('YOUR-ANON')) {
    showMessage('Unable to submit.', 'error');
    return;
  }
  submit.disabled = true;
  submit.textContent = 'Sending applicationâ€¦';
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabase = createClient(config.url, config.anonKey);
  const data = new FormData(form);
  const { error } = await supabase.from('live_creator_applications').insert({
    name: data.get('name'), username: data.get('username'), platform: data.get('platform'),
    followers: Number(data.get('followers')), average_viewers: data.get('average_viewers') ? Number(data.get('average_viewers')) : null,
    content_description: data.get('content'), why_relvia: data.get('why_relvia'),
    social_links: data.get('social_links'), contact_email: data.get('contact')
  });
  submit.disabled = false;
  submit.textContent = 'Submit application â†—';
  if (error) return showMessage('Unable to submit.', 'error');
  form.reset();
  showMessage('Application submitted.', 'success');
});

