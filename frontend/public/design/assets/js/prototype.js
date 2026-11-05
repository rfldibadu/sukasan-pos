/**
 * Sukasan POS - Lightweight Prototype Utilities
 * Handles interactive behaviors for design mockups without complex frameworks.
 */

// Initialize Lucide icons on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }
  initEscapeKeyClose();
});

// Format numbers into Indonesian Rupiah format (e.g. 18000 -> "Rp 18.000")
function formatIDR(amount) {
  return 'Rp ' + Number(amount || 0).toLocaleString('id-ID');
}

// Modal helpers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (window.lucide) window.lucide.createIcons();
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}

// Drawer helpers (Slide-up bottom sheets for mobile / side drawer)
function openDrawer(drawerId) {
  const drawer = document.getElementById(drawerId);
  if (!drawer) return;
  drawer.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (window.lucide) window.lucide.createIcons();
}

function closeDrawer(drawerId) {
  const drawer = document.getElementById(drawerId);
  if (!drawer) return;
  drawer.classList.add('hidden');
  document.body.style.overflow = '';
}

// Tab Switching
function switchTab(containerSelector, activeBtn, targetId) {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  // Update button styles
  const buttons = container.querySelectorAll('[data-tab-button]');
  buttons.forEach(btn => {
    btn.classList.remove('bg-amber-100', 'text-amber-800', 'border-amber-600', 'font-semibold');
    btn.classList.add('text-slate-600', 'border-transparent', 'hover:text-slate-900');
  });

  if (activeBtn) {
    activeBtn.classList.remove('text-slate-600', 'border-transparent', 'hover:text-slate-900');
    activeBtn.classList.add('bg-amber-100', 'text-amber-800', 'border-amber-600', 'font-semibold');
  }

  // Update tab panels
  const panels = container.querySelectorAll('[data-tab-panel]');
  panels.forEach(panel => {
    panel.classList.add('hidden');
  });

  const targetPanel = document.getElementById(targetId);
  if (targetPanel) {
    targetPanel.classList.remove('hidden');
  }

  if (window.lucide) window.lucide.createIcons();
}

// Toast notification helper
function showToast(message, type = 'success') {
  let toastContainer = document.getElementById('prototype-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'prototype-toast-container';
    toastContainer.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  let bgClass = 'bg-slate-900 text-white';
  let iconName = 'info';

  if (type === 'success') {
    bgClass = 'bg-emerald-600 text-white';
    iconName = 'check-circle';
  } else if (type === 'error' || type === 'danger') {
    bgClass = 'bg-rose-600 text-white';
    iconName = 'alert-triangle';
  } else if (type === 'warning') {
    bgClass = 'bg-amber-600 text-white';
    iconName = 'alert-circle';
  }

  toast.className = `${bgClass} shadow-lg rounded-xl p-3.5 text-xs sm:text-sm font-medium flex items-center justify-between transition-all duration-300 transform translate-y-2 opacity-0 pointer-events-auto`;
  toast.innerHTML = `
    <div class="flex items-center gap-2">
      <i data-lucide="${iconName}" class="w-4 h-4"></i>
      <span>${message}</span>
    </div>
  `;

  toastContainer.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();

  // Animate in
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  // Animate out
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Shake animation for invalid inputs (e.g. wrong PIN)
function shakeElement(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.classList.add('animate-shake');
  setTimeout(() => el.classList.remove('animate-shake'), 500);
}

// Keyboard shortcuts (Escape key closes modals)
function initEscapeKeyClose() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const openModals = document.querySelectorAll('.fixed:not(.hidden)[id$="Modal"], .fixed:not(.hidden)[id$="Drawer"]');
      openModals.forEach(modal => {
        modal.classList.add('hidden');
      });
      document.body.style.overflow = '';
    }
  });
}
