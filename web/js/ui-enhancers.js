// ========================================================
// 3. HERO BADGES ALIGNMENT
// ========================================================
// Keep badges properly grouped
    function alignHeroBadges() {
      const hero = document.querySelector('.net-worth-hero');
      if (!hero) return;
      const wrap = hero.querySelector('.hero-badges-wrapper');
      const usdLine = hero.querySelector('.net-worth-usd-line');
      const profitBadge = hero.querySelector('.hero-profit-badge');
      if (wrap && usdLine && !wrap.contains(usdLine)) {
        wrap.insertBefore(usdLine, wrap.firstChild);
      }
      if (wrap && profitBadge && !wrap.contains(profitBadge)) {
        wrap.appendChild(profitBadge);
      }
    }
    let heroBadgesDebounce = null;
    const heroBadgesObserver = new MutationObserver(() => {
      if (!heroBadgesDebounce) {
        heroBadgesDebounce = setTimeout(() => {
          heroBadgesDebounce = null;
          alignHeroBadges();
        }, 150);
      }
    });
    heroBadgesObserver.observe(document.body, { childList: true, subtree: true });
    alignHeroBadges();

// ========================================================
// 4. SPEED DIAL INTERACTION
// ========================================================
(function() {
  function setupSpeedDial() {
    var backdrop = document.getElementById('speed-dial-backdrop');
    if (!backdrop) return;

    function openDial() {
      backdrop.classList.add('active');
      var btn = document.querySelector('#m-btn-catat, .m-nav-action-center, .mobile-nav-action-btn');
      if (btn) btn.classList.add('speed-dial-active-btn');
    }

    function closeDial() {
      backdrop.classList.remove('active');
      var btn = document.querySelector('#m-btn-catat, .m-nav-action-center, .mobile-nav-action-btn');
      if (btn) btn.classList.remove('speed-dial-active-btn');
    }

    function toggleDial() {
      if (backdrop.classList.contains('active')) {
        closeDial();
      } else {
        openDial();
      }
    }

    // Capture click on center plus button
    document.addEventListener('click', function(e) {
      var centerBtn = e.target.closest('#m-btn-catat, .m-nav-action-center, .mobile-nav-action-btn');
      if (centerBtn) {
        e.preventDefault();
        e.stopPropagation();
        toggleDial();
        return;
      }

      if (backdrop.classList.contains('active') && !e.target.closest('.speed-dial-item')) {
        closeDial();
      }
    }, true);

    // Option 1: Manual Input
    var optManual = document.getElementById('sd-opt-manual');
    if (optManual) {
      optManual.onclick = function(e) {
        e.stopPropagation();
        closeDial();
        if (typeof window.__openTransactionModal === 'function') {
          window.__openTransactionModal();
        } else {
          var primaryBtn = document.querySelector('.header-actions .btn-primary, .btn-primary');
          if (primaryBtn) primaryBtn.click();
        }
      };
    }

    // Option 2: AI Input
    var optAi = document.getElementById('sd-opt-ai');
    if (optAi) {
      optAi.onclick = function(e) {
        e.stopPropagation();
        closeDial();
        if (typeof window.__openAiModal === 'function') {
          window.__openAiModal();
        } else {
          var aBtn = document.querySelector('.header-actions .btn-ai, .btn-ai') || document.getElementById('m-btn-ai');
          if (aBtn) aBtn.click();
        }
      };
    }

    // Option 3: Scan Resi
    var optScan = document.getElementById('sd-opt-scan');
    if (optScan) {
      optScan.onclick = function(e) {
        e.stopPropagation();
        closeDial();
        var fileInput = document.getElementById('receipt-file-input');
        if (fileInput) fileInput.click();
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupSpeedDial);
  } else {
    setupSpeedDial();
  }
})();

// ========================================================
// 5. WALLET SECTION ENHANCER
// ========================================================
// ========================================================
// WALLET SECTION INTELLIGENT ENHANCER
// - Adds interactive Bento / List view switcher
// - Cleans redundant "Utama • " prefixes so text never truncates
// - Ensures + Tambah button is responsive on mobile
// ========================================================
(function() {
  function enhanceWalletsUI() {
    const walletsGrid = document.querySelector('.wallets-grid');
    if (!walletsGrid) return;

    // 1. Restore Saved View Mode (Default is Bento Grid)
    const savedMode = localStorage.getItem('fintrack_wallet_view_mode') || 'bento';
    if (savedMode === 'list') {
      walletsGrid.classList.add('view-list');
    } else {
      walletsGrid.classList.remove('view-list');
    }

    // 2. Enhance Section Header with View Toggle
    const headerWrap = document.querySelector('.section-title-wrap');
    if (headerWrap && !headerWrap.querySelector('.wallet-view-toggle')) {
      // Responsive button text on mobile
      const addBtn = headerWrap.querySelector('.btn-secondary');
      if (addBtn) {
        const span = addBtn.querySelector('span');
        if (span && span.textContent.includes('Tambah Bank')) {
          span.textContent = '+ Tambah';
        }
      }

      // Create View Toggle
      const toggle = document.createElement('div');
      toggle.className = 'wallet-view-toggle';
      toggle.innerHTML = `
        <button type="button" class="w-view-btn ${savedMode === 'bento' ? 'active' : ''}" data-view="bento" title="Tampilan Bento Grid">
          <i class="ph ph-squares-four"></i>
        </button>
        <button type="button" class="w-view-btn ${savedMode === 'list' ? 'active' : ''}" data-view="list" title="Tampilan List Baris">
          <i class="ph ph-list-dashes"></i>
        </button>
      `;

      toggle.addEventListener('click', (e) => {
        const btn = e.target.closest('.w-view-btn');
        if (!btn) return;
        const view = btn.dataset.view;
        toggle.querySelectorAll('.w-view-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (view === 'list') {
          walletsGrid.classList.add('view-list');
          localStorage.setItem('fintrack_wallet_view_mode', 'list');
        } else {
          walletsGrid.classList.remove('view-list');
          localStorage.setItem('fintrack_wallet_view_mode', 'bento');
        }
      });

      if (addBtn && addBtn.parentNode) {
        addBtn.parentNode.insertBefore(toggle, addBtn);
      } else if (headerWrap) {
        headerWrap.appendChild(toggle);
      }
    }

    // 3. Clean "Utama • " prefixes and prevent ugly truncations
    const cards = walletsGrid.querySelectorAll('.wallet-card');
    cards.forEach(card => {
      const sub = card.querySelector('.wallet-sub');
      if (sub && !sub.hasAttribute('data-cleaned')) {
        let txt = sub.textContent || '';
        txt = txt.replace(/^Utama\s*•\s*/i, '');
        if (txt.toLowerCase() === 'bank konvensional') txt = 'Konvensional';
        if (txt.toLowerCase() === 'tunai') txt = 'Kas Tunai';
        sub.textContent = txt;
        sub.setAttribute('data-cleaned', 'true');
      }
    });
  }

  // Observe React re-renders with safe debounce
  let walletDebounce = null;
  const walletObserver = new MutationObserver(() => {
    if (!walletDebounce) {
      walletDebounce = setTimeout(() => {
        walletDebounce = null;
        enhanceWalletsUI();
      }, 150);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      enhanceWalletsUI();
      walletObserver.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    enhanceWalletsUI();
    walletObserver.observe(document.body, { childList: true, subtree: true });
  }
})();

// ========================================================
// 6. BIBIT WEALTH ENHANCER
// ========================================================
// ========================================================
// BIBIT WEALTH MANAGEMENT UI ENHANCER
// - Makes + Tambah Aset button single-line and compact
// - Applies structured classes to Bibit product cards
// ========================================================
(function() {
  function enhanceBibitUI() {
    const bibitCard = document.querySelector('.invest-card.bibit');
    if (!bibitCard) return;

    // 1. Ensure header button text is single-line & compact on mobile
    const addBtn = bibitCard.querySelector('.invest-header .btn-secondary');
    if (addBtn) {
      const span = addBtn.querySelector('span');
      if (span && span.textContent.includes('Tambah Aset')) {
        span.textContent = '+ Aset';
      }
    }

    // 2. Enhance each product card
    const items = bibitCard.querySelectorAll('div[style*="flex-direction: column; gap: 0.65rem"] > div, div[style*="flexDirection: column; gap: 0.65rem"] > div');
    items.forEach(item => {
      item.classList.add('bibit-product-card');
      const editBtn = item.querySelector('.btn-icon');
      if (editBtn) {
        editBtn.classList.add('bibit-edit-btn');
      }
    });
  }

  let bibitDebounce = null;
  const bibitObserver = new MutationObserver(() => {
    if (!bibitDebounce) {
      bibitDebounce = setTimeout(() => {
        bibitDebounce = null;
        enhanceBibitUI();
      }, 150);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      enhanceBibitUI();
      bibitObserver.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    enhanceBibitUI();
    bibitObserver.observe(document.body, { childList: true, subtree: true });
  }
})();

