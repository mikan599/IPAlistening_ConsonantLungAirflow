(function fitNonpulmonicButtonsIIFE(){
  const pageRoot = document.querySelector('.nonpulmonic') || document.body;
  if (!pageRoot) return;

  const SELECTOR_ITEM = '.np-item, .np-col-clicks .np-sound-cell, .np-col-implosives .np-sound-cell, .np-col-ejectives .np-sound-cell';
  const SELECTOR_BTN  = '.np-glyph-btn, .np-sound-cell';

  const GAP = 8;               // 列より少しだけ短く（左右合計で8px）
  const MIN_H_PC = 64;         // PCの目安高さ
  const MIN_H_SP = 56;         // モバイルの目安高さ
  const isMobile = () => window.matchMedia('(max-width: 640px)').matches;

  function fitOnce() {
    const items = pageRoot.querySelectorAll(SELECTOR_ITEM);
    items.forEach(item => {
      const wrap = item.classList?.contains('np-item') ? item : (item.parentElement || item);
      const btn = (wrap.querySelector(SELECTOR_BTN) || item);
      if (!btn) return;

      const rect = wrap.getBoundingClientRect();
      if (!rect.width) return;

      const targetWidth = Math.max(44, Math.floor(rect.width - GAP)); // 列幅ほぼいっぱい
      const minH = isMobile() ? MIN_H_SP : MIN_H_PC;
      const fontPx = Math.max(18, Math.min(Math.floor(targetWidth * 0.38), isMobile() ? 28 : 32)); // 記号を大きく

      btn.style.display = 'block';
      btn.style.width   = `${targetWidth}px`;
      btn.style.marginLeft  = 'auto';
      btn.style.marginRight = 'auto';
      btn.style.minHeight   = `${minH}px`;
      btn.style.padding     = isMobile() ? '8px 10px' : '10px 12px';
      btn.style.lineHeight  = '1';
      btn.style.boxSizing   = 'border-box';
      btn.style.fontSize    = `${fontPx}px`;

      const ja = wrap.querySelector('.np-ja');
      if (ja) {
        ja.style.display = 'block';
        ja.style.maxWidth = `${targetWidth}px`;
        ja.style.marginLeft = 'auto';
        ja.style.marginRight = 'auto';
        ja.style.whiteSpace = 'nowrap';
        ja.style.overflow = 'hidden';
        ja.style.textOverflow = 'clip'; // “…”なら 'ellipsis'
        ja.style.fontSize = '12px';     // 全セル同一
        ja.style.lineHeight = '1.2';
        ja.style.textAlign = 'center';
        ja.style.pointerEvents = 'none';
        if (!ja.style.marginTop) ja.style.marginTop = '6px';
      }
    });
  }

  function init() {
    fitOnce();

    const roTargets = [
      pageRoot,
      pageRoot.querySelector('.np-col-clicks'),
      pageRoot.querySelector('.np-col-implosives'),
      pageRoot.querySelector('.np-col-ejectives'),
    ].filter(Boolean);

    roTargets.forEach(t => {
      const ro = new ResizeObserver(() => fitOnce());
      ro.observe(t);
    });

    window.addEventListener('resize', fitOnce);
    window.addEventListener('orientationchange', fitOnce);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') fitOnce();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
