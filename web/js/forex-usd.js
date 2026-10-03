      // Realtime USD Forex Engine & Privacy Observer
      let currentUsdRate = 17883.05;
      let isFetchingUsd = false;
      try {
        const cached = localStorage.getItem('fintrack_usd_rate_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.rate && parsed.rate > 1000) {
            currentUsdRate = parsed.rate;
          }
        }
      } catch(e) {}
      window.fintrackUsdRate = currentUsdRate;

      async function fetchUsdRate(force = false) {
        const cached = localStorage.getItem('fintrack_usd_rate_cache');
        if (!force && cached) {
          try {
            const data = JSON.parse(cached);
            if (data.rate !== 17900 && Date.now() - data.timestamp < 60 * 1000 && data.rate > 1000) {
              currentUsdRate = data.rate;
              window.fintrackUsdRate = currentUsdRate;
              renderUsdEquivalency();
              return;
            }
          } catch(e) {}
        }

        if (isFetchingUsd) return;
        isFetchingUsd = true;

        try {
          // 1. Direct high-speed realtime proxy endpoint (Yahoo Finance live forex)
          let res = await fetch('/api/rates/usd', { cache: 'no-store' });
          if (!res.ok) {
            // 2. Direct public endpoint fallback
            res = await fetch('https://open.er-api.com/v6/latest/USD');
          }
          const json = await res.json();
          const rate = json?.rate || json?.rates?.IDR;
          if (rate && rate > 5000) {
            currentUsdRate = rate;
            window.fintrackUsdRate = currentUsdRate;
            localStorage.setItem('fintrack_usd_rate_cache', JSON.stringify({
              rate: currentUsdRate,
              timestamp: Date.now()
            }));
          }
        } catch (err) {
          console.warn('Primary USD rate error, trying secondary:', err);
          try {
            const res2 = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
            const json2 = await res2.json();
            if (json2?.rates?.IDR) {
              currentUsdRate = json2.rates.IDR;
              window.fintrackUsdRate = currentUsdRate;
            }
          } catch(e2) {}
        } finally {
          isFetchingUsd = false;
          renderUsdEquivalency();
        }
      }

      function renderUsdEquivalency() {
        const hero = document.querySelector('.net-worth-hero');
        if (!hero) return;

        // Clean up any legacy pill outside mainGroup if exists
        const oldPill = hero.querySelector('#net-worth-usd-pill');
        if (oldPill) oldPill.remove();

        const mainGroup = hero.querySelector('.net-worth-main-group');
        const figureEl = hero.querySelector('.net-worth-figure');
        if (!mainGroup || !figureEl) return;

        let line = mainGroup.querySelector('#net-worth-usd-line');
        if (!line) {
          line = document.createElement('div');
          line.id = 'net-worth-usd-line';
          line.className = 'net-worth-usd-line';

          const badgesWrap = hero.querySelector('.hero-badges-wrapper');
          if (badgesWrap) {
            if (!badgesWrap.contains(line)) {
              badgesWrap.insertBefore(line, badgesWrap.firstChild);
            }
          } else if (figureEl.nextSibling) {
            mainGroup.insertBefore(line, figureEl.nextSibling);
          } else {
            mainGroup.appendChild(line);
          }
        }

        const amountEl = hero.querySelector('.net-worth-amount');
        const isPrivacy = (localStorage.getItem('fintrack_show_balance') === 'false') || !amountEl || (figureEl && figureEl.textContent.includes('•'));

        let usdDisplay = '$ ••••••';

        if (!isPrivacy && amountEl) {
          const rawNum = amountEl.textContent.replace(/[^0-9]/g, '');
          const netWorthIdr = parseInt(rawNum, 10);
          if (!isNaN(netWorthIdr) && currentUsdRate > 0) {
            const usdValue = netWorthIdr / currentUsdRate;
            usdDisplay = '$' + usdValue.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            });
          }
        }

        const rateFormatted = (typeof currentUsdRate === 'number' && !isNaN(currentUsdRate))
          ? currentUsdRate.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : '17.883,05';

        const contentHtml = `
          <span class="usd-approx">≈</span>
          <span class="usd-val">${usdDisplay}</span>
          <span class="usd-badge">USD</span>
          <span class="usd-dot-sep">•</span>
          <span class="usd-rate-text" id="usd-rate-refresh-btn" title="Kurs realtime USD/IDR (Live Interbank FX). Klik untuk refresh">
            <span class="usd-pulse-dot"></span>
            1$ = Rp ${rateFormatted}
            <i class="ph ph-arrows-clockwise usd-refresh-icon"></i>
          </span>
        `;

        if (line.innerHTML !== contentHtml) {
          line.innerHTML = contentHtml;

          const refreshBtn = line.querySelector('#usd-rate-refresh-btn');
          if (refreshBtn) {
            refreshBtn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              const icon = refreshBtn.querySelector('.usd-refresh-icon');
              if (icon) icon.style.animation = 'spinRefresh 0.6s linear';
              fetchUsdRate(true);
              setTimeout(() => {
                if (icon) icon.style.animation = '';
              }, 600);
            };
          }
        }
      }

      // Initialize USD rate fetching & refresh every minute
      fetchUsdRate();
      setInterval(fetchUsdRate, 60 * 1000);

      window.addEventListener('fintrack_privacy_change', () => {
        renderUsdEquivalency();
      });

      // Event listeners for instant reactivity (Bubbling phase, isolated from AI parser textarea)
      document.addEventListener('input', (e) => {
        if (e.target && e.target.tagName !== 'TEXTAREA' && e.target.closest && e.target.closest('.modal-card')) {
          const card = e.target.closest('.modal-card');
          const title = card.querySelector('.modal-title');
          if (title && title.textContent.toLowerCase().includes('catat')) {
            updateRealtimeSimulationSafe();
          }
        }
      });

      document.addEventListener('change', (e) => {
        if (e.target && e.target.tagName !== 'TEXTAREA' && e.target.closest && e.target.closest('.modal-card')) {
          const card = e.target.closest('.modal-card');
          const title = card.querySelector('.modal-title');
          if (title && title.textContent.toLowerCase().includes('catat')) {
            updateRealtimeSimulationSafe();
          }
        }
      });

      // Auto-scroll input into view when focused (Prevents mobile virtual keyboard covering textarea)
      document.addEventListener('focusin', (e) => {
        if (e.target && (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT')) {
          setTimeout(() => {
            if (typeof e.target.scrollIntoViewIfNeeded === 'function') {
              e.target.scrollIntoViewIfNeeded(true);
            } else if (typeof e.target.scrollIntoView === 'function') {
              e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 280);
        }
      });

      document.addEventListener('click', (e) => {
        if (e.target.closest && e.target.closest('.form-tab-btn')) {
          setTimeout(updateRealtimeSimulationSafe, 40);
        }
        setTimeout(renderUsdEquivalency, 50);
      });

      // Continuous DOM observer for dynamically rendered elements (isolated & debounced)
      let modalObserverDebounce = null;
      const modalObserver = new MutationObserver((mutations) => {
        // Quick filter: ignore mutations originating from the FX ripple/confetti container
        const isIgnorable = mutations.every(m => {
          if (m.target && m.target.closest && m.target.closest('#ft-fx-container')) return true;
          return false;
        });
        if (isIgnorable) return;

        if (modalObserverDebounce) clearTimeout(modalObserverDebounce);
        modalObserverDebounce = setTimeout(() => {
          const hasModal = !!document.querySelector('.modal-backdrop');
          if (hasModal) {
            if (!document.body.classList.contains('modal-open')) {
              document.body.classList.add('modal-open');
            }
          } else {
            if (document.body.classList.contains('modal-open')) {
              document.body.classList.remove('modal-open');
            }
          }
          setupQuickNominalChips();
          updateRealtimeSimulationSafe();
          renderUsdEquivalency();

          // Only mount tab navigation if missing from DOM (e.g. React complete remount)
          if (!document.getElementById('section-analytics-overview') || !document.querySelector('.mobile-bottom-bar[data-enhanced]')) {
            setupTabNavigationSafe();
          }
        }, 60);
      });
      modalObserver.observe(document.body, { childList: true, subtree: true });

