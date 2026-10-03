// ========================================================
// 🔊 FINTRACK MASTER AUDIO & CUSTOM IN-APP MODAL ENGINE
// - Web Audio API Pure Synthesizer (Zero-Latency & Offline)
// - Custom In-App Confirmation Modal (Anti Browser Dialog)
// - Multi-Asset Sound Effects (Uang Masuk, Transaksi, Scan, Hapus)
// ========================================================
(function() {
  'use strict';

  // ------------------------------------------------------
  // 1. WEB AUDIO API SYNTHESIZER
  // ------------------------------------------------------
  let audioCtx = null;
  let isSoundMuted = false;

  try {
    isSoundMuted = localStorage.getItem('fintrack_sound_enabled') === 'false';
  } catch (_) {}

  function getAudioContext() {
    if (isSoundMuted) return null;
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
      return audioCtx;
    } catch (_) {
      return null;
    }
  }

  // Pre-unlock AudioContext on first user interaction (Mobile Chrome / Safari compliance)
  ['click', 'touchstart', 'pointerdown', 'keydown'].forEach((evt) => {
    window.addEventListener(evt, () => {
      getAudioContext();
    }, { once: true, passive: true });
  });

  // 💰 1. UANG MASUK (Cash Register & Golden Coins Shimmer)
  function playCashSound() {
    if (isSoundMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Arpeggiated upbeat chord: D5 (587Hz), G5 (784Hz), B5 (988Hz), D6 (1175Hz)
      const notes = [
        { freq: 587.33, start: 0.00, dur: 0.16, vol: 0.22, type: 'triangle' },
        { freq: 783.99, start: 0.07, dur: 0.18, vol: 0.26, type: 'triangle' },
        { freq: 987.77, start: 0.14, dur: 0.22, vol: 0.30, type: 'sine' },
        { freq: 1174.66, start: 0.20, dur: 0.38, vol: 0.35, type: 'sine' }
      ];

      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = n.type;
        osc.frequency.setValueAtTime(n.freq, now + n.start);
        osc.frequency.exponentialRampToValueAtTime(n.freq * 1.015, now + n.start + n.dur);

        gain.gain.setValueAtTime(0.0001, now + n.start);
        gain.gain.linearRampToValueAtTime(n.vol, now + n.start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + n.start);
        osc.stop(now + n.start + n.dur);
      });
    } catch (e) {
      console.warn('Audio playCashSound error:', e);
    }
  }

  // ✨ 2. TRANSAKSI BERHASIL / HITUNG BERHASIL (Apple Pay Style Dual Chime)
  function playSuccessSound() {
    if (isSoundMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Bell 1: Eb5 (622Hz) -> Bell 2: Bb5 (932Hz)
      const chimes = [
        { freq: 622.25, start: 0.00, dur: 0.25, vol: 0.25 },
        { freq: 932.33, start: 0.09, dur: 0.45, vol: 0.35 }
      ];

      chimes.forEach((c) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(c.freq, now + c.start);

        gain.gain.setValueAtTime(0.0001, now + c.start);
        gain.gain.linearRampToValueAtTime(c.vol, now + c.start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + c.start + c.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + c.start);
        osc.stop(now + c.start + c.dur);
      });
    } catch (e) {
      console.warn('Audio playSuccessSound error:', e);
    }
  }

  // 📡 3. SCAN QRIS / STRUK MEMINDAI (Digital Laser Radar Sweep)
  function playScanSound() {
    if (isSoundMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(2600, now + 0.24);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.20, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } catch (_) {}
  }

  // 🎯 4. SCAN QRIS BERHASIL TERDETEKSI (Recognition Bell)
  function playDetectionSound() {
    if (isSoundMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const tones = [
        { freq: 1046.50, start: 0.00, dur: 0.16, vol: 0.25 }, // C6
        { freq: 1318.51, start: 0.07, dur: 0.32, vol: 0.32 }  // E6
      ];

      tones.forEach((t) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(t.freq, now + t.start);

        gain.gain.setValueAtTime(0.0001, now + t.start);
        gain.gain.linearRampToValueAtTime(t.vol, now + t.start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + t.start + t.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + t.start);
        osc.stop(now + t.start + t.dur);
      });
    } catch (_) {}
  }

  // 🗑️ 5. HAPUS DATA MUTASI / TRANSAKSI (Descending Swoosh Pop)
  function playDeleteSound() {
    if (isSoundMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(85, now + 0.22);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.23);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.23);
    } catch (_) {}
  }

  // ⚠️ 6. ERROR / GAGAL (Soft Double Low Boop)
  function playErrorSound() {
    if (isSoundMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      [
        { freq: 280, start: 0.00, dur: 0.12 },
        { freq: 210, start: 0.10, dur: 0.18 }
      ].forEach((t) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(t.freq, now + t.start);

        gain.gain.setValueAtTime(0.0001, now + t.start);
        gain.gain.linearRampToValueAtTime(0.24, now + t.start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + t.start + t.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + t.start);
        osc.stop(now + t.start + t.dur);
      });
    } catch (_) {}
  }

  // 🔔 7. WARNING / PERINGATAN (Amber Tone)
  function playWarningSound() {
    if (isSoundMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(466.16, now); // Bb4
      osc.frequency.exponentialRampToValueAtTime(415.30, now + 0.20); // Ab4

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.22, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch (_) {}
  }

  // 👆 8. TACTILE TAP / CLICK FEEDBACK ("Ketika Mau Ngapa-Ngapain")
  function playTapSound() {
    if (isSoundMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.025);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.07, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.025);
    } catch (_) {}
  }

  // 🪙 9. ANIMASI HITUNG UANG (Rapid Mechanical Money Counter Flutter & Final Ding)
  function playMoneyCounterStream(durationMs = 650) {
    if (isSoundMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const count = 15; // 15 rapid flutter ticks
      const interval = (durationMs / 1000) / count;

      for (let i = 0; i < count; i++) {
        const tickTime = now + (i * interval);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Pitch rises smoothly from 720Hz up to 1600Hz as the counter ticks up!
        const freq = 720 + (i * 60);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, tickTime);

        gain.gain.setValueAtTime(0.0001, tickTime);
        gain.gain.linearRampToValueAtTime(0.14, tickTime + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, tickTime + 0.024);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(tickTime);
        osc.stop(tickTime + 0.024);
      }

      // Finale bell / triumphant ding when counting reaches the final number!
      setTimeout(() => {
        playDetectionSound();
      }, durationMs);
    } catch (e) {
      console.warn('Money counter sound failed:', e);
    }
  }

  // 🪟 10. MODAL POPUP OPEN & CLOSE
  function playModalOpenSound() {
    if (isSoundMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(560, now + 0.12);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch (_) {}
  }

  function playModalCloseSound() {
    if (isSoundMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.10);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.10);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.10);
    } catch (_) {}
  }

  // Expose sound methods globally
  window.playCashSound = playCashSound;
  window.playSuccessSound = playSuccessSound;
  window.playSuccessChime = playSuccessSound;
  window.playScanSound = playScanSound;
  window.playDetectionSound = playDetectionSound;
  window.playDetectionChime = playDetectionSound;
  window.playDeleteSound = playDeleteSound;
  window.playErrorSound = playErrorSound;
  window.playWarningSound = playWarningSound;
  window.playTapSound = playTapSound;
  window.playTactileTick = playTapSound;
  window.playMoneyCounterStream = playMoneyCounterStream;
  window.playCashCounterTick = playMoneyCounterStream;
  window.playModalOpenSound = playModalOpenSound;
  window.playModalCloseSound = playModalCloseSound;

  // ------------------------------------------------------
  // 2. CUSTOM IN-APP CONFIRMATION MODAL (ANTI BROWSER CHROME)
  // ------------------------------------------------------
  function ensureConfirmModalDom() {
    let modal = document.getElementById('fintrack-confirm-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'fintrack-confirm-modal';
      modal.className = 'ft-confirm-backdrop';
      modal.style.display = 'none';
      modal.innerHTML = `
        <div class="ft-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="ft-confirm-title">
          <div class="ft-confirm-icon-wrap" id="ft-confirm-icon-wrap">
            <i class="ph-bold ph-trash" id="ft-confirm-icon"></i>
          </div>
          <h3 class="ft-confirm-title" id="ft-confirm-title">Konfirmasi</h3>
          <p class="ft-confirm-message" id="ft-confirm-message">Apakah Anda yakin ingin melanjutkan tindakan ini?</p>
          <div class="ft-confirm-actions">
            <button type="button" class="ft-confirm-btn ft-confirm-cancel" id="ft-confirm-btn-cancel">Batal</button>
            <button type="button" class="ft-confirm-btn ft-confirm-ok" id="ft-confirm-btn-ok">
              <i class="ph-bold ph-check" id="ft-confirm-btn-icon"></i>
              <span id="ft-confirm-ok-text">Lanjutkan</span>
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }
    return modal;
  }

  window.fintrackConfirm = function({
    title = 'Konfirmasi',
    message = 'Apakah Anda yakin?',
    confirmText = 'Hapus',
    cancelText = 'Batal',
    type = 'danger',
    onConfirm,
    onCancel
  }) {
    const modal = ensureConfirmModalDom();
    const titleEl = document.getElementById('ft-confirm-title');
    const msgEl = document.getElementById('ft-confirm-message');
    const okTextEl = document.getElementById('ft-confirm-ok-text');
    const okBtn = document.getElementById('ft-confirm-btn-ok');
    const cancelBtn = document.getElementById('ft-confirm-btn-cancel');
    const iconWrap = document.getElementById('ft-confirm-icon-wrap');
    const icon = document.getElementById('ft-confirm-icon');
    const btnIcon = document.getElementById('ft-confirm-btn-icon');

    if (titleEl) titleEl.textContent = title;
    if (msgEl) msgEl.innerHTML = message;
    if (okTextEl) okTextEl.textContent = confirmText;
    if (cancelBtn) cancelBtn.textContent = cancelText;

    if (type === 'danger') {
      if (iconWrap) {
        iconWrap.className = 'ft-confirm-icon-wrap is-danger';
      }
      if (icon) icon.className = 'ph-bold ph-trash';
      if (btnIcon) btnIcon.className = 'ph-bold ph-trash';
      if (okBtn) {
        okBtn.className = 'ft-confirm-btn ft-confirm-ok is-danger';
      }
    } else {
      if (iconWrap) {
        iconWrap.className = 'ft-confirm-icon-wrap is-info';
      }
      if (icon) icon.className = 'ph-bold ph-question';
      if (btnIcon) btnIcon.className = 'ph-bold ph-check';
      if (okBtn) {
        okBtn.className = 'ft-confirm-btn ft-confirm-ok is-info';
      }
    }

    // Play warning sound when modal pops up
    playWarningSound();

    modal.style.display = 'flex';
    // Force DOM reflow for CSS transition
    void modal.offsetWidth;
    modal.classList.add('is-open');

    function closeDialog() {
      modal.classList.remove('is-open');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 240);
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      modal.onclick = null;
      document.removeEventListener('keydown', handleKey);
    }

    function handleKey(e) {
      if (e.key === 'Escape') {
        closeDialog();
        if (onCancel) onCancel();
      }
    }

    okBtn.onclick = () => {
      closeDialog();
      if (onConfirm) onConfirm();
    };

    cancelBtn.onclick = () => {
      closeDialog();
      if (onCancel) onCancel();
    };

    modal.onclick = (e) => {
      if (e.target === modal) {
        closeDialog();
        if (onCancel) onCancel();
      }
    };

    document.addEventListener('keydown', handleKey);
  };

  // Replace native window.alert globally so no ugly browser popup appears
  window.alert = function(msg) {
    if (window.showToastMessage) {
      window.showToastMessage(msg, 'warning', 4200, 'Perhatian');
    } else {
      console.warn('Alert intercepted:', msg);
    }
  };

  // ------------------------------------------------------
  // 3. ATTACH TACTILE SOUND TO ALL CLICKABLE & INTERACTIVE ELEMENTS
  // (Uses Capture Phase so React stopPropagation cannot block it!)
  // ------------------------------------------------------
  let lastTapTime = 0;

  function handleUniversalTap(e) {
    const now = Date.now();
    if (now - lastTapTime < 45) return; // Debounce double triggers

    const target = e.target;
    if (!target) return;

    // Check if the element or any ancestor is interactive/clickable
    const interactive = target.closest(
      'button, a, [role="button"], input, select, textarea, label, ' +
      '.btn, .btn-primary, .btn-secondary, .btn-icon, .q-chip, .tab-btn, .form-tab-btn, ' +
      '.mobile-nav-btn, .mobile-nav-action-btn, .speed-dial-btn, .speed-dial-action, .fab-btn, ' +
      '.wallet-card, .wallet-item, .tx-item, .transaction-row, .chip, .period-pill, ' +
      '.statement-period-pill, .statement-btn, .statement-db-btn, .btn-receipt-close, ' +
      '.ft-toast-close, .modal-backdrop, .section-action, [data-clickable], [onclick]'
    );

    if (interactive) {
      if (interactive.id === 'ft-confirm-btn-ok') return; // Handled by delete/confirm sound
      lastTapTime = now;
      playTapSound();
    }
  }

  window.addEventListener('pointerdown', handleUniversalTap, true); // Capture phase!
  window.addEventListener('click', handleUniversalTap, true); // Fallback capture!

  console.log('✅ FinTrack Audio Engine & Custom In-App Modal initialized!');
})();
