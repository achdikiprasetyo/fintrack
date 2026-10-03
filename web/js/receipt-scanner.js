      // ========================================================
      // 10.5 AUDIO SYNTHESIZER & HAPTIC DOPAMINE ENGINE
      // ========================================================
      let audioCtx = null;
      function getAudioContext() {
        try {
          if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
              audioCtx = new AudioContextClass();
            }
          }
          if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
          }
        } catch (e) {
          console.warn('AudioContext init failed:', e);
        }
        return audioCtx;
      }

      // Silent audio & haptic stubs (vibrations and synthesizer sounds disabled as requested)
      function playDetectionChime() {}
      function playSuccessChime() {}

      // Rolling count-up number animation for detected nominal
      function animateCountUp(targetAmount, element) {
        if (!element || targetAmount <= 0) return;
        const duration = 650; // ms
        const startTime = performance.now();

        // Trigger neon glow pulse
        element.classList.remove('nominal-glow-active');
        void element.offsetWidth; // reflow
        element.classList.add('nominal-glow-active');

        function step(now) {
          const progress = Math.min((now - startTime) / duration, 1);
          // Ease out cubic: 1 - (1 - progress)^3
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const currentVal = Math.round(targetAmount * easeOut);
          element.value = currentVal.toLocaleString('id-ID');

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            element.value = targetAmount.toLocaleString('id-ID');
          }
        }
        requestAnimationFrame(step);
      }

      // Dynamic HUD scanning ticker
      let hudInterval = null;
      const HUD_STEPS = [
        { text: 'Memindai Citra Digital...', desc: 'Mendeteksi kontur struk, QRIS & logo institusi' },
        { text: 'Membaca Teks OCR...', desc: 'Mengekstrak teks angka, tanggal, dan nama merchant' },
        { text: 'Gemini Vision AI Engine...', desc: 'Deep multi-modal reasoning & klasifikasi transaksi' },
        { text: 'Verifikasi Akun Dompet...', desc: 'Mencocokkan sumber pembayaran dan kategori pos' }
      ];

      function startHudScanningSteps() {
        stopHudScanningSteps();
        let stepIdx = 0;
        const badgeText = document.getElementById('hud-step-text');
        const stepTitle = document.getElementById('scanning-step-title');
        const stepDesc = document.getElementById('scanning-step-desc');

        if (badgeText) badgeText.textContent = HUD_STEPS[0].text;
        if (stepTitle) stepTitle.textContent = HUD_STEPS[0].text;
        if (stepDesc) stepDesc.textContent = HUD_STEPS[0].desc;

        hudInterval = setInterval(() => {
          stepIdx = (stepIdx + 1) % HUD_STEPS.length;
          const current = HUD_STEPS[stepIdx];
          if (badgeText) badgeText.textContent = current.text;
          if (stepTitle) stepTitle.textContent = current.text;
          if (stepDesc) stepDesc.textContent = current.desc;
        }, 1200);
      }

      function stopHudScanningSteps() {
        if (hudInterval) {
          clearInterval(hudInterval);
          hudInterval = null;
        }
      }

      // Fullscreen Dopamine Confetti Particle Engine
      let confettiAnimId = null;
      function fireDopamineConfetti() {
        const canvas = document.getElementById('dopamine-confetti-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        canvas.style.display = 'block';

        if (confettiAnimId) {
          cancelAnimationFrame(confettiAnimId);
          confettiAnimId = null;
        }

        const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#fb7185', '#eab308'];
        const particles = [];
        const count = 140;

        for (let i = 0; i < count; i++) {
          const type = Math.random() < 0.25 ? 'coin' : (Math.random() < 0.4 ? 'bill' : 'ribbon');
          particles.push({
            type,
            x: canvas.width * (0.35 + Math.random() * 0.3),
            y: canvas.height * 0.65,
            vx: (Math.random() - 0.5) * 18,
            vy: -(Math.random() * 16 + 8),
            gravity: 0.42,
            drag: 0.965,
            size: type === 'coin' ? 14 : (type === 'bill' ? 18 : Math.random() * 8 + 6),
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 12,
            opacity: 1
          });
        }

        const startTime = performance.now();
        const duration = 2800; // ms

        function renderConfetti(now) {
          const elapsed = now - startTime;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          particles.forEach((p) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= p.drag;
            p.rotation += p.rotSpeed;

            if (elapsed > 1800) {
              p.opacity = Math.max(0, 1 - (elapsed - 1800) / 1000);
            }

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.globalAlpha = p.opacity;

            if (p.type === 'coin') {
              // Golden coin
              ctx.beginPath();
              ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
              ctx.fillStyle = '#f59e0b';
              ctx.fill();
              ctx.lineWidth = 1.5;
              ctx.strokeStyle = '#fef08a';
              ctx.stroke();
              // Inner coin mark
              ctx.fillStyle = '#b45309';
              ctx.font = 'bold 9px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('$', 0, 0);
            } else if (p.type === 'bill') {
              // Green cash note
              ctx.fillStyle = '#059669';
              ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
              ctx.lineWidth = 1;
              ctx.strokeStyle = '#a7f3d0';
              ctx.strokeRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            } else {
              // Ribbon confetti
              ctx.fillStyle = p.color;
              ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
            }
            ctx.restore();
          });

          if (elapsed < duration) {
            confettiAnimId = requestAnimationFrame(renderConfetti);
          } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.style.display = 'none';
            confettiAnimId = null;
          }
        }

        confettiAnimId = requestAnimationFrame(renderConfetti);
      }

      let currentScanAbortController = null;
      let successAutoCloseTimer = null;

      function openReceiptModalScanning(previewSrc) {
        if (!receiptModal) return;
        getAudioContext(); // Pre-warm Web Audio API on user gesture
        if (successAutoCloseTimer) {
          clearTimeout(successAutoCloseTimer);
          successAutoCloseTimer = null;
        }
        const receiptSuccessState = document.getElementById('receipt-success-state');
        if (receiptSuccessState) receiptSuccessState.style.setProperty('display', 'none', 'important');
        receiptScanningState.style.setProperty('display', 'flex', 'important');
        receiptFormState.style.setProperty('display', 'none', 'important');
        receiptPreviewImg.src = previewSrc || '/finance/icons/icon-512.png';
        receiptModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        startHudScanningSteps();
      }

      function closeReceiptModal() {
        if (currentScanAbortController) {
          try { currentScanAbortController.abort(); } catch (_) {}
          currentScanAbortController = null;
        }
        if (successAutoCloseTimer) {
          clearTimeout(successAutoCloseTimer);
          successAutoCloseTimer = null;
        }
        stopHudScanningSteps();
        if (!receiptModal) return;
        receiptModal.classList.remove('active');
        receiptScanningState.style.setProperty('display', 'none', 'important');
        receiptFormState.style.setProperty('display', 'none', 'important');
        const receiptSuccessState = document.getElementById('receipt-success-state');
        if (receiptSuccessState) receiptSuccessState.style.setProperty('display', 'none', 'important');
        receiptPreviewImg.src = '';
        receiptCompactImg.src = '';
        document.body.style.overflow = '';
      }

      if (btnCloseReceiptModal) {
        btnCloseReceiptModal.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          closeReceiptModal();
        };
      }
      if (btnCancelReceipt) {
        btnCancelReceipt.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          closeReceiptModal();
        };
      }
      if (receiptModal) {
        receiptModal.onclick = (e) => {
          if (e.target === receiptModal) closeReceiptModal();
        };
      }

      // Format input rupiah as user types
      if (receiptInputAmount) {
        receiptInputAmount.addEventListener('input', (e) => {
          const raw = e.target.value.replace(/[^0-9]/g, '');
          if (!raw) {
            e.target.value = '';
            return;
          }
          const num = parseInt(raw, 10);
          e.target.value = num.toLocaleString('id-ID');
        });
      }

      // Client-side high efficiency image compressor (shrinks 5-12MB camera photos down to ~150KB in ~30ms)
      async function compressReceiptImage(fileOrBlob, maxDimension = 1280, quality = 0.82) {
        return new Promise((resolve) => {
          try {
            let url;
            let shouldRevoke = false;
            if (fileOrBlob instanceof Blob) {
              url = URL.createObjectURL(fileOrBlob);
              shouldRevoke = true;
            } else if (typeof fileOrBlob === 'string' && fileOrBlob.startsWith('data:image')) {
              url = fileOrBlob;
            } else {
              return resolve(typeof fileOrBlob === 'string' ? fileOrBlob : '');
            }

            const img = new Image();
            img.onload = () => {
              if (shouldRevoke) URL.revokeObjectURL(url);
              let width = img.width;
              let height = img.height;

              // If already compact and reasonable size, keep as is
              if (width <= maxDimension && height <= maxDimension && typeof fileOrBlob === 'string' && fileOrBlob.length < 350000) {
                return resolve(fileOrBlob);
              }

              if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                  height = Math.round((height * maxDimension) / width);
                  width = maxDimension;
                } else {
                  width = Math.round((width * maxDimension) / height);
                  height = maxDimension;
                }
              }

              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
              } else {
                resolve(typeof fileOrBlob === 'string' ? fileOrBlob : '');
              }
            };

            img.onerror = () => {
              if (shouldRevoke) URL.revokeObjectURL(url);
              resolve(typeof fileOrBlob === 'string' ? fileOrBlob : '');
            };

            img.src = url;
          } catch (_) {
            resolve(typeof fileOrBlob === 'string' ? fileOrBlob : '');
          }
        });
      }

      async function processReceiptScan(fileOrDataUri, textContext) {
        if (!fileOrDataUri && !textContext) {
          closeReceiptModal();
          return;
        }

        // 1. Instant visual preview without waiting for compression/network
        let initialPreview = '';
        if (fileOrDataUri instanceof Blob) {
          try {
            initialPreview = URL.createObjectURL(fileOrDataUri);
          } catch (_) {}
        } else if (typeof fileOrDataUri === 'string' && fileOrDataUri.startsWith('data:image')) {
          initialPreview = fileOrDataUri;
        }

        openReceiptModalScanning(initialPreview);

        if (currentScanAbortController) {
          try { currentScanAbortController.abort(); } catch (_) {}
        }
        currentScanAbortController = new AbortController();
        const timeoutId = setTimeout(() => {
          if (currentScanAbortController) {
            currentScanAbortController.abort();
          }
        }, 25000);

        try {
          // 2. High-speed client compression (drops upload payload by ~40x)
          let finalBase64 = '';
          if (fileOrDataUri) {
            finalBase64 = await compressReceiptImage(fileOrDataUri, 1280, 0.82);
            if (receiptPreviewImg && finalBase64) {
              receiptPreviewImg.src = finalBase64;
            }
          }

          // 3. Ultra-fast backend API call (Gemini 3.5 Flash Lite JSON mode)
          const res = await fetch('/api/scan-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: finalBase64 || (typeof fileOrDataUri === 'string' ? fileOrDataUri : ''),
              text: textContext || ''
            }),
            signal: currentScanAbortController.signal
          });
          clearTimeout(timeoutId);

          const json = await res.json();
          if (!json.success || !json.data) {
            throw new Error(json.error || 'AI tidak dapat mendeteksi informasi transaksi.');
          }

          const tx = json.data;
          const wallets = json.wallets || getFinTrackData().wallets || [];

          // Stop HUD ticker & Play crystal detection bell + haptic!
          stopHudScanningSteps();
          playDetectionChime();

          // Populate wallets dropdown
          receiptSelectWallet.innerHTML = '';
          wallets.forEach((w) => {
            const opt = document.createElement('option');
            opt.value = w.id;
            opt.textContent = `${w.name} (Saldo: ${formatRupiah(w.balance || 0)})`;
            if (tx.matchedWalletId === w.id) {
              opt.selected = true;
            }
            receiptSelectWallet.appendChild(opt);
          });

          // Fallback if none selected
          if (!receiptSelectWallet.value && wallets.length > 0) {
            receiptSelectWallet.value = wallets[0].id;
          }

          // Pre-fill form fields
          receiptInputMerchant.value = tx.merchant || '';
          receiptSelectCategory.value = tx.category || 'Makanan & Minuman';
          receiptInputNote.value = tx.note || (tx.merchant ? `QRIS ${tx.merchant}` : 'Pengeluaran QRIS');

          // Date pre-fill
          if (tx.date) {
            try {
              const dt = new Date(tx.date);
              if (!isNaN(dt.getTime())) {
                const tzOffset = dt.getTimezoneOffset() * 60000;
                const localISOTime = new Date(dt.getTime() - tzOffset).toISOString().slice(0, 16);
                receiptInputDate.value = localISOTime;
              } else {
                receiptInputDate.value = new Date().toISOString().slice(0, 16);
              }
            } catch (_) {
              receiptInputDate.value = new Date().toISOString().slice(0, 16);
            }
          } else {
            receiptInputDate.value = new Date().toISOString().slice(0, 16);
          }

          // Summary and compact preview
          receiptCompactImg.src = finalBase64 || initialPreview || '/finance/icons/icon-512.png';
          receiptDetectedSummary.textContent = `${tx.bank || 'Struk'} Terdeteksi · ${tx.merchant || 'Pembayaran QRIS'}`;
          receiptMetaVal.textContent = `${tx.bank || 'Bank'} • ${formatRupiah(tx.amount || 0)} • ${tx.merchant || 'Transaksi'}`;

          // Switch view to form
          receiptScanningState.style.setProperty('display', 'none', 'important');
          receiptFormState.style.setProperty('display', 'block', 'important');
          const rSuccess = document.getElementById('receipt-success-state');
          if (rSuccess) rSuccess.style.setProperty('display', 'none', 'important');

          // Animate amount count up with neon glow burst!
          animateCountUp(Math.round(tx.amount || 0), receiptInputAmount);

        } catch (err) {
          stopHudScanningSteps();
          if (err.name === 'AbortError') {
            console.log('Receipt scanning aborted by user or timeout.');
            closeReceiptModal();
            return;
          }
          console.error('Scan error:', err);
          closeReceiptModal();
          showToastMessage('Gagal menganalisis struk: ' + (err.message || 'Error AI'), false);
        }
      }

      // Handle form submission
      if (receiptConfirmForm) {
        receiptConfirmForm.onsubmit = async (e) => {
          e.preventDefault();
          const walletId = receiptSelectWallet.value;
          const cleanAmount = parseInt(receiptInputAmount.value.replace(/[^0-9]/g, ''), 10) || 0;
          const merchant = receiptInputMerchant.value.trim();
          const category = receiptSelectCategory.value;
          const note = receiptInputNote.value.trim() || `QRIS ${merchant}`;
          const dateVal = receiptInputDate.value;

          if (cleanAmount <= 0) {
            showToastMessage('Nominal transaksi harus lebih dari 0.', 'warning');
            return;
          }

          const originalBtnHtml = btnSubmitReceipt.innerHTML;
          btnSubmitReceipt.disabled = true;
          btnSubmitReceipt.innerHTML = '<i class="ph ph-spinner animate-spin"></i><span>Mencatat Transaksi...</span>';

          try {
            const payload = {
              walletId,
              amount: cleanAmount,
              type: 'expense',
              category,
              note,
              date: dateVal ? new Date(dateVal).toISOString() : new Date().toISOString()
            };

            const res = await fetch('/api/record-receipt-transaction', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (!result.success) {
              throw new Error(result.error || 'Gagal menyimpan transaksi');
            }

            // DOPAMINE EFFECTS TRIGGER!
            // 1. Play triumphant cash arpeggio & haptic burst
            playSuccessChime();

            // 2. Explode confetti with gold coins and cash notes
            fireDopamineConfetti();

            // 3. Populate and show success card
            const receiptSuccessState = document.getElementById('receipt-success-state');
            const receiptSuccessAmount = document.getElementById('receipt-success-amount');
            const receiptSuccessMerchant = document.getElementById('receipt-success-merchant');
            const receiptSuccessWallet = document.getElementById('receipt-success-wallet');
            const receiptSuccessBalance = document.getElementById('receipt-success-balance');
            const receiptSuccessCategory = document.getElementById('receipt-success-category');

            if (receiptSuccessAmount) receiptSuccessAmount.textContent = `- Rp ${formatRupiah(cleanAmount)}`;
            if (receiptSuccessMerchant) receiptSuccessMerchant.textContent = merchant || '-';
            if (receiptSuccessWallet) receiptSuccessWallet.textContent = result.wallet?.name || 'Dompet';
            if (receiptSuccessBalance) receiptSuccessBalance.textContent = formatRupiah(result.wallet?.balance || 0);
            if (receiptSuccessCategory) receiptSuccessCategory.textContent = category;

            receiptScanningState.style.setProperty('display', 'none', 'important');
            receiptFormState.style.setProperty('display', 'none', 'important');
            if (receiptSuccessState) receiptSuccessState.style.setProperty('display', 'flex', 'important');

            showToastMessage(`🎉 Pengeluaran Rp ${formatRupiah(cleanAmount)} dari ${result.wallet?.name || 'Dompet'} berhasil dicatat!`);

            // Trigger local update & storage event so UI refreshes real-time
            window.dispatchEvent(new Event('storage'));
            if (currentActiveTab === 'analytics') {
              setTimeout(() => renderAnalyticsDashboard(true), 500);
            }

            // Wire up finish button or auto-close after 3.2s
            const btnFinish = document.getElementById('btn-success-finish');
            if (successAutoCloseTimer) clearTimeout(successAutoCloseTimer);
            successAutoCloseTimer = setTimeout(() => {
              closeReceiptModal();
            }, 3200);

            if (btnFinish) {
              btnFinish.onclick = () => {
                if (successAutoCloseTimer) {
                  clearTimeout(successAutoCloseTimer);
                  successAutoCloseTimer = null;
                }
                closeReceiptModal();
              };
            }
          } catch (err) {
            console.error('Failed recording transaction:', err);
            showToastMessage('Gagal mencatat transaksi: ' + (err.message || err), 'error');
          } finally {
            btnSubmitReceipt.disabled = false;
            btnSubmitReceipt.innerHTML = originalBtnHtml;
          }
        };
      }

      // Handle file selection from local camera or gallery
      if (receiptFileInput) {
        receiptFileInput.onchange = (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          processReceiptScan(file, '');
          receiptFileInput.value = ''; // reset so same file can be reselected
        };
      }

      // Check for incoming shared receipt from Web Share Target
      async function checkForSharedReceipt() {
        // Clear ?shared_receipt from URL so refresh doesn't re-trigger
        if (window.location.search.includes('shared_receipt')) {
          const cleanUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, cleanUrl);
        }

        const sharedItem = await getAndClearPendingSharedReceipt();
        if (sharedItem) {
          if (sharedItem.file && sharedItem.file.buffer && sharedItem.file.buffer.byteLength > 10) {
            const blob = new Blob([sharedItem.file.buffer], { type: sharedItem.file.type || 'image/jpeg' });
            processReceiptScan(blob, sharedItem.text || '');
          } else if (sharedItem.text && sharedItem.text.trim()) {
            processReceiptScan('', sharedItem.text.trim());
          }
        }
      }

      // Check on startup and when user returns to app
      checkForSharedReceipt();
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          checkForSharedReceipt();
        }
      });

      window.addEventListener('resize', () => {
        if (currentActiveTab === 'analytics') {
          if (chartInstances.category && typeof chartInstances.category.resize === 'function') {
            chartInstances.category.resize();
          }
          if (chartInstances.networth && typeof chartInstances.networth.resize === 'function') {
            chartInstances.networth.resize();
          }
          if (chartInstances.timeline && typeof chartInstances.timeline.resize === 'function') {
            chartInstances.timeline.resize();
          }
        }
      });

