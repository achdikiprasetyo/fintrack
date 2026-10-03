      // ========================================================
      // 11. AI RECEIPT SCANNER & WEB SHARE TARGET ENGINE
      // ========================================================
      const receiptModal = document.getElementById('receipt-scan-modal');
      const receiptFileInput = document.getElementById('receipt-file-input');
      const receiptScanningState = document.getElementById('receipt-scanning-state');
      const receiptFormState = document.getElementById('receipt-form-state');
      const receiptPreviewImg = document.getElementById('receipt-preview-img');
      const receiptCompactImg = document.getElementById('receipt-compact-img');
      const receiptDetectedSummary = document.getElementById('receipt-detected-summary');
      const receiptMetaVal = document.getElementById('receipt-meta-val');
      const receiptSelectWallet = document.getElementById('receipt-select-wallet');
      const receiptInputAmount = document.getElementById('receipt-input-amount');
      const receiptInputMerchant = document.getElementById('receipt-input-merchant');
      const receiptSelectCategory = document.getElementById('receipt-select-category');
      const receiptInputDate = document.getElementById('receipt-input-date');
      const receiptInputNote = document.getElementById('receipt-input-note');
      const receiptConfirmForm = document.getElementById('receipt-confirm-form');
      const btnCloseReceiptModal = document.getElementById('btn-close-receipt-modal');
      const btnCancelReceipt = document.getElementById('btn-cancel-receipt');
      const btnSubmitReceipt = document.getElementById('btn-submit-receipt');

      // ========================================================
      // MODERN STACKABLE TOAST NOTIFICATION ENGINE (SONNER / RADIX STYLE)
      // - Corner-positioned with real-time countdown progress bar
      // - Stacks seamlessly, handles fast consecutive additions
      // - Interactive hover/touch pause, touch swipe & tactile haptic
      // ========================================================
      function getOrCreateToastContainer() {
        let container = document.getElementById('fintrack-toast-container');
        if (!container) {
          container = document.createElement('div');
          container.id = 'fintrack-toast-container';
          container.setAttribute('aria-live', 'polite');
          container.setAttribute('aria-atomic', 'false');
          document.body.appendChild(container);
        }
        return container;
      }

      function dismissToast(toastEl) {
        if (!toastEl || toastEl.classList.contains('is-exiting')) return;
        toastEl.classList.add('is-exiting');
        setTimeout(() => {
          try {
            if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
          } catch (_) {}
        }, 320);
      }

      function showToastMessage(msg, isSuccess = true, duration = 3800, customTitle = '') {
        const container = getOrCreateToastContainer();

        // 1. Normalize parameters & options
        let message = typeof msg === 'object' && msg !== null ? (msg.message || '') : String(msg || '');
        let type = 'success';
        if (typeof isSuccess === 'string') {
          type = isSuccess;
        } else if (isSuccess === false) {
          type = 'error';
        } else if (typeof msg === 'object' && msg !== null && msg.type) {
          type = msg.type;
        }

        let dur = duration;
        if (typeof msg === 'object' && msg !== null && typeof msg.duration === 'number') {
          dur = msg.duration;
        }
        if (!dur || dur < 1000) dur = 3800;

        let title = customTitle || (typeof msg === 'object' && msg !== null ? msg.title : '');
        if (!title) {
          if (type === 'success') {
            title = message.includes('🎉') ? 'Transaksi Berhasil' : 'Berhasil';
          } else if (type === 'error') {
            title = 'Pemberitahuan';
          } else if (type === 'warning') {
            title = 'Perhatian';
          } else {
            title = 'Informasi';
          }
        }

        // Clean redundant celebratory emoji from message if present in title
        if (title.includes('Berhasil') && message.startsWith('🎉 ')) {
          message = message.replace('🎉 ', '');
        }

        let iconClass = 'ph-check-circle';
        if (type === 'error') iconClass = 'ph-x-circle';
        else if (type === 'warning') iconClass = 'ph-warning-circle';
        else if (type === 'info') iconClass = 'ph-info';

        // 2. Play contextual audio sound effect
        try {
          if (type === 'error') {
            if (window.playErrorSound) window.playErrorSound();
          } else if (type === 'warning') {
            if (window.playWarningSound) window.playWarningSound();
          } else if (type === 'success') {
            const lowerMsg = (message + ' ' + title).toLowerCase();
            if (lowerMsg.includes('pemasukan') || lowerMsg.includes('uang masuk') || lowerMsg.includes('terima') || lowerMsg.includes('gaji')) {
              if (window.playCashSound) window.playCashSound();
            } else {
              if (window.playSuccessSound) window.playSuccessSound();
            }
          } else if (type === 'info') {
            const lowerMsg = (message + ' ' + title).toLowerCase();
            if (lowerMsg.includes('hapus') || lowerMsg.includes('dihapus')) {
              if (window.playDeleteSound) window.playDeleteSound();
            } else {
              if (window.playTapSound) window.playTapSound();
            }
          }
        } catch (_) {}

        // 3. Limit stack size to max 4 to avoid screen clutter
        const activeToasts = container.querySelectorAll('.ft-toast:not(.is-exiting)');
        if (activeToasts.length >= 4) {
          dismissToast(activeToasts[0]);
        }

        // 3. Construct modern toast element
        const toast = document.createElement('div');
        toast.className = `ft-toast ft-toast-${type}`;
        toast.setAttribute('role', 'status');
        toast.innerHTML = `
          <div class="ft-toast-icon-wrap">
            <i class="ph ${iconClass}"></i>
          </div>
          <div class="ft-toast-body">
            <div class="ft-toast-title">${title}</div>
            <div class="ft-toast-message">${message}</div>
          </div>
          <button class="ft-toast-close" type="button" aria-label="Tutup notifikasi">
            <i class="ph ph-x"></i>
          </button>
          <div class="ft-toast-progress-track">
            <div class="ft-toast-progress-bar" style="animation-duration: ${dur}ms;"></div>
          </div>
        `;

        container.appendChild(toast);



        // 5. Dynamic timer with pause/resume on hover & touch
        let remainingTime = dur;
        let startTime = Date.now();
        let dismissTimer = null;
        let isPaused = false;

        function startTimer(timeMs) {
          if (dismissTimer) clearTimeout(dismissTimer);
          startTime = Date.now();
          dismissTimer = setTimeout(() => {
            dismissToast(toast);
          }, timeMs);
        }

        function pauseTimer() {
          if (isPaused) return;
          isPaused = true;
          clearTimeout(dismissTimer);
          const elapsed = Date.now() - startTime;
          remainingTime = Math.max(0, remainingTime - elapsed);
          toast.classList.add('is-paused');
        }

        function resumeTimer() {
          if (!isPaused) return;
          isPaused = false;
          toast.classList.remove('is-paused');
          startTimer(remainingTime || 1000);
        }

        toast.addEventListener('mouseenter', pauseTimer);
        toast.addEventListener('mouseleave', resumeTimer);

        // 6. Mobile swipe to dismiss
        let touchStartX = 0;
        let touchCurrentX = 0;
        toast.addEventListener('touchstart', (e) => {
          if (e.touches && e.touches[0]) {
            touchStartX = e.touches[0].clientX;
            touchCurrentX = touchStartX;
          }
          pauseTimer();
        }, { passive: true });

        toast.addEventListener('touchmove', (e) => {
          if (touchStartX > 0 && e.touches && e.touches[0]) {
            touchCurrentX = e.touches[0].clientX;
            const diff = touchCurrentX - touchStartX;
            if (diff > 0) {
              toast.style.transform = `translateX(${diff}px) scale(0.98)`;
              toast.style.opacity = `${Math.max(0.2, 1 - diff / 220)}`;
            }
          }
        }, { passive: true });

        toast.addEventListener('touchend', () => {
          const diff = touchCurrentX - touchStartX;
          if (diff > 75) {
            dismissToast(toast);
          } else {
            toast.style.transform = '';
            toast.style.opacity = '';
            resumeTimer();
          }
          touchStartX = 0;
          touchCurrentX = 0;
        }, { passive: true });

        // 7. Manual Close button
        const closeBtn = toast.querySelector('.ft-toast-close');
        if (closeBtn) {
          closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dismissToast(toast);
          });
        }

        // 8. Start countdown
        startTimer(dur);

        return toast;
      }
      window.showToastMessage = showToastMessage;

      function openSharedDBClient() {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open('fintrack_shared_store', 1);
          request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('shared_items')) {
              db.createObjectStore('shared_items', { keyPath: 'id' });
            }
          };
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }

      async function getAndClearPendingSharedReceipt() {
        try {
          const db = await openSharedDBClient();
          return new Promise((resolve) => {
            const tx = db.transaction('shared_items', 'readwrite');
            const store = tx.objectStore('shared_items');
            const getReq = store.get('pending_receipt');
            getReq.onsuccess = () => {
              const item = getReq.result;
              if (item) {
                store.delete('pending_receipt');
                resolve(item);
              } else {
                resolve(null);
              }
            };
            getReq.onerror = () => resolve(null);
          });
        } catch (e) {
          console.warn('Failed reading shared IndexedDB:', e);
          return null;
        }
      }

