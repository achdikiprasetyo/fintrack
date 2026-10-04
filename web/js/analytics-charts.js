      // ========================================================
      // 10. ADVANCED FINTRACK TAB & ANALYTICS OVERVIEW ENGINE
      // ========================================================
      let currentActiveTab = sessionStorage.getItem('fintrack_active_tab') || 'assets';
      let currentSelectedMonth = '2026-10';
      let lastRenderedDataHash = '';
      let isUpdatingTabUI = false;

      const chartInstances = {
        category: null,
        timeline: null,
        wallet: null,
        networth: null
      };

      const INDO_MONTH_NAMES = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];

      function formatMonthLabel(ym) {
        if (!ym || ym === 'all') return 'Semua Waktu';
        const parts = ym.split('-');
        if (parts.length < 2) return ym;
        const mIndex = parseInt(parts[1], 10) - 1;
        return `${INDO_MONTH_NAMES[mIndex] || parts[1]} ${parts[0]}`;
      }

      function normalizeCategoryName(cat) {
        if (!cat || !cat.trim()) return 'Lainnya';
        const clean = cat.trim();
        const lower = clean.toLowerCase();
        if (lower === 'makanan' || lower === 'makanan & minuman' || lower === 'kuliner') return 'Makanan & Minuman';
        if (lower === 'belanja' || lower === 'shopping' || lower === 'pembelian') return 'Belanja & Shopping';
        if (lower === 'biaya admin' || lower === 'biaya admin bank' || lower === 'admin') return 'Biaya Admin';
        if (lower === 'keluarga' || lower === 'orang tua') return 'Keluarga';
        if (lower === 'domain' || lower === 'langganan' || lower === 'subscription') return 'Tagihan & Subskripsi';
        if (lower === 'bunga tabungan' || lower === 'bunga') return 'Bunga & Bagi Hasil';
        return clean.charAt(0).toUpperCase() + clean.slice(1);
      }

      const CATEGORY_SHORT_NAMES = {
        'Makanan & Minuman': 'Makanan',
        'Belanja & Shopping': 'Belanja',
        'Biaya Admin': 'Admin Bank',
        'Biaya Admin Bank': 'Admin Bank',
        'Tagihan & Subskripsi': 'Tagihan',
        'Bunga & Bagi Hasil': 'Bunga Bank',
        'Bunga Tabungan': 'Bunga Bank',
        'Transfer Antar Rekening': 'Transfer',
        'Pendidikan & Belajar': 'Pendidikan',
        'Kesehatan & Medis': 'Kesehatan',
        'Hiburan & Rekreasi': 'Hiburan',
        'Transportasi & Ojek': 'Transport',
        'Transportasi': 'Transport',
        'Pendapatan Lain': 'Lainnya',
        'Keluarga': 'Keluarga'
      };

      function getShortCategoryName(cat) {
        if (!cat) return 'Lainnya';
        const trimmed = cat.trim();
        if (CATEGORY_SHORT_NAMES[trimmed]) return CATEGORY_SHORT_NAMES[trimmed];
        const lower = trimmed.toLowerCase();
        if (lower.includes('makan') || lower.includes('kuliner')) return 'Makanan';
        if (lower.includes('belanja') || lower.includes('shop') || lower.includes('beli')) return 'Belanja';
        if (lower.includes('admin')) return 'Admin Bank';
        if (lower.includes('bunga')) return 'Bunga Bank';
        if (lower.includes('transfer')) return 'Transfer';
        if (lower.includes('tagihan') || lower.includes('domain') || lower.includes('subskripsi')) return 'Tagihan';
        if (lower.includes('keluarga') || lower.includes('orang tua')) return 'Keluarga';
        if (lower.includes('transport') || lower.includes('ojek') || lower.includes('bensin')) return 'Transport';
        if (lower.includes('hiburan') || lower.includes('game')) return 'Hiburan';
        if (lower.includes('kesehatan') || lower.includes('obat')) return 'Kesehatan';
        if (trimmed.length > 11) {
          return trimmed.slice(0, 10) + '…';
        }
        return trimmed;
      }

      const CATEGORY_COLORS = {
        'Makanan & Minuman': '#ef4444',
        'Makanan': '#ef4444',
        'Belanja & Shopping': '#0ea5e9',
        'Belanja': '#0ea5e9',
        'Biaya Admin': '#94a3b8',
        'Admin Bank': '#94a3b8',
        'Keluarga': '#a855f7',
        'Tagihan & Subskripsi': '#f59e0b',
        'Tagihan': '#f59e0b',
        'Bunga & Bagi Hasil': '#10b981',
        'Bunga Bank': '#10b981',
        'Transportasi': '#06b6d4',
        'Transport': '#06b6d4',
        'Hiburan': '#ec4899',
        'Kesehatan': '#14b8a6',
        'Lainnya': '#64748b'
      };

      const PALETTE_FALLBACK = [
        '#ef4444', '#0ea5e9', '#10b981', '#fbbf24', '#a855f7',
        '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#64748b'
      ];

      function getFinTrackData() {
        try {
          const raw = localStorage.getItem('fintrack_hub_data_v10');
          if (!raw) return { transactions: [], wallets: [] };
          const parsed = JSON.parse(raw);
          return {
            transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
            wallets: Array.isArray(parsed.wallets) ? parsed.wallets : [],
            investments: parsed.investments || {},
            bibitAssets: parsed.bibitAssets || []
          };
        } catch (e) {
          console.error('getFinTrackData error:', e);
          return { transactions: [], wallets: [] };
        }
      }

      const TAB_INDEX_MAP = {
        'assets': 0,
        'analytics': 1,
        'transactions': 2
      };

      function updateNavPillPosition() {
        const bottomBar = document.querySelector('.mobile-bottom-bar');
        if (!bottomBar) return;
        let pill = bottomBar.querySelector('.m-nav-pill-indicator');
        if (!pill) {
          pill = document.createElement('div');
          pill.className = 'm-nav-pill-indicator';
          bottomBar.insertBefore(pill, bottomBar.firstChild);
        }
        const activeBtn = bottomBar.querySelector(`.m-nav-item[data-tab="${currentActiveTab}"]`);
        if (activeBtn) {
          const barRect = bottomBar.getBoundingClientRect();
          const btnRect = activeBtn.getBoundingClientRect();
          const x = btnRect.left - barRect.left;
          const y = btnRect.top - barRect.top;
          const w = btnRect.width;
          const h = btnRect.height;
          if (w > 0 && h > 0) {
            pill.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
            pill.style.width = `${Math.round(w)}px`;
            pill.style.height = `${Math.round(h)}px`;
            pill.style.opacity = '1';
          }
        } else {
          pill.style.opacity = '0';
        }
      }
      let analyticsResizeRaf = null;
      window.addEventListener('resize', () => {
        updateNavPillPosition();
        if (currentActiveTab === 'analytics') {
          if (analyticsResizeRaf) cancelAnimationFrame(analyticsResizeRaf);
          analyticsResizeRaf = requestAnimationFrame(() => {
            if (chartInstances.category && typeof chartInstances.category.resize === 'function') {
              chartInstances.category.resize();
            }
            if (chartInstances.networth && typeof chartInstances.networth.resize === 'function') {
              chartInstances.networth.resize();
            }
            if (chartInstances.timeline && typeof chartInstances.timeline.resize === 'function') {
              chartInstances.timeline.resize();
            }
            if (chartInstances.wallet && typeof chartInstances.wallet.resize === 'function') {
              chartInstances.wallet.resize();
            }
          });
        }
      }, { passive: true });

      function switchTab(targetTab) {
        if (!targetTab) return;
        if (targetTab === currentActiveTab) {
          return;
        }

        const prevIdx = TAB_INDEX_MAP[currentActiveTab] ?? 0;
        const newIdx = TAB_INDEX_MAP[targetTab] ?? 0;
        const direction = newIdx >= prevIdx ? 'right' : 'left';

        currentActiveTab = targetTab;
        sessionStorage.setItem('fintrack_active_tab', targetTab);

        // Tactile micro-haptic feedback (Apple Taptic Engine feel: 8ms)
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          try { navigator.vibrate(8); } catch (e) {}
        }

        // 1. Update Desktop Tab buttons
        document.querySelectorAll('.fintrack-tab-btn').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-tab') === targetTab);
        });

        // 2. Update Mobile Bottom Bar buttons
        document.querySelectorAll('.mobile-bottom-bar .m-nav-item').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-tab') === targetTab);
        });

        // 2b. Glide sliding pill indicator
        updateNavPillPosition();

        // 3. Immediately reset scroll to top for clean slide transition
        window.scrollTo(0, 0);

        // 4. Apply DOM visibility and slide transition ("geser-geser")
        applyTabVisibility(targetTab, direction);

        // 5. Trigger smooth tab entrance
        if (targetTab === 'analytics') {
          renderAnalyticsDashboard(false);
        } else if (targetTab === 'transactions') {
          if (window.animateTransactionCascade) {
            setTimeout(() => window.animateTransactionCascade(), 35);
          }
        }
      }

      function applyTabVisibility(tab, direction = 'right') {
        const appContainer = document.querySelector('.app-container');
        if (!appContainer) return;

        // Atomic attributes for pure CSS isolation (ZERO FLASH of previous tab)
        document.documentElement.setAttribute('data-active-tab', tab);
        document.body.setAttribute('data-active-tab', tab);
        appContainer.setAttribute('data-active-tab', tab);

        const sections = Array.from(appContainer.querySelectorAll(':scope > section'));
        const analyticsSec = document.getElementById('section-analytics-overview');
        const heroCard = appContainer.querySelector('.net-worth-hero');
        const tickerBar = appContainer.querySelector('.market-ticker-wrap') || appContainer.querySelector('.live-market-ribbon');

        if (heroCard) {
          heroCard.setAttribute('data-fintrack-tab', 'assets');
          heroCard.style.setProperty('display', tab === 'assets' ? 'block' : 'none', 'important');
        }

        if (tickerBar) {
          tickerBar.setAttribute('data-fintrack-tab', 'assets');
          tickerBar.style.setProperty('display', tab === 'assets' ? 'block' : 'none', 'important');
        }

        if (analyticsSec) {
          analyticsSec.setAttribute('data-fintrack-tab', 'analytics');
          analyticsSec.style.setProperty('display', tab === 'analytics' ? 'block' : 'none', 'important');
        }

        sections.forEach(sec => {
          const title = (sec.querySelector('.section-title')?.textContent || sec.textContent || '').toLowerCase();
          const isReport = title.includes('pusat laporan') || title.includes('performa portofolio');
          const isWallet = title.includes('rekening bank') || title.includes('saldo kas');
          const isInvest = title.includes('portofolio investasi');
          const isTrans = title.includes('riwayat mutasi') || title.includes('transaksi');

          if (isWallet || isInvest) {
            sec.setAttribute('data-fintrack-tab', 'assets');
            sec.style.setProperty('display', tab === 'assets' ? 'block' : 'none', 'important');
          } else if (isTrans) {
            sec.setAttribute('data-fintrack-tab', 'transactions');
            sec.style.setProperty('display', tab === 'transactions' ? 'block' : 'none', 'important');
          } else if (isReport) {
            sec.setAttribute('data-fintrack-tab', 'reports');
            sec.style.setProperty('display', 'none', 'important');
          }
        });

        // Soft FinTech tab entrance transition (Apple Spring & Velvet Sheen)
        const targetElements = [];
        if (tab === 'analytics' && analyticsSec) {
          targetElements.push(analyticsSec);
        } else if (tab === 'transactions') {
          const transSec = sections.find(s => s.getAttribute('data-fintrack-tab') === 'transactions');
          if (transSec) targetElements.push(transSec);
        } else if (tab === 'assets') {
          if (heroCard) targetElements.push(heroCard);
          sections.filter(s => s.getAttribute('data-fintrack-tab') === 'assets').forEach(s => targetElements.push(s));
        }

        targetElements.forEach(el => {
          el.classList.remove('ft-tab-enter');
          void el.offsetWidth;
          el.classList.add('ft-tab-enter');
        });

        setTimeout(() => {
          targetElements.forEach(el => {
            el.classList.remove('ft-tab-enter');
          });
        }, 550);
      }

      function setupTabNavigation() {
        const appContainer = document.querySelector('.app-container');
        if (!appContainer) return;

        // 1. Remove redundant top tabs as requested
        const topNav = appContainer.querySelector('.fintrack-tab-nav');
        if (topNav) topNav.remove();

        // 2. Mobile Bottom Bar
        const bottomBar = document.querySelector('.mobile-bottom-bar');
        if (bottomBar && !bottomBar.getAttribute('data-enhanced')) {
          bottomBar.setAttribute('data-enhanced', 'true');
          bottomBar.innerHTML = `
            <div class="m-nav-pill-indicator"></div>
            <button type="button" class="m-nav-item tab-assets ${currentActiveTab === 'assets' ? 'active' : ''}" data-tab="assets">
              <i class="ph ph-wallet" style="font-size: 24px;"></i>
              <span>Beranda</span>
            </button>
            <button type="button" class="m-nav-item tab-analytics ${currentActiveTab === 'analytics' ? 'active' : ''}" data-tab="analytics">
              <i class="ph ph-chart-pie-slice" style="font-size: 24px;"></i>
              <span>Analisis</span>
            </button>
            <button type="button" class="m-nav-action-center" id="m-btn-catat" title="Catat Transaksi Baru">
              <i class="ph ph-plus" style="font-size: 24px;"></i>
            </button>
            <button type="button" class="m-nav-item tab-mutasi ${currentActiveTab === 'transactions' ? 'active' : ''}" data-tab="transactions">
              <i class="ph ph-receipt" style="font-size: 24px;"></i>
              <span>Mutasi</span>
            </button>
            <button type="button" class="m-nav-item" id="m-btn-ai" title="AI Voice/Text Input">
              <i class="ph ph-sparkle" style="font-size: 24px;"></i>
              <span>AI Input</span>
            </button>
          `;

          bottomBar.querySelectorAll('.m-nav-item[data-tab]').forEach(btn => {
            btn.onclick = (e) => {
              e.preventDefault();
              switchTab(btn.getAttribute('data-tab'));
            };
          });

          // Position the sliding pill after DOM paint
          updateNavPillPosition();
          setTimeout(updateNavPillPosition, 50);
          setTimeout(updateNavPillPosition, 250);

          const catatBtn = bottomBar.querySelector('#m-btn-catat');
          if (catatBtn) {
            catatBtn.onclick = (e) => {
              e.preventDefault();
              if (typeof window.__openTransactionModal === 'function') {
                window.__openTransactionModal();
              } else {
                const primaryBtn = document.querySelector('.header-actions .btn-primary, .btn-primary');
                if (primaryBtn) primaryBtn.click();
              }
            };
          }

          const aiBtn = bottomBar.querySelector('#m-btn-ai');
          if (aiBtn) {
            aiBtn.onclick = (e) => {
              e.preventDefault();
              if (typeof window.__openAiModal === 'function') {
                window.__openAiModal();
              } else {
                const aBtn = document.querySelector('.header-actions .btn-ai, .btn-ai');
                if (aBtn) aBtn.click();
              }
            };
          }
        }

        // 2b. Add Scan Resi pill button to Header Actions
        const headerActions = document.querySelector('.header-actions');
        if (headerActions && !document.getElementById('btn-header-scan-receipt')) {
          const scanPill = document.createElement('button');
          scanPill.type = 'button';
          scanPill.id = 'btn-header-scan-receipt';
          scanPill.className = 'btn-scan-receipt-pill';
          scanPill.title = 'Scan Resi / QRIS Pembayaran';
          scanPill.innerHTML = '<i class="ph ph-camera"></i><span>Scan Resi</span>';
          scanPill.onclick = (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('receipt-file-input');
            if (fileInput) fileInput.click();
          };
          headerActions.insertBefore(scanPill, headerActions.firstChild);
        }

        // 3. Analytics Section container insertion
        let analyticsSec = document.getElementById('section-analytics-overview');
        if (!analyticsSec) {
          analyticsSec = document.createElement('div');
          analyticsSec.id = 'section-analytics-overview';
          analyticsSec.style.display = currentActiveTab === 'analytics' ? 'block' : 'none';

          const reportSec = Array.from(appContainer.querySelectorAll(':scope > section')).find(sec => {
            const text = (sec.querySelector('.section-title')?.textContent || '').toLowerCase();
            return text.includes('pusat laporan') || text.includes('performa portofolio');
          });

          if (reportSec) {
            appContainer.insertBefore(analyticsSec, reportSec);
          } else {
            appContainer.appendChild(analyticsSec);
          }
        }

        applyTabVisibility(currentActiveTab);

        if (currentActiveTab === 'analytics') {
          renderAnalyticsDashboard();
        }
      }

      function setupTabNavigationSafe() {
        if (isUpdatingTabUI) return;
        isUpdatingTabUI = true;
        try {
          setupTabNavigation();
        } catch (e) {
          console.error('setupTabNavigation error:', e);
        } finally {
          setTimeout(() => { isUpdatingTabUI = false; }, 30);
        }
      }

      function getLocalDateString(dateInput) {
        if (!dateInput) return '';
        if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
          return dateInput;
        }
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return String(dateInput).slice(0, 10);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }

      function getLiveNetWorth(data) {
        // Priority 1: Read rendered live figure directly from DOM
        const el = document.querySelector('.net-worth-amount');
        if (el) {
          const raw = el.textContent.replace(/[^0-9]/g, '');
          const num = parseInt(raw, 10);
          if (!isNaN(num) && num > 0) return num;
        }
        // Priority 2: Compute exactly with sellPrice for gold and currentNav for bibit
        const totalCash = (data.wallets || []).reduce((acc, w) => acc + (Number(w.balance) || 0), 0);
        const gold = data.investments?.treasury;
        const goldVal = gold ? (Number(gold.grams) || 0) * (Number(gold.sellPrice) || Number(gold.buyPrice) || 0) : 0;
        const bibitVal = (data.bibitAssets || []).reduce((acc, b) => acc + ((Number(b.units) || 0) * (Number(b.currentNav) || 0)), 0);
        return Math.round(totalCash + goldVal + bibitVal);
      }

      function renderAnalyticsDashboard(forceRedraw = false) {
        const container = document.getElementById('section-analytics-overview');
        if (!container) return;

        const data = getFinTrackData();
        const txs = data.transactions;
        const currentTotalNetWorth = getLiveNetWorth(data);

        function getNetWorthAtClosing(targetDateStr) {
          let nw = currentTotalNetWorth;
          for (const t of txs) {
            const tDate = getLocalDateString(t.date);
            if (tDate > targetDateStr) {
              const amt = Number(t.amount) || 0;
              if (t.type === 'expense') nw += amt;
              else if (t.type === 'income') nw -= amt;
            }
          }
          return Math.round(nw);
        }

        const distinctMonths = Array.from(new Set(txs.map(t => getLocalDateString(t.date).slice(0, 7)).filter(Boolean))).sort().reverse();
        if (!window.__currentAnalyticsFilter) {
          window.__currentAnalyticsFilter = 'this_month';
        }
        const activeFilter = window.__currentAnalyticsFilter;

        const nw = new Date();
        const cy = nw.getFullYear();
        const cm = nw.getMonth(); // 0-indexed
        const mnNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
        const fullMnNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

        let filteredTxs = [];
        let periodLabelStr = 'Bulan Ini';
        let isSingleMonthMode = false;
        let singleMonthKey = '';

        if (activeFilter === 'this_month') {
          const curYm = `${cy}-${String(cm+1).padStart(2,'0')}`;
          periodLabelStr = `${fullMnNames[cm]} ${cy}`;
          filteredTxs = txs.filter(t => getLocalDateString(t.date).startsWith(curYm));
          isSingleMonthMode = true;
          singleMonthKey = curYm;
        } else if (activeFilter === 'last_month') {
          const prevD = new Date(cy, cm - 1, 1);
          const py = prevD.getFullYear();
          const pm = prevD.getMonth();
          const targetYm = `${py}-${String(pm+1).padStart(2,'0')}`;
          periodLabelStr = `${fullMnNames[pm]} ${py}`;
          filteredTxs = txs.filter(t => getLocalDateString(t.date).startsWith(targetYm));
          isSingleMonthMode = true;
          singleMonthKey = targetYm;
        } else if (activeFilter === 'last_3_months') {
          const start3 = new Date(cy, cm - 2, 1);
          const start3Ymd = `${start3.getFullYear()}-${String(start3.getMonth()+1).padStart(2,'0')}-01`;
          periodLabelStr = `3 Bulan Terakhir (${mnNames[start3.getMonth()]} - ${mnNames[cm]})`;
          filteredTxs = txs.filter(t => getLocalDateString(t.date) >= start3Ymd);
        } else if (activeFilter === 'this_year') {
          const curYearStr = String(cy);
          periodLabelStr = `Tahun ${cy}`;
          filteredTxs = txs.filter(t => getLocalDateString(t.date).startsWith(curYearStr));
        } else if (typeof activeFilter === 'string' && activeFilter.startsWith('custom:')) {
          const parts = activeFilter.split(':');
          const sDate = parts[1];
          const eDate = parts[2] || sDate;
          periodLabelStr = `${sDate} s/d ${eDate}`;
          filteredTxs = txs.filter(t => {
            const d = getLocalDateString(t.date);
            return d >= sDate && d <= eDate;
          });
        } else if (/^\d{4}-\d{2}$/.test(activeFilter)) {
          const [y, m] = activeFilter.split('-');
          periodLabelStr = `${fullMnNames[parseInt(m,10)-1]} ${y}`;
          filteredTxs = txs.filter(t => getLocalDateString(t.date).startsWith(activeFilter));
          isSingleMonthMode = true;
          singleMonthKey = activeFilter;
        } else {
          periodLabelStr = 'Semua Waktu';
          filteredTxs = txs;
        }

        const dataHash = `${activeFilter}_${txs.length}_${txs[0]?.id || ''}_${txs[txs.length - 1]?.id || ''}_${currentTotalNetWorth}`;
        if (!forceRedraw && dataHash === lastRenderedDataHash && container.querySelector('.analytics-header-card')) {
          return;
        }
        lastRenderedDataHash = dataHash;

        let totalIncome = 0;
        let totalExpense = 0;
        let incomeCount = 0;
        let expenseCount = 0;

        const catMap = {};
        const dayMap = {};
        const walletMap = {};

        filteredTxs.forEach(t => {
          const amt = Number(t.amount) || 0;
          const localD = getLocalDateString(t.date);
          const key = currentSelectedMonth === 'all' ? localD.slice(0, 7) : localD.slice(8, 10);

          if (t.type === 'income') {
            totalIncome += amt;
            incomeCount++;
            dayMap[key] = dayMap[key] || { income: 0, expense: 0 };
            dayMap[key].income += amt;
          } else if (t.type === 'expense') {
            totalExpense += amt;
            expenseCount++;
            const cat = normalizeCategoryName(t.category);
            catMap[cat] = (catMap[cat] || 0) + amt;

            dayMap[key] = dayMap[key] || { income: 0, expense: 0 };
            dayMap[key].expense += amt;

            const w = (t.walletName || 'Kas / Rekening').trim();
            walletMap[w] = (walletMap[w] || 0) + amt;
          }
        });

        const netCashflow = totalIncome - totalExpense;
        const isSurplus = netCashflow >= 0;
        let savingsRateSub = '';
        if (netCashflow < 0) {
          savingsRateSub = `Status: <b class="text-rose">Defisit Arus Kas</b>`;
        } else if (totalIncome <= 0) {
          savingsRateSub = `Savings Rate: <b>0%</b>`;
        } else {
          const sRate = Math.min(100, Math.max(0, Math.round((netCashflow / totalIncome) * 100)));
          savingsRateSub = `Savings Rate: <b class="text-emerald">${sRate}%</b>`;
        }

        // Daily avg expense
        let dailyAvg = 0;
        if (currentSelectedMonth !== 'all') {
          const now = new Date();
          const [y, m] = currentSelectedMonth.split('-');
          const isCurrentMonth = now.getFullYear() === parseInt(y, 10) && (now.getMonth() + 1) === parseInt(m, 10);
          const daysPassed = isCurrentMonth ? Math.max(1, now.getDate()) : new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
          dailyAvg = totalExpense > 0 ? Math.round(totalExpense / daysPassed) : 0;
        } else {
          dailyAvg = distinctMonths.length > 0 ? Math.round(totalExpense / (distinctMonths.length * 30)) : 0;
        }

        // Top category
        let topCatName = 'Belum Ada';
        let topCatAmount = 0;
        let topCatPct = 0;
        const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
        if (sortedCats.length > 0) {
          topCatName = sortedCats[0][0];
          topCatAmount = sortedCats[0][1];
          topCatPct = totalExpense > 0 ? Math.round((topCatAmount / totalExpense) * 100) : 0;
        }

        // Daily Net Worth Trajectory Array & Current Month Average Net Worth
        const netWorthDays = [];
        const netWorthValues = [];
        let currentMonthAvgNW = currentTotalNetWorth;

        if (currentSelectedMonth !== 'all') {
          const [yStr, mStr] = currentSelectedMonth.split('-');
          const yearNum = parseInt(yStr, 10);
          const monthNum = parseInt(mStr, 10);
          const now = new Date();
          const isThisMonth = now.getFullYear() === yearNum && (now.getMonth() + 1) === monthNum;
          const maxDay = isThisMonth ? Math.max(1, now.getDate()) : new Date(yearNum, monthNum, 0).getDate();

          let sumMonthNW = 0;
          for (let d = 1; d <= maxDay; d++) {
            const dayStr = String(d).padStart(2, '0');
            const dateStr = `${currentSelectedMonth}-${dayStr}`;
            let nwVal;
            if (isThisMonth && d === maxDay) {
              nwVal = currentTotalNetWorth;
            } else {
              nwVal = getNetWorthAtClosing(dateStr);
            }
            netWorthDays.push(`${d} ${INDO_MONTH_NAMES[monthNum - 1]?.slice(0, 3) || ''}`);
            netWorthValues.push(nwVal);
            sumMonthNW += nwVal;
          }
          currentMonthAvgNW = maxDay > 0 ? Math.round(sumMonthNW / maxDay) : currentTotalNetWorth;
        } else {
          const revDistinct = distinctMonths.slice().reverse();
          let sumAllNW = 0;
          revDistinct.forEach(mKey => {
            const [yStr, mStr] = mKey.split('-');
            const daysInM = new Date(parseInt(yStr, 10), parseInt(mStr, 10), 0).getDate();
            const dateStr = `${mKey}-${String(daysInM).padStart(2, '0')}`;
            const nwVal = getNetWorthAtClosing(dateStr);
            netWorthDays.push(formatMonthLabel(mKey));
            netWorthValues.push(nwVal);
            sumAllNW += nwVal;
          });
          currentMonthAvgNW = revDistinct.length > 0 ? Math.round(sumAllNW / revDistinct.length) : currentTotalNetWorth;
        }

        const currentIdx = distinctMonths.indexOf(currentSelectedMonth);
        const canGoPrev = currentIdx < distinctMonths.length - 1;
        const canGoNext = currentIdx > 0;

        // Previous month comparison calculation
        const prevMonthKey = currentIdx !== -1 && currentIdx < distinctMonths.length - 1 ? distinctMonths[currentIdx + 1] : null;

        let prevTotalIncome = 0;
        let prevTotalExpense = 0;
        let prevDailyAvg = 0;
        let prevMonthAvgNW = 0;
        let diffAvgNWPct = 0;
        let diffAvgNWRp = 0;
        let currentNWBarPct = 100;
        let prevNWBarPct = 100;
        let hasPrevMonth = false;

        if (prevMonthKey && currentSelectedMonth !== 'all') {
          hasPrevMonth = true;
          const prevTxs = txs.filter(t => getLocalDateString(t.date).startsWith(prevMonthKey));
          prevTxs.forEach(t => {
            const amt = Number(t.amount) || 0;
            if (t.type === 'income') prevTotalIncome += amt;
            else if (t.type === 'expense') prevTotalExpense += amt;
          });
          const [py, pm] = prevMonthKey.split('-');
          const prevDaysInMonth = new Date(parseInt(py, 10), parseInt(pm, 10), 0).getDate();
          prevDailyAvg = prevTotalExpense > 0 ? Math.round(prevTotalExpense / prevDaysInMonth) : 0;

          // Backtrack average net worth for previous month
          let sumPrevMonthNW = 0;
          for (let pd = 1; pd <= prevDaysInMonth; pd++) {
            const pDayStr = String(pd).padStart(2, '0');
            const pDateStr = `${prevMonthKey}-${pDayStr}`;
            const pNwVal = getNetWorthAtClosing(pDateStr);
            sumPrevMonthNW += pNwVal;
          }
          prevMonthAvgNW = prevDaysInMonth > 0 ? Math.round(sumPrevMonthNW / prevDaysInMonth) : 0;
          diffAvgNWRp = currentMonthAvgNW - prevMonthAvgNW;
          diffAvgNWPct = prevMonthAvgNW > 0 ? Number((((currentMonthAvgNW - prevMonthAvgNW) / prevMonthAvgNW) * 100).toFixed(2)) : 0;

          const maxNWComparison = Math.max(currentMonthAvgNW, prevMonthAvgNW, 1);
          currentNWBarPct = Math.min(100, Math.round((currentMonthAvgNW / maxNWComparison) * 100));
          prevNWBarPct = Math.min(100, Math.round((prevMonthAvgNW / maxNWComparison) * 100));
        }

        const prevNetCashflow = prevTotalIncome - prevTotalExpense;
        const diffDailyAvgPct = prevDailyAvg > 0 ? Math.round(((dailyAvg - prevDailyAvg) / prevDailyAvg) * 100) : 0;
        const diffExpensePct = prevTotalExpense > 0 ? Math.round(((totalExpense - prevTotalExpense) / prevTotalExpense) * 100) : 0;
        const diffIncomePct = prevTotalIncome > 0 ? Math.round(((totalIncome - prevTotalIncome) / prevTotalIncome) * 100) : 0;

        const maxExpComparison = Math.max(totalExpense, prevTotalExpense, 1);
        const currentExpBarPct = Math.min(100, Math.round((totalExpense / maxExpComparison) * 100));
        const prevExpBarPct = Math.min(100, Math.round((prevTotalExpense / maxExpComparison) * 100));

        const monthOptionsHtml = `
          <option value="all" ${currentSelectedMonth === 'all' ? 'selected' : ''}>Semua Waktu</option>
          ${distinctMonths.map(m => `<option value="${m}" ${currentSelectedMonth === m ? 'selected' : ''}>${formatMonthLabel(m)}</option>`).join('')}
        `;

        const pillsHtml = `
          ${distinctMonths[0] ? `<button type="button" class="month-pill-btn ${currentSelectedMonth === distinctMonths[0] ? 'active' : ''}" data-val="${distinctMonths[0]}">${formatMonthLabel(distinctMonths[0])}</button>` : ''}
          ${distinctMonths[1] ? `<button type="button" class="month-pill-btn ${currentSelectedMonth === distinctMonths[1] ? 'active' : ''}" data-val="${distinctMonths[1]}">${formatMonthLabel(distinctMonths[1])}</button>` : ''}
          <button type="button" class="month-pill-btn ${currentSelectedMonth === 'all' ? 'active' : ''}" data-val="all">Semua Waktu</button>
        `;

        // Render EXACT hierarchy requested:
        // 1. Month Selector Header
        // 2. PALING ATAS: Grafik Komposisi Pengeluaran per Kategori (Donut Chart & Legend)
        // 3. DI BAWAHNYA: 4 KPI Cards
        // 4. DI BAWAHNYA: Arus Kas Harian (Timeline Bar)
        // 5. DI BAWAHNYA: Pengeluaran per Sumber Rekening
        // 6. PALING BAWAH: Riwayat Kekayaan Bersih (Day-by-Day Net Worth)
        // 7. PALING BAWAH: Komparasi Antar Bulan (MoM Comparison)
        container.innerHTML = `
          <div class="analytics-header-card">
            <div class="analytics-top-row" style="flex-direction: column; align-items: stretch; gap: 0.65rem; margin-bottom: 0;">
              <div class="analytics-title-group">
                <div class="analytics-badge-tag">
                  <i class="ph ph-chart-line-up"></i>
                  <span>FINANCIAL OVERVIEW</span>
                </div>
                <h2 class="analytics-title">Analisis Keuangan</h2>
                <p class="analytics-subtitle">Arus kas & performa aset bulanan</p>
              </div>
              <div class="analytics-filter-bar-wrap">
                <button type="button" class="analytics-period-bar-btn ${activeFilter !== 'all' ? 'active' : ''}" id="btn-analytics-period-trigger" title="Pilih Rentang Waktu Analisis">
                  <div class="period-bar-left">
                    <i class="ph ph-calendar-blank" style="color:#38bdf8; font-size: 16px; flex-shrink: 0;"></i>
                    <span class="period-bar-text">${periodLabelStr}</span>
                  </div>
                  <div class="period-bar-right">
                    <span class="period-bar-action">Ubah</span>
                    <i class="ph ph-caret-down" style="color:#94a3b8; font-size: 12px;"></i>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <!-- 1. PALING ATAS: GRAFIK KOMPOSISI PENGELUARAN (DONUT CHART & LEADER LINES) -->
          <div class="analytics-chart-card" style="margin-bottom: 1.25rem;">
            <div class="chart-card-header" style="align-items: flex-start; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.65rem;">
              <div>
                <div class="chart-card-title" style="margin-bottom: 2px;">
                  <i class="ph ph-chart-pie-slice" style="font-size: 1.15rem; color: #38bdf8;"></i>
                  <span>Pengeluaran Kategori</span>
                </div>
                <div style="font-size: 0.7rem; color: #64748b; font-weight: 500;">Proporsi & nominal per pos belanja</div>
              </div>
              <div style="text-align: right; flex-shrink: 0;">
                <div style="font-size: 0.65rem; color: #94a3b8; text-transform: uppercase; font-weight: 600; letter-spacing: 0.03em;">Total Belanja</div>
                <div class="text-rose" style="font-size: 1.05rem; font-weight: 800; white-space: nowrap;">-${formatRupiah(totalExpense)}</div>
              </div>
            </div>
            <div class="chart-canvas-wrap" style="height: 300px;">
              <div id="fintrack-category-chart" style="width: 100%; height: 100%;"></div>
            </div>
            <div class="category-legend-list" id="category-legend-list">
              <!-- Populated by JS -->
            </div>
          </div>

          <!-- 2. 4 KPI CARDS -->
          <div class="analytics-kpi-grid">
            <div class="analytics-kpi-card kpi-income">
              <div class="kpi-label">
                <div class="kpi-label-left">
                  <i class="ph ph-trend-up"></i>
                  <span>Pemasukan</span>
                </div>
                <span class="kpi-dot" style="background:#10b981;"></span>
              </div>
              <div class="kpi-val text-emerald">+${formatRupiah(totalIncome)}</div>
              <div class="kpi-sub">${incomeCount} transaksi masuk</div>
            </div>

            <div class="analytics-kpi-card kpi-expense">
              <div class="kpi-label">
                <div class="kpi-label-left">
                  <i class="ph ph-trend-down"></i>
                  <span>Pengeluaran</span>
                </div>
                <span class="kpi-dot" style="background:#ef4444;"></span>
              </div>
              <div class="kpi-val text-rose">-${formatRupiah(totalExpense)}</div>
              <div class="kpi-sub">${expenseCount} transaksi keluar</div>
            </div>

            <div class="analytics-kpi-card kpi-net">
              <div class="kpi-label">
                <div class="kpi-label-left">
                  <i class="ph ph-scales"></i>
                  <span>Arus Kas</span>
                </div>
                <span class="kpi-badge ${isSurplus ? 'surplus' : 'deficit'}">${isSurplus ? 'Surplus' : 'Defisit'}</span>
              </div>
              <div class="kpi-val ${isSurplus ? 'text-emerald' : 'text-rose'}">
                ${isSurplus ? '+' : ''}${formatRupiah(netCashflow)}
              </div>
              <div class="kpi-sub">${savingsRateSub}</div>
            </div>

            <div class="analytics-kpi-card kpi-daily">
              <div class="kpi-label">
                <div class="kpi-label-left">
                  <i class="ph ph-lightning"></i>
                  <span>Rata-Rata</span>
                </div>
                <span class="kpi-dot" style="background:#a855f7;"></span>
              </div>
              <div class="kpi-val" style="color:#c084fc;">${formatRupiah(dailyAvg)}/hr</div>
              <div class="kpi-sub">Top: <b>${getShortCategoryName(topCatName)}</b> (${topCatPct}%)</div>
            </div>
          </div>

          <!-- 3. ARUS KAS HARIAN (TIMELINE BAR VIA ECHARTS) -->
          <div class="analytics-chart-card" style="margin-bottom: 1.25rem;">
            <div class="chart-card-header" style="align-items: flex-start; justify-content: space-between; gap: 0.5rem;">
              <div>
                <div class="chart-card-title" style="margin-bottom: 2px;">
                  <i class="ph ph-chart-line-up" style="font-size: 1.15rem; color: #10b981;"></i>
                  <span>Arus Kas Harian</span>
                </div>
                <div style="font-size: 0.7rem; color: #64748b; font-weight: 500;">Masuk vs keluar per tanggal</div>
              </div>
              <span class="kpi-badge surplus" style="font-size: 0.7rem;">Harian</span>
            </div>
            <div class="chart-canvas-wrap" style="height: 250px;">
              <div id="fintrack-timeline-chart" style="width: 100%; height: 100%;"></div>
            </div>
            <div class="daily-flow-list" id="daily-flow-list">
              <!-- Populated by JS -->
            </div>
          </div>

          <!-- 4. PENGELUARAN PER SUMBER REKENING -->
          <div class="analytics-chart-card" style="margin-bottom: 1.25rem;">
            <div class="chart-card-header">
              <div class="chart-card-title">
                <i class="ph ph-credit-card" style="font-size:20px; color:#f59e0b;"></i>
                <span>Pengeluaran per Sumber Rekening / Dompet</span>
              </div>
              <span style="font-size:0.75rem; color:#94a3b8; font-weight:600;">Otomatis per Mutasi</span>
            </div>
            <div class="wallet-breakdown-list" id="wallet-breakdown-list">
              <!-- Populated by JS -->
            </div>
          </div>

          <!-- 5. PALING BAWAH: RIWAYAT KEKAYAAN BERSIH (NET WORTH DAY-BY-DAY) -->
          <div class="analytics-chart-card" style="margin-bottom: 1.25rem;">
            <div class="chart-card-header" style="align-items: flex-start; justify-content: space-between; gap: 0.5rem;">
              <div>
                <div class="chart-card-title" style="margin-bottom: 2px;">
                  <i class="ph ph-shield-check" style="font-size: 1.15rem; color: #38bdf8;"></i>
                  <span>Riwayat Kekayaan</span>
                </div>
                <div style="font-size: 0.7rem; color: #64748b; font-weight: 500;">Saldo kas & aset hari ke hari</div>
              </div>
              <span class="kpi-badge surplus">
                Live: ${formatRupiah(currentTotalNetWorth)}
              </span>
            </div>
            <div class="chart-canvas-wrap" style="height: 250px;">
              <div id="fintrack-networth-history-chart" style="width: 100%; height: 100%;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.65rem; font-size:0.75rem; color:#94a3b8; padding:0 0.2rem; flex-wrap:wrap; gap:0.4rem;">
              <span>Rata-rata: <b style="color:#38bdf8;">${formatRupiah(currentMonthAvgNW)}</b></span>
              <span>Aset Kas + Emas + Bibit</span>
            </div>
            <div class="nw-day-list" id="nw-day-list">
              <!-- Populated by JS -->
            </div>
          </div>

          <!-- 6. PALING BAWAH: KOMPARASI ANTAR BULAN -->
          ${hasPrevMonth ? `
          <div class="analytics-chart-card" style="margin-bottom: 2rem;">
            <div class="chart-card-header">
              <div class="chart-card-title">
                <i class="ph ph-arrows-left-right" style="font-size:20px; color:#38bdf8;"></i>
                <span>Komparasi Antar Bulan</span>
              </div>
              <span class="kpi-badge ${diffExpensePct <= 0 ? 'surplus' : 'deficit'}" style="display: inline-flex; align-items: center; gap: 4px;">
                ${diffExpensePct <= 0 ? '<i class="ph ph-piggy-bank"></i> Hemat ' + Math.abs(diffExpensePct) + '%' : '<i class="ph ph-trend-up"></i> Naik +' + diffExpensePct + '%'}
              </span>
            </div>
            <div class="mom-comparison-grid">
              <!-- Rata-rata Kekayaan Bersih (Net Worth) MoM -->
              <div class="mom-card" style="grid-column: span 2; background: rgba(56, 189, 248, 0.08) !important; border: 1px solid rgba(56, 189, 248, 0.25) !important;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div class="mom-label" style="color:#38bdf8; font-weight:700;">
                    <i class="ph ph-shield-check" style="vertical-align:middle;"></i> Rata-rata Kekayaan Bersih (Net Worth)
                  </div>
                  <span class="kpi-badge ${diffAvgNWPct >= 0 ? 'surplus' : 'deficit'}" style="font-size:0.68rem; padding:2px 8px;">
                    ${diffAvgNWPct >= 0 ? '▲ +' + diffAvgNWPct + '%' : '▼ ' + diffAvgNWPct + '%'}
                  </span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:baseline; margin-top:0.35rem; flex-wrap:wrap; gap:0.35rem;">
                  <div>
                    <span class="mom-current" style="font-size:1.05rem; color:#38bdf8;">${formatRupiah(currentMonthAvgNW)}</span>
                    <span class="mom-prev" style="margin-left:0.5rem;">Lalu: ${formatRupiah(prevMonthAvgNW)}</span>
                  </div>
                  <div class="mom-diff ${diffAvgNWRp >= 0 ? 'text-emerald' : 'text-rose'}" style="font-size:0.75rem;">
                    ${diffAvgNWRp >= 0 ? '▲ Tumbuh +' + formatRupiah(diffAvgNWRp) : '▼ -' + formatRupiah(Math.abs(diffAvgNWRp))}
                  </div>
                </div>
              </div>

              <div class="mom-card">
                <div class="mom-label">Rata-rata Belanja Harian</div>
                <div class="mom-values">
                  <span class="mom-current">${formatRupiah(dailyAvg)}/hr</span>
                  <span class="mom-prev">Lalu: ${formatRupiah(prevDailyAvg)}/hr</span>
                </div>
                <div class="mom-diff ${dailyAvg <= prevDailyAvg ? 'text-emerald' : 'text-rose'}">
                  ${dailyAvg <= prevDailyAvg ? '<i class="ph ph-piggy-bank"></i> ' + Math.abs(diffDailyAvgPct) + '% lebih hemat' : '<i class="ph ph-trend-up"></i> +' + diffDailyAvgPct + '% lebih tinggi'}
                </div>
              </div>

              <div class="mom-card">
                <div class="mom-label">Total Belanja</div>
                <div class="mom-values">
                  <span class="mom-current text-rose">${formatRupiah(totalExpense)}</span>
                  <span class="mom-prev">Lalu: ${formatRupiah(prevTotalExpense)}</span>
                </div>
                <div class="mom-diff ${totalExpense <= prevTotalExpense ? 'text-emerald' : 'text-rose'}">
                  ${totalExpense <= prevTotalExpense ? '<i class="ph ph-piggy-bank"></i> Hemat ' + formatRupiah(prevTotalExpense - totalExpense) : '<i class="ph ph-trend-up"></i> Naik ' + formatRupiah(totalExpense - prevTotalExpense)}
                </div>
              </div>

              <div class="mom-card">
                <div class="mom-label">Total Pemasukan</div>
                <div class="mom-values">
                  <span class="mom-current text-emerald">${formatRupiah(totalIncome)}</span>
                  <span class="mom-prev">Lalu: ${formatRupiah(prevTotalIncome)}</span>
                </div>
                <div class="mom-diff ${totalIncome >= prevTotalIncome ? 'text-emerald' : 'text-rose'}">
                  ${totalIncome >= prevTotalIncome ? '▲ ' + (prevTotalIncome > 0 ? '+' + diffIncomePct + '%' : 'Naik') : '▼ ' + Math.abs(diffIncomePct) + '%'}
                </div>
              </div>

              <div class="mom-card">
                <div class="mom-label">Arus Kas Bersih</div>
                <div class="mom-values">
                  <span class="mom-current ${netCashflow >= 0 ? 'text-emerald' : 'text-rose'}">${netCashflow >= 0 ? '+' : ''}${formatRupiah(netCashflow)}</span>
                  <span class="mom-prev">Lalu: ${prevNetCashflow >= 0 ? '+' : ''}${formatRupiah(prevNetCashflow)}</span>
                </div>
                <div class="mom-diff ${netCashflow >= prevNetCashflow ? 'text-emerald' : 'text-rose'}">
                  ${netCashflow >= prevNetCashflow ? '▲ Arus kas membaik' : '▼ Arus kas menurun'}
                </div>
              </div>
            </div>

            <div class="mom-bar-comparison">
              <div class="mom-bar-row">
                <div class="mom-bar-info">
                  <span><b>${formatMonthLabel(currentSelectedMonth)}</b> (Belanja Bulanan)</span>
                  <b class="text-rose">${formatRupiah(totalExpense)}</b>
                </div>
                <div class="wb-progress-track">
                  <div class="wb-progress-bar" style="width: ${currentExpBarPct}%; background: #f43f5e;"></div>
                </div>
              </div>
              <div class="mom-bar-row">
                <div class="mom-bar-info">
                  <span style="color:#94a3b8;"><b>${formatMonthLabel(prevMonthKey)}</b> (Belanja Bulanan)</span>
                  <b style="color:#cbd5e1;">${formatRupiah(prevTotalExpense)}</b>
                </div>
                <div class="wb-progress-track">
                  <div class="wb-progress-bar" style="width: ${prevExpBarPct}%; background: #64748b;"></div>
                </div>
              </div>
              <div class="mom-bar-row" style="margin-top:0.4rem; padding-top:0.4rem; border-top:1px dashed rgba(255,255,255,0.06);">
                <div class="mom-bar-info">
                  <span><b>${formatMonthLabel(currentSelectedMonth)}</b> (Rata-rata Kekayaan)</span>
                  <b style="color:#38bdf8;">${formatRupiah(currentMonthAvgNW)}</b>
                </div>
                <div class="wb-progress-track">
                  <div class="wb-progress-bar" style="width: ${currentNWBarPct}%; background: #0284c7;"></div>
                </div>
              </div>
              <div class="mom-bar-row">
                <div class="mom-bar-info">
                  <span style="color:#94a3b8;"><b>${formatMonthLabel(prevMonthKey)}</b> (Rata-rata Kekayaan)</span>
                  <b style="color:#93c5fd;">${formatRupiah(prevMonthAvgNW)}</b>
                </div>
                <div class="wb-progress-track">
                  <div class="wb-progress-bar" style="width: ${prevNWBarPct}%; background: #475569;"></div>
                </div>
              </div>
            </div>
          </div>
          ` : ''}
        `;

        // Attach unified period filter event
        const triggerBtn = container.querySelector('#btn-analytics-period-trigger');
        if (triggerBtn) {
          triggerBtn.onclick = () => {
            if (window.__openPeriodFilterModal) {
              window.__openPeriodFilterModal('analytics');
            }
          };
        }

        window.__setAnalyticsDateFilter = function(filterVal) {
          window.__currentAnalyticsFilter = filterVal;
          renderAnalyticsDashboard(true);
        };

        // Draw Charts
        drawAnalyticsCharts(sortedCats, totalExpense, dayMap, walletMap, netWorthDays, netWorthValues);
      }

      function drawAnalyticsCharts(sortedCats, totalExpense, dayMap, walletMap, netWorthDays = [], netWorthValues = []) {
        // 1. ECharts Donut Chart with Polyline Leader Lines (PALING ATAS)
        const catContainer = document.getElementById('fintrack-category-chart');
        const legendList = document.getElementById('category-legend-list');

        if (catContainer && typeof echarts !== 'undefined') {
          let myChart = echarts.getInstanceByDom(catContainer);
          if (myChart) {
            try { myChart.dispose(); } catch(e){}
          }
          chartInstances.category = null;

          if (sortedCats.length > 0) {
            const chartData = sortedCats.map(([cat, val], i) => {
              const shortName = getShortCategoryName(cat);
              const color = CATEGORY_COLORS[cat] || CATEGORY_COLORS[shortName] || PALETTE_FALLBACK[i % PALETTE_FALLBACK.length];
              return {
                name: shortName,
                fullName: cat,
                value: val,
                itemStyle: { color: color }
              };
            });

            myChart = echarts.init(catContainer);
            chartInstances.category = myChart;

            const option = {
              backgroundColor: 'transparent',
              tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: 'rgba(255, 255, 255, 0.15)',
                borderWidth: 1,
                padding: [8, 12],
                textStyle: { color: '#f8fafc', fontSize: 12 },
                formatter: (p) => {
                  const val = p.value || 0;
                  const pct = p.percent || 0;
                  const fullName = p.data?.fullName || p.name;
                  return `
                    <div style="font-weight:700; color:#f8fafc; margin-bottom:3px;">${fullName}</div>
                    <div style="display:flex; justify-content:space-between; gap:14px; margin-bottom:2px;">
                      <span style="color:#94a3b8;">Nominal:</span>
                      <b style="color:#fb7185;">-Rp ${Math.round(val).toLocaleString('id-ID')}</b>
                    </div>
                    <div style="display:flex; justify-content:space-between; gap:14px;">
                      <span style="color:#94a3b8;">Porsi Belanja:</span>
                      <b style="color:#38bdf8;">${pct}%</b>
                    </div>
                  `;
                }
              },
              series: [
                {
                  name: 'Kategori',
                  type: 'pie',
                  radius: ['34%', '52%'],
                  center: ['50%', '50%'],
                  avoidLabelOverlap: true,
                  minAngle: 5,
                  itemStyle: {
                    borderRadius: 6,
                    borderColor: '#0f172a',
                    borderWidth: 2
                  },
                  label: {
                    show: true,
                    position: 'outside',
                    formatter: (p) => {
                      const val = p.value || 0;
                      const rpStr = val >= 10000000 
                        ? `Rp ${(val / 1000000).toFixed(1)}Jt`
                        : `Rp ${Math.round(val).toLocaleString('id-ID')}`;
                      return `${p.name} · ${p.percent}%\n${rpStr}`;
                    },
                    color: '#e2e8f0',
                    fontSize: 10,
                    fontWeight: '600',
                    lineHeight: 14
                  },
                  labelLine: {
                    show: true,
                    length: 12,
                    length2: 10,
                    smooth: 0.2,
                    lineStyle: {
                      color: 'rgba(255, 255, 255, 0.45)',
                      width: 1.2
                    }
                  },
                  data: chartData
                }
              ]
            };
            myChart.setOption(option);

            if (legendList) {
              legendList.innerHTML = sortedCats.map(([cat, amt], idx) => {
                const shortName = getShortCategoryName(cat);
                const color = CATEGORY_COLORS[cat] || CATEGORY_COLORS[shortName] || PALETTE_FALLBACK[idx % PALETTE_FALLBACK.length];
                const pct = totalExpense > 0 ? ((amt / totalExpense) * 100).toFixed(1) : 0;
                return `
                  <div class="category-legend-item">
                    <div class="cat-item-left">
                      <span class="cat-dot" style="background: ${color};"></span>
                      <div class="cat-names-col">
                        <span class="cat-name">${shortName}</span>
                        ${cat !== shortName ? `<span class="cat-fullname">${cat}</span>` : ''}
                      </div>
                    </div>
                    <div class="cat-item-right">
                      <span class="cat-amount">Rp ${Math.round(amt).toLocaleString('id-ID')}</span>
                      <span class="cat-pct-badge">${pct}%</span>
                    </div>
                  </div>
                `;
              }).join('');
            }
          } else {
            catContainer.innerHTML = `<div class="analytics-empty-state"><div class="analytics-empty-icon">📂</div>Belum ada transaksi pengeluaran di periode ini.</div>`;
            if (legendList) legendList.innerHTML = '';
          }
        }

        // 2. TIMELINE BAR CHART (Daily Cash Flow via ECharts)
        const timeContainer = document.getElementById('fintrack-timeline-chart');
        if (timeContainer && typeof echarts !== 'undefined') {
          let myTimeChart = echarts.getInstanceByDom(timeContainer);
          if (myTimeChart) {
            try { myTimeChart.dispose(); } catch(e){}
          }
          chartInstances.timeline = null;

          const rawKeys = Object.keys(dayMap).sort();
          if (rawKeys.length > 0) {
            myTimeChart = echarts.init(timeContainer);
            chartInstances.timeline = myTimeChart;

            const timeLabels = rawKeys.map(k => {
              if (currentSelectedMonth === 'all') {
                return formatMonthLabel(k);
              }
              const mIdx = parseInt(currentSelectedMonth.slice(5, 7), 10) - 1;
              const mShort = INDO_MONTH_NAMES[mIdx]?.slice(0, 3) || '';
              return `${parseInt(k, 10)} ${mShort}`;
            });

            const incData = rawKeys.map(k => dayMap[k].income);
            const expData = rawKeys.map(k => dayMap[k].expense);

            const timelineOption = {
              backgroundColor: 'transparent',
              tooltip: {
                trigger: 'axis',
                axisPointer: {
                  type: 'shadow',
                  shadowStyle: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: 'rgba(255, 255, 255, 0.12)',
                borderWidth: 1,
                padding: [10, 14],
                textStyle: { color: '#f8fafc', fontSize: 12 },
                formatter: (params) => {
                  if (!params || !params.length) return '';
                  const dateLabel = params[0].name;
                  let inc = 0;
                  let exp = 0;
                  params.forEach(p => {
                    if (p.seriesName === 'Pemasukan') inc = p.value || 0;
                    if (p.seriesName === 'Pengeluaran') exp = p.value || 0;
                  });
                  const net = inc - exp;
                  const netColor = net >= 0 ? '#34d399' : '#f43f5e';
                  const netSign = net >= 0 ? '+' : '';
                  return `
                    <div style="font-weight:700; color:#94a3b8; font-size:11px; margin-bottom:6px;">${dateLabel}</div>
                    <div style="display:flex; justify-content:space-between; gap:16px; margin-bottom:4px;">
                      <span style="color:#34d399;">● Masuk:</span>
                      <b>+Rp ${Math.round(inc).toLocaleString('id-ID')}</b>
                    </div>
                    <div style="display:flex; justify-content:space-between; gap:16px; margin-bottom:6px;">
                      <span style="color:#fb7185;">● Keluar:</span>
                      <b>-Rp ${Math.round(exp).toLocaleString('id-ID')}</b>
                    </div>
                    <div style="border-top:1px dashed rgba(255,255,255,0.15); padding-top:4px; display:flex; justify-content:space-between; gap:16px;">
                      <span style="color:#cbd5e1;">Arus Kas:</span>
                      <b style="color:${netColor};">${netSign}Rp ${Math.round(net).toLocaleString('id-ID')}</b>
                    </div>
                  `;
                }
              },
              legend: {
                show: true,
                right: '3%',
                top: '0%',
                itemWidth: 10,
                itemHeight: 10,
                textStyle: { color: '#94a3b8', fontSize: 11, fontWeight: '600' }
              },
              grid: {
                left: '3%',
                right: '3%',
                top: '16%',
                bottom: '8%',
                containLabel: true
              },
              xAxis: {
                type: 'category',
                data: timeLabels,
                axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
                axisTick: { show: false },
                axisLabel: {
                  color: '#94a3b8',
                  fontSize: 10,
                  interval: 0
                }
              },
              yAxis: {
                type: 'value',
                splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)', type: 'dashed' } },
                axisLabel: {
                  color: '#94a3b8',
                  fontSize: 10,
                  formatter: (val) => val >= 1000000 ? (val / 1000000).toFixed(1) + 'Jt' : (val >= 1000 ? (val / 1000).toFixed(0) + 'Rb' : val)
                }
              },
              series: [
                {
                  name: 'Pemasukan',
                  type: 'bar',
                  barMaxWidth: 20,
                  barMinHeight: 4,
                  barGap: '20%',
                  itemStyle: {
                    borderRadius: [4, 4, 0, 0],
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                      { offset: 0, color: '#34d399' },
                      { offset: 1, color: '#059669' }
                    ])
                  },
                  data: incData
                },
                {
                  name: 'Pengeluaran',
                  type: 'bar',
                  barMaxWidth: 20,
                  barMinHeight: 4,
                  itemStyle: {
                    borderRadius: [4, 4, 0, 0],
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                      { offset: 0, color: '#fb7185' },
                      { offset: 1, color: '#e11d48' }
                    ])
                  },
                  data: expData
                }
              ],
              dataZoom: timeLabels.length > 8 ? [
                {
                  type: 'inside',
                  start: Math.max(0, 100 - Math.round((8 / timeLabels.length) * 100)),
                  end: 100
                }
              ] : []
            };

            myTimeChart.setOption(timelineOption);

            const dailyFlowEl = document.getElementById('daily-flow-list');
            if (dailyFlowEl) {
              const revKeys = rawKeys.slice().reverse();
              dailyFlowEl.innerHTML = revKeys.map(k => {
                const inc = dayMap[k].income;
                const exp = dayMap[k].expense;
                const net = inc - exp;
                let label = '';
                if (currentSelectedMonth === 'all') {
                  label = formatMonthLabel(k);
                } else {
                  const mIdx = parseInt(currentSelectedMonth.slice(5, 7), 10) - 1;
                  const mShort = INDO_MONTH_NAMES[mIdx]?.slice(0, 3) || '';
                  label = `${parseInt(k, 10)} ${mShort}`;
                }
                return `
                  <div class="daily-flow-item">
                    <div class="daily-flow-left">
                      <span class="daily-date-chip">${label}</span>
                      <span style="color:${net >= 0 ? '#34d399' : '#f43f5e'}; font-weight:700;">
                        ${net >= 0 ? '+' : ''}${formatRupiah(net)}
                      </span>
                    </div>
                    <div class="daily-flow-right">
                      <span style="color:#10b981; font-weight:600;">+${formatRupiah(inc)}</span>
                      <span style="color:#64748b;">|</span>
                      <span style="color:#f43f5e; font-weight:600;">-${formatRupiah(exp)}</span>
                    </div>
                  </div>
                `;
              }).join('');
            }
          } else {
            timeContainer.innerHTML = `<div class="analytics-empty-state"><div class="analytics-empty-icon">📊</div>Belum ada arus kas harian di periode ini.</div>`;
            const dailyFlowEl = document.getElementById('daily-flow-list');
            if (dailyFlowEl) dailyFlowEl.innerHTML = '';
          }
        }

        // 3. WALLET SPENDING PROGRESS LIST
        const walletListContainer = document.getElementById('wallet-breakdown-list');
        if (walletListContainer) {
          const sortedWallets = Object.entries(walletMap).sort((a, b) => b[1] - a[1]);
          const totalWalletSpent = sortedWallets.reduce((acc, [, val]) => acc + val, 0);

          if (sortedWallets.length > 0 && totalWalletSpent > 0) {
            walletListContainer.innerHTML = sortedWallets.map(([name, amt], i) => {
              const lower = name.toLowerCase();
              let color = '#38bdf8';
              if (lower.includes('bca')) color = '#0060af';
              else if (lower.includes('seabank')) color = '#ff5a00';
              else if (lower.includes('tunai') || lower.includes('dompet')) color = '#10b981';
              else if (lower.includes('jago')) color = '#794bf7';
              else if (lower.includes('gopay')) color = '#00aed6';
              else if (lower.includes('dana')) color = '#118eea';
              else if (lower.includes('indodax')) color = '#d814db';
              else color = PALETTE_FALLBACK[i % PALETTE_FALLBACK.length];

              const pct = ((amt / totalWalletSpent) * 100).toFixed(1);

              return `
                <div class="wb-row">
                  <div class="wb-head">
                    <div class="wb-left">
                      <span class="wb-pill-dot" style="background: ${color};"></span>
                      <span class="wb-name">${name}</span>
                    </div>
                    <div class="wb-right">
                      <span class="wb-amount">-Rp ${Math.round(amt).toLocaleString('id-ID')}</span>
                      <span class="wb-pct-badge">${pct}%</span>
                    </div>
                  </div>
                  <div class="wb-progress-track">
                    <div class="wb-progress-bar" style="width: ${pct}%; background: ${color};"></div>
                  </div>
                </div>
              `;
            }).join('');
          } else {
            walletListContainer.innerHTML = `<div class="analytics-empty-state"><div class="analytics-empty-icon">💳</div>Belum ada pengeluaran rekening di periode ini.</div>`;
          }
        }

        // 4. ECharts Net Worth Trajectory Area Chart (PALING BAWAH)
        const nwContainer = document.getElementById('fintrack-networth-history-chart');
        if (nwContainer && typeof echarts !== 'undefined' && Array.isArray(netWorthValues) && netWorthValues.length > 0) {
          let myNwChart = echarts.getInstanceByDom(nwContainer);
          if (myNwChart) {
            try { myNwChart.dispose(); } catch(e){}
          }
          chartInstances.networth = null;

          myNwChart = echarts.init(nwContainer);
          chartInstances.networth = myNwChart;

          const minVal = Math.min(...netWorthValues);
          const maxVal = Math.max(...netWorthValues);
          const rangeVal = maxVal - minVal;
          const paddingVal = Math.max(150000, rangeVal * 0.25 || 250000);

          const nwOption = {
            backgroundColor: 'transparent',
            tooltip: {
              trigger: 'axis',
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              borderColor: 'rgba(56, 189, 248, 0.3)',
              borderWidth: 1,
              padding: [8, 12],
              textStyle: { color: '#f8fafc', fontSize: 12 },
              formatter: (params) => {
                if (!params || !params[0]) return '';
                const p = params[0];
                const idx = p.dataIndex;
                const val = p.value;
                let deltaHtml = '';
                if (idx > 0) {
                  const prevVal = netWorthValues[idx - 1];
                  const diff = val - prevVal;
                  if (diff > 0) {
                    deltaHtml = `<div style="font-size:0.72rem; color:#34d399; margin-top:3px;">▲ +Rp ${diff.toLocaleString('id-ID')} vs hari lalu</div>`;
                  } else if (diff < 0) {
                    deltaHtml = `<div style="font-size:0.72rem; color:#f87171; margin-top:3px;">▼ -Rp ${Math.abs(diff).toLocaleString('id-ID')} vs hari lalu</div>`;
                  } else {
                    deltaHtml = `<div style="font-size:0.72rem; color:#94a3b8; margin-top:3px;">= Saldo stabil</div>`;
                  }
                }
                return `
                  <div style="font-weight:700; color:#94a3b8; margin-bottom:2px; font-size:0.72rem;">${p.name}</div>
                  <div style="font-weight:800; font-size:0.92rem; color:#38bdf8;">Rp ${Math.round(val).toLocaleString('id-ID')}</div>
                  ${deltaHtml}
                `;
              }
            },
            grid: {
              left: '3%',
              right: '4%',
              top: '12%',
              bottom: '8%',
              containLabel: true
            },
            xAxis: {
              type: 'category',
              data: netWorthDays,
              axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
              axisTick: { show: false },
              axisLabel: {
                color: '#94a3b8',
                fontSize: 10,
                interval: netWorthDays.length > 15 ? Math.ceil(netWorthDays.length / 8) : 0
              }
            },
            yAxis: {
              type: 'value',
              min: Math.floor(minVal - paddingVal),
              max: Math.ceil(maxVal + paddingVal),
              splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)', type: 'dashed' } },
              axisLabel: {
                color: '#94a3b8',
                fontSize: 10,
                formatter: (val) => val >= 1000000 ? (val / 1000000).toFixed(1) + 'Jt' : (val >= 1000 ? (val / 1000).toFixed(0) + 'Rb' : val)
              }
            },
            series: [
              {
                name: 'Kekayaan Bersih',
                type: 'line',
                smooth: 0.35,
                showSymbol: true,
                symbolSize: 7,
                itemStyle: {
                  color: '#38bdf8',
                  borderColor: '#0f172a',
                  borderWidth: 2
                },
                lineStyle: {
                  width: 3,
                  color: '#38bdf8',
                  shadowColor: 'rgba(56, 189, 248, 0.3)',
                  shadowBlur: 8
                },
                areaStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'rgba(56, 189, 248, 0.35)' },
                    { offset: 0.8, color: 'rgba(56, 189, 248, 0.04)' },
                    { offset: 1, color: 'rgba(56, 189, 248, 0.0)' }
                  ])
                },
                data: netWorthValues
              }
            ]
          };

          myNwChart.setOption(nwOption);

          const nwDayListEl = document.getElementById('nw-day-list');
          if (nwDayListEl && Array.isArray(netWorthValues) && netWorthValues.length > 0) {
            const daysList = [];
            for (let i = netWorthValues.length - 1; i >= 0; i--) {
              const dayLabel = netWorthDays[i];
              const val = netWorthValues[i];
              const prevVal = i > 0 ? netWorthValues[i - 1] : val;
              const diff = val - prevVal;
              let diffHtml = '';
              if (diff > 0) {
                diffHtml = `<span style="color:#34d399; font-weight:700;">▲ +${formatRupiah(diff)}</span>`;
              } else if (diff < 0) {
                diffHtml = `<span style="color:#f43f5e; font-weight:700;">▼ -${formatRupiah(Math.abs(diff))}</span>`;
              } else {
                diffHtml = `<span style="color:#64748b;">Saldo Stabil</span>`;
              }
              daysList.push(`
                <div class="daily-flow-item">
                  <div class="daily-flow-left">
                    <span class="daily-date-chip" style="background: rgba(56, 189, 248, 0.15); color:#38bdf8;">${dayLabel}</span>
                    <span style="color:#f8fafc; font-weight:700;">${formatRupiah(val)}</span>
                  </div>
                  <div class="daily-flow-right">
                    ${diffHtml}
                  </div>
                </div>
              `);
            }
            nwDayListEl.innerHTML = daysList.join('');
          }
        }
      }

      // Initial tab boot
      setTimeout(() => {
        setupTabNavigationSafe();
        if (currentActiveTab === 'analytics') {
          renderAnalyticsDashboard(false);
        } else if (currentActiveTab === 'transactions') {
          if (window.animateTransactionCascade) {
            setTimeout(() => window.animateTransactionCascade(), 40);
          }
        }
      }, 120);

      window.addEventListener('storage', () => {
        if (currentActiveTab === 'analytics') {
          renderAnalyticsDashboard(true);
        }
      });

      window.addEventListener('fintrack_privacy_change', () => {
        if (currentActiveTab === 'analytics' && typeof renderAnalyticsDashboard === 'function') {
          renderAnalyticsDashboard(true);
        }
      });
      function enforceCleanHeader() {
        document.querySelectorAll('.brand-title').forEach(el => {
          if (el.textContent.includes('24/7')) {
            el.textContent = 'FinTrack';
          }
        });
      }
      enforceCleanHeader();
      window.addEventListener('DOMContentLoaded', enforceCleanHeader);

