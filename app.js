/**
 * Financial Statement Simulator (FinSim)
 * Multi-Period Accounting Engine & Interactive UI Controller
 */

// Application State
let periods = ['ปี X0', 'ปี X1', 'ปี X2', 'ปี X3'];
let selectedComparePeriods = ['ปี X0', 'ปี X1', 'ปี X2']; // Max 3 for Workspace view
let activeFocusPeriod = 'ปี X0';
let editingTransactionId = null;
let transactions = [];
let nextTransactionId = 1;

// Currency Formatter
const formatMoney = (amount) => {
  const num = Number(amount) || 0;
  const isNegative = num < 0;
  const formatted = Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${isNegative ? '-' : ''}฿${formatted}`;
};

// Check if account name represents cash or cash equivalents
const isCashAccount = (name, type) => {
  if (type !== 'Asset') return false;
  const lower = (name || '').toLowerCase();
  return (
    lower.includes('cash') ||
    lower.includes('bank') ||
    lower.includes('เงินสด') ||
    lower.includes('เงินฝาก')
  );
};

// Smart guess account type & CF category based on name
const guessAccountProperties = (accountName) => {
  const lower = (accountName || '').toLowerCase();
  
  // Asset
  if (lower.includes('cash') || lower.includes('เงินสด') || lower.includes('bank') || lower.includes('เงินฝาก')) {
    return { type: 'Asset', cf: 'Auto' };
  }
  if (lower.includes('receivable') || lower.includes('ลูกหนี้') || lower.includes('inventory') || lower.includes('สินค้า') || lower.includes('prepaid')) {
    return { type: 'Asset', cf: 'Operating' };
  }
  if (lower.includes('equipment') || lower.includes('อุปกรณ์') || lower.includes('building') || lower.includes('ที่ดิน') || lower.includes('vehicle') || lower.includes('asset')) {
    return { type: 'Asset', cf: 'Investing' };
  }

  // Liability
  if (lower.includes('payable') || lower.includes('เจ้าหนี้') || lower.includes('accrued')) {
    return { type: 'Liability', cf: 'Operating' };
  }
  if (lower.includes('loan') || lower.includes('กู้') || lower.includes('debt') || lower.includes('bond')) {
    return { type: 'Liability', cf: 'Financing' };
  }

  // Equity
  if (lower.includes('stock') || lower.includes('capital') || lower.includes('ทุน') || lower.includes('retained') || lower.includes('dividend')) {
    return { type: 'Equity', cf: 'Financing' };
  }

  // Revenue
  if (lower.includes('revenue') || lower.includes('sales') || lower.includes('รายได้') || lower.includes('income')) {
    return { type: 'Revenue', cf: 'Operating' };
  }

  // Expense
  if (lower.includes('expense') || lower.includes('cost') || lower.includes('ค่าใช้จ่าย') || lower.includes('เงินเดือน') || lower.includes('salary') || lower.includes('rent')) {
    return { type: 'Expense', cf: 'Operating' };
  }

  return null;
};

// Initial default rows
const defaultLineRows = [
  { side: 'Dr', account: 'Cash (เงินสด)', type: 'Asset', cf: 'Auto', amount: '' },
  { side: 'Cr', account: 'Common Stock (ทุนเรือนหุ้น)', type: 'Equity', cf: 'Financing', amount: '' }
];

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  updatePeriodDropdowns();
  renderPeriodChips();
  initFormLines();
  bindEvents();
  renderAll();
});

// Update period selectors in forms and headers
function updatePeriodDropdowns() {
  const formSelect = document.getElementById('je-period');
  const kpiSelect = document.getElementById('kpi-period-select');
  const badgeTotal = document.getElementById('badge-total-periods');
  const fullReportRange = document.getElementById('full-report-period-range');

  const currentFormVal = formSelect.value || periods[0];
  const currentKpiVal = kpiSelect.value || activeFocusPeriod;

  formSelect.innerHTML = periods.map(p => `<option value="${p}">${p}</option>`).join('');
  kpiSelect.innerHTML = periods.map(p => `<option value="${p}">${p}</option>`).join('');

  if (periods.includes(currentFormVal)) formSelect.value = currentFormVal;
  if (periods.includes(currentKpiVal)) kpiSelect.value = currentKpiVal;
  activeFocusPeriod = kpiSelect.value;

  if (badgeTotal) badgeTotal.textContent = `${periods.length} งวด`;
  if (fullReportRange) fullReportRange.textContent = `${periods[0]} ถึง ${periods[periods.length - 1]}`;
}

// Render Filter Chips for Workspace (Max 3 selectable)
function renderPeriodChips() {
  const container = document.getElementById('period-chips-container');
  if (!container) return;

  const countEl = document.getElementById('selected-period-count');
  if (countEl) countEl.textContent = selectedComparePeriods.length;

  const summaryEl = document.getElementById('tabs-period-summary');
  if (summaryEl) summaryEl.textContent = selectedComparePeriods.join(', ');

  const isMaxReached = selectedComparePeriods.length >= 3;

  container.innerHTML = periods.map((p) => {
    const isSelected = selectedComparePeriods.includes(p);
    const isDisabled = !isSelected && isMaxReached;
    return `
      <button type="button" class="period-chip ${isSelected ? 'active' : ''} ${isDisabled ? 'disabled-limit' : ''}" 
              data-period="${p}" 
              title="${isDisabled ? 'เลือกได้สูงสุด 3 งวดพร้อมกัน' : (isSelected ? 'คลิกเพื่อซ่อนงวดนี้' : 'คลิกเพื่อแสดงงวดนี้')}">
        <span>${isSelected ? '✓' : '+'}</span> ${p}
      </button>
    `;
  }).join('');

  // Bind click on chips
  container.querySelectorAll('.period-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const p = chip.dataset.period;
      togglePeriodSelection(p);
    });
  });
}

// Toggle period selection (Max 3)
function togglePeriodSelection(periodName) {
  const idx = selectedComparePeriods.indexOf(periodName);
  if (idx !== -1) {
    // Already selected: deselect if more than 1
    if (selectedComparePeriods.length > 1) {
      selectedComparePeriods.splice(idx, 1);
    } else {
      alert('ต้องเลือกแสดงผลอย่างน้อย 1 งวด');
      return;
    }
  } else {
    // Not selected: add if < 3
    if (selectedComparePeriods.length >= 3) {
      alert('ในหน้าหลักสามารถเลือกเปรียบเทียบได้สูงสุด 3 งวดพร้อมกัน (หากต้องการดูทุกงวดครบทั้งหมด สามารถคลิกแท็บ "หน้างบการเงินรวมทุกงวด" ด้านบนได้ทันทีครับ)');
      return;
    }
    selectedComparePeriods.push(periodName);
    // Sort according to master periods order
    selectedComparePeriods.sort((a, b) => periods.indexOf(a) - periods.indexOf(b));
  }

  renderPeriodChips();
  renderAll();
}

// Render Line Items in Form
function initFormLines(customLines = null) {
  const tbody = document.getElementById('je-lines-body');
  tbody.innerHTML = '';
  const linesToRender = customLines && customLines.length ? customLines : defaultLineRows;
  linesToRender.forEach((row) => addFormRow(row.side, row.account || row.accountName, row.type || row.accountType, row.cf || row.cfActivity, row.amount));
  validateFormBalance();
}

function addFormRow(side = 'Dr', account = '', type = 'Asset', cf = 'Auto', amount = '') {
  const tbody = document.getElementById('je-lines-body');
  const tr = document.createElement('tr');
  tr.className = 'je-line-row';

  tr.innerHTML = `
    <td>
      <select class="side-selector ${side === 'Dr' ? 'is-dr' : 'is-cr'}">
        <option value="Dr" ${side === 'Dr' ? 'selected' : ''}>Dr.</option>
        <option value="Cr" ${side === 'Cr' ? 'selected' : ''}>Cr.</option>
      </select>
    </td>
    <td>
      <input type="text" class="form-control account-name-input" list="account-suggestions" placeholder="ระบุชื่อบัญชี..." value="${account}" required>
    </td>
    <td>
      <select class="type-select">
        <option value="Asset" ${type === 'Asset' ? 'selected' : ''}>Asset (สินทรัพย์)</option>
        <option value="Liability" ${type === 'Liability' ? 'selected' : ''}>Debt / Liability (หนี้สิน)</option>
        <option value="Equity" ${type === 'Equity' ? 'selected' : ''}>Equity (ส่วนของทุน)</option>
        <option value="Revenue" ${type === 'Revenue' ? 'selected' : ''}>Revenue (รายได้)</option>
        <option value="Expense" ${type === 'Expense' ? 'selected' : ''}>Expense (ค่าใช้จ่าย)</option>
      </select>
    </td>
    <td>
      <select class="cf-select">
        <option value="Auto" ${cf === 'Auto' ? 'selected' : ''}>Auto-detect</option>
        <option value="Operating" ${cf === 'Operating' ? 'selected' : ''}>ดำเนินงาน (CFO)</option>
        <option value="Investing" ${cf === 'Investing' ? 'selected' : ''}>ลงทุน (CFI)</option>
        <option value="Financing" ${cf === 'Financing' ? 'selected' : ''}>จัดหาเงิน (CFF)</option>
        <option value="Non-Cash" ${cf === 'Non-Cash' ? 'selected' : ''}>ไม่กระทบเงินสด</option>
      </select>
    </td>
    <td>
      <input type="number" step="any" min="0" class="form-control amount-input" placeholder="0.00" value="${amount}" required>
    </td>
    <td>
      <button type="button" class="btn-remove-row" title="ลบขานี้">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </td>
  `;

  // Side selector styling
  const sideSelect = tr.querySelector('.side-selector');
  sideSelect.addEventListener('change', (e) => {
    e.target.className = e.target.value === 'Dr' ? 'side-selector is-dr' : 'side-selector is-cr';
    validateFormBalance();
  });

  // Smart guesser when account name typed
  const accountInput = tr.querySelector('.account-name-input');
  const typeSelect = tr.querySelector('.type-select');
  const cfSelect = tr.querySelector('.cf-select');

  accountInput.addEventListener('change', (e) => {
    const guess = guessAccountProperties(e.target.value);
    if (guess) {
      typeSelect.value = guess.type;
      if (guess.cf && cfSelect.value === 'Auto') {
        cfSelect.value = guess.cf;
      }
    }
    validateFormBalance();
  });

  // Amount input event
  const amtInput = tr.querySelector('.amount-input');
  amtInput.addEventListener('input', validateFormBalance);

  // Remove button event
  const removeBtn = tr.querySelector('.btn-remove-row');
  removeBtn.addEventListener('click', () => {
    const rows = tbody.querySelectorAll('.je-line-row');
    if (rows.length > 2) {
      tr.remove();
      validateFormBalance();
    } else {
      alert('รายการบัญชีต้องมีอย่างน้อย 2 ขา (Debit และ Credit)');
    }
  });

  tbody.appendChild(tr);
}

// Validate Form Debit vs Credit
function validateFormBalance() {
  const rows = document.querySelectorAll('#je-lines-body .je-line-row');
  let totalDr = 0;
  let totalCr = 0;

  rows.forEach((row) => {
    const side = row.querySelector('.side-selector').value;
    const amount = parseFloat(row.querySelector('.amount-input').value) || 0;
    if (side === 'Dr') {
      totalDr += amount;
    } else {
      totalCr += amount;
    }
  });

  const diff = Math.abs(totalDr - totalCr);
  const isBalanced = totalDr > 0 && totalCr > 0 && diff < 0.001;

  document.getElementById('form-total-dr').textContent = formatMoney(totalDr);
  document.getElementById('form-total-cr').textContent = formatMoney(totalCr);
  
  const diffEl = document.getElementById('form-diff');
  const diffItem = document.getElementById('form-diff-item');

  if (diffEl) {
    if (isBalanced) {
      diffEl.textContent = '฿0.00 (ลงตัว ✅)';
    } else {
      diffEl.textContent = formatMoney(diff);
    }
  }

  if (diffItem) {
    diffItem.className = isBalanced ? 'summary-item diff-item is-zero' : 'summary-item diff-item';
  }

  const postBtn = document.getElementById('btn-post-entry');
  if (postBtn) {
    postBtn.disabled = !isBalanced;
  }
}

// Start Editing an existing transaction
function startEditTransaction(id) {
  const tx = transactions.find(t => t.id === id);
  if (!tx) return;

  editingTransactionId = id;

  // Set Period & Memo
  document.getElementById('je-period').value = tx.period || periods[0];
  document.getElementById('je-memo').value = tx.memo;

  // Load lines
  initFormLines(tx.lines);

  // Update UI into Editing Mode
  const banner = document.getElementById('edit-mode-banner');
  banner.classList.remove('is-hidden');
  document.getElementById('edit-banner-title').textContent = `กำลังแก้ไขรายการ #${tx.id} (${tx.period}): ${tx.memo}`;

  const postBtn = document.getElementById('btn-post-entry');
  postBtn.classList.add('is-editing');
  document.getElementById('btn-submit-label').textContent = 'บันทึกการแก้ไข (Update Entry)';
  document.getElementById('form-step-badge').classList.add('editing');

  // Switch to workspace view if in full report view
  switchView('workspace');

  // Scroll smoothly to form
  document.getElementById('form-card-container').scrollIntoView({ behavior: 'smooth' });
  renderHistory();
}

// Cancel Editing Mode
function cancelEdit() {
  editingTransactionId = null;

  document.getElementById('edit-mode-banner').classList.add('is-hidden');
  const postBtn = document.getElementById('btn-post-entry');
  postBtn.classList.remove('is-editing');
  document.getElementById('btn-submit-label').textContent = 'บันทึกรายการ (Post Journal Entry)';
  document.getElementById('form-step-badge').classList.remove('editing');

  document.getElementById('je-memo').value = '';
  initFormLines();
  renderHistory();
}

// Delete single transaction
function deleteTransaction(id) {
  if (editingTransactionId === id) {
    cancelEdit();
  }
  transactions = transactions.filter((t) => t.id !== id);
  renderAll();
}

// Switch between Workspace View and Full Report View
function switchView(viewName) {
  const wsView = document.getElementById('view-workspace');
  const fullView = document.getElementById('view-full-report');
  const btnWs = document.getElementById('btn-view-workspace');
  const btnFull = document.getElementById('btn-view-full-report');

  if (viewName === 'workspace') {
    wsView.classList.remove('is-hidden');
    fullView.classList.add('is-hidden');
    btnWs.classList.add('active');
    btnFull.classList.remove('active');
  } else {
    wsView.classList.add('is-hidden');
    fullView.classList.remove('is-hidden');
    btnWs.classList.remove('active');
    btnFull.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Event Bindings
function bindEvents() {
  // Add Line
  document.getElementById('btn-add-line').addEventListener('click', () => {
    addFormRow('Dr', '', 'Asset', 'Auto', '');
    validateFormBalance();
  });

  // Clear Form
  document.getElementById('btn-clear-form').addEventListener('click', () => {
    if (editingTransactionId) {
      cancelEdit();
    } else {
      document.getElementById('je-memo').value = '';
      initFormLines();
    }
  });

  // Cancel Edit Button
  document.getElementById('btn-cancel-edit').addEventListener('click', cancelEdit);

  // View Switcher Buttons
  document.getElementById('btn-view-workspace').addEventListener('click', () => switchView('workspace'));
  document.getElementById('btn-view-full-report').addEventListener('click', () => switchView('full-report'));
  document.getElementById('btn-jump-full-report').addEventListener('click', () => switchView('full-report'));
  document.getElementById('btn-back-to-workspace').addEventListener('click', () => switchView('workspace'));

  // In-App Modal for Adding New Period (Unlimited)
  const addPeriodModal = document.getElementById('modal-add-period');
  const openAddPeriodBtn = document.getElementById('btn-open-add-period-modal');
  const cancelAddPeriodBtn = document.getElementById('btn-cancel-add-period');
  const confirmAddPeriodBtn = document.getElementById('btn-confirm-add-period');
  const inputNewPeriod = document.getElementById('input-new-period-name');

  openAddPeriodBtn.addEventListener('click', () => {
    // Generate intelligent next period name
    const nextIdx = periods.length;
    inputNewPeriod.value = `ปี X${nextIdx}`;
    addPeriodModal.classList.remove('is-hidden');
    setTimeout(() => inputNewPeriod.focus(), 50);
  });

  cancelAddPeriodBtn.addEventListener('click', () => {
    addPeriodModal.classList.add('is-hidden');
  });

  addPeriodModal.addEventListener('click', (e) => {
    if (e.target === addPeriodModal) {
      addPeriodModal.classList.add('is-hidden');
    }
  });

  const handleConfirmAddPeriod = () => {
    const val = inputNewPeriod.value.trim();
    if (!val) {
      alert('กรุณาระบุชื่องวดบัญชี');
      return;
    }
    if (periods.includes(val)) {
      alert('มีงวดบัญชีนี้อยู่แล้ว');
      return;
    }

    periods.push(val);
    updatePeriodDropdowns();
    document.getElementById('je-period').value = val;

    // Auto add to compare if < 3
    if (selectedComparePeriods.length < 3) {
      selectedComparePeriods.push(val);
    }
    renderPeriodChips();

    addPeriodModal.classList.add('is-hidden');
    renderAll();
  };

  confirmAddPeriodBtn.addEventListener('click', handleConfirmAddPeriod);
  inputNewPeriod.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmAddPeriod();
    }
  });

  // Period focus filter in navbar
  document.getElementById('kpi-period-select').addEventListener('change', (e) => {
    activeFocusPeriod = e.target.value;
    renderAll();
  });

  // Form Submit (Create or Update)
  document.getElementById('je-form').addEventListener('submit', (e) => {
    e.preventDefault();
    handleFormSubmit();
  });

  // Custom Modal Reset Logic
  const resetBtn = document.getElementById('btn-reset-all');
  const resetModal = document.getElementById('modal-reset-confirm');
  const cancelResetBtn = document.getElementById('btn-cancel-modal-reset');
  const confirmResetBtn = document.getElementById('btn-confirm-modal-reset');

  resetBtn.addEventListener('click', () => {
    resetModal.classList.remove('is-hidden');
  });

  cancelResetBtn.addEventListener('click', () => {
    resetModal.classList.add('is-hidden');
  });

  resetModal.addEventListener('click', (e) => {
    if (e.target === resetModal) {
      resetModal.classList.add('is-hidden');
    }
  });

  confirmResetBtn.addEventListener('click', () => {
    transactions = [];
    nextTransactionId = 1;
    if (editingTransactionId) cancelEdit();
    resetModal.classList.add('is-hidden');
    renderAll();
  });

  // Statement Tabs in Workspace
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const target = btn.dataset.tab;
      const stmtCards = document.querySelectorAll('#view-workspace .statement-card');
      if (target === 'tab-all') {
        stmtCards.forEach((card) => card.classList.remove('is-hidden'));
      } else {
        stmtCards.forEach((card) => {
          if (card.id === target) {
            card.classList.remove('is-hidden');
          } else {
            card.classList.add('is-hidden');
          }
        });
      }
    });
  });

  // Quick Presets
  const presetBtns = document.querySelectorAll('.preset-btn');
  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const presetKey = btn.dataset.preset;
      applyPreset(presetKey);
    });
  });
}

// Handle Form Submission (Create or Edit)
function handleFormSubmit() {
  const period = document.getElementById('je-period').value;
  const memo = document.getElementById('je-memo').value.trim() || 'รายการรายวันทั่วไป';
  const rows = document.querySelectorAll('#je-lines-body .je-line-row');
  const lines = [];

  rows.forEach((row) => {
    const side = row.querySelector('.side-selector').value;
    const accountName = row.querySelector('.account-name-input').value.trim();
    const accountType = row.querySelector('.type-select').value;
    const cfActivity = row.querySelector('.cf-select').value;
    const amount = parseFloat(row.querySelector('.amount-input').value) || 0;

    if (accountName && amount > 0) {
      lines.push({
        side,
        accountName,
        accountType,
        cfActivity,
        amount
      });
    }
  });

  if (lines.length < 2) {
    alert('กรุณากรอกข้อมูลรายการบัญชีให้ครบถ้วน');
    return;
  }

  if (editingTransactionId) {
    // Update existing transaction
    const txIndex = transactions.findIndex(t => t.id === editingTransactionId);
    if (txIndex !== -1) {
      transactions[txIndex] = {
        ...transactions[txIndex],
        period,
        memo,
        lines,
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' (แก้ไขแล้ว)'
      };
    }
    cancelEdit();
  } else {
    // Create new transaction
    const newTx = {
      id: nextTransactionId++,
      period,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      memo,
      lines
    };
    transactions.unshift(newTx); // newest first
    document.getElementById('je-memo').value = '';
    initFormLines();
  }

  renderAll();
}

// Quick Presets with X0 Opening Balances
function applyPreset(key) {
  if (key === 'multi_year_demo') {
    // Demo 3 years together: X0 (Opening), X1 (Operations), X2 (Expansion)
    const txYear0 = {
      id: nextTransactionId++,
      period: 'ปี X0',
      timestamp: '09:00:00',
      memo: 'ยอดยกมาต้นงวด (Opening Balance): เงินสด 50,000, สินค้าคงเหลือ 20,000 และทุน 70,000',
      lines: [
        { side: 'Dr', accountName: 'Cash (เงินสด)', accountType: 'Asset', cfActivity: 'Financing', amount: 50000 },
        { side: 'Dr', accountName: 'Inventory (สินค้าคงเหลือ)', accountType: 'Asset', cfActivity: 'Non-Cash', amount: 20000 },
        { side: 'Cr', accountName: 'Common Stock (ทุนเรือนหุ้น)', accountType: 'Equity', cfActivity: 'Financing', amount: 70000 }
      ]
    };
    const txYear1 = {
      id: nextTransactionId++,
      period: 'ปี X1',
      timestamp: '11:00:00',
      memo: 'ขายสินค้าเป็นเงินสดในปี X1',
      lines: [
        { side: 'Dr', accountName: 'Cash (เงินสด)', accountType: 'Asset', cfActivity: 'Operating', amount: 30000 },
        { side: 'Cr', accountName: 'Sales Revenue (รายได้จากการขาย)', accountType: 'Revenue', cfActivity: 'Operating', amount: 30000 }
      ]
    };
    const txYear2_1 = {
      id: nextTransactionId++,
      period: 'ปี X2',
      timestamp: '14:00:00',
      memo: 'ขายสินค้าเพิ่มเป็นเงินสดในปี X2',
      lines: [
        { side: 'Dr', accountName: 'Cash (เงินสด)', accountType: 'Asset', cfActivity: 'Operating', amount: 60000 },
        { side: 'Cr', accountName: 'Sales Revenue (รายได้จากการขาย)', accountType: 'Revenue', cfActivity: 'Operating', amount: 60000 }
      ]
    };
    const txYear2_2 = {
      id: nextTransactionId++,
      period: 'ปี X2',
      timestamp: '15:00:00',
      memo: 'จัดซื้ออุปกรณ์สำนักงานเป็นเงินสดในปี X2',
      lines: [
        { side: 'Dr', accountName: 'Office Equipment (อุปกรณ์สำนักงาน)', accountType: 'Asset', cfActivity: 'Investing', amount: 40000 },
        { side: 'Cr', accountName: 'Cash (เงินสด)', accountType: 'Asset', cfActivity: 'Investing', amount: 40000 }
      ]
    };
    transactions.unshift(txYear2_2, txYear2_1, txYear1, txYear0);
    renderAll();
    return;
  }

  let presetData = null;
  switch (key) {
    case 'x0_opening':
      presetData = {
        period: 'ปี X0',
        memo: 'บันทึกยอดยกมาต้นงวด (เงินสด 50,000 + สินค้าคงเหลือ 20,000 / ทุน 70,000)',
        lines: [
          { side: 'Dr', accountName: 'Cash (เงินสด)', accountType: 'Asset', cfActivity: 'Financing', amount: 50000 },
          { side: 'Dr', accountName: 'Inventory (สินค้าคงเหลือ)', accountType: 'Asset', cfActivity: 'Non-Cash', amount: 20000 },
          { side: 'Cr', accountName: 'Common Stock (ทุนเรือนหุ้น)', accountType: 'Equity', cfActivity: 'Financing', amount: 70000 }
        ]
      };
      break;

    case 'x1_sales':
      presetData = {
        period: 'ปี X1',
        memo: 'ขายสินค้าเป็นเงินสดในปี X1 จำนวน 30,000',
        lines: [
          { side: 'Dr', accountName: 'Cash (เงินสด)', accountType: 'Asset', cfActivity: 'Operating', amount: 30000 },
          { side: 'Cr', accountName: 'Sales Revenue (รายได้จากการขาย)', accountType: 'Revenue', cfActivity: 'Operating', amount: 30000 }
        ]
      };
      break;

    case 'x2_sales':
      presetData = {
        period: 'ปี X2',
        memo: 'ขายสินค้าเป็นเงินสดในปี X2 จำนวน 60,000',
        lines: [
          { side: 'Dr', accountName: 'Cash (เงินสด)', accountType: 'Asset', cfActivity: 'Operating', amount: 60000 },
          { side: 'Cr', accountName: 'Sales Revenue (รายได้จากการขาย)', accountType: 'Revenue', cfActivity: 'Operating', amount: 60000 }
        ]
      };
      break;

    case 'x2_equipment':
      presetData = {
        period: 'ปี X2',
        memo: 'จัดซื้ออุปกรณ์สำนักงานเป็นเงินสดในปี X2 จำนวน 40,000',
        lines: [
          { side: 'Dr', accountName: 'Office Equipment (อุปกรณ์สำนักงาน)', accountType: 'Asset', cfActivity: 'Investing', amount: 40000 },
          { side: 'Cr', accountName: 'Cash (เงินสด)', accountType: 'Asset', cfActivity: 'Investing', amount: 40000 }
        ]
      };
      break;
  }

  if (presetData) {
    const newTx = {
      id: nextTransactionId++,
      period: presetData.period,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      memo: presetData.memo,
      lines: presetData.lines
    };
    transactions.unshift(newTx);
    renderAll();
  }
}

/**
 * =========================================================
 * Multi-Period Accounting Calculation Engine
 * =========================================================
 */
function calculateMultiPeriodFinancials() {
  // Sort transactions chronologically
  const chronologicalTxs = [...transactions].reverse();

  // Results keyed by period name
  const periodResults = {};
  let rollingBeginningCash = 0;
  let cumulativeRetainedEarnings = 0;

  // Track unique account names across all periods
  const allAssetNames = new Set();
  const allLiabNames = new Set();
  const allEquityNames = new Set();
  const allRevNames = new Set();
  const allExpNames = new Set();

  // Process period by period in order
  periods.forEach((periodName) => {
    // 1. Transactions strictly belonging to this period
    const currentPeriodTxs = chronologicalTxs.filter(t => (t.period || periods[0]) === periodName);

    // 2. Transactions up to and including this period (cumulative for Balance Sheet)
    const periodIdx = periods.indexOf(periodName);
    const validPeriodsUpToNow = periods.slice(0, periodIdx + 1);
    const cumulativeTxs = chronologicalTxs.filter(t => validPeriodsUpToNow.includes(t.period || periods[0]));

    // --- P&L (เฉพาะงวด) ---
    const revenues = {};
    const expenses = {};
    let totalRevenue = 0;
    let totalExpenses = 0;

    currentPeriodTxs.forEach((tx) => {
      tx.lines.forEach((line) => {
        const { side, accountName, accountType, amount } = line;
        if (accountType === 'Revenue') {
          allRevNames.add(accountName);
          if (!revenues[accountName]) revenues[accountName] = 0;
          revenues[accountName] += (side === 'Cr' ? amount : -amount);
          totalRevenue += (side === 'Cr' ? amount : -amount);
        } else if (accountType === 'Expense') {
          allExpNames.add(accountName);
          if (!expenses[accountName]) expenses[accountName] = 0;
          expenses[accountName] += (side === 'Dr' ? amount : -amount);
          totalExpenses += (side === 'Dr' ? amount : -amount);
        }
      });
    });

    const netIncome = totalRevenue - totalExpenses;
    cumulativeRetainedEarnings += netIncome; // Rolls into Balance Sheet Retained Earnings

    // --- Cash Flow Statement (เฉพาะงวด) ---
    let cfo = 0;
    let cfi = 0;
    let cff = 0;

    currentPeriodTxs.forEach((tx) => {
      let cashChange = 0;
      let counterpartyLines = [];

      tx.lines.forEach((l) => {
        if (isCashAccount(l.accountName, l.accountType)) {
          cashChange += (l.side === 'Dr' ? l.amount : -l.amount);
        } else {
          counterpartyLines.push(l);
        }
      });

      if (cashChange !== 0) {
        let category = 'Operating';
        const explicitTag = tx.lines.find(l => l.cfActivity && l.cfActivity !== 'Auto' && l.cfActivity !== 'Non-Cash');
        if (explicitTag) {
          category = explicitTag.cfActivity;
        } else {
          const hasEquity = counterpartyLines.some(l => l.accountType === 'Equity');
          const hasLoan = counterpartyLines.some(l => l.accountType === 'Liability' && (l.accountName.toLowerCase().includes('loan') || l.accountName.toLowerCase().includes('กู้')));
          const hasFixedAsset = counterpartyLines.some(l => l.accountType === 'Asset' && (
            l.accountName.toLowerCase().includes('equipment') ||
            l.accountName.toLowerCase().includes('building') ||
            l.accountName.toLowerCase().includes('อุปกรณ์') ||
            l.accountName.toLowerCase().includes('ที่ดิน')
          ));

          if (hasEquity || hasLoan) category = 'Financing';
          else if (hasFixedAsset) category = 'Investing';
          else category = 'Operating';
        }

        if (category === 'Operating') cfo += cashChange;
        else if (category === 'Investing') cfi += cashChange;
        else if (category === 'Financing') cff += cashChange;
      }
    });

    const netCashChange = cfo + cfi + cff;
    const beginningCash = rollingBeginningCash;
    const endingCash = beginningCash + netCashChange;
    rollingBeginningCash = endingCash; // Next period's beginning cash

    // --- Balance Sheet (สะสมต่อเนื่องตั้งแต่เริ่มต้น) ---
    const assets = {};
    const liabilities = {};
    const equityContributed = {};
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquityContributed = 0;
    let totalCashAsset = 0;

    cumulativeTxs.forEach((tx) => {
      tx.lines.forEach((line) => {
        const { side, accountName, accountType, amount } = line;
        if (accountType === 'Asset') {
          allAssetNames.add(accountName);
          if (!assets[accountName]) assets[accountName] = 0;
          const delta = (side === 'Dr' ? amount : -amount);
          assets[accountName] += delta;
          totalAssets += delta;
          if (isCashAccount(accountName, accountType)) {
            totalCashAsset += delta;
          }
        } else if (accountType === 'Liability') {
          allLiabNames.add(accountName);
          if (!liabilities[accountName]) liabilities[accountName] = 0;
          const delta = (side === 'Cr' ? amount : -amount);
          liabilities[accountName] += delta;
          totalLiabilities += delta;
        } else if (accountType === 'Equity') {
          allEquityNames.add(accountName);
          if (!equityContributed[accountName]) equityContributed[accountName] = 0;
          const delta = (side === 'Cr' ? amount : -amount);
          equityContributed[accountName] += delta;
          totalEquityContributed += delta;
        }
      });
    });

    // Total Equity = Contributed Equity + Cumulative Retained Earnings
    const totalEquity = totalEquityContributed + cumulativeRetainedEarnings;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

    periodResults[periodName] = {
      // P&L
      revenues,
      expenses,
      totalRevenue,
      totalExpenses,
      netIncome,

      // Cash Flow
      cfo,
      cfi,
      cff,
      netCashChange,
      beginningCash,
      endingCash,

      // Balance Sheet (Cumulative)
      assets,
      liabilities,
      equityContributed,
      retainedEarnings: cumulativeRetainedEarnings,
      totalAssets,
      totalLiabilities,
      totalEquityContributed,
      totalEquity,
      totalLiabilitiesAndEquity,
      totalCashAsset,
      isBalanced
    };
  });

  return {
    periodResults,
    allAssetNames: Array.from(allAssetNames),
    allLiabNames: Array.from(allLiabNames),
    allEquityNames: Array.from(allEquityNames),
    allRevNames: Array.from(allRevNames),
    allExpNames: Array.from(allExpNames)
  };
}

/**
 * =========================================================
 * Render All UI Components
 * =========================================================
 */
function renderAll() {
  const data = calculateMultiPeriodFinancials();
  const pData = data.periodResults[activeFocusPeriod] || data.periodResults[periods[0]] || {};

  // 1. KPI Banner (reflects activeFocusPeriod)
  document.querySelectorAll('.kpi-focus-period').forEach(el => {
    el.textContent = activeFocusPeriod;
  });

  document.getElementById('kpi-assets').textContent = formatMoney(pData.totalAssets || 0);
  document.getElementById('kpi-liab-equity').textContent = formatMoney(pData.totalLiabilitiesAndEquity || 0);
  
  const kpiNetIncome = document.getElementById('kpi-net-income');
  kpiNetIncome.textContent = formatMoney(pData.netIncome || 0);
  kpiNetIncome.style.color = (pData.netIncome || 0) < 0 ? '#f43f5e' : '#38bdf8';

  document.getElementById('kpi-cash-balance').textContent = formatMoney(pData.totalCashAsset || 0);

  const badge = document.getElementById('kpi-balance-badge');
  if (pData.isBalanced !== false) {
    badge.className = 'kpi-badge badge-balanced';
    badge.innerHTML = '<span class="status-dot"></span> สมดุล (Balanced)';
  } else {
    badge.className = 'kpi-badge badge-unbalanced';
    badge.innerHTML = '<span class="status-dot"></span> ไม่สมดุล (Unbalanced)';
  }

  // 2. Render History
  renderHistory();

  // 3. Render Workspace Comparative Tables (Selected periods, max 3)
  renderComparativeBalanceSheet(data, selectedComparePeriods, 'bs-table-head', 'bs-table-body');
  renderComparativeIncomeStatement(data, selectedComparePeriods, 'pl-table-head', 'pl-table-body');
  renderComparativeCashFlow(data, selectedComparePeriods, 'cf-table-head', 'cf-table-body');

  // Render Multi Audit Pills for Workspace
  const auditContainer = document.getElementById('bs-multi-audit');
  auditContainer.innerHTML = selectedComparePeriods.map(p => {
    const isOk = data.periodResults[p]?.isBalanced !== false;
    return `
      <div class="audit-period-pill ${isOk ? 'is-ok' : 'is-err'}">
        <span>${p}:</span>
        <strong>${isOk ? 'Balanced ✅' : 'Unbalanced ⚠️'}</strong>
      </div>
    `;
  }).join('');

  // 4. Render Full Report Tables (All periods without limit)
  renderComparativeBalanceSheet(data, periods, 'full-bs-table-head', 'full-bs-table-body');
  renderComparativeIncomeStatement(data, periods, 'full-pl-table-head', 'full-pl-table-body');
  renderComparativeCashFlow(data, periods, 'full-cf-table-head', 'full-cf-table-body');
}

// Render General Journal History
function renderHistory() {
  const container = document.getElementById('history-list');
  const countEl = document.getElementById('history-count');
  countEl.textContent = transactions.length;

  if (transactions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <p>ยังไม่มีรายการบันทึกบัญชี</p>
        <small>กรอกข้อมูลในฟอร์มด้านบน หรือคลิกเหตุการณ์จำลองเพื่อเริ่มต้น</small>
      </div>
    `;
    return;
  }

  container.innerHTML = transactions
    .map(
      (tx) => `
    <div class="history-item ${editingTransactionId === tx.id ? 'is-active-edit' : ''}">
      <div class="history-item-top">
        <div class="history-title-row">
          <span class="badge-period">${tx.period || periods[0]}</span>
          <div class="history-memo">#${tx.id} - ${tx.memo}</div>
          <span class="history-time">(${tx.timestamp})</span>
        </div>
        <div class="history-actions">
          <button class="btn-edit-entry" onclick="startEditTransaction(${tx.id})" title="แก้ไขรายการนี้">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            แก้ไข
          </button>
          <button class="btn-delete-entry" onclick="deleteTransaction(${tx.id})" title="ลบรายการนี้">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            ลบ
          </button>
        </div>
      </div>
      <div class="history-lines">
        ${tx.lines
          .map(
            (l) => `
          <div class="history-line-row">
            <div class="history-line-left">
              <span class="badge-side ${l.side === 'Dr' ? 'badge-dr' : 'badge-cr'}">${l.side}</span>
              <span>${l.accountName}</span>
              <span class="badge-type-tag badge-type-${l.accountType}">${l.accountType}</span>
            </div>
            <div class="history-line-amt">${formatMoney(l.amount)}</div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `
    )
    .join('');
}

// 1. Generic Render Comparative Balance Sheet Table
function renderComparativeBalanceSheet(data, targetPeriods, theadId, tbodyId) {
  const thead = document.getElementById(theadId);
  const tbody = document.getElementById(tbodyId);
  if (!thead || !tbody) return;

  thead.innerHTML = `<th>รายการ (Line Items)</th>` + targetPeriods.map(p => `<th>${p}</th>`).join('');

  let html = '';

  // Assets Section
  html += `<tr class="row-section-header asset-sec"><td colspan="${targetPeriods.length + 1}">สินทรัพย์ (Assets) — สะสมต่อเนื่อง</td></tr>`;
  if (data.allAssetNames.length === 0) {
    html += `<tr><td><em>ยังไม่มีรายการสินทรัพย์</em></td>` + targetPeriods.map(() => `<td>฿0.00</td>`).join('') + `</tr>`;
  } else {
    data.allAssetNames.forEach((acc) => {
      html += `<tr><td>${acc}</td>` + targetPeriods.map(p => {
        const val = data.periodResults[p]?.assets[acc] || 0;
        return `<td>${formatMoney(val)}</td>`;
      }).join('') + `</tr>`;
    });
  }

  // Subtotal Total Assets
  html += `<tr class="row-subtotal"><td><strong>รวมสินทรัพย์ (Total Assets)</strong></td>` + targetPeriods.map(p => {
    return `<td><strong>${formatMoney(data.periodResults[p]?.totalAssets || 0)}</strong></td>`;
  }).join('') + `</tr>`;

  // Liabilities Section
  html += `<tr class="row-section-header liab-sec"><td colspan="${targetPeriods.length + 1}">หนี้สิน (Liabilities) — สะสมต่อเนื่อง</td></tr>`;
  if (data.allLiabNames.length === 0) {
    html += `<tr><td><em>ยังไม่มีรายการหนี้สิน</em></td>` + targetPeriods.map(() => `<td>฿0.00</td>`).join('') + `</tr>`;
  } else {
    data.allLiabNames.forEach((acc) => {
      html += `<tr><td>${acc}</td>` + targetPeriods.map(p => {
        const val = data.periodResults[p]?.liabilities[acc] || 0;
        return `<td>${formatMoney(val)}</td>`;
      }).join('') + `</tr>`;
    });
  }
  html += `<tr class="row-subtotal"><td>รวมหนี้สิน (Total Liabilities)</td>` + targetPeriods.map(p => {
    return `<td>${formatMoney(data.periodResults[p]?.totalLiabilities || 0)}</td>`;
  }).join('') + `</tr>`;

  // Equity Section
  html += `<tr class="row-section-header equity-sec"><td colspan="${targetPeriods.length + 1}">ส่วนของเจ้าของ (Equity)</td></tr>`;
  if (data.allEquityNames.length > 0) {
    data.allEquityNames.forEach((acc) => {
      html += `<tr><td>${acc}</td>` + targetPeriods.map(p => {
        const val = data.periodResults[p]?.equityContributed[acc] || 0;
        return `<td>${formatMoney(val)}</td>`;
      }).join('') + `</tr>`;
    });
  }

  // Cumulative Retained Earnings row
  html += `<tr class="row-retained-earnings"><td>กำไรสะสมยกมาจาก P&L (Retained Earnings)</td>` + targetPeriods.map(p => {
    const val = data.periodResults[p]?.retainedEarnings || 0;
    return `<td><strong>${formatMoney(val)}</strong></td>`;
  }).join('') + `</tr>`;

  html += `<tr class="row-subtotal"><td>รวมส่วนของเจ้าของ (Total Equity)</td>` + targetPeriods.map(p => {
    return `<td>${formatMoney(data.periodResults[p]?.totalEquity || 0)}</td>`;
  }).join('') + `</tr>`;

  // Grand Total Liabilities and Equity
  html += `<tr class="row-grand-total"><td>รวมหนี้สินและส่วนของเจ้าของ (Total Liab & Equity)</td>` + targetPeriods.map(p => {
    return `<td><strong>${formatMoney(data.periodResults[p]?.totalLiabilitiesAndEquity || 0)}</strong></td>`;
  }).join('') + `</tr>`;

  tbody.innerHTML = html;
}

// 2. Generic Render Comparative P&L Statement Table
function renderComparativeIncomeStatement(data, targetPeriods, theadId, tbodyId) {
  const thead = document.getElementById(theadId);
  const tbody = document.getElementById(tbodyId);
  if (!thead || !tbody) return;

  thead.innerHTML = `<th>รายการ (Line Items)</th>` + targetPeriods.map(p => `<th>${p}</th>`).join('');

  let html = '';

  // Revenue Section
  html += `<tr class="row-section-header rev-sec"><td colspan="${targetPeriods.length + 1}">รายได้ (Revenues) — เฉพาะงวด</td></tr>`;
  if (data.allRevNames.length === 0) {
    html += `<tr><td><em>ยังไม่มีรายการรายได้</em></td>` + targetPeriods.map(() => `<td>฿0.00</td>`).join('') + `</tr>`;
  } else {
    data.allRevNames.forEach((acc) => {
      html += `<tr><td>${acc}</td>` + targetPeriods.map(p => {
        const val = data.periodResults[p]?.revenues[acc] || 0;
        return `<td>${formatMoney(val)}</td>`;
      }).join('') + `</tr>`;
    });
  }
  html += `<tr class="row-subtotal"><td>รวมรายได้ (Total Revenue)</td>` + targetPeriods.map(p => {
    return `<td><strong style="color: #38bdf8;">${formatMoney(data.periodResults[p]?.totalRevenue || 0)}</strong></td>`;
  }).join('') + `</tr>`;

  // Expense Section
  html += `<tr class="row-section-header exp-sec"><td colspan="${targetPeriods.length + 1}">ค่าใช้จ่าย (Expenses) — เฉพาะงวด</td></tr>`;
  if (data.allExpNames.length === 0) {
    html += `<tr><td><em>ยังไม่มีรายการค่าใช้จ่าย</em></td>` + targetPeriods.map(() => `<td>฿0.00</td>`).join('') + `</tr>`;
  } else {
    data.allExpNames.forEach((acc) => {
      html += `<tr><td>${acc}</td>` + targetPeriods.map(p => {
        const val = data.periodResults[p]?.expenses[acc] || 0;
        return `<td>${formatMoney(val)}</td>`;
      }).join('') + `</tr>`;
    });
  }
  html += `<tr class="row-subtotal"><td>รวมค่าใช้จ่าย (Total Expenses)</td>` + targetPeriods.map(p => {
    return `<td><strong style="color: #fb7185;">${formatMoney(data.periodResults[p]?.totalExpenses || 0)}</strong></td>`;
  }).join('') + `</tr>`;

  // Net Income Grand Total
  html += `<tr class="row-grand-total"><td>กำไร (ขาดทุน) สุทธิประจำงวด (Net Income)</td>` + targetPeriods.map(p => {
    const ni = data.periodResults[p]?.netIncome || 0;
    const color = ni < 0 ? '#fb7185' : '#38bdf8';
    return `<td><strong style="color: ${color}; font-size: 1.05rem;">${formatMoney(ni)}</strong></td>`;
  }).join('') + `</tr>`;

  tbody.innerHTML = html;
}

// 3. Generic Render Comparative Cash Flow Statement Table
function renderComparativeCashFlow(data, targetPeriods, theadId, tbodyId) {
  const thead = document.getElementById(theadId);
  const tbody = document.getElementById(tbodyId);
  if (!thead || !tbody) return;

  thead.innerHTML = `<th>รายการ (Line Items)</th>` + targetPeriods.map(p => `<th>${p}</th>`).join('');

  let html = '';

  // CFO
  html += `<tr class="row-section-header cf-sec"><td colspan="${targetPeriods.length + 1}">1. กิจกรรมดำเนินงาน (Operating Activities - CFO)</td></tr>`;
  html += `<tr><td>กระแสเงินสดสุทธิจากกิจกรรมดำเนินงาน</td>` + targetPeriods.map(p => {
    return `<td>${formatMoney(data.periodResults[p]?.cfo || 0)}</td>`;
  }).join('') + `</tr>`;

  // CFI
  html += `<tr class="row-section-header cf-sec"><td colspan="${targetPeriods.length + 1}">2. กิจกรรมลงทุน (Investing Activities - CFI)</td></tr>`;
  html += `<tr><td>กระแสเงินสดสุทธิจากกิจกรรมลงทุน</td>` + targetPeriods.map(p => {
    return `<td>${formatMoney(data.periodResults[p]?.cfi || 0)}</td>`;
  }).join('') + `</tr>`;

  // CFF
  html += `<tr class="row-section-header cf-sec"><td colspan="${targetPeriods.length + 1}">3. กิจกรรมจัดหาเงิน (Financing Activities - CFF)</td></tr>`;
  html += `<tr><td>กระแสเงินสดสุทธิจากกิจกรรมจัดหาเงิน</td>` + targetPeriods.map(p => {
    return `<td>${formatMoney(data.periodResults[p]?.cff || 0)}</td>`;
  }).join('') + `</tr>`;

  // Net Change
  html += `<tr class="row-subtotal"><td>กระแสเงินสดสุทธิเพิ่มขึ้น (ลดลง) ประจำงวด</td>` + targetPeriods.map(p => {
    return `<td><strong>${formatMoney(data.periodResults[p]?.netCashChange || 0)}</strong></td>`;
  }).join('') + `</tr>`;

  // Beginning Cash
  html += `<tr><td>บวก: เงินสดต้นงวดยกมาจากงวดก่อน (Beginning Cash)</td>` + targetPeriods.map(p => {
    return `<td>${formatMoney(data.periodResults[p]?.beginningCash || 0)}</td>`;
  }).join('') + `</tr>`;

  // Ending Cash
  html += `<tr class="row-grand-total"><td>เงินสดและรายการเทียบเท่าเงินสดปลายงวด (Ending Cash)</td>` + targetPeriods.map(p => {
    return `<td><strong style="color: #34d399; font-size: 1.05rem;">${formatMoney(data.periodResults[p]?.endingCash || 0)}</strong></td>`;
  }).join('') + `</tr>`;

  tbody.innerHTML = html;
}

// Global functions for onclick
window.startEditTransaction = startEditTransaction;
window.deleteTransaction = deleteTransaction;
