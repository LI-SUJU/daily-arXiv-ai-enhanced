document.addEventListener('DOMContentLoaded', () => {
  // Only auto-init on settings.html (standalone page)
  if (document.querySelector('.settings-page')) {
    initSettings();
    initSettingsEventListeners();
    fetchGitHubStats();
  } else {
    // On index.html — init lazily when panel opens, just attach listeners now
    initSettingsEventListeners();
  }
});

function openSettingsPanel() {
  const panel = document.getElementById('settingsPanel');
  if (!panel) return;
  initSettings();
  panel.style.display = 'flex';
}

function closeSettingsPanel() {
  const panel = document.getElementById('settingsPanel');
  if (panel) panel.style.display = 'none';
}

// 初始化设置，从localStorage加载已保存的设置
function initSettings() {
  loadAiSettings();
  initThemeUI();
}

function loadAiSettings() {
  document.getElementById('aiBaseUrl').value   = localStorage.getItem('aiBaseUrl')    || '';
  document.getElementById('aiApiKey').value    = localStorage.getItem('aiApiKey')     || '';
  document.getElementById('aiModelName').value = localStorage.getItem('aiModelName')  || '';
  document.getElementById('githubToken').value = localStorage.getItem('githubToken')  || '';

  // Lock AI fields if already configured
  const hasAi = !!(localStorage.getItem('aiApiKey') || localStorage.getItem('aiBaseUrl') || localStorage.getItem('aiModelName'));
  setAiFieldsLocked(hasAi);

  // GitHub token: disabled for visitors (no token), locked if already set
  const hasToken = !!localStorage.getItem('githubToken');
  if (hasToken) {
    setGithubFieldState('locked');
  } else {
    setGithubFieldState('visitor');
  }
}

function setAiFieldsLocked(locked) {
  ['aiBaseUrl', 'aiApiKey', 'aiModelName'].forEach(id => {
    const el = document.getElementById(id);
    el.readOnly = locked;
    el.style.opacity = locked ? '0.7' : '';
    el.style.cursor = locked ? 'default' : '';
  });
  document.getElementById('aiUpdateRow').style.display = locked ? '' : 'none';
}

// state: 'editable' | 'locked' | 'visitor'
function setGithubFieldState(state) {
  const el = document.getElementById('githubToken');
  const updateBtn = document.getElementById('updateGithubBtn');
  const visitorNote = document.getElementById('githubVisitorNote');

  el.readOnly = state === 'locked';
  el.disabled = state === 'visitor';
  el.style.opacity = state !== 'editable' ? '0.7' : '';
  el.style.cursor = state === 'locked' ? 'default' : '';
  updateBtn.style.display = state === 'locked' ? '' : 'none';
  visitorNote.style.display = state === 'visitor' ? '' : 'none';
}

function unlockAiFields() {
  setAiFieldsLocked(false);
}

function unlockGithubField() {
  setGithubFieldState('editable');
}

// 初始化事件监听器
function initSettingsEventListeners() {
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('resetSettings').addEventListener('click', resetSettings);
}

// 保存设置 — shows confirmation modal for credentials
function saveSettings() {
  // Check if any credential fields are being edited (not locked/disabled)
  const aiBaseUrl   = document.getElementById('aiBaseUrl');
  const aiApiKey    = document.getElementById('aiApiKey');
  const aiModelName = document.getElementById('aiModelName');
  const githubToken = document.getElementById('githubToken');

  const aiEditing = !aiBaseUrl.readOnly || !aiApiKey.readOnly || !aiModelName.readOnly;
  const githubEditing = !githubToken.readOnly && !githubToken.disabled;

  if (!aiEditing && !githubEditing) {
    showNotification('Settings saved successfully!', 'success');
    return;
  }

  // Build confirmation summary
  const lines = [];
  if (aiEditing) {
    if (aiBaseUrl.value.trim())   lines.push(`API Base URL: ${aiBaseUrl.value.trim()}`);
    if (aiApiKey.value.trim())    lines.push(`API Key: ${'•'.repeat(Math.min(aiApiKey.value.trim().length, 12))}`);
    if (aiModelName.value.trim()) lines.push(`Model: ${aiModelName.value.trim()}`);
  }
  if (githubEditing && githubToken.value.trim()) {
    lines.push(`GitHub Token: ${'•'.repeat(Math.min(githubToken.value.trim().length, 12))}`);
  }

  if (lines.length === 0) {
    // Credentials cleared — save directly
    confirmSaveSettings();
    return;
  }

  document.getElementById('saveConfirmDetails').innerHTML = lines.join('<br>');
  document.getElementById('saveConfirmModal').style.display = 'flex';
}

function confirmSaveSettings() {
  document.getElementById('saveConfirmModal').style.display = 'none';

  const aiBaseUrl   = document.getElementById('aiBaseUrl').value.trim();
  const aiApiKey    = document.getElementById('aiApiKey').value.trim();
  const aiModelName = document.getElementById('aiModelName').value.trim();
  const githubToken = document.getElementById('githubToken').value.trim();

  if (aiBaseUrl)   localStorage.setItem('aiBaseUrl',   aiBaseUrl);   else localStorage.removeItem('aiBaseUrl');
  if (aiApiKey)    localStorage.setItem('aiApiKey',    aiApiKey);    else localStorage.removeItem('aiApiKey');
  if (aiModelName) localStorage.setItem('aiModelName', aiModelName); else localStorage.removeItem('aiModelName');
  if (githubToken) localStorage.setItem('githubToken', githubToken); else localStorage.removeItem('githubToken');

  // Re-lock fields after saving
  const hasAi = !!(aiBaseUrl || aiApiKey || aiModelName);
  setAiFieldsLocked(hasAi);
  if (githubToken) setGithubFieldState('locked');
  else setGithubFieldState('visitor');

  showNotification('Settings saved successfully!', 'success');
}

// 重置设置
function resetSettings() {
  document.getElementById('aiBaseUrl').value   = '';
  document.getElementById('aiApiKey').value    = '';
  document.getElementById('aiModelName').value = '';
  document.getElementById('githubToken').value = '';
  localStorage.removeItem('aiBaseUrl');
  localStorage.removeItem('aiApiKey');
  localStorage.removeItem('aiModelName');
  localStorage.removeItem('githubToken');

  setAiFieldsLocked(false);
  setGithubFieldState('visitor');

  showNotification('Settings reset to default!', 'info');
}

// 显示通知
function showNotification(message, type = 'success') {
  // 检查是否已存在通知元素
  let notification = document.querySelector('.settings-notification');
  
  if (!notification) {
    // 创建通知元素
    notification = document.createElement('div');
    notification.className = 'settings-notification';
    document.body.appendChild(notification);
  }
  
  // 根据类型设置图标
  let icon = '';
  let bgColor = 'var(--primary-color)';
  
  if (type === 'success') {
    icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/></svg>';
  } else if (type === 'info') {
    icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm1-8h-2V7h2v2z" fill="currentColor"/></svg>';
    bgColor = '#3b82f6';
  }
  
  // 设置通知内容和样式
  notification.innerHTML = `${icon}<span>${message}</span>`;
  notification.style.display = 'flex';
  notification.style.alignItems = 'center';
  notification.style.gap = '8px';
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.backgroundColor = bgColor;
  notification.style.color = 'white';
  notification.style.padding = '12px 20px';
  notification.style.borderRadius = 'var(--radius-sm)';
  notification.style.boxShadow = 'var(--shadow-md)';
  notification.style.zIndex = '1000';
  notification.style.opacity = '0';
  notification.style.transform = 'translateY(20px)';
  notification.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  
  // 显示通知
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);
  
  // 3秒后隐藏通知
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(20px)';
    
    // 动画结束后移除元素
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// 获取GitHub统计数据
async function fetchGitHubStats() {
  try {
    const response = await fetch('https://api.github.com/repos/dw-dengwei/daily-arXiv-ai-enhanced');
    const data = await response.json();
    const starCount = data.stargazers_count;
    const forkCount = data.forks_count;
    
    document.getElementById('starCount').textContent = starCount;
    document.getElementById('forkCount').textContent = forkCount;
  } catch (error) {
    console.error('获取GitHub统计数据失败:', error);
    document.getElementById('starCount').textContent = '?';
    document.getElementById('forkCount').textContent = '?';
  }
}

// ── Theme system ──────────────────────────────────────────────────────────────

const THEMES = ['purple', 'ocean', 'rose', 'forest', 'amber'];

function applyTheme(theme, dark) {
  const root = document.documentElement;
  // Remove all theme attrs first
  THEMES.forEach(t => root.removeAttribute('data-theme-' + t));
  if (theme && theme !== 'purple') root.setAttribute('data-theme', theme);
  else root.removeAttribute('data-theme');
  root.setAttribute('data-dark', dark ? 'true' : 'false');
}

function loadTheme() {
  const theme = localStorage.getItem('colorTheme') || 'purple';
  const dark  = localStorage.getItem('darkMode') === 'true';
  applyTheme(theme, dark);
}

function initThemeUI() {
  const theme = localStorage.getItem('colorTheme') || 'purple';
  const dark  = localStorage.getItem('darkMode') === 'true';

  // Highlight active swatch
  document.querySelectorAll('.theme-swatch').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
    btn.addEventListener('click', () => {
      localStorage.setItem('colorTheme', btn.dataset.theme);
      applyTheme(btn.dataset.theme, localStorage.getItem('darkMode') === 'true');
      document.querySelectorAll('.theme-swatch').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  // Dark mode toggle state
  const toggle = document.getElementById('darkModeToggle');
  const label  = document.getElementById('darkModeLabel');
  if (toggle && label) {
    toggle.classList.toggle('on', dark);
    label.textContent = dark ? 'On' : 'Off';
  }
}

function toggleDarkMode() {
  const dark = localStorage.getItem('darkMode') !== 'true';
  localStorage.setItem('darkMode', dark);
  applyTheme(localStorage.getItem('colorTheme') || 'purple', dark);
  const toggle = document.getElementById('darkModeToggle');
  const label  = document.getElementById('darkModeLabel');
  if (toggle) toggle.classList.toggle('on', dark);
  if (label)  label.textContent = dark ? 'On' : 'Off';
}

// Apply theme immediately on script load (before DOMContentLoaded) to avoid flash
loadTheme();