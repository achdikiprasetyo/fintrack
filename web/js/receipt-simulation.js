      // 4. Quick Nominal Chips Injector for Catat Transaksi Modal
      const PRESET_AMOUNTS = [
        { label: '+10rb', val: 10000 },
        { label: '+20rb', val: 20000 },
        { label: '+50rb', val: 50000 },
        { label: '+100rb', val: 100000 },
        { label: '+250rb', val: 250000 },
        { label: '+500rb', val: 500000 },
        { label: '+1jt', val: 1000000 },
      ];

      function setupQuickNominalChips() {
        const rupiahWrappers = document.querySelectorAll('.rupiah-input-wrapper');
        rupiahWrappers.forEach((wrapper) => {
          if (wrapper.nextElementSibling?.classList.contains('quick-amount-chips')) return;

          const chipsRow = document.createElement('div');
          chipsRow.className = 'quick-amount-chips';

          PRESET_AMOUNTS.forEach(({ label, val }) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'q-chip';
            btn.textContent = label;
            btn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              const input = wrapper.querySelector('input');
              if (!input) return;
              const currentVal = parseInt(input.value.replace(/[^0-9]/g, '') || '0', 10);
              const newVal = currentVal + val;
              
              const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
              nativeSetter.call(input, String(newVal));
              input.dispatchEvent(new Event('input', { bubbles: true }));
              updateRealtimeSimulationSafe();
            };
            chipsRow.appendChild(btn);
          });

          // Reset button
          const clearBtn = document.createElement('button');
          clearBtn.type = 'button';
          clearBtn.className = 'q-chip q-chip-clear';
          clearBtn.textContent = '✕ Reset';
          clearBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const input = wrapper.querySelector('input');
            if (!input) return;
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(input, '');
            input.dispatchEvent(new Event('input', { bubbles: true }));
            updateRealtimeSimulationSafe();
          };
          chipsRow.appendChild(clearBtn);

          wrapper.parentNode.insertBefore(chipsRow, wrapper.nextSibling);
        });
      }

      // 5. Realtime Balance Simulation & Dynamic Transaction Recording UX
      function formatRupiah(num, ignorePrivacy = false) {
        if (!ignorePrivacy) {
          try {
            if (localStorage.getItem('fintrack_show_balance') === 'false') {
              return 'Rp ••••••';
            }
          } catch(e) {}
        }
        const isNeg = num < 0;
        const abs = Math.abs(Math.round(num));
        return (isNeg ? '-Rp ' : 'Rp ') + abs.toLocaleString('id-ID');
      }

      function parseWalletOption(opt) {
        if (!opt) return { name: 'Kas / Rekening', balance: 0 };
        const text = (opt.textContent || opt.innerText || '').trim();
        const match = text.match(/^(.*?)\s*\((?:Sisa:\s*)?Rp\s*([-\d\.,]+)\)/i);
        if (match) {
          const name = match[1].trim();
          const rawNum = match[2].replace(/\./g, '').replace(/,/g, '.');
          const balance = parseFloat(rawNum) || 0;
          return { name, balance };
        }
        return { name: text.split('(')[0].trim() || 'Kas / Rekening', balance: 0 };
      }

      function getActiveTab(modalCard) {
        const activeBtn = modalCard.querySelector('.form-tab-btn.active');
        if (!activeBtn) return 'expense';
        const text = (activeBtn.textContent || '').toLowerCase();
        if (text.includes('pengeluaran')) return 'expense';
        if (text.includes('pemasukan')) return 'income';
        if (text.includes('transfer')) return 'transfer';
        if (text.includes('emas')) return 'gold';
        if (text.includes('bibit')) return 'bibit';
        return 'expense';
      }

      function updateRealtimeSimulation() {
        const modalCard = document.querySelector('.modal-card');
        if (!modalCard) return;

        const modalTitle = modalCard.querySelector('.modal-title');
        if (!modalTitle || !modalTitle.textContent.toLowerCase().includes('catat')) return;

        // 1. Synchronize data-tab attribute for dynamic styles
        const activeTab = getActiveTab(modalCard);
        if (modalCard.getAttribute('data-tab') !== activeTab) {
          modalCard.setAttribute('data-tab', activeTab);
        }

        // 2a. Enhance Modal Header Icon
        if (modalTitle && !modalTitle.querySelector('i')) {
          modalTitle.innerHTML = '<i class="ph-bold ph-receipt" style="color: #38bdf8; font-size: 1.15rem; margin-right: 6px;"></i><span>Catat Transaksi Finansial</span>';
          modalTitle.style.display = 'inline-flex';
          modalTitle.style.alignItems = 'center';
        }

        // 2b. Modernize Tab Buttons with Mutasi-style Icons
        const tabBtns = modalCard.querySelectorAll('.form-tab-btn');
        tabBtns.forEach(btn => {
          const t = (btn.textContent || '').trim();
          if (t.includes('Pengeluaran') && !btn.querySelector('i')) {
            btn.innerHTML = '<i class="ph-bold ph-arrow-up-right" style="font-size:12px; color:#fb7185; margin-right:4px;"></i><span>Pengeluaran</span>';
            btn.style.display = 'inline-flex'; btn.style.alignItems = 'center'; btn.style.justifyContent = 'center';
          } else if (t.includes('Pemasukan') && !btn.querySelector('i')) {
            btn.innerHTML = '<i class="ph-bold ph-arrow-down-left" style="font-size:12px; color:#34d399; margin-right:4px;"></i><span>Pemasukan</span>';
            btn.style.display = 'inline-flex'; btn.style.alignItems = 'center'; btn.style.justifyContent = 'center';
          } else if (t.includes('Transfer') && (!btn.querySelector('i') || t.includes('🔄'))) {
            btn.innerHTML = '<i class="ph-bold ph-arrows-left-right" style="font-size:12px; color:#38bdf8; margin-right:4px;"></i><span>Transfer Dana</span>';
            btn.style.display = 'inline-flex'; btn.style.alignItems = 'center'; btn.style.justifyContent = 'center';
          } else if (t.includes('Emas') && !btn.querySelector('i')) {
            btn.innerHTML = '<i class="ph-bold ph-sparkle" style="font-size:12px; color:#fbbf24; margin-right:4px;"></i><span>Beli Emas</span>';
            btn.style.display = 'inline-flex'; btn.style.alignItems = 'center'; btn.style.justifyContent = 'center';
          } else if (t.includes('Bibit') && !btn.querySelector('i')) {
            btn.innerHTML = '<i class="ph-bold ph-trend-up" style="font-size:12px; color:#10b981; margin-right:4px;"></i><span>Beli Bibit</span>';
            btn.style.display = 'inline-flex'; btn.style.alignItems = 'center'; btn.style.justifyContent = 'center';
          }
        });

        // 2c. Enhance Form Labels with Mutasi-style Icons
        const formLabels = modalCard.querySelectorAll('.form-label');
        formLabels.forEach(lbl => {
          const t = (lbl.textContent || '').trim();
          if ((t.includes('Rekening / Kas') || t.includes('Sumber Dana')) && !lbl.querySelector('i')) {
            lbl.innerHTML = '<i class="ph-bold ph-wallet" style="color: #38bdf8; font-size: 13px; margin-right: 5px;"></i><span>' + t + '</span>';
            lbl.style.display = 'inline-flex'; lbl.style.alignItems = 'center';
          } else if ((t.includes('Nominal Transaksi') || t.includes('Nominal Pembelian')) && !lbl.querySelector('i')) {
            lbl.innerHTML = '<i class="ph-bold ph-coins" style="color: #f59e0b; font-size: 13px; margin-right: 5px;"></i><span>' + t + '</span>';
            lbl.style.display = 'inline-flex'; lbl.style.alignItems = 'center';
          } else if (t.includes('Kategori') && !lbl.querySelector('i')) {
            lbl.innerHTML = '<i class="ph-bold ph-tag" style="color: #c084fc; font-size: 13px; margin-right: 5px;"></i><span>Kategori</span>';
            lbl.style.display = 'inline-flex'; lbl.style.alignItems = 'center';
          } else if (t.includes('Catatan Transaksi') && !lbl.querySelector('i')) {
            lbl.innerHTML = '<i class="ph-bold ph-note-pencil" style="color: #94a3b8; font-size: 13px; margin-right: 5px;"></i><span>Catatan Transaksi</span>';
            lbl.style.display = 'inline-flex'; lbl.style.alignItems = 'center';
          } else if (t.includes('Dari Rekening (Pengirim)')) {
            lbl.innerHTML = '<i class="ph-bold ph-arrow-up-right" style="color: #fb7185; font-size: 13px; margin-right: 5px;"></i><span style="color:#fda4af;">Dari Rekening (Pengirim)</span>';
            lbl.style.display = 'inline-flex'; lbl.style.alignItems = 'center';
          } else if (t.includes('Ke Rekening (Tujuan)')) {
            lbl.innerHTML = '<i class="ph-bold ph-arrow-down-left" style="color: #34d399; font-size: 13px; margin-right: 5px;"></i><span style="color:#6ee7b7;">Ke Rekening (Tujuan)</span>';
            lbl.style.display = 'inline-flex'; lbl.style.alignItems = 'center';
          }
        });

        // 2d. Dynamic Submit Button with Mutasi-style Icons
        const submitBtn = modalCard.querySelector('.modal-footer .btn-primary');
        if (submitBtn) {
          let btnIcon = 'ph-arrow-up-right';
          let btnText = 'Catat Pengeluaran';
          if (activeTab === 'expense') { btnIcon = 'ph-arrow-up-right'; btnText = 'Catat Pengeluaran'; }
          else if (activeTab === 'income') { btnIcon = 'ph-arrow-down-left'; btnText = 'Catat Pemasukan'; }
          else if (activeTab === 'transfer') { btnIcon = 'ph-arrows-left-right'; btnText = 'Proses Transfer Dana'; }
          else if (activeTab === 'gold') { btnIcon = 'ph-sparkle'; btnText = 'Beli Emas Treasury'; }
          else if (activeTab === 'bibit') { btnIcon = 'ph-trend-up'; btnText = 'Beli Reksa Dana Bibit'; }

          if (submitBtn.dataset.tabType !== activeTab) {
            submitBtn.dataset.tabType = activeTab;
            submitBtn.innerHTML = `<i class="ph-bold ${btnIcon}" style="font-size: 16px; margin-right: 6px;"></i><span>${btnText}</span>`;
            submitBtn.style.display = 'inline-flex';
            submitBtn.style.alignItems = 'center';
            submitBtn.style.justifyContent = 'center';
          }
        }

        // 3. Locate or insert #realtime-impact-card
        let impactCard = modalCard.querySelector('#realtime-impact-card');
        if (!impactCard) {
          impactCard = document.createElement('div');
          impactCard.id = 'realtime-impact-card';
          impactCard.className = `realtime-impact-card theme-${activeTab}`;

          const chips = modalCard.querySelector('.quick-amount-chips');
          const rupiahWrapper = modalCard.querySelector('.rupiah-input-wrapper');
          if (chips && chips.parentNode) {
            chips.parentNode.insertBefore(impactCard, chips.nextSibling);
          } else if (rupiahWrapper && rupiahWrapper.parentNode) {
            rupiahWrapper.parentNode.insertBefore(impactCard, rupiahWrapper.nextSibling);
          } else {
            const modalBody = modalCard.querySelector('.modal-body');
            if (modalBody) modalBody.appendChild(impactCard);
          }
        }

        // Ensure theme class is updated
        impactCard.className = `realtime-impact-card theme-${activeTab}`;

        // 4. Read user input amount
        const rupiahInput = modalCard.querySelector('.rupiah-input-wrapper input');
        const rawVal = rupiahInput ? rupiahInput.value.replace(/[^0-9]/g, '') : '0';
        const amount = parseInt(rawVal || '0', 10);

        // 5. Read wallet selects
        const selects = Array.from(modalCard.querySelectorAll('select.form-control'));

        // TAB: TRANSFER
        if (activeTab === 'transfer') {
          const fromSelect = selects[0];
          const toSelect = selects[1] || selects[0];
          const fromWallet = fromSelect && fromSelect.selectedIndex >= 0 ? parseWalletOption(fromSelect.options[fromSelect.selectedIndex]) : { name: 'Kas Pengirim', balance: 0 };
          const toWallet = toSelect && toSelect.selectedIndex >= 0 ? parseWalletOption(toSelect.options[toSelect.selectedIndex]) : { name: 'Kas Penerima', balance: 0 };

          if (amount <= 0) {
            impactCard.innerHTML = `
              <div class="impact-header">
                <span class="impact-type-badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); display: inline-flex; align-items: center; gap: 4px;">
                  <i class="ph-bold ph-arrows-left-right"></i> TRANSFER SALDO
                </span>
                <span class="impact-realtime-tag">● SIMULASI REALTIME</span>
              </div>
              <div class="impact-empty-hint">
                💡 Masukkan nominal transfer untuk melihat simulasi pergeseran saldo antar rekening secara instan.
              </div>
            `;
            return;
          }

          const fromNew = fromWallet.balance - amount;
          const toNew = toWallet.balance + amount;
          const isSameWallet = fromWallet.name.toLowerCase() === toWallet.name.toLowerCase();
          const isInsufficient = fromNew < 0;

          let warningHtml = '';
          if (isSameWallet) {
            warningHtml = '<div class="impact-warning">⚠️ Rekening asal dan rekening tujuan tidak boleh sama!</div>';
          } else if (isInsufficient) {
            warningHtml = `<div class="impact-warning">⚠️ Saldo <b>${fromWallet.name}</b> tidak mencukupi! (Kurang ${formatRupiah(Math.abs(fromNew))})</div>`;
          }

          impactCard.innerHTML = `
            <div class="impact-header">
              <span class="impact-type-badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); display: inline-flex; align-items: center; gap: 4px;">
                <i class="ph-bold ph-arrows-left-right"></i> TRANSFER SALDO
              </span>
              <span class="impact-realtime-tag">● SIMULASI REALTIME</span>
            </div>
            <div class="impact-rows-wrap">
              <div class="impact-row">
                <div class="impact-col-left">
                  <span class="impact-role" style="display: inline-flex; align-items: center; gap: 4px;"><i class="ph-bold ph-arrow-up-right" style="color: #fb7185;"></i> Pengirim:</span>
                  <span class="impact-w-name">${fromWallet.name}</span>
                </div>
                <div class="impact-col-right">
                  <span class="impact-before">${formatRupiah(fromWallet.balance)}</span>
                  <span class="impact-arrow">➔</span>
                  <span class="impact-after ${isInsufficient ? 'text-danger' : 'text-minus'}">${formatRupiah(fromNew)}</span>
                </div>
              </div>
              <div class="impact-row">
                <div class="impact-col-left">
                  <span class="impact-role" style="display: inline-flex; align-items: center; gap: 4px;"><i class="ph-bold ph-arrow-down-left" style="color: #34d399;"></i> Penerima:</span>
                  <span class="impact-w-name">${toWallet.name}</span>
                </div>
                <div class="impact-col-right">
                  <span class="impact-before">${formatRupiah(toWallet.balance)}</span>
                  <span class="impact-arrow">➔</span>
                  <span class="impact-after text-plus">${formatRupiah(toNew)}</span>
                </div>
              </div>
              <div class="impact-summary-row">
                <span>Nominal Ditransfer:</span>
                <span style="color:#38bdf8;font-weight:700;">${formatRupiah(amount)}</span>
              </div>
              ${warningHtml}
            </div>
          `;
          return;
        }

        // TABS: EXPENSE, INCOME, GOLD, BIBIT
        const walletSelect = selects[0];
        const wallet = walletSelect && walletSelect.selectedIndex >= 0 ? parseWalletOption(walletSelect.options[walletSelect.selectedIndex]) : { name: 'Kas / Rekening', balance: 0 };

        // TAB: EXPENSE
        if (activeTab === 'expense') {
          if (amount <= 0) {
            impactCard.innerHTML = `
              <div class="impact-header">
                <span class="impact-type-badge" style="background: rgba(244, 63, 94, 0.15); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.3); display: inline-flex; align-items: center; gap: 4px;">
                  <i class="ph-bold ph-arrow-up-right"></i> PENGELUARAN
                </span>
                <span class="impact-realtime-tag">● SIMULASI REALTIME</span>
              </div>
              <div class="impact-empty-hint">
                💡 Masukkan nominal untuk melihat simulasi sisa saldo rekening secara langsung.
              </div>
            `;
            return;
          }

          const newBal = wallet.balance - amount;
          const isInsufficient = newBal < 0;
          const warningHtml = isInsufficient 
            ? `<div class="impact-warning">⚠️ Saldo <b>${wallet.name}</b> tidak mencukupi! (Kurang ${formatRupiah(Math.abs(newBal))})</div>` 
            : '';

          impactCard.innerHTML = `
            <div class="impact-header">
              <span class="impact-type-badge" style="background: rgba(244, 63, 94, 0.15); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.3); display: inline-flex; align-items: center; gap: 4px;">
                <i class="ph-bold ph-arrow-up-right"></i> PENGELUARAN
              </span>
              <span class="impact-realtime-tag">● SIMULASI REALTIME</span>
            </div>
            <div class="impact-rows-wrap">
              <div class="impact-row">
                <div class="impact-col-left">
                  <span class="impact-role" style="display: inline-flex; align-items: center; gap: 4px;"><i class="ph-bold ph-wallet" style="color: #38bdf8;"></i> Kas / Rek:</span>
                  <span class="impact-w-name">${wallet.name}</span>
                </div>
                <div class="impact-col-right">
                  <span class="impact-before">${formatRupiah(wallet.balance)}</span>
                  <span class="impact-arrow">➔</span>
                  <span class="impact-after ${isInsufficient ? 'text-danger' : 'text-minus'}">${formatRupiah(newBal)}</span>
                </div>
              </div>
              <div class="impact-summary-row">
                <span>Potongan Dana:</span>
                <span class="text-minus" style="font-weight:700;">-${formatRupiah(amount)}</span>
              </div>
              ${warningHtml}
            </div>
          `;
          return;
        }

        // TAB: INCOME
        if (activeTab === 'income') {
          if (amount <= 0) {
            impactCard.innerHTML = `
              <div class="impact-header">
                <span class="impact-type-badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); display: inline-flex; align-items: center; gap: 4px;">
                  <i class="ph-bold ph-arrow-down-left"></i> PEMASUKAN
                </span>
                <span class="impact-realtime-tag">● SIMULASI REALTIME</span>
              </div>
              <div class="impact-empty-hint">
                💡 Masukkan nominal untuk melihat estimasi kenaikan saldo rekening secara langsung.
              </div>
            `;
            return;
          }

          const newBal = wallet.balance + amount;
          impactCard.innerHTML = `
            <div class="impact-header">
              <span class="impact-type-badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); display: inline-flex; align-items: center; gap: 4px;">
                <i class="ph-bold ph-arrow-down-left"></i> PEMASUKAN
              </span>
              <span class="impact-realtime-tag">● SIMULASI REALTIME</span>
            </div>
            <div class="impact-rows-wrap">
              <div class="impact-row">
                <div class="impact-col-left">
                  <span class="impact-role" style="display: inline-flex; align-items: center; gap: 4px;"><i class="ph-bold ph-wallet" style="color: #38bdf8;"></i> Masuk ke:</span>
                  <span class="impact-w-name">${wallet.name}</span>
                </div>
                <div class="impact-col-right">
                  <span class="impact-before">${formatRupiah(wallet.balance)}</span>
                  <span class="impact-arrow">➔</span>
                  <span class="impact-after text-plus">${formatRupiah(newBal)}</span>
                </div>
              </div>
              <div class="impact-summary-row">
                <span>Pertambahan Saldo:</span>
                <span class="text-plus" style="font-weight:700;">+${formatRupiah(amount)}</span>
              </div>
            </div>
          `;
          return;
        }

        // TAB: GOLD (Investasi Emas)
        if (activeTab === 'gold') {
          if (amount <= 0) {
            impactCard.innerHTML = `
              <div class="impact-header">
                <span class="impact-type-badge" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); display: inline-flex; align-items: center; gap: 4px;">
                  <i class="ph-bold ph-sparkle"></i> BELI EMAS TREASURY
                </span>
                <span class="impact-realtime-tag">● SIMULASI REALTIME</span>
              </div>
              <div class="impact-empty-hint">
                💡 Masukkan nominal rupiah untuk simulasi estimasi gram emas yang diperoleh.
              </div>
            `;
            return;
          }

          const newBal = wallet.balance - amount;
          const isInsufficient = newBal < 0;
          const warningHtml = isInsufficient 
            ? `<div class="impact-warning">⚠️ Saldo <b>${wallet.name}</b> tidak mencukupi! (Kurang ${formatRupiah(Math.abs(newBal))})</div>` 
            : '';

          const gramsInput = modalCard.querySelector('input[step="0.0001"]');
          const gramsVal = gramsInput ? parseFloat(gramsInput.value) : 0;
          const gramsText = gramsVal > 0 ? gramsVal.toFixed(4) : (amount > 0 ? (amount / 1380000).toFixed(4) : '0.0000');

          impactCard.innerHTML = `
            <div class="impact-header">
              <span class="impact-type-badge" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); display: inline-flex; align-items: center; gap: 4px;">
                <i class="ph-bold ph-sparkle"></i> BELI EMAS TREASURY
              </span>
              <span class="impact-realtime-tag">● SIMULASI REALTIME</span>
            </div>
            <div class="impact-rows-wrap">
              <div class="impact-row">
                <div class="impact-col-left">
                  <span class="impact-role" style="display: inline-flex; align-items: center; gap: 4px;"><i class="ph-bold ph-wallet" style="color: #38bdf8;"></i> Rekening:</span>
                  <span class="impact-w-name">${wallet.name}</span>
                </div>
                <div class="impact-col-right">
                  <span class="impact-before">${formatRupiah(wallet.balance)}</span>
                  <span class="impact-arrow">➔</span>
                  <span class="impact-after ${isInsufficient ? 'text-danger' : 'text-minus'}">${formatRupiah(newBal)}</span>
                </div>
              </div>
              <div class="impact-row" style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2);">
                <div class="impact-col-left">
                  <span class="impact-role" style="color: #fbbf24; display: inline-flex; align-items: center; gap: 4px;"><i class="ph-bold ph-sparkle"></i> Tambahan Emas:</span>
                  <span class="impact-w-name" style="color: #fde68a;">Treasury</span>
                </div>
                <div class="impact-col-right">
                  <span class="impact-after text-plus">+${gramsText} gr</span>
                </div>
              </div>
              ${warningHtml}
            </div>
          `;
          return;
        }

        // TAB: BIBIT (Investasi Bibit)
        if (activeTab === 'bibit') {
          if (amount <= 0) {
            impactCard.innerHTML = `
              <div class="impact-header">
                <span class="impact-type-badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); display: inline-flex; align-items: center; gap: 4px;">
                  <i class="ph-bold ph-trend-up"></i> BELI BIBIT
                </span>
                <span class="impact-realtime-tag">● SIMULASI REALTIME</span>
              </div>
              <div class="impact-empty-hint">
                💡 Masukkan nominal untuk simulasi estimasi unit bibit & sisa saldo.
              </div>
            `;
            return;
          }

          const newBal = wallet.balance - amount;
          const isInsufficient = newBal < 0;
          const warningHtml = isInsufficient 
            ? `<div class="impact-warning">⚠️ Saldo <b>${wallet.name}</b> tidak mencukupi! (Kurang ${formatRupiah(Math.abs(newBal))})</div>` 
            : '';

          const upInput = modalCard.querySelector('input[placeholder="0.0000"]');
          const unitsVal = upInput ? parseFloat(upInput.value) : 0;
          const unitsText = unitsVal > 0 ? unitsVal.toFixed(2) : 'Bertambah';

          impactCard.innerHTML = `
            <div class="impact-header">
              <span class="impact-type-badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); display: inline-flex; align-items: center; gap: 4px;">
                <i class="ph-bold ph-trend-up"></i> BELI BIBIT
              </span>
              <span class="impact-realtime-tag">● SIMULASI REALTIME</span>
            </div>
            <div class="impact-rows-wrap">
              <div class="impact-row">
                <div class="impact-col-left">
                  <span class="impact-role" style="display: inline-flex; align-items: center; gap: 4px;"><i class="ph-bold ph-wallet" style="color: #38bdf8;"></i> Rekening:</span>
                  <span class="impact-w-name">${wallet.name}</span>
                </div>
                <div class="impact-col-right">
                  <span class="impact-before">${formatRupiah(wallet.balance)}</span>
                  <span class="impact-arrow">➔</span>
                  <span class="impact-after ${isInsufficient ? 'text-danger' : 'text-minus'}">${formatRupiah(newBal)}</span>
                </div>
              </div>
              <div class="impact-row" style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25);">
                <div class="impact-col-left">
                  <span class="impact-role" style="color: #34d399; display: inline-flex; align-items: center; gap: 4px;"><i class="ph-bold ph-trend-up"></i> Tambahan Investasi:</span>
                  <span class="impact-w-name" style="color: #a7f3d0;">Bibit</span>
                </div>
                <div class="impact-col-right">
                  <span class="impact-after text-plus">+${unitsText} UP</span>
                </div>
              </div>
              ${warningHtml}
            </div>
          `;
          return;
        }
      }

      let isUpdatingSimulation = false;
      function updateRealtimeSimulationSafe() {
        if (isUpdatingSimulation) return;
        isUpdatingSimulation = true;
        try {
          updateRealtimeSimulation();
        } catch (e) {
          console.error('Simulation error:', e);
        } finally {
          setTimeout(() => { isUpdatingSimulation = false; }, 20);
        }
      }

