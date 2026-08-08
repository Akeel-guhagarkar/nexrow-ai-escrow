// ================================================================
// SUPREMEX — Firebase Config & Shared Utilities
// Single source of truth — NO duplicates
// ================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ── FIREBASE CONFIG ──
const firebaseConfig = {
  apiKey: "AIzaSyAGVRcCFahhT0B8H6SGMrtAicShrr1HxBY",
  authDomain: "supremex-c7764.firebaseapp.com",
  projectId: "supremex-c7764",
  storageBucket: "supremex-c7764.firebasestorage.app",
  messagingSenderId: "895782620056",
  appId: "1:895782620056:web:d718998782d32ba00eb9ed",
};

const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);
const db      = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };

// ── GUARD: fallback to active or demo user without forced logout redirects ──
export function requireAuth(callback) {
  onAuthStateChanged(auth, user => {
    const activeUser = user || { uid: 'usr-demo-101', email: 'client@supremex.io' };
    callback(activeUser);
  });
}

// ── Set nav user email ──
export function setNavUser(user) {
  const el = document.getElementById('navUser');
  if (el && user) {
    el.textContent = user.email.length > 24
      ? user.email.slice(0, 22) + '…'
      : user.email;
  }
}

// ── Logout ──
export function setupLogout() {
  const btn = document.getElementById('logoutBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      const isInPages = window.location.pathname.includes('/pages/');
      signOut(auth).then(() => {
        window.location.href = isInPages ? '../index.html' : 'index.html';
      });
    });
  }
}

// ── Dark / Light Mode Toggle ──
export function initThemeToggle() {
  const savedTheme = localStorage.getItem('supremex-theme') || 'dark';
  const isLightInit = savedTheme === 'light';

  if (isLightInit) {
    document.documentElement.classList.add('light-theme');
    if (document.body) document.body.classList.add('light-theme');
  }

  let toggleBtn = document.getElementById('themeToggleBtn');
  const navRight = document.querySelector('.nav-right');

  if (!toggleBtn && navRight) {
    toggleBtn = document.createElement('button');
    toggleBtn.id = 'themeToggleBtn';
    toggleBtn.className = 'theme-toggle-btn';
    toggleBtn.type = 'button';
    navRight.insertBefore(toggleBtn, navRight.firstChild);
  }

  if (toggleBtn) {
    toggleBtn.innerHTML = isLightInit ? '☀️ Light' : '🌙 Dark';
    toggleBtn.onclick = () => {
      const isLight = document.body.classList.toggle('light-theme');
      document.documentElement.classList.toggle('light-theme', isLight);
      const newTheme = isLight ? 'light' : 'dark';
      localStorage.setItem('supremex-theme', newTheme);
      toggleBtn.innerHTML = isLight ? '☀️ Light' : '🌙 Dark';
    };
  }
}

// Automatically apply theme on script load
if (localStorage.getItem('supremex-theme') === 'light') {
  document.documentElement.classList.add('light-theme');
  if (document.body) document.body.classList.add('light-theme');
}
document.addEventListener('DOMContentLoaded', initThemeToggle);



// ── Generate Unique Deal Code (SUPX-XXXXX) ──
export function genDealCode() {
  const chars = '0123456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return 'SUPX-' + code;
}

// ── Legacy genDealId (kept for backward compat) ──
export function genDealId() {
  return 'SX-' + Date.now().toString(36).toUpperCase()
       + '-' + Math.random().toString(36).slice(2,5).toUpperCase();
}

// ── Generate OTP (4-digit random for demo) ──
export function generateOTP() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// ── Format currency ──
export function formatINR(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// ── Format timestamp ──
export function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ── Show alert ──
export function showAlert(containerId, type, message) {
  const icons = { error: '✕', success: '✓', info: 'ℹ', warning: '⚠' };
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <div class="alert alert-${type}">
      <span>${icons[type] || '•'}</span>
      <span>${message}</span>
    </div>`;
  setTimeout(() => { el.innerHTML = ''; }, 5000);
}

// ── Deal status config ──
export const STATUS = {
  WAITING_FOR_CLIENT: { label: 'Waiting for Client', badge: 'badge-muted',  icon: '○' },
  CLIENT_JOINED:      { label: 'Client Joined',      badge: 'badge-cyan',   icon: '🤝' },
  PENDING:            { label: 'Pending Payment',     badge: 'badge-muted',  icon: '○' },
  LOCKED:             { label: 'Payment Locked',      badge: 'badge-gold',   icon: '🔒' },
  DELIVERED:          { label: 'Delivered',            badge: 'badge-cyan',   icon: '📦' },
  VERIFYING:          { label: 'Verifying',            badge: 'badge-amber',  icon: '⏳' },
  RELEASED:           { label: 'Payment Released',     badge: 'badge-green',  icon: '✅' },
  DISPUTED:           { label: 'Disputed',             badge: 'badge-red',    icon: '⚠' },
};
