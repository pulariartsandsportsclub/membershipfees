/**
 * Pulari Arts & Sports Club - Membership Management System
 * Official Certificate Generation Module (js/certificates.js)
 */

const CertState = {
  selectedType: 'appreciation',
  selectedMemberId: '',
  recipientName: 'Muhammed Ali',
  memberId: 'PLC-001',
  recipientRole: 'Active Club Member',
  title: 'CERTIFICATE OF APPRECIATION',
  event: 'Annual Club Activities & Social Service',
  body: 'This certificate is proudly presented in sincere appreciation and recognition of outstanding dedication, valuable service, and continuous commitment toward the initiatives and success of Pulari Arts & Sports Club.',
  refNo: '',
  issueDate: new Date().toISOString().split('T')[0],
  theme: 'royal-gold',
  orientation: 'landscape',
  signatorySecretary: 'General Secretary',
  signatoryPresident: 'President',
  logoBase64: null
};

// Preset Templates
const CERTIFICATE_PRESETS = {
  membership: {
    title: 'CERTIFICATE OF MEMBERSHIP',
    role: 'Registered Active Member',
    event: 'Club Membership Register',
    body: 'This is to officially certify that the aforementioned individual is a registered and esteemed active member in good standing of Pulari Arts & Sports Club. We honor their association and ongoing contribution to the club.'
  },
  appreciation: {
    title: 'CERTIFICATE OF APPRECIATION',
    role: 'Distinguished Contributor',
    event: 'Annual Club Activities & Community Service',
    body: 'This certificate is proudly presented in sincere appreciation and recognition of outstanding dedication, valuable service, and continuous commitment toward the initiatives and success of Pulari Arts & Sports Club.'
  },
  sports: {
    title: 'CERTIFICATE OF SPORTS EXCELLENCE',
    role: 'Winner / Tournament Champion',
    event: 'Annual Sports & Games Meet',
    body: 'Awarded for demonstrating exceptional athletic skill, remarkable sportsmanship, and securing a meritorious position in the sports tournament organized by Pulari Arts & Sports Club.'
  },
  arts: {
    title: 'CERTIFICATE OF CULTURAL MERIT',
    role: 'First Prize Winner - Cultural Arts',
    event: 'Annual Arts & Cultural Festival',
    body: 'Conferred in recognition of outstanding artistic brilliance, exceptional creative performance, and commendable achievement in the cultural competitions conducted by Pulari Arts & Sports Club.'
  },
  participation: {
    title: 'CERTIFICATE OF PARTICIPATION',
    role: 'Active Participant',
    event: 'Club Workshop & Sports Coaching Camp',
    body: 'This is to certify active and successful participation in the program conducted under the auspices of Pulari Arts & Sports Club, showing praiseworthy dedication and enthusiasm.'
  },
  custom: {
    title: 'OFFICIAL CLUB CERTIFICATE',
    role: 'Club Associate',
    event: 'Pulari Special Initiatives',
    body: 'This certificate is issued by the authority of Pulari Arts & Sports Club in formal recognition of exemplary conduct, distinguished service, and praiseworthy association.'
  }
};

/**
 * Initialize Certificates Page
 */
document.addEventListener('DOMContentLoaded', () => {
  initCertificatesModule();
});

function initCertificatesModule() {
  generateDefaultRefNo();
  loadCertLogoBase64();
  bindCertificateEvents();
}

/**
 * Render the Certificates Page View when tab opens
 */
function renderCertificatesPage() {
  populateCertMembersDropdown();
  syncFormFromState();
  renderCertificateCanvas();
}

/**
 * Generate a clean serial reference number (e.g. PULARI/CERT/2026/014)
 */
function generateDefaultRefNo() {
  const year = new Date().getFullYear();
  const randNum = Math.floor(100 + Math.random() * 900);
  CertState.refNo = `PULARI/CERT/${year}/${randNum}`;
}

/**
 * Pre-load logo as base64 to avoid canvas taint in html2pdf
 */
function loadCertLogoBase64() {
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = function () {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      CertState.logoBase64 = canvas.toDataURL('image/png');
      renderCertificateCanvas();
    } catch (e) {
      CertState.logoBase64 = 'PULARI.png';
    }
  };
  img.onerror = function () {
    CertState.logoBase64 = 'PULARI.png';
  };
  img.src = 'PULARI.png';
}

/**
 * Populate Members Quick-Fill Dropdown
 */
function populateCertMembersDropdown() {
  const select = document.getElementById('cert-member-select');
  if (!select) return;

  const members = (AppState.members || []).filter(m => m.status === 'Active');
  const currentVal = select.value;

  select.innerHTML = '<option value="">-- Choose registered member or enter manually --</option>' +
    members.map(m => `<option value="${escapeCertHtml(m.memberId)}">${escapeCertHtml(m.fullName)} (${m.memberId})</option>`).join('');

  if (currentVal && members.some(m => m.memberId === currentVal)) {
    select.value = currentVal;
  }
}

/**
 * Synchronize UI inputs with CertState
 */
function syncFormFromState() {
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val ?? '';
  };

  setVal('cert-type-select', CertState.selectedType);
  setVal('cert-recipient-name', CertState.recipientName);
  setVal('cert-member-id', CertState.memberId);
  setVal('cert-recipient-role', CertState.recipientRole);
  setVal('cert-title-input', CertState.title);
  setVal('cert-event-input', CertState.event);
  setVal('cert-body-input', CertState.body);
  setVal('cert-ref-no', CertState.refNo);
  setVal('cert-issue-date', CertState.issueDate);
  setVal('cert-theme-select', CertState.theme);
  setVal('cert-orientation-select', CertState.orientation);
  setVal('cert-signatory-secretary', CertState.signatorySecretary);
  setVal('cert-signatory-president', CertState.signatoryPresident);
}

/**
 * Bind Interactive Form Controls
 */
function bindCertificateEvents() {
  const getEl = id => document.getElementById(id);

  // Preset Selector
  getEl('cert-type-select')?.addEventListener('change', (e) => {
    const type = e.target.value;
    CertState.selectedType = type;
    const preset = CERTIFICATE_PRESETS[type] || CERTIFICATE_PRESETS.appreciation;
    
    CertState.title = preset.title;
    CertState.recipientRole = preset.role;
    CertState.event = preset.event;
    CertState.body = preset.body;

    syncFormFromState();
    renderCertificateCanvas();
  });

  // Member Quick-Fill Dropdown
  getEl('cert-member-select')?.addEventListener('change', (e) => {
    const memberId = e.target.value;
    CertState.selectedMemberId = memberId;

    if (memberId) {
      const member = (AppState.members || []).find(m => m.memberId === memberId);
      if (member) {
        CertState.recipientName = member.fullName || '';
        CertState.memberId = member.memberId || '';
        if (CertState.selectedType === 'membership') {
          CertState.recipientRole = `Registered Active Member • Join Date: ${formatCertDate(member.joinDate)}`;
        }
      }
    }
    syncFormFromState();
    renderCertificateCanvas();
  });

  // Live Text Inputs
  const liveBindings = [
    { id: 'cert-recipient-name', prop: 'recipientName' },
    { id: 'cert-member-id', prop: 'memberId' },
    { id: 'cert-recipient-role', prop: 'recipientRole' },
    { id: 'cert-title-input', prop: 'title' },
    { id: 'cert-event-input', prop: 'event' },
    { id: 'cert-body-input', prop: 'body' },
    { id: 'cert-ref-no', prop: 'refNo' },
    { id: 'cert-issue-date', prop: 'issueDate' },
    { id: 'cert-theme-select', prop: 'theme' },
    { id: 'cert-orientation-select', prop: 'orientation' },
    { id: 'cert-signatory-secretary', prop: 'signatorySecretary' },
    { id: 'cert-signatory-president', prop: 'signatoryPresident' }
  ];

  liveBindings.forEach(({ id, prop }) => {
    const el = getEl(id);
    if (!el) return;
    const eventName = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(eventName, (e) => {
      CertState[prop] = e.target.value;
      renderCertificateCanvas();
    });
  });

  // Action Buttons
  getEl('btn-cert-reset')?.addEventListener('click', () => {
    generateDefaultRefNo();
    CertState.selectedType = 'appreciation';
    const preset = CERTIFICATE_PRESETS.appreciation;
    CertState.recipientName = 'Muhammed Ali';
    CertState.memberId = 'PLC-001';
    CertState.recipientRole = preset.role;
    CertState.title = preset.title;
    CertState.event = preset.event;
    CertState.body = preset.body;
    CertState.issueDate = new Date().toISOString().split('T')[0];
    CertState.theme = 'royal-gold';
    CertState.orientation = 'landscape';
    CertState.signatorySecretary = 'General Secretary';
    CertState.signatoryPresident = 'President';
    
    syncFormFromState();
    renderCertificateCanvas();
    showToast('Certificate form reset to default.', 'info');
  });

  getEl('btn-cert-download-pdf')?.addEventListener('click', downloadCertificatePDF);
}

/**
 * Format ISO date string into formal English format (e.g. 08 October 2026)
 */
function formatCertDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Render the Live Certificate Canvas HTML
 */
function renderCertificateCanvas() {
  const canvas = document.getElementById('certificate-canvas');
  if (!canvas) return;

  const clubName = (AppState.settings && AppState.settings.club_name) || "Pulari Arts & Sports Club";
  const logoSrc = CertState.logoBase64 || 'PULARI.png';
  const formattedDate = formatCertDate(CertState.issueDate);

  // Apply Theme & Orientation CSS classes
  canvas.className = `certificate-paper theme-${CertState.theme} orientation-${CertState.orientation}`;

  canvas.innerHTML = `
    <!-- Concentric Double Ornate Border Frame -->
    <div class="cert-frame-outer">
      <div class="cert-frame-middle">
        <div class="cert-frame-inner">

          <!-- Corner Filigree Ornaments (Pure CSS for 100% Vector/Canvas Precision) -->
          <div class="cert-corner corner-tl">
            <div class="corner-outer"></div>
            <div class="corner-inner"></div>
            <div class="corner-accent-diamond"></div>
            <div class="corner-accent-dot"></div>
          </div>
          <div class="cert-corner corner-tr">
            <div class="corner-outer"></div>
            <div class="corner-inner"></div>
            <div class="corner-accent-diamond"></div>
            <div class="corner-accent-dot"></div>
          </div>
          <div class="cert-corner corner-bl">
            <div class="corner-outer"></div>
            <div class="corner-inner"></div>
            <div class="corner-accent-diamond"></div>
            <div class="corner-accent-dot"></div>
          </div>
          <div class="cert-corner corner-br">
            <div class="corner-outer"></div>
            <div class="corner-inner"></div>
            <div class="corner-accent-diamond"></div>
            <div class="corner-accent-dot"></div>
          </div>

          <!-- Translucent Background Watermark Crest -->
          <div class="cert-watermark" aria-hidden="true">
            <img src="${logoSrc}" alt="Watermark Emblem">
          </div>

          <!-- Top Meta Bar: Serial Number & Date -->
          <div class="cert-top-meta-bar">
            <div class="cert-meta-item">
              <span class="meta-label">REF NO:</span>
              <strong class="meta-val">${escapeCertHtml(CertState.refNo || 'PULARI/CERT/2026/001')}</strong>
            </div>
            <div class="cert-meta-item text-right">
              <span class="meta-label">DATE:</span>
              <strong class="meta-val">${escapeCertHtml(formattedDate)}</strong>
            </div>
          </div>

          <!-- Certificate Header: Club Logo & Name -->
          <div class="cert-header-block">
            <div class="cert-logo-wrap">
              <img src="${logoSrc}" alt="Pulari Club Crest" class="cert-club-logo">
            </div>
            <div class="cert-club-title-group">
              <h1 class="cert-club-main-title">${escapeCertHtml(clubName.toUpperCase())}</h1>
              <div class="cert-club-tagline-bar">
                <span>MPM/CA/355/2017 - MALAPPURAM KERALA</span>
              </div>
            </div>
          </div>

          <!-- Gold Regal Divider Ribbon -->
          <div class="cert-gold-ribbon">
            <div class="ribbon-line"></div>
            <div class="ribbon-diamond-box"></div>
            <div class="ribbon-line"></div>
          </div>

          <!-- Certificate Major Heading -->
          <div class="cert-title-section">
            <h2 class="cert-primary-heading">${escapeCertHtml(CertState.title || 'CERTIFICATE OF APPRECIATION')}</h2>
          </div>

          <!-- Formal Presentation Line -->
          <div class="cert-present-lead">
            <span>THIS CERTIFICATE IS PROUDLY PRESENTED TO</span>
          </div>

          <!-- Recipient Name Block -->
          <div class="cert-recipient-wrapper">
            <div class="cert-recipient-name">${escapeCertHtml(CertState.recipientName || 'RECIPIENT NAME')}</div>
            <div class="cert-recipient-underline"></div>
            ${CertState.recipientRole || CertState.memberId ? `
              <div class="cert-recipient-meta">
                ${CertState.memberId ? `<span class="cert-badge-chip">ID: ${escapeCertHtml(CertState.memberId)}</span>` : ''}
                ${CertState.recipientRole ? `<span class="cert-role-text">${escapeCertHtml(CertState.recipientRole)}</span>` : ''}
              </div>
            ` : ''}
          </div>

          <!-- Certificate Body Description Paragraph -->
          <div class="cert-body-section">
            <p class="cert-body-paragraph">
              ${escapeCertHtml(CertState.body || '')}
            </p>
            ${CertState.event ? `
              <div class="cert-event-highlight">
                <span class="event-icon">✦</span> <strong>${escapeCertHtml(CertState.event)}</strong> <span class="event-icon">✦</span>
              </div>
            ` : ''}
          </div>

          <!-- Bottom Footer Area: Signatures -->
          <div class="cert-footer-section">

            <!-- Left Signatory: General Secretary -->
            <div class="cert-signatory-block left-sign">
              <div class="cert-sign-space">
                <div class="cert-simulated-sign">Pulari Sec.</div>
                <div class="cert-sign-line"></div>
              </div>
              <div class="cert-sign-designation">${escapeCertHtml(CertState.signatorySecretary || 'General Secretary')}</div>
              <div class="cert-sign-club">${escapeCertHtml(clubName)}</div>
            </div>

            <!-- Right Signatory: President -->
            <div class="cert-signatory-block right-sign">
              <div class="cert-sign-space">
                <div class="cert-simulated-sign president-sign">President</div>
                <div class="cert-sign-line president-line"></div>
              </div>
              <div class="cert-sign-designation president-designation">
                <span class="president-title-main">${escapeCertHtml(CertState.signatoryPresident || 'President')}</span>
              </div>
              <div class="cert-sign-club">${escapeCertHtml(clubName)}</div>
            </div>

          </div>

          <!-- Bottom Micro Security Footer -->
          <div class="cert-micro-footer">
            <span>Official Certificate issued by ${escapeCertHtml(clubName)} • Verification via Club Office</span>
          </div>

        </div>
      </div>
    </div>
  `;
}

/**
 * Generate Exact 1-Page High-Resolution PDF matching live preview with 100% precision
 */
async function downloadCertificatePDF() {
  const canvas = document.getElementById('certificate-canvas');
  if (!canvas) {
    showToast('Certificate element not found.', 'error');
    return;
  }

  showToast('Rendering high-resolution certificate PDF...', 'info');

  const recipientClean = (CertState.recipientName || 'Member').replace(/[^a-zA-Z0-9_\u0D00-\u0D7F]/g, '_');
  const year = new Date().getFullYear();
  const filename = `Pulari_Certificate_${recipientClean}_${year}.pdf`;
  const isLandscape = CertState.orientation === 'landscape';

  // Ensure Base64 image and web fonts are fully loaded
  if (!CertState.logoBase64) {
    await new Promise(r => setTimeout(r, 200));
  }
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const pdfWidth = isLandscape ? 297 : 210;
  const pdfHeight = isLandscape ? 210 : 297;
  const viewport = document.getElementById('cert-viewport');
  const origScrollLeft = viewport ? viewport.scrollLeft : 0;
  const origScrollTop = viewport ? viewport.scrollTop : 0;
  const origBoxShadow = canvas.style.boxShadow;

  try {
    if (viewport) {
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    }
    canvas.style.boxShadow = 'none';

    const html2canvasFunc = window.html2canvas || (typeof html2pdf !== 'undefined' && html2pdf.Worker && window.html2canvas);
    
    if (typeof html2canvasFunc === 'function') {
      const renderedCanvas = await html2canvasFunc(canvas, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0
      });

      const imgData = renderedCanvas.toDataURL('image/jpeg', 0.98);
      const jsPdfConstructor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;

      if (jsPdfConstructor) {
        const pdf = new jsPdfConstructor({
          orientation: isLandscape ? 'landscape' : 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true
        });

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        pdf.save(filename);
        showToast(`Certificate for "${CertState.recipientName}" downloaded successfully!`, 'success');
        return;
      }
    }

    // Fallback via html2pdf bundle if direct jsPDF instance is not available
    if (typeof html2pdf !== 'undefined') {
      const opt = {
        margin: 0,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, logging: false, scrollX: 0, scrollY: 0, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: CertState.orientation },
        pagebreak: { mode: 'avoid-all' }
      };

      await html2pdf().set(opt).from(canvas).save();
      showToast(`Certificate for "${CertState.recipientName}" downloaded successfully!`, 'success');
    } else {
      throw new Error('PDF generator library not loaded.');
    }
  } catch (err) {
    console.error('PDF Generation Error:', err);
    showToast('Failed to generate PDF. Please try again.', 'error');
  } finally {
    canvas.style.boxShadow = origBoxShadow;
    if (viewport) {
      viewport.scrollLeft = origScrollLeft;
      viewport.scrollTop = origScrollTop;
    }
  }
}

/**
 * Helper to escape HTML safely
 */
function escapeCertHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

window.renderCertificatesPage = renderCertificatesPage;

