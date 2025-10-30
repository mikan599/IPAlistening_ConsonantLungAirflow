(function fitNonpulmonicButtonsIIFE(){
  const pageRoot = document.querySelector('.nonpulmonic');
  if (!pageRoot) return;

  const COLS_SEL = '.np-col-clicks, .np-col-implosives, .np-col-ejectives';
  const ITEM_SEL = '.np-item';
  const BTN_SEL  = '.np-glyph-btn, .np-sound-cell';

  const GAP = 8;               // ボタンを列幅より少し短く（左右合計で8px）
  const MIN_H_PC = 64;
  const MIN_H_SP = 56;
  const isMobile = () => matchMedia('(max-width: 640px)').matches;

  // すべてのセルを .np-item でラップし、ボタンとラベルを同じコンテナに収める
  function normalizeDOM() {
    pageRoot.querySelectorAll(COLS_SEL).forEach(col => {
      col.querySelectorAll('.np-sound-cell').forEach(cell => {
        const parent = cell.parentElement;
        if (!(parent && parent.classList.contains('np-item'))) {
          const wrap = document.createElement('div');
          wrap.className = 'np-item';
          col.insertBefore(wrap, cell);
          wrap.appendChild(cell);

          const sibling = cell.nextElementSibling;
          if (sibling && sibling.classList && sibling.classList.contains('np-ja')) {
            wrap.appendChild(sibling);
          }
        } else {
          const wrap = parent;
          const next = cell.nextElementSibling;
          if (next && next.classList && next.classList.contains('np-ja') && next.parentElement !== wrap) {
            wrap.appendChild(next);
          }
        }
      });
    });
  }

  function fitOnce() {
    const items = pageRoot.querySelectorAll(ITEM_SEL);
    items.forEach(wrap => {
      const btn = wrap.querySelector(BTN_SEL);
      if (!btn) return;

      const rect = wrap.getBoundingClientRect();
      if (!rect.width) return;

      const targetWidth = Math.max(44, Math.floor(rect.width - GAP));
      const minH = isMobile() ? MIN_H_SP : MIN_H_PC;
      const fontPx = Math.max(18, Math.min(Math.floor(targetWidth * 0.38), isMobile() ? 28 : 32));

      btn.style.display = 'block';
      btn.style.width = `${targetWidth}px`;
      btn.style.marginLeft = 'auto';
      btn.style.marginRight = 'auto';
      btn.style.minHeight = `${minH}px`;
      btn.style.padding = isMobile() ? '8px 10px' : '10px 12px';
      btn.style.lineHeight = '1';
      btn.style.boxSizing = 'border-box';
      btn.style.fontSize = `${fontPx}px`;

      const ja = wrap.querySelector('.np-ja');
      if (ja) {
        ja.style.display = 'block';
        ja.style.maxWidth = `${targetWidth}px`;
        ja.style.margin = '6px auto 0';
        ja.style.whiteSpace = 'nowrap';
        ja.style.overflow = 'hidden';
        ja.style.textOverflow = 'clip';
        ja.style.fontSize = '12px';
        ja.style.lineHeight = '1.2';
        ja.style.textAlign = 'center';
        ja.style.pointerEvents = 'none';
      }
    });
  }

  function init() {
    normalizeDOM();
    fitOnce();

    const targets = [pageRoot, ...pageRoot.querySelectorAll(COLS_SEL)];
    targets.forEach(target => {
      const ro = new ResizeObserver(fitOnce);
      ro.observe(target);
    });

    addEventListener('resize', fitOnce);
    addEventListener('orientationchange', fitOnce);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        fitOnce();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
