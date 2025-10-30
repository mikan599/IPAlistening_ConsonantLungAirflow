(function fitNonpulmonicButtonsIIFE(){
  const pageRoot = document.querySelector('.nonpulmonic');
  if (!pageRoot) return;

  const COLS_SEL = '.np-col-clicks, .np-col-implosives, .np-col-ejectives';
  const ITEM_SEL = '.np-item';
  const BTN_SEL  = '.np-glyph-btn, .np-sound-cell';

  const GAP = 8;               // 列より少し短く（左右合計で8px）
  const MIN_H_PC = 64;
  const MIN_H_SP = 56;
  const isMobile = () => matchMedia('(max-width: 640px)').matches;

  // ★ すべてのセルを .np-item に正規化（親の違いに依存しない）
  function normalizeDOM() {
    pageRoot.querySelectorAll(COLS_SEL).forEach(col => {
      col.querySelectorAll('.np-sound-cell').forEach(cell => {
        const parent = cell.parentNode;
        if (!(parent && parent.classList && parent.classList.contains('np-item'))) {
          const wrap = document.createElement('div');
          wrap.className = 'np-item';
          parent.insertBefore(wrap, cell);
          wrap.appendChild(cell);

          const sib = wrap.nextElementSibling;
          if (sib && sib.classList && sib.classList.contains('np-ja')) {
            wrap.appendChild(sib);
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

  // 列の内側幅（paddingを除いた幅）を取得
  function getColInnerWidth(col) {
    const cs = getComputedStyle(col);
    const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    return Math.max(0, Math.floor(col.clientWidth - pad));
  }

  function fitOnce() {
    const items = pageRoot.querySelectorAll(ITEM_SEL);
    items.forEach(wrap => {
      const btn = wrap.querySelector(BTN_SEL);
      if (!btn) return;

      const col = wrap.closest(COLS_SEL);
      if (!col) return;
      const colW = getColInnerWidth(col);
      if (!colW) return;

      const targetWidth = Math.max(44, colW - GAP);
      const minH = isMobile() ? MIN_H_SP : MIN_H_PC;
      const fontPx = Math.max(18, Math.min(Math.floor(targetWidth * 0.38), isMobile() ? 28 : 32));

      btn.style.display   = 'block';
      btn.style.width     = `${targetWidth}px`;
      btn.style.maxWidth  = `${targetWidth}px`;
      btn.style.margin    = '0 auto';
      btn.style.minHeight = `${minH}px`;
      btn.style.padding   = isMobile() ? '8px 10px' : '10px 12px';
      btn.style.lineHeight= '1';
      btn.style.boxSizing = 'border-box';
      btn.style.fontSize  = `${fontPx}px`;

      const ja = wrap.querySelector('.np-ja');
      if (ja) {
        ja.style.display      = 'block';
        ja.style.maxWidth     = `${targetWidth}px`;
        ja.style.margin       = '6px auto 0';
        ja.style.whiteSpace   = 'nowrap';
        ja.style.overflow     = 'hidden';
        ja.style.textOverflow = 'clip';
        ja.style.fontSize     = '12px';
        ja.style.lineHeight   = '1.2';
        ja.style.textAlign    = 'center';
        ja.style.pointerEvents= 'none';
      }
    });
  }

  function init() {
    const run = () => {
      normalizeDOM();
      fitOnce();
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(run));
    } else {
      requestAnimationFrame(run);
    }

    const targets = [pageRoot, ...pageRoot.querySelectorAll(COLS_SEL)];
    targets.forEach(t => {
      const ro = new ResizeObserver(() => requestAnimationFrame(fitOnce));
      ro.observe(t);
    });

    addEventListener('resize', () => requestAnimationFrame(fitOnce), { passive: true });
    addEventListener('orientationchange', () => requestAnimationFrame(fitOnce), { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        requestAnimationFrame(fitOnce);
      }
    });
  }

  init();
})();
