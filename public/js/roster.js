const form = document.getElementById('roster-form');
const names = document.getElementById('names');
const save = document.getElementById('save-names');
const status = document.getElementById('editor-status');
const retry = document.getElementById('reload-names');
let dirty = false;

async function request(url, options) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `Server error (${response.status})`);
  return body;
}

async function load() {
  retry.hidden = true;
  status.textContent = 'Loading roster...';
  status.className = '';
  try {
    const data = await request('/api/state');
    names.value = data.names.join('\n');
    names.disabled = save.disabled = false;
    status.textContent = data.warnings.join(' ');
  } catch (err) {
    // Allow repairing an unreadable or missing roster through this screen.
    names.disabled = save.disabled = false;
    status.className = 'error';
    status.textContent = `Could not load the list: ${err.message} Retry loading, or enter a replacement list and save.`;
    retry.hidden = false;
  }
}

names.addEventListener('input', () => { dirty = true; });
retry.addEventListener('click', load);
window.addEventListener('beforeunload', (event) => {
  if (dirty) { event.preventDefault(); event.returnValue = ''; }
});
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  save.disabled = names.disabled = true;
  status.className = '';
  status.textContent = 'Saving list...';
  try {
    const data = await request('/api/names', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names: names.value.split(/\r?\n/) }),
    });
    names.value = data.names.join('\n');
    dirty = false;
    status.className = 'ok';
    status.textContent = `Saved ${data.names.length} racer${data.names.length === 1 ? '' : 's'}. ${data.warnings.join(' ')}`;
    retry.hidden = true;
  } catch (err) {
    status.className = 'error';
    status.textContent = `Could not save the list: ${err.message}`;
  } finally {
    save.disabled = names.disabled = false;
    save.focus();
  }
});
load();
