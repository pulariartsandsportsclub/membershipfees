/**
 * Pulari Arts & Sports Club - Membership Management System
 * Members Management Module (js/members.js)
 */

let memberSearchQuery = '';
let memberStatusFilter = 'All';

function renderMembersPage() {
  const tbody = document.getElementById('members-table-body');
  if (!tbody) return;

  const filtered = AppState.members.filter(m => {
    const matchesSearch = 
      m.fullName.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      m.memberId.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      (m.phone && m.phone.includes(memberSearchQuery));
    
    const matchesStatus = 
      memberStatusFilter === 'All' || 
      m.status === memberStatusFilter;

    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
          <p>No members found matching your search or filter.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(m => `
    <tr>
      <td><strong>${m.memberId}</strong></td>
      <td>${m.fullName}</td>
      <td>${m.phone || '—'}</td>
      <td>${m.joinDate || '—'}</td>
      <td>
        <span class="badge ${m.status === 'Active' ? 'badge-active' : 'badge-inactive'}">
          ${m.status}
        </span>
      </td>
      <td>
        <div style="display:flex; gap:0.4rem;">
          <button class="btn btn-outline btn-sm" onclick="viewMemberDetails('${m.memberId}')">View</button>
          <button class="btn btn-outline btn-sm" onclick="openEditMemberModal('${m.memberId}')">Edit</button>
          ${m.status === 'Active' ? `
            <button class="btn btn-danger btn-sm" onclick="deactivateMemberPrompt('${m.memberId}')">Deactivate</button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

/**
 * Filter & Search Event Listeners setup
 */
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('member-search');
  const statusFilterSelect = document.getElementById('member-status-filter');
  const addBtn = document.getElementById('btn-add-member');
  const memberForm = document.getElementById('add-member-form');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      memberSearchQuery = e.target.value;
      renderMembersPage();
    });
  }

  if (statusFilterSelect) {
    statusFilterSelect.addEventListener('change', (e) => {
      memberStatusFilter = e.target.value;
      renderMembersPage();
    });
  }

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      openAddMemberModal();
    });
  }

  if (memberForm) {
    memberForm.addEventListener('submit', handleMemberFormSubmit);
  }
});

/**
 * Auto-generate next Member ID (e.g., PUL001, PUL002...)
 */
function generateNextMemberId() {
  const existingIds = AppState.members.map(m => m.memberId);
  let maxNum = 0;

  existingIds.forEach(id => {
    const match = id.match(/PUL(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });

  const nextNum = maxNum + 1;
  return `PUL${String(nextNum).padStart(3, '0')}`;
}

/**
 * Open Add Member Modal with prefilled defaults
 */
function openAddMemberModal() {
  const form = document.getElementById('add-member-form');
  if (!form) return;

  form.reset();
  document.getElementById('member-modal-title').textContent = 'Add New Member';
  document.getElementById('member-id-input').value = generateNextMemberId();
  document.getElementById('member-join-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('member-fee-input').value = AppState.settings.monthly_fee || 30;
  document.getElementById('member-status-input').value = 'Active';
  document.getElementById('member-is-edit').value = 'false';

  openModal('member-form-modal');
}

/**
 * Open Edit Member Modal
 */
function openEditMemberModal(memberId) {
  const member = AppState.members.find(m => m.memberId === memberId);
  if (!member) return;

  document.getElementById('member-modal-title').textContent = 'Edit Member Details';
  document.getElementById('member-id-input').value = member.memberId;
  document.getElementById('member-name-input').value = member.fullName;
  document.getElementById('member-phone-input').value = member.phone || '';
  document.getElementById('member-address-input').value = member.address || '';
  document.getElementById('member-join-date').value = member.joinDate || new Date().toISOString().split('T')[0];
  document.getElementById('member-fee-input').value = member.monthlyFee || AppState.settings.monthly_fee || 30;
  document.getElementById('member-status-input').value = member.status || 'Active';
  document.getElementById('member-notes-input').value = member.notes || '';
  document.getElementById('member-is-edit').value = 'true';

  openModal('member-form-modal');
}

/**
 * Handle Add/Edit Form Submission
 */
async function handleMemberFormSubmit(e) {
  e.preventDefault();
  const isEdit = document.getElementById('member-is-edit').value === 'true';

  const memberData = {
    memberId: document.getElementById('member-id-input').value.trim(),
    fullName: document.getElementById('member-name-input').value.trim(),
    phone: document.getElementById('member-phone-input').value.trim(),
    address: document.getElementById('member-address-input').value.trim(),
    joinDate: document.getElementById('member-join-date').value,
    monthlyFee: Number(document.getElementById('member-fee-input').value || 30),
    status: document.getElementById('member-status-input').value,
    notes: document.getElementById('member-notes-input').value.trim()
  };

  if (!memberData.memberId || !memberData.fullName) {
    showToast('Please fill in Member ID and Full Name.', 'warning');
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';

  const action = isEdit ? 'UPDATE_MEMBER' : 'ADD_MEMBER';
  const res = await apiCall(action, memberData);

  submitBtn.disabled = false;
  submitBtn.textContent = 'Save Member';

  if (res.success) {
    closeModal('member-form-modal');
    showToast(res.message, 'success');
    refreshAppData();
  } else {
    showToast(res.message || 'Failed to save member.', 'error');
  }
}

/**
 * Deactivate Member Confirmation
 */
async function deactivateMemberPrompt(memberId) {
  const member = AppState.members.find(m => m.memberId === memberId);
  if (!member) return;

  if (confirm(`Are you sure you want to deactivate member ${member.fullName} (${member.memberId})?`)) {
    const res = await apiCall('DEACTIVATE_MEMBER', { memberId });
    if (res.success) {
      showToast('Member deactivated.', 'success');
      refreshAppData();
    } else {
      showToast(res.message || 'Error deactivating member.', 'error');
    }
  }
}

/**
 * View Member Details & Complete Payment History Modal
 */
function viewMemberDetails(memberId) {
  const member = AppState.members.find(m => m.memberId === memberId);
  if (!member) return;

  document.getElementById('view-member-name').textContent = member.fullName;
  document.getElementById('view-member-id').textContent = member.memberId;
  document.getElementById('view-member-phone').textContent = member.phone || 'N/A';
  document.getElementById('view-member-join').textContent = member.joinDate || 'N/A';
  document.getElementById('view-member-status').textContent = member.status;
  document.getElementById('view-member-fee').textContent = formatCurrency(member.monthlyFee || AppState.settings.monthly_fee);

  // Render payment history for this member
  const memberPayments = AppState.payments
    .filter(p => p.memberId === memberId)
    .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

  const historyTbody = document.getElementById('view-member-payments-body');
  if (historyTbody) {
    if (memberPayments.length === 0) {
      historyTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#94a3b8;">No payment records found.</td></tr>`;
    } else {
      historyTbody.innerHTML = memberPayments.map(p => `
        <tr>
          <td>${p.month} ${p.year}</td>
          <td>${formatCurrency(p.amount)}</td>
          <td><span class="badge badge-paid">${p.status}</span></td>
          <td>${p.paymentDate}</td>
          <td>${p.paymentMethod || 'Cash'}</td>
        </tr>
      `).join('');
    }
  }

  openModal('member-details-modal');
}
