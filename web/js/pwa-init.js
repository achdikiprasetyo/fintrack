// ========================================================
// 1. CORE APPLICATION ENGINE (STATE, SUPABASE, MODALS, TRANSACTIONS)
// ========================================================
// 1. Service Worker Registration
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/finance/sw.js', { scope: '/finance/' })
            .then(reg => {
              console.log('FinTrack SW Active:', reg.scope);
              reg.update();
            })
            .catch(err => console.error('SW Error:', err));
        });
      }

      // 2. Standalone Mode Detection
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in window.navigator && window.navigator.standalone);
      const isIos = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());

      let deferredPrompt = null;
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (!isStandalone && !sessionStorage.getItem('fintrack_pwa_shown')) {
          setTimeout(() => showPwaModal(), 1200);
        }
      });

      function showPwaModal() {
        if (isStandalone) return;
        const modal = document.getElementById('pwa-modal');
        const iosSteps = document.getElementById('pwa-ios-steps');
        const actionBtn = document.getElementById('pwa-action-btn');

        if (isIos) {
          iosSteps.style.display = 'block';
          actionBtn.style.display = 'none';
        } else {
          iosSteps.style.display = 'none';
          actionBtn.style.display = 'block';
        }

        modal.style.display = 'flex';
        sessionStorage.setItem('fintrack_pwa_shown', 'true');
      }

      document.getElementById('pwa-action-btn')?.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          console.log('PWA Choice:', outcome);
          deferredPrompt = null;
          document.getElementById('pwa-modal').style.display = 'none';
        } else {
          showToastMessage('Buka menu browser (titik 3 di kanan atas) lalu pilih "Tambahkan ke Layar Utama".', 'info', 5000, 'Pasang Aplikasi');
          document.getElementById('pwa-modal').style.display = 'none';
        }
      });

      document.getElementById('pwa-close-btn')?.addEventListener('click', () => {
        document.getElementById('pwa-modal').style.display = 'none';
      });

      // Show install helper on iOS after a brief delay
      if (isIos && !isStandalone && !sessionStorage.getItem('fintrack_pwa_shown')) {
        setTimeout(() => showPwaModal(), 2000);
      }

