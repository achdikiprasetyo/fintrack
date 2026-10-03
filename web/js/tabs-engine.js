// ========================================================
// 2. TAB SLIDE & CASCADE ENGINE
// ========================================================
// ========================================================
// FINTRACK MASTER DIRECTIONAL SLIDE & CASCADE ENGINE
// - Fluid "geser-geser" tab transitions
// - Satisfying Mutasi transaction card cascade
// - Silent, solid clicks (zero vibration / click twitch)
// ========================================================
(function() {
  'use strict';

  // 1. Number Rolling Engine (IDR Compliant)
  function parseIndonesianIDR(text) {
    if (!text) return null;
    if (text.includes('•••')) return null;
    const cleaned = text.replace(/[^0-9]/g, '');
    if (!cleaned) return null;
    return parseInt(cleaned, 10);
  }

  function animateRollingNumber(el, targetNum, duration = 650, isNegative = false) {
    if (!el || typeof targetNum !== 'number' || isNaN(targetNum)) return;
    let startTime = null;
    const easeOutExpo = t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    const startVal = Math.round(targetNum * 0.72);
    const originalText = el.textContent || '';
    const hasPlus = originalText.includes('+');
    const hasPerHr = originalText.includes('/hr');
    const suffix = hasPerHr ? '/hr' : '';
    const prefix = isNegative ? '-Rp ' : (hasPlus ? '+Rp ' : (originalText.includes('Rp') ? 'Rp ' : ''));

    function frame(time) {
      if (!startTime) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const current = Math.round(startVal + (targetNum - startVal) * easeOutExpo(progress));
      el.textContent = prefix + current.toLocaleString('id-ID') + suffix;
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = prefix + targetNum.toLocaleString('id-ID') + suffix;
      }
    }
    requestAnimationFrame(frame);
  }
  window.animateRollingNumber = animateRollingNumber;

  // 2. Analytics Tab (Rock Solid, Zero Kedut/Jitter)
  function animateKpiCascade() {
    setTimeout(() => {
      if (typeof chartInstances !== 'undefined') {
        if (chartInstances.category && typeof chartInstances.category.resize === 'function') chartInstances.category.resize();
        if (chartInstances.timeline && typeof chartInstances.timeline.resize === 'function') chartInstances.timeline.resize();
        if (chartInstances.networth && typeof chartInstances.networth.resize === 'function') chartInstances.networth.resize();
      }
    }, 60);
  }
  window.animateKpiCascade = animateKpiCascade;

  // 3. Beranda / Assets Tab (Steady, Zero Jitter)
  function animateWalletCascade() {
    // Pure rock-solid display
  }
  window.animateWalletCascade = animateWalletCascade;

  // 4. Mutasi / Transactions Tab Satisfying Cascade (Bulletproof CSS Cascade Engine)
  function animateTransactionCascade() {
    const appContainer = document.querySelector('.app-container');
    if (!appContainer) return;
    const transSec = appContainer.querySelector('[data-fintrack-tab="transactions"]') || 
      Array.from(appContainer.querySelectorAll(':scope > section')).find(s => {
        const t = (s.querySelector('.section-title')?.textContent || '').toLowerCase();
        return t.includes('riwayat mutasi') || t.includes('transaksi');
      });
    if (!transSec) return;

    // 1. Force wipe any stuck inline styles so text is ALWAYS guaranteed 100% visible
    const stuck = transSec.querySelectorAll('*[style*="opacity"], *[style*="transform"]');
    stuck.forEach(el => {
      el.style.opacity = '';
      el.style.transform = '';
    });

    // 2. Cleanly trigger the hardware-accelerated CSS cascade
    transSec.classList.remove('ft-mutasi-animating');
    void transSec.offsetWidth; // Force CSS reflow
    transSec.classList.add('ft-mutasi-animating');

    // 3. Remove cascade class after 550ms so all elements are permanently in static resting state
    setTimeout(() => {
      if (transSec) {
        transSec.classList.remove('ft-mutasi-animating');
      }
    }, 550);
  }
  window.animateTransactionCascade = animateTransactionCascade;

  // Auto trigger cascade when switching filter tabs inside Mutasi
  document.addEventListener('click', (e) => {
    if (e.target.closest('.tx-filter-btn, .tx-rows-select-wrap select')) {
      setTimeout(() => {
        if (typeof window.animateTransactionCascade === 'function') {
          window.animateTransactionCascade();
        }
      }, 70);
    }
  });

  // 6. Confetti Celebration Engine (Quiet - No vibration or sound)
  function triggerDopamineConfetti(originX, originY) {
    try {
      const cx = originX || window.innerWidth / 2;
      const cy = originY || window.innerHeight * 0.45;
      const colors = ['#38bdf8', '#34d399', '#fbbf24', '#c084fc', '#fb7185'];
      const count = 26;

      for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        const color = colors[i % colors.length];
        const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.4 - 0.2);
        const velocity = 70 + Math.random() * 120;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity - 35;
        const size = 6 + Math.random() * 5;

        p.style.cssText = `
          position: fixed; left: ${cx}px; top: ${cy}px;
          width: ${size}px; height: ${size}px;
          background: ${color}; border-radius: 50%;
          pointer-events: none; z-index: 100000;
          box-shadow: 0 0 6px ${color}88;
          transition: transform 0.8s cubic-bezier(0.12, 0.8, 0.33, 1), opacity 0.8s ease;
          transform: translate(0, 0);
        `;
        document.body.appendChild(p);

        requestAnimationFrame(() => {
          p.style.transform = `translate(${vx}px, ${vy + 100}px) scale(0.3)`;
          p.style.opacity = '0';
        });

        setTimeout(() => p.remove(), 850);
      }
    } catch (e) {}
  }
  window.triggerDopamineConfetti = triggerDopamineConfetti;

  // 7. Event Listeners for Modal Tabs and Submits
  document.addEventListener('click', (e) => {
    const formTab = e.target.closest('.form-tab-btn');
    if (formTab) {
      setTimeout(() => {
        const form = document.querySelector('.modal-card form');
        if (form) {
          form.style.animation = 'none';
          void form.offsetWidth;
          form.style.animation = 'ftFormCrossFade 0.2s cubic-bezier(0.16, 1, 0.3, 1) both';
        }
      }, 20);
    }

    const submitBtn = e.target.closest('#btn-receipt-submit, .btn-success-finish, #btn-modal-export-submit');
    if (submitBtn) {
      setTimeout(() => {
        triggerDopamineConfetti(e.clientX, e.clientY);
      }, 150);
    }
  });

  // 8. Modern Icons Enhancer for Mutasi & Filter Pills
  function modernizeMutasiIcons() {
    document.querySelectorAll('.section-title').forEach(title => {
      if (title.textContent.includes('Riwayat Mutasi')) {
        const oldSvg = title.querySelector('svg.lucide-history, svg');
        if (oldSvg && !title.querySelector('i.ph-receipt')) {
          const icon = document.createElement('i');
          icon.className = 'ph-bold ph-receipt';
          icon.style.cssText = 'font-size: 20px; color: #38bdf8; display: inline-flex; align-items: center; margin-right: 4px;';
          oldSvg.replaceWith(icon);
        }
      }
    });

    document.querySelectorAll('.tx-filter-btn:not([data-icon-modernized])').forEach(btn => {
      const raw = btn.textContent || '';
      btn.setAttribute('data-icon-modernized', 'true');
      if (raw.includes('Keluar') && !btn.querySelector('.ph-arrow-up-right')) {
        btn.innerHTML = '<i class="ph-bold ph-arrow-up-right" style="font-size:13px;color:#fb7185;"></i><span>Keluar</span>';
      } else if (raw.includes('Masuk') && !btn.querySelector('.ph-arrow-down-left')) {
        btn.innerHTML = '<i class="ph-bold ph-arrow-down-left" style="font-size:13px;color:#34d399;"></i><span>Masuk</span>';
      } else if (raw.includes('Transfer') && !btn.querySelector('.ph-arrows-left-right')) {
        btn.innerHTML = '<i class="ph-bold ph-arrows-left-right" style="font-size:13px;color:#38bdf8;"></i><span>Transfer</span>';
      } else if (raw.includes('Invest') && !btn.querySelector('.ph-trend-up')) {
        btn.innerHTML = '<i class="ph-bold ph-trend-up" style="font-size:13px;color:#fbbf24;"></i><span>Invest</span>';
      } else if (raw.trim() === 'Semua' && !btn.querySelector('.ph-squares-four')) {
        btn.innerHTML = '<i class="ph-bold ph-squares-four" style="font-size:13px;opacity:0.9;"></i><span>Semua</span>';
      }
    });
  }

  let iconDebounce = null;
  const iconObserver = new MutationObserver(() => {
    if (!iconDebounce) {
      iconDebounce = setTimeout(() => {
        iconDebounce = null;
        modernizeMutasiIcons();
      }, 200);
    }
  });
  iconObserver.observe(document.body, { childList: true, subtree: true });
  modernizeMutasiIcons();

  // 9. Initial Net Worth number roll
  window.addEventListener('load', () => {
    setTimeout(() => {
      const netWorthEl = document.querySelector('.net-worth-amount');
      if (netWorthEl) {
        const rawVal = parseIndonesianIDR(netWorthEl.textContent);
        if (rawVal && rawVal > 1000) {
          animateRollingNumber(netWorthEl, rawVal, 800);
        }
      }
    }, 250);
  });
})();

