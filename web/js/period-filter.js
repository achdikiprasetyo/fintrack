// ========================================================
// 7. MUTASI PERIOD FILTER
// ========================================================
(function() {
  let fpInstance = null;
  let selectedFilterMode = 'all';
  let customStartDate = '';
  let customEndDate = '';

  function formatDateShortId(d) {
    if (!d) return '-';
    const mn = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return `${d.getDate()} ${mn[d.getMonth()]} ${d.getFullYear()}`;
  }

  function initPeriodModal() {
    const modal = document.getElementById('fintrack-period-modal');
    if (!modal) return;
    const backdrop = document.getElementById('period-modal-backdrop');
    const closeBtn = document.getElementById('period-modal-close-btn');
    const resetBtn = document.getElementById('period-btn-reset');
    const applyBtn = document.getElementById('period-btn-apply');
    const customToggleBtn = document.getElementById('period-custom-toggle-btn');
    const customCaret = document.getElementById('custom-toggle-caret');
    const calendarSection = document.getElementById('period-calendar-section');
    const chips = modal.querySelectorAll('.period-preset-chip:not(.period-custom-toggle-btn)');
    const startVal = document.getElementById('range-start-val');
    const endVal = document.getElementById('range-end-val');

    function setupFlatpickr() {
      if (window.flatpickr && !fpInstance) {
        try {
          fpInstance = flatpickr("#flatpickr-inline-calendar", {
            inline: true,
            mode: "range",
            dateFormat: "Y-m-d",
            showMonths: 1,
            onDayCreate: function(dObj, dStr, fp, dayElem) {
              const d = dayElem.dateObj;
              const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              if (window.__transactionDates && window.__transactionDates.has(ymd)) {
                dayElem.classList.add('has-tx-data');
                const dot = document.createElement('span');
                dot.className = 'calendar-day-dot';
                dayElem.appendChild(dot);
              } else {
                dayElem.classList.add('no-tx-data');
              }
            },
            onChange: function(selectedDates, dateStr, instance) {
              if (selectedDates.length > 0) {
                selectedFilterMode = 'custom';
                chips.forEach(c => c.classList.remove('active'));
                customToggleBtn.classList.add('active');

                const d1 = selectedDates[0];
                customStartDate = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, '0')}-${String(d1.getDate()).padStart(2, '0')}`;
                startVal.textContent = formatDateShortId(d1);

                if (selectedDates.length > 1) {
                  const d2 = selectedDates[1];
                  customEndDate = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}-${String(d2.getDate()).padStart(2, '0')}`;
                  endVal.textContent = formatDateShortId(d2);
                } else {
                  customEndDate = customStartDate;
                  endVal.textContent = formatDateShortId(d1);
                }
              }
            }
          });
        } catch(e) {
          console.warn('Flatpickr init error:', e);
        }
      }
    }

    function toggleCustomCalendar(expand) {
      const isExpanded = expand !== undefined ? expand : !calendarSection.classList.contains('show');
      if (isExpanded) {
        calendarSection.classList.add('show');
        customToggleBtn.classList.add('expanded');
        if (customCaret) {
          customCaret.className = 'ph-bold ph-caret-up';
        }
        setupFlatpickr();
        if (fpInstance) fpInstance.redraw();
      } else {
        calendarSection.classList.remove('show');
        customToggleBtn.classList.remove('expanded');
        if (customCaret) {
          customCaret.className = 'ph-bold ph-caret-down';
        }
      }
    }

    if (customToggleBtn) {
      customToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleCustomCalendar();
      });
    }

    let currentModalCaller = 'mutasi';

    window.__openPeriodFilterModal = function(caller = 'mutasi') {
      currentModalCaller = caller;
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';

      const cur = (caller === 'analytics')
        ? (window.__currentAnalyticsFilter || 'this_month')
        : (window.__currentMutasiFilter || 'all');

      if (cur.startsWith('custom:')) {
        selectedFilterMode = 'custom';
        chips.forEach(c => c.classList.remove('active'));
        customToggleBtn.classList.add('active');
        toggleCustomCalendar(true);

        const parts = cur.split(':');
        customStartDate = parts[1] || '';
        customEndDate = parts[2] || customStartDate;
        if (fpInstance && customStartDate) {
          fpInstance.setDate([customStartDate, customEndDate], false);
        }
        startVal.textContent = customStartDate || '-';
        endVal.textContent = customEndDate || '-';
      } else {
        selectedFilterMode = cur;
        chips.forEach(c => {
          c.classList.toggle('active', c.getAttribute('data-preset') === cur);
        });
        customToggleBtn.classList.remove('active');
        toggleCustomCalendar(false); // Collapsed by default for presets!
        startVal.textContent = '-';
        endVal.textContent = '-';
        if (fpInstance) fpInstance.clear();
      }
    };

    function closeModal() {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }

    if (backdrop) backdrop.addEventListener('click', closeModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    // Preset chips click
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        customToggleBtn.classList.remove('active');
        chip.classList.add('active');
        const preset = chip.getAttribute('data-preset');
        selectedFilterMode = preset;
        toggleCustomCalendar(false); // Auto-collapse calendar when preset is picked
        if (fpInstance) fpInstance.clear();
        startVal.textContent = '-';
        endVal.textContent = '-';
      });
    });

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        const defaultMode = currentModalCaller === 'analytics' ? 'this_month' : 'all';
        selectedFilterMode = defaultMode;
        chips.forEach(c => c.classList.toggle('active', c.getAttribute('data-preset') === defaultMode));
        customToggleBtn.classList.remove('active');
        toggleCustomCalendar(false);
        if (fpInstance) fpInstance.clear();
        startVal.textContent = '-';
        endVal.textContent = '-';
        if (currentModalCaller === 'analytics') {
          if (window.__setAnalyticsDateFilter) {
            window.__setAnalyticsDateFilter('this_month');
          }
        } else {
          if (window.__setMutasiDateFilter) {
            window.__setMutasiDateFilter('all');
          }
        }
        closeModal();
      });
    }

    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        let finalFilter = 'all';
        if (selectedFilterMode === 'custom') {
          if (customStartDate) {
            finalFilter = `custom:${customStartDate}:${customEndDate || customStartDate}`;
          } else {
            finalFilter = currentModalCaller === 'analytics' ? 'this_month' : 'all';
          }
        } else {
          finalFilter = selectedFilterMode;
        }

        if (currentModalCaller === 'analytics') {
          if (window.__setAnalyticsDateFilter) {
            window.__setAnalyticsDateFilter(finalFilter);
          }
        } else {
          if (window.__setMutasiDateFilter) {
            window.__setMutasiDateFilter(finalFilter);
          }
        }
        closeModal();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPeriodModal);
  } else {
    initPeriodModal();
  }
})();

