(() => {
  const key = 'alice-ji-portfolio-theme';
  const root = document.documentElement;
  const localFile = location.protocol === 'file:';
  const incoming = localFile ? new URLSearchParams(location.search).get('theme') : null;
  let saved;
  try {
    saved = localStorage.getItem(key);
  } catch {
    // Theme changes still work while this page is open.
  }

  function apply(theme) {
    root.dataset.theme = theme;
    try {
      localStorage.setItem(key, theme);
    } catch {
      // Storage may be disabled by the browser.
    }
  }

  apply(incoming === 'dark' || incoming === 'light' ? incoming : saved === 'dark' ? 'dark' : 'light');

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.querySelector('.theme-toggle');
    function refresh() {
      toggle.setAttribute('aria-checked', String(root.dataset.theme === 'dark'));
      if (!localFile) return;
      // Browsers can give each file:// page its own storage.
      for (const anchor of document.querySelectorAll('a[href]')) {
        const target = new URL(anchor.href);
        if (target.protocol !== 'file:' || target.pathname === location.pathname) continue;
        target.searchParams.set('theme', root.dataset.theme);
        anchor.href = target.href;
      }
      if (incoming) {
        try {
          const current = new URL(location.href);
          current.searchParams.set('theme', root.dataset.theme);
          history.replaceState(null, '', current);
        } catch {
          // File URL history edits may be restricted.
        }
      }
    }
    refresh();
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      apply(root.dataset.theme === 'dark' ? 'light' : 'dark');
      refresh();
    });
    window.addEventListener('storage', event => {
      if (event.key !== key) return;
      root.dataset.theme = event.newValue === 'dark' ? 'dark' : 'light';
      refresh();
    });
  });
})();
