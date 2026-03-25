document.addEventListener('DOMContentLoaded', () => {
  renderDigests();
});

function loadSavedDigests() {
  return JSON.parse(localStorage.getItem('savedDigests') || '[]');
}

function saveSavedDigests(digests) {
  localStorage.setItem('savedDigests', JSON.stringify(digests));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function digestMarkdownToHtml(md) {
  // Strip leading # title line (shown separately)
  let text = md.replace(/^#\s+.+\n?\n?/, '');

  let html = text
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(\d+)\]/g, '<sup class="cite">[$1]</sup>')
    .replace(/^[\*\-] (.+)$/gm, '<li>$1</li>')
    .split(/\n{2,}/);

  html = html.map(block => {
    const t = block.trim();
    if (!t) return '';
    if (/^<h[1-3]>/.test(t)) return t;
    if (/^<li>/.test(t)) return `<ul>${t}</ul>`;
    return `<p>${t.replace(/\n/g, ' ')}</p>`;
  });

  return html.join('\n');
}

function formatTimestamp(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatPaperDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAuthorsShort(authorsStr) {
  if (!authorsStr) return '';
  const parts = authorsStr.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length <= 2) return parts.join(', ');
  return `${parts[0]}, ${parts[1]} et al.`;
}

function renderDigests() {
  const container = document.getElementById('digestsList');
  const digests = loadSavedDigests();

  const countEl = document.getElementById('digestsCount');
  if (countEl) {
    countEl.textContent = digests.length === 0 ? '' : `${digests.length} digest${digests.length !== 1 ? 's' : ''}`;
  }

  if (digests.length === 0) {
    container.innerHTML = `
      <div class="digests-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 12h6M9 16h6M7 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2h-2M7 4a2 2 0 012-2h6a2 2 0 012 2M7 4a2 2 0 000 4h10a2 2 0 000-4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p class="digests-empty-title">No saved digests yet</p>
        <p class="digests-empty-sub">Generate an AI digest from the main page, then save it here.</p>
        <a href="index.html" class="button primary">Go to Papers</a>
      </div>`;
    return;
  }

  container.innerHTML = digests.map((digest, index) => {
    const articleHtml = digestMarkdownToHtml(digest.digest || '');
    const papers = digest.papers || [];
    const refsHtml = papers.map((p, i) =>
      `<li><a href="${escapeHtml(p.url || '#')}" target="_blank" rel="noopener">${escapeHtml(p.title || '')}</a><br>
       <span class="digest-ref-meta">${escapeHtml(formatAuthorsShort(p.authors))} · ${formatPaperDate(p.date)}</span></li>`
    ).join('');

    return `
      <article class="digest-entry" data-index="${index}">
        <header class="digest-entry-header">
          <div class="digest-entry-meta">
            <time class="digest-entry-time">${formatTimestamp(digest.timestamp)}</time>
            <span class="digest-entry-badge">${papers.length} paper${papers.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="digest-entry-actions">
            <button class="button digest-entry-copy-btn" onclick="copyDigestEntry(${index})">Copy</button>
            <button class="button digest-entry-delete-btn" onclick="deleteDigest(${index})">Delete</button>
          </div>
        </header>
        <h1 class="digest-entry-title" id="digest-title-${index}" onclick="startRenameDigest(${index})" title="Click to rename">
          ${escapeHtml(digest.title || 'Research Digest')}
          <span class="digest-title-edit-hint">&#9998;</span>
        </h1>
        <div class="digest-article">${articleHtml}</div>
        ${refsHtml ? `<div class="digest-references"><h3>References</h3><ol>${refsHtml}</ol></div>` : ''}
      </article>`;
  }).join('');
}

function deleteDigest(index) {
  if (!confirm('Delete this digest? This cannot be undone.')) return;
  const digests = loadSavedDigests();
  digests.splice(index, 1);
  saveSavedDigests(digests);
  renderDigests();
}

function copyDigestEntry(index) {
  const digests = loadSavedDigests();
  const digest = digests[index];
  if (!digest) return;
  navigator.clipboard.writeText(digest.digest || '').then(() => {
    const btn = document.querySelector(`.digest-entry[data-index="${index}"] .digest-entry-copy-btn`);
    if (btn) { btn.textContent = 'Copied!'; setTimeout(() => btn.textContent = 'Copy', 2000); }
  });
}

function startRenameDigest(index) {
  const titleEl = document.getElementById(`digest-title-${index}`);
  if (!titleEl) return;
  const digests = loadSavedDigests();
  const current = digests[index]?.title || 'Research Digest';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'digest-title-input digest-entry-title-input';
  input.value = current;
  titleEl.replaceWith(input);
  input.focus();
  input.select();

  const commit = () => {
    const val = input.value.trim() || current;
    digests[index].title = val;
    saveSavedDigests(digests);
    const newEl = document.createElement('h1');
    newEl.className = 'digest-entry-title';
    newEl.id = `digest-title-${index}`;
    newEl.title = 'Click to rename';
    newEl.innerHTML = `${escapeHtml(val)} <span class="digest-title-edit-hint">&#9998;</span>`;
    newEl.onclick = () => startRenameDigest(index);
    input.replaceWith(newEl);
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.value = current; input.blur(); }
  });
}
