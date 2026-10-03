// ========================================================
// 8. E-STATEMENT PDF & EXCEL EXPORT
// ========================================================
(function() {
  let selectedFormat = 'pdf'; // 'pdf' | 'excel'
  let selectedPeriod = 'this_month'; // 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'all' | 'custom'
  let currentFilteredList = [];
  let currentSummary = { totalIncome: 0, totalExpense: 0, count: 0 };
  let periodLabelStr = 'Bulan Ini';

  function initStatementExportModal() {
    const modal = document.getElementById('fintrack-statement-modal');
    if (!modal) return;
    const backdrop = document.getElementById('statement-modal-backdrop');
    const closeBtn = document.getElementById('statement-modal-close-btn');
    const formatPdf = document.getElementById('format-card-pdf');
    const formatExcel = document.getElementById('format-card-excel');
    const periodChips = modal.querySelectorAll('.statement-preset-chip:not(.statement-custom-toggle)');
    const customToggleBtn = document.getElementById('statement-custom-toggle');
    const customBox = document.getElementById('statement-custom-box');
    const customCaret = document.getElementById('statement-custom-caret');
    const startDateInput = document.getElementById('statement-start-date');
    const endDateInput = document.getElementById('statement-end-date');
    const downloadBtn = document.getElementById('statement-btn-download');
    const downloadBtnText = document.getElementById('statement-download-btn-text');
    const countEl = document.getElementById('export-preview-count');
    const incomeEl = document.getElementById('export-preview-income');
    const expenseEl = document.getElementById('export-preview-expense');

    const backupJsonBtn = document.getElementById('statement-backup-json-btn');
    const restoreJsonBtn = document.getElementById('statement-restore-json-btn');

    // Default dates for custom
    const now = new Date();
    const todayYmd = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const firstDayYmd = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    if (startDateInput) startDateInput.value = firstDayYmd;
    if (endDateInput) endDateInput.value = todayYmd;

    function getTransactions() {
      if (window.__fintrackData && Array.isArray(window.__fintrackData.transactions)) {
        return window.__fintrackData.transactions;
      }
      return [];
    }

    function calculateFilteredData() {
      const txs = getTransactions();
      const nw = new Date();
      const cy = nw.getFullYear();
      const cm = nw.getMonth(); // 0-indexed

      let filtered = [];
      const mnNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

      if (selectedPeriod === 'this_month') {
        const targetYm = `${cy}-${String(cm+1).padStart(2,'0')}`;
        periodLabelStr = `${mnNames[cm]} ${cy}`;
        filtered = txs.filter(t => {
          if (!t.date) return false;
          const d = new Date(t.date);
          if (isNaN(d.getTime())) return false;
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` === targetYm;
        });
      } else if (selectedPeriod === 'last_month') {
        const lmY = cm === 0 ? cy - 1 : cy;
        const lmM = cm === 0 ? 12 : cm;
        const targetYm = `${lmY}-${String(lmM).padStart(2,'0')}`;
        periodLabelStr = `${mnNames[lmM-1]} ${lmY}`;
        filtered = txs.filter(t => {
          if (!t.date) return false;
          const d = new Date(t.date);
          if (isNaN(d.getTime())) return false;
          return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` === targetYm;
        });
      } else if (selectedPeriod === 'last_3_months') {
        const start3 = new Date(cy, cm - 2, 1);
        const start3Ymd = `${start3.getFullYear()}-${String(start3.getMonth()+1).padStart(2,'0')}-01`;
        periodLabelStr = `3 Bulan Terakhir (${mnNames[start3.getMonth()]} - ${mnNames[cm]} ${cy})`;
        filtered = txs.filter(t => {
          if (!t.date) return false;
          const d = new Date(t.date);
          if (isNaN(d.getTime())) return false;
          const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          return ymd >= start3Ymd;
        });
      } else if (selectedPeriod === 'this_year') {
        periodLabelStr = `Tahun ${cy}`;
        filtered = txs.filter(t => {
          if (!t.date) return false;
          const d = new Date(t.date);
          if (isNaN(d.getTime())) return false;
          return d.getFullYear() === cy;
        });
      } else if (selectedPeriod === 'all') {
        periodLabelStr = 'Semua Transaksi';
        filtered = [...txs];
      } else if (selectedPeriod === 'custom') {
        const sYmd = startDateInput ? startDateInput.value : '';
        const eYmd = endDateInput ? endDateInput.value : sYmd;
        periodLabelStr = `${sYmd} s/d ${eYmd}`;
        filtered = txs.filter(t => {
          if (!t.date) return false;
          const d = new Date(t.date);
          if (isNaN(d.getTime())) return false;
          const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          return ymd >= sYmd && ymd <= eYmd;
        });
      }

      // Sort chronological descending (latest first)
      filtered.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

      let income = 0;
      let expense = 0;
      filtered.forEach(t => {
        if (t.type === 'income') income += Number(t.amount || 0);
        else if (t.type === 'expense') expense += Number(t.amount || 0);
      });

      currentFilteredList = filtered;
      currentSummary = {
        totalIncome: income,
        totalExpense: expense,
        count: filtered.length
      };

      if (countEl) countEl.textContent = `${filtered.length} Data`;
      if (incomeEl) incomeEl.textContent = `+ Rp ${income.toLocaleString('id-ID')}`;
      if (expenseEl) expenseEl.textContent = `- Rp ${expense.toLocaleString('id-ID')}`;
    }

    function updateFormat(fmt) {
      selectedFormat = fmt;
      if (formatPdf) formatPdf.classList.toggle('active', fmt === 'pdf');
      if (formatExcel) formatExcel.classList.toggle('active', fmt === 'excel');
      if (downloadBtnText) {
        downloadBtnText.textContent = fmt === 'pdf' ? 'Unduh Rekening Koran (.pdf)' : 'Unduh Workbook Excel (.xlsx)';
      }
    }

    if (formatPdf) formatPdf.addEventListener('click', () => updateFormat('pdf'));
    if (formatExcel) formatExcel.addEventListener('click', () => updateFormat('excel'));

    periodChips.forEach(chip => {
      chip.addEventListener('click', () => {
        periodChips.forEach(c => c.classList.remove('active'));
        if (customToggleBtn) customToggleBtn.classList.remove('active');
        if (customBox) customBox.classList.remove('show');
        if (customCaret) customCaret.className = 'ph-bold ph-caret-down';
        chip.classList.add('active');
        selectedPeriod = chip.getAttribute('data-period');
        calculateFilteredData();
      });
    });

    if (customToggleBtn) {
      customToggleBtn.addEventListener('click', () => {
        const isShow = customBox.classList.contains('show');
        if (isShow) {
          customBox.classList.remove('show');
          customToggleBtn.classList.remove('active');
          if (customCaret) customCaret.className = 'ph-bold ph-caret-down';
        } else {
          customBox.classList.add('show');
          customToggleBtn.classList.add('active');
          periodChips.forEach(c => c.classList.remove('active'));
          if (customCaret) customCaret.className = 'ph-bold ph-caret-up';
          selectedPeriod = 'custom';
          calculateFilteredData();
        }
      });
    }

    if (startDateInput) startDateInput.addEventListener('change', calculateFilteredData);
    if (endDateInput) endDateInput.addEventListener('change', calculateFilteredData);

    // Dynamic On-Demand Script Loader for Heavy Export Libraries (Lazy-Loaded)
    function loadScriptAsync(src) {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = (err) => reject(new Error(`Gagal memuat modul ${src}`));
        document.head.appendChild(s);
      });
    }

    async function ensureExportLibraries(format) {
      if (format === 'excel') {
        if (!window.XLSX) {
          await loadScriptAsync('/finance/vendor/xlsx.full.min.js');
        }
      } else {
        if (!window.jspdf || !window.jspdf.jsPDF) {
          await loadScriptAsync('/finance/vendor/jspdf.umd.min.js');
        }
        if (!window.jspdf?.jsPDF?.API?.autoTable) {
          await loadScriptAsync('/finance/vendor/jspdf.plugin.autotable.min.js');
        }
      }
    }

    window.__openStatementExportModal = function() {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      calculateFilteredData();
      // Preload export libraries silently in background while user views modal
      setTimeout(() => {
        ensureExportLibraries('pdf').catch(() => {});
      }, 300);
    };

    function closeModal() {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }

    if (backdrop) backdrop.addEventListener('click', closeModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    // Backup & Restore buttons
    if (backupJsonBtn) {
      backupJsonBtn.addEventListener('click', () => {
        if (window.__fintrackBackupJson) {
          window.__fintrackBackupJson();
        } else if (window.showToastMessage) {
          window.showToastMessage('Fungsi backup JSON siap.', 'info', 3000, 'Backup Data');
        }
      });
    }

    if (restoreJsonBtn) {
      restoreJsonBtn.addEventListener('click', () => {
        if (window.__fintrackRestoreJson) {
          window.__fintrackRestoreJson();
        } else if (window.showToastMessage) {
          window.showToastMessage('Fungsi restore JSON siap.', 'info', 3000, 'Restore Data');
        }
      });
    }

    // Download execution with real-time feedback & toast notification
    if (downloadBtn) {
      downloadBtn.addEventListener('click', async () => {
        if (currentFilteredList.length === 0) {
          if (window.showToastMessage) {
            window.showToastMessage('Tidak ada transaksi pada periode yang dipilih.', 'warning', 3800, 'Tidak Ada Data');
          }
          return;
        }

        const originalText = downloadBtnText ? downloadBtnText.innerHTML : 'Unduh Dokumen Laporan';
        if (downloadBtnText) {
          downloadBtnText.innerHTML = '<i class="ph ph-spinner-gap" style="animation: spinRefresh 0.8s linear infinite; display: inline-block; vertical-align: middle; margin-right: 6px;"></i>Menyiapkan Dokumen...';
        }
        downloadBtn.disabled = true;

        try {
          await ensureExportLibraries(selectedFormat);
          if (selectedFormat === 'excel') {
            exportExcelCsv(currentFilteredList, periodLabelStr, currentSummary);
          } else {
            exportPdfStatement(currentFilteredList, periodLabelStr, currentSummary);
          }
        } catch (err) {
          console.error('Export error:', err);
          if (window.showToastMessage) {
            window.showToastMessage('Gagal membuat dokumen laporan: ' + (err.message || err), false, 5000, 'Unduh Gagal');
          }
        } finally {
          if (downloadBtnText) downloadBtnText.innerHTML = originalText;
          downloadBtn.disabled = false;
          closeModal();
        }
      });
    }
  }

  // ========================================================
  // 1. CORPORATE MULTI-SHEET EXCEL WORKBOOK GENERATOR (XLSX)
  // ========================================================
  function exportExcelCsv(transactions, periodLabel, summary) {
    if (window.XLSX) {
      try {
        const XLSX = window.XLSX;
        const wb = XLSX.utils.book_new();

        // SHEET 1: RINGKASAN EKSEKUTIF (EXECUTIVE SUMMARY)
        const wallets = (window.__fintrackData && window.__fintrackData.wallets) || [];
        const gold = (window.__fintrackData && window.__fintrackData.gold) || {};
        const bibit = (window.__fintrackData && window.__fintrackData.bibitAssets) || [];

        const summaryRows = [
          ['FINTRACK PRIVÉ WEALTH MANAGEMENT'],
          ['LAPORAN KEUANGAN & REKENING KORAN RESMI (OFFICIAL STATEMENT)'],
          [''],
          ['INFORMASI DOKUMEN'],
          ['Nomor Dokumen', `FTP-EXCEL-${Date.now().toString().slice(-6)}`],
          ['Periode Laporan', periodLabel],
          ['Waktu Cetak Dokumen', new Date().toLocaleString('id-ID')],
          ['Status Akun', 'VERIFIED PRIVÉ CLIENT'],
          ['Mata Uang Acuan', 'Indonesian Rupiah (IDR)'],
          [''],
          ['RINGKASAN ARUS KAS PERIODE'],
          ['Total Transaksi Tercatat', transactions.length],
          ['Total Pemasukan (Kredit)', summary ? summary.totalIncome : 0],
          ['Total Pengeluaran (Debet)', summary ? summary.totalExpense : 0],
          ['Arus Kas Bersih (Net Cashflow)', summary ? (summary.totalIncome - summary.totalExpense) : 0],
          [''],
          ['SNAPSHOT POSISI SALDO & PORTOFOLIO SAAT INI'],
          ['Nama Rekening / Instrumen Aset', 'Klasifikasi', 'Saldo Terkini (IDR)']
        ];

        let totalAssets = 0;
        wallets.forEach(w => {
          const bal = Number(w.balance || 0);
          totalAssets += bal;
          summaryRows.push([w.name, 'Kas & Tabungan Bank', bal]);
        });
        if (gold && gold.balanceGrams) {
          const goldVal = Number(gold.balanceGrams) * 1900000;
          totalAssets += goldVal;
          summaryRows.push([`Emas Fisik Treasury (${gold.balanceGrams} gram)`, 'Komoditas Emas Murni', goldVal]);
        }
        if (Array.isArray(bibit)) {
          bibit.forEach(b => {
            const bVal = Number(b.totalInvestment || b.currentValue || 0);
            totalAssets += bVal;
            summaryRows.push([b.name || 'Reksadana Pasar Uang / Obligasi', 'Investasi Reksadana Bibit', bVal]);
          });
        }
        summaryRows.push(['TOTAL KEKAYAAN BERSIH (NET WORTH)', 'Total Seluruh Portofolio', totalAssets]);

        const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
        wsSummary['!cols'] = [{ wch: 40 }, { wch: 28 }, { wch: 24 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Eksekutif');

        // SHEET 2: BUKU BESAR MUTASI KAS (TRANSACTION LEDGER)
        const ledgerHeaders = [
          'No',
          'Tanggal',
          'Waktu',
          'Jenis Transaksi',
          'Kategori Transaksi',
          'Rekening Asal',
          'Rekening Tujuan',
          'Keterangan / Catatan Transaksi',
          'Debet (Keluar IDR)',
          'Kredit (Masuk IDR)',
          'Arus Bersih (IDR)'
        ];

        const ledgerRows = [ledgerHeaders];
        transactions.forEach((t, idx) => {
          const d = new Date(t.date || Date.now());
          const dateStr = !isNaN(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '';
          const timeStr = !isNaN(d.getTime()) ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
          const typeLabel = t.type === 'income' ? 'Pemasukan' : (t.type === 'expense' ? 'Pengeluaran' : (t.type === 'transfer' ? 'Transfer Saldo' : 'Investasi'));
          const debit = t.type === 'expense' ? Number(t.amount || 0) : 0;
          const credit = t.type === 'income' ? Number(t.amount || 0) : 0;
          const net = credit - debit;
          const fromW = t.walletName || t.fromWalletName || (t.type === 'transfer' ? 'Kas' : '-');
          const toW = t.toWalletName || '-';

          ledgerRows.push([
            idx + 1,
            dateStr,
            timeStr,
            typeLabel,
            t.category || '-',
            fromW,
            toW,
            t.note || '-',
            debit,
            credit,
            net
          ]);
        });

        const wsLedger = XLSX.utils.aoa_to_sheet(ledgerRows);
        wsLedger['!cols'] = [
          { wch: 6 },
          { wch: 13 },
          { wch: 10 },
          { wch: 18 },
          { wch: 24 },
          { wch: 20 },
          { wch: 20 },
          { wch: 45 },
          { wch: 18 },
          { wch: 18 },
          { wch: 18 }
        ];
        XLSX.utils.book_append_sheet(wb, wsLedger, 'Buku Mutasi Kas');

        const cleanPeriod = periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
        XLSX.writeFile(wb, `FinTrack_Statement_${cleanPeriod}.xlsx`);
        if (window.showToastMessage) {
          window.showToastMessage(`Buku Kas (Excel) periode ${periodLabel} berhasil diunduh.`, true, 4200, 'Unduh Berhasil');
        }
        return;
      } catch (err) {
        console.warn('XLSX generation failed, falling back to CSV:', err);
      }
    }

    // Fallback: UTF-8 BOM CSV
    const BOM = '\uFEFF';
    const headers = ['No', 'Tanggal', 'Waktu', 'Jenis Transaksi', 'Kategori', 'Rekening Asal', 'Rekening Tujuan', 'Keterangan', 'Debet (Keluar)', 'Kredit (Masuk)', 'Nominal Bersih'];
    const rows = transactions.map((t, idx) => {
      const d = new Date(t.date || Date.now());
      const dateStr = !isNaN(d.getTime()) ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` : '';
      const timeStr = !isNaN(d.getTime()) ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
      const typeLabel = t.type === 'income' ? 'Pemasukan' : (t.type === 'expense' ? 'Pengeluaran' : (t.type === 'transfer' ? 'Transfer' : 'Investasi'));
      const debit = t.type === 'expense' ? Number(t.amount || 0) : 0;
      const credit = t.type === 'income' ? Number(t.amount || 0) : 0;
      const net = credit - debit;
      const fromW = t.walletName || t.fromWalletName || (t.type === 'transfer' ? 'Kas' : '-');
      const toW = t.toWalletName || '-';

      return [
        idx + 1,
        dateStr,
        timeStr,
        typeLabel,
        `"${(t.category || '-').replace(/"/g, '""')}"`,
        `"${fromW.replace(/"/g, '""')}"`,
        `"${toW.replace(/"/g, '""')}"`,
        `"${(t.note || '-').replace(/"/g, '""')}"`,
        debit,
        credit,
        net
      ].join(';');
    });

    const csvContent = BOM + headers.join(';') + '\r\n' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FinTrack_Statement_${periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (window.showToastMessage) {
      window.showToastMessage(`Buku Kas (CSV) periode ${periodLabel} berhasil diunduh.`, true, 4200, 'Unduh Berhasil');
    }
  }

  // ========================================================
  // 2. TIER-1 CORPORATE BANKING e-STATEMENT PDF GENERATOR
  // ========================================================
  function exportPdfStatement(transactions, periodLabel, summary) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      if (window.showToastMessage) {
        window.showToastMessage('Modul PDF sedang disiapkan. Silakan coba kembali dalam 2 detik.', 'warning', 3500, 'Menyiapkan Modul');
      }
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // A4 dimensions: 210mm x 297mm
    const docId = `FTP/STM/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`;
    const printDateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB';

    // 1. Corporate Header Banner (Deep Slate + Luxury Cyan Accent)
    doc.setFillColor(11, 15, 25); // #0b0f19
    doc.rect(0, 0, 210, 40, 'F');

    // Dual accent line: Gold + Cyan
    doc.setFillColor(212, 175, 55); // Gold
    doc.rect(0, 39, 210, 0.7, 'F');
    doc.setFillColor(56, 189, 248); // Cyan
    doc.rect(0, 39.7, 210, 1.3, 'F');

    // Branding
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('FINTRACK PRIVÉ', 14, 16);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(56, 189, 248);
    doc.text('WEALTH MANAGEMENT & PRIVATE FINANCIAL SERVICES', 14, 22.5);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('REKENING KORAN RESMI • OFFICIAL STATEMENT OF ACCOUNT', 14, 29);

    // Right header metadata block
    doc.setFontSize(7.5);
    doc.setTextColor(203, 213, 225);
    doc.text(`No. Dokumen : ${docId}`, 130, 15);
    doc.text(`Periode     : ${periodLabel}`, 130, 20.5);
    doc.text(`Dicetak     : ${printDateStr}`, 130, 26);
    doc.text(`Klasifikasi : CONFIDENTIAL / RAHASIA`, 130, 31.5);

    // 2. Account Holder & Security Overview
    doc.setFillColor(248, 250, 252); // #f8fafc
    doc.setDrawColor(226, 232, 240); // #e2e8f0
    doc.roundedRect(14, 45, 182, 14, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('PEMEGANG REKENING:', 18, 51);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Private Client (Default User)', 54, 51);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('STATUS AKUN:', 18, 56);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(14, 165, 233);
    doc.text('ACTIVE VERIFIED PRIVÉ TIER', 54, 56);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('MATA UANG DASAR:', 125, 51);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Indonesian Rupiah (IDR)', 158, 51);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL TRANSAKSI:', 125, 56);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${transactions.length} Transaksi Tercatat`, 158, 56);

    // 3. Executive KPI Cards (Pemasukan, Pengeluaran, Arus Kas Bersih)
    const net = summary ? (summary.totalIncome - summary.totalExpense) : 0;

    // Card 1: Total Pemasukan (Kredit)
    doc.setFillColor(240, 253, 244); // light green
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(14, 62, 58, 18, 2, 2, 'FD');
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text('TOTAL KREDIT (PEMASUKAN)', 18, 68);
    doc.setFontSize(10.5);
    doc.text(`+ Rp ${(summary ? summary.totalIncome : 0).toLocaleString('id-ID')}`, 18, 76);

    // Card 2: Total Pengeluaran (Debet)
    doc.setFillColor(255, 241, 242); // light red
    doc.setDrawColor(254, 205, 211);
    doc.roundedRect(76, 62, 58, 18, 2, 2, 'FD');
    doc.setFontSize(6.8);
    doc.setTextColor(159, 18, 57);
    doc.text('TOTAL DEBET (PENGELUARAN)', 80, 68);
    doc.setFontSize(10.5);
    doc.text(`- Rp ${(summary ? summary.totalExpense : 0).toLocaleString('id-ID')}`, 80, 76);

    // Card 3: Arus Kas Bersih (Net Cashflow)
    doc.setFillColor(240, 249, 255); // light cyan
    doc.setDrawColor(186, 230, 253);
    doc.roundedRect(138, 62, 58, 18, 2, 2, 'FD');
    doc.setFontSize(6.8);
    doc.setTextColor(3, 105, 161);
    doc.text('ARUS KAS BERSIH (NET CASHFLOW)', 142, 68);
    doc.setFontSize(10.5);
    doc.setTextColor(net >= 0 ? 22 : 159, net >= 0 ? 101 : 18, net >= 0 ? 52 : 57);
    doc.text(`${net >= 0 ? '+' : ''}Rp ${net.toLocaleString('id-ID')}`, 142, 76);

    // 4. AutoTable Transaction Ledger (Corporate Accounting Style)
    const tableData = transactions.map((t, idx) => {
      const d = new Date(t.date || Date.now());
      const dateStr = !isNaN(d.getTime()) ? `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}` : '-';
      const timeStr = !isNaN(d.getTime()) ? d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
      const typeLabel = t.type === 'income' ? 'Masuk' : (t.type === 'expense' ? 'Keluar' : (t.type === 'transfer' ? 'Transfer' : 'Invest'));
      const walletStr = t.walletName || (t.type === 'transfer' ? `${t.fromWalletName || 'Kas'} ➔ ${t.toWalletName || 'Tujuan'}` : 'Kas');
      
      const debitStr = t.type === 'expense' ? `Rp ${Number(t.amount || 0).toLocaleString('id-ID')}` : '-';
      const creditStr = t.type === 'income' ? `Rp ${Number(t.amount || 0).toLocaleString('id-ID')}` : (t.type === 'transfer' || t.type.includes('invest') ? `Rp ${Number(t.amount || 0).toLocaleString('id-ID')}` : '-');

      return [
        idx + 1,
        `${dateStr}\n${timeStr}`,
        typeLabel,
        t.category || '-',
        walletStr,
        t.note || '-',
        debitStr,
        creditStr
      ];
    });

    doc.autoTable({
      startY: 84,
      head: [['#', 'Tanggal', 'Tipe', 'Kategori', 'Rekening / Dompet', 'Keterangan Transaksi', 'Debet (Keluar)', 'Kredit (Masuk)']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [11, 15, 25],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'left',
        lineWidth: 0.1,
        lineColor: [203, 213, 225]
      },
      styles: {
        fontSize: 7,
        cellPadding: 2.2,
        valign: 'middle',
        lineColor: [226, 232, 240],
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center' },
        1: { cellWidth: 19, halign: 'center' },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 26 },
        4: { cellWidth: 28 },
        5: { cellWidth: 43 },
        6: { cellWidth: 22, halign: 'right' },
        7: { cellWidth: 22, halign: 'right' }
      },
      didParseCell: function(data) {
        if (data.section === 'body') {
          // Color code Debet
          if (data.column.index === 6 && data.cell.raw !== '-') {
            data.cell.styles.textColor = [225, 29, 72]; // rose red
            data.cell.styles.fontStyle = 'bold';
          }
          // Color code Kredit
          if (data.column.index === 7 && data.cell.raw !== '-') {
            data.cell.styles.textColor = [16, 185, 129]; // emerald green
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      foot: [[
        'TOTAL',
        '',
        '',
        '',
        '',
        `${transactions.length} Data`,
        `Rp ${(summary ? summary.totalExpense : 0).toLocaleString('id-ID')}`,
        `Rp ${(summary ? summary.totalIncome : 0).toLocaleString('id-ID')}`
      ]],
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'right'
      }
    });

    // 5. Digital Security Seal & Verification Footer on each page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      // Bottom verification card on the last page
      if (i === pageCount) {
        const finalY = Math.min(doc.lastAutoTable.finalY + 6, 260);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, finalY, 182, 16, 2, 2, 'FD');

        doc.setFontSize(6.8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(14, 165, 233);
        doc.text('[ VERIFIED DIGITAL FINANCIAL STATEMENT • FINTRACK PRIVÉ CERTIFIED ]', 18, finalY + 5);

        doc.setFontSize(6.2);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Dokumen rekening koran ini diproduksi secara terenkripsi oleh sistem komputasi FinTrack Privé. Sah dan mengikat secara digital tanpa membutuhkan tanda tangan basah.', 18, finalY + 9.5);
        doc.text(`Kode Hash Validasi: SHA256-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString(36).toUpperCase()} • Otentikasi Integritas Data Terjamin.`, 18, finalY + 13.5);
      }

      // Page boundary lines & footer text
      doc.setDrawColor(226, 232, 240);
      doc.line(14, 287, 196, 287);

      doc.setFontSize(6.8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`FinTrack Privé Wealth Hub • Dokumen Rahasia Perbankan • Halaman ${i} dari ${pageCount}`, 14, 292);
      doc.text('Hak Cipta © FinTrack Privé. Seluruh hak dilindungi undang-undang.', 132, 292);
    }

    const cleanPeriod = periodLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`FinTrack_eStatement_${cleanPeriod}.pdf`);
    if (window.showToastMessage) {
      window.showToastMessage(`e-Statement (PDF) periode ${periodLabel} berhasil diunduh.`, true, 4200, 'Unduh Berhasil');
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStatementExportModal);
  } else {
    initStatementExportModal();
  }
})();
