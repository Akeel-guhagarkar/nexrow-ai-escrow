// ============================================================
// Nexrow — AI Agent Chat Widget
// Powers both AI (Gemini + Local Demo AI) and Live Chat (Supabase + Local Sync)
// Include as: <script type="module" src="../js/chat-widget.js"></script>
// ============================================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = 'https://qhcxwwobfqsecwqsvwid.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoY3h3d29iZnFzZWN3cXN2d2lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODc0NzQsImV4cCI6MjA5NDc2MzQ3NH0.ZIcAU6PjSwEHeGZtD8B8NKJEd3YifgZa7S7hR9zbkMM';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Context detection ──
const urlParams   = new URLSearchParams(window.location.search);
const DEAL_ID     = urlParams.get('id') || 'demo-deal';

// ── Local Cross-Tab Sync Channel ──
const bc = window.BroadcastChannel ? new BroadcastChannel(`sx-chat-${DEAL_ID}`) : null;

// ── State ──
let currentUser     = null;
let dealData        = null;
let realtimeChannel = null;
let panelOpen       = false;
let activeTab       = 'ai';
let unread          = 0;
let aiHistory       = [];          // Gemini multi-turn history
let chatLoaded      = false;       // prevents double-loading chat history
let geminiKey       = localStorage.getItem('sx-gemini-key') || '';
let toastTimer      = null;

// ============================================================
// 1. INJECT CSS
// ============================================================
const WIDGET_CSS = `
/* ── Floating Button ── */
#sx-chat-toggle {
  position: fixed; bottom: 2rem; right: 2rem;
  width: 58px; height: 58px; border-radius: 50%;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem;
  box-shadow: 0 4px 24px rgba(245,158,11,0.45), 0 0 0 0 rgba(245,158,11,0.3);
  transition: transform 0.3s, box-shadow 0.3s;
  z-index: 9999;
  animation: sxPulseRing 3s infinite;
}
#sx-chat-toggle:hover { transform: scale(1.12); box-shadow: 0 8px 30px rgba(245,158,11,0.55); }

@keyframes sxPulseRing {
  0%   { box-shadow: 0 4px 24px rgba(245,158,11,0.45), 0 0 0 0 rgba(245,158,11,0.3); }
  60%  { box-shadow: 0 4px 24px rgba(245,158,11,0.45), 0 0 0 14px rgba(245,158,11,0); }
  100% { box-shadow: 0 4px 24px rgba(245,158,11,0.45), 0 0 0 0 rgba(245,158,11,0); }
}

/* ── Badge ── */
#sx-chat-badge {
  position: absolute; top: -5px; right: -5px;
  background: #ef4444; color: #fff;
  border-radius: 50%; min-width: 20px; height: 20px;
  font-size: 0.6rem; font-weight: 800;
  font-family: 'JetBrains Mono', monospace;
  display: none; align-items: center; justify-content: center;
  padding: 0 3px;
  border: 2px solid #0f0f12;
  box-shadow: 0 2px 8px rgba(239,68,68,0.5);
}
#sx-chat-badge.show { display: flex; animation: sxBadgePop 0.3s cubic-bezier(0.34,1.56,0.64,1); }
@keyframes sxBadgePop { from { transform: scale(0); } to { transform: scale(1); } }

/* ── Panel ── */
#sx-chat-panel {
  position: fixed; bottom: 5.5rem; right: 2rem;
  width: 385px; height: 590px;
  background: #111318;
  border: 1px solid rgba(245,158,11,0.18);
  border-radius: 18px;
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 24px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03);
  z-index: 9998;
  transform: scale(0.85) translateY(20px);
  opacity: 0; pointer-events: none;
  transition: all 0.35s cubic-bezier(0.34,1.56,0.64,1);
  transform-origin: bottom right;
}
#sx-chat-panel.open { transform: scale(1) translateY(0); opacity: 1; pointer-events: all; }

/* ── Header ── */
#sx-chat-header {
  background: linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%);
  border-bottom: 1px solid rgba(245,158,11,0.12);
  padding: 1rem 1.1rem;
  display: flex; align-items: center; justify-content: space-between;
  flex-shrink: 0;
}
#sx-chat-avatar {
  width: 38px; height: 38px; border-radius: 50%;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.15rem; flex-shrink: 0;
}
#sx-chat-hinfo { margin-left: 0.7rem; }
#sx-chat-htitle {
  font-family: 'Outfit', sans-serif; font-weight: 700;
  font-size: 0.92rem; color: #f1f5f9; line-height: 1.2;
}
#sx-chat-hsub {
  font-family: 'JetBrains Mono', monospace; font-size: 0.58rem;
  color: #f59e0b; letter-spacing: 0.1em; margin-top: 1px;
}
#sx-chat-hactions { display: flex; gap: 0.5rem; align-items: center; }
#sx-chat-fullpage {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px; color: #94a3b8; cursor: pointer;
  font-size: 0.7rem; padding: 0.3rem 0.6rem;
  font-family: 'JetBrains Mono', monospace;
  text-decoration: none; display: flex; align-items: center;
  transition: all 0.2s;
}
#sx-chat-fullpage:hover { background: rgba(245,158,11,0.1); color: #f59e0b; border-color: rgba(245,158,11,0.3); }
#sx-chat-close {
  background: none; border: none; color: #64748b;
  cursor: pointer; font-size: 1.1rem; padding: 0.2rem;
  line-height: 1; transition: color 0.2s;
}
#sx-chat-close:hover { color: #f1f5f9; }

/* ── API Key Setup ── */
#sx-api-setup {
  padding: 0.75rem 1.1rem;
  background: rgba(245,158,11,0.04);
  border-bottom: 1px solid rgba(245,158,11,0.1);
  flex-shrink: 0;
}
#sx-api-setup-label {
  font-family: 'JetBrains Mono', monospace; font-size: 0.62rem;
  color: #94a3b8; margin-bottom: 0.4rem; line-height: 1.4;
}
#sx-api-setup-label a { color: #f59e0b; text-decoration: none; }
#sx-api-setup-label a:hover { text-decoration: underline; }
#sx-api-row { display: flex; gap: 0.5rem; }
#sx-api-input {
  flex: 1;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09);
  border-radius: 8px; color: #f1f5f9;
  padding: 0.45rem 0.75rem; font-family: 'JetBrains Mono', monospace;
  font-size: 0.68rem; outline: none; transition: border-color 0.2s;
}
#sx-api-input:focus { border-color: rgba(245,158,11,0.4); }
#sx-api-input::placeholder { color: #334155; }
#sx-api-save {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #000; border: none; border-radius: 8px;
  padding: 0.45rem 0.8rem; font-family: 'JetBrains Mono', monospace;
  font-size: 0.68rem; font-weight: 800; cursor: pointer;
  white-space: nowrap; transition: opacity 0.2s;
}
#sx-api-save:hover { opacity: 0.85; }

/* ── Deal Context Bar ── */
#sx-deal-ctx {
  padding: 0.55rem 1.1rem;
  background: rgba(56,189,248,0.04);
  border-bottom: 1px solid rgba(56,189,248,0.1);
  font-family: 'JetBrains Mono', monospace; font-size: 0.6rem;
  color: #38bdf8; letter-spacing: 0.06em;
  flex-shrink: 0; display: none;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ── Tabs ── */
.sx-tabs {
  display: flex; border-bottom: 1px solid rgba(255,255,255,0.05);
  flex-shrink: 0;
}
.sx-tab {
  flex: 1; background: none; border: none;
  color: #475569; padding: 0.7rem 0;
  font-family: 'JetBrains Mono', monospace; font-size: 0.68rem;
  letter-spacing: 0.06em; cursor: pointer;
  transition: all 0.2s; border-bottom: 2px solid transparent;
  position: relative;
}
.sx-tab.active { color: #f59e0b; border-bottom-color: #f59e0b; background: rgba(245,158,11,0.04); }
.sx-tab:hover:not(.active) { color: #94a3b8; }
.sx-tab-badge {
  display: inline-flex; align-items: center; justify-content: center;
  background: #ef4444; color: #fff;
  border-radius: 50%; min-width: 16px; height: 16px;
  font-size: 0.55rem; margin-left: 0.35rem; padding: 0 2px;
}

/* ── Panes ── */
.sx-pane { display: none; flex-direction: column; flex: 1; overflow: hidden; }
.sx-pane.active { display: flex; }

/* ── Messages ── */
.sx-msgs {
  flex: 1; overflow-y: auto; padding: 1rem;
  display: flex; flex-direction: column; gap: 0.7rem;
  scroll-behavior: smooth;
}
.sx-msgs::-webkit-scrollbar { width: 3px; }
.sx-msgs::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }

.sx-msg { display: flex; flex-direction: column; max-width: 82%; animation: sxMsgIn 0.2s ease-out; }
@keyframes sxMsgIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
.sx-msg.me   { align-self: flex-end;   align-items: flex-end; }
.sx-msg.them { align-self: flex-start; align-items: flex-start; }
.sx-msg.ai-msg { align-self: flex-start; align-items: flex-start; max-width: 92%; }

.sx-bubble { padding: 0.6rem 0.9rem; border-radius: 12px; font-size: 0.82rem; line-height: 1.55; word-break: break-word; }
.sx-msg.me   .sx-bubble { background: linear-gradient(135deg,#f59e0b,#d97706); color: #000; font-weight: 500; border-bottom-right-radius: 3px; }
.sx-msg.them .sx-bubble { background: rgba(255,255,255,0.06); color: #e2e8f0; border: 1px solid rgba(255,255,255,0.07); border-bottom-left-radius: 3px; }
.sx-msg.ai-msg .sx-bubble {
  background: rgba(56,189,248,0.08); color: #e2e8f0;
  border: 1px solid rgba(56,189,248,0.12);
  border-bottom-left-radius: 3px;
  font-family: inherit;
}

.sx-meta { font-family: 'JetBrains Mono', monospace; font-size: 0.57rem; color: #64748b; margin-top: 0.22rem; padding: 0 0.15rem; }

/* ── Typing Indicator ── */
.sx-typing {
  display: flex; align-items: center; gap: 4px;
  padding: 0.55rem 0.85rem;
  background: rgba(56,189,248,0.07); border: 1px solid rgba(56,189,248,0.1);
  border-radius: 12px; border-bottom-left-radius: 3px;
  align-self: flex-start; width: fit-content;
}
.sx-tdot { width: 6px; height: 6px; background: #38bdf8; border-radius: 50%; animation: sxTypeBounce 1.3s infinite; }
.sx-tdot:nth-child(2) { animation-delay: 0.18s; }
.sx-tdot:nth-child(3) { animation-delay: 0.36s; }
@keyframes sxTypeBounce { 0%,80%,100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-5px); opacity: 1; } }

/* ── Input Area ── */
.sx-input-area {
  display: flex; gap: 0.5rem; padding: 0.7rem;
  border-top: 1px solid rgba(255,255,255,0.05); flex-shrink: 0;
  align-items: flex-end;
}
.sx-input {
  flex: 1; background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; color: #f1f5f9;
  padding: 0.6rem 0.85rem; font-size: 0.82rem;
  font-family: inherit; outline: none; resize: none;
  min-height: 40px; max-height: 100px; line-height: 1.4;
  transition: border-color 0.2s;
}
.sx-input:focus { border-color: rgba(245,158,11,0.35); }
.sx-input::placeholder { color: #334155; }
.sx-send {
  background: linear-gradient(135deg,#f59e0b,#d97706); color: #000;
  border: none; border-radius: 10px;
  width: 40px; height: 40px; font-size: 1rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; flex-shrink: 0;
}
.sx-send:hover { opacity: 0.85; transform: scale(1.05); }
.sx-send:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }

/* ── Empty State ── */
.sx-empty {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; height: 100%; gap: 0.85rem; color: #334155;
  padding: 2rem; text-align: center;
}
.sx-empty-icon { font-size: 2.8rem; opacity: 0.45; }
.sx-empty-txt { font-family: 'JetBrains Mono', monospace; font-size: 0.72rem; line-height: 1.6; color: #475569; }

/* ── Quick Suggestions ── */
.sx-suggestions { display: flex; flex-wrap: wrap; gap: 0.4rem; padding: 0.6rem 1rem 0; flex-shrink: 0; }
.sx-suggest {
  background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.15);
  color: #f59e0b; border-radius: 20px; padding: 0.3rem 0.7rem;
  font-family: 'JetBrains Mono', monospace; font-size: 0.62rem;
  cursor: pointer; transition: all 0.2s; white-space: nowrap;
}
.sx-suggest:hover { background: rgba(245,158,11,0.15); }

/* ── Toast Notification ── */
#sx-toast {
  position: fixed; bottom: 5.5rem; right: 2rem;
  background: rgba(15,16,20,0.96); backdrop-filter: blur(12px);
  border: 1px solid rgba(245,158,11,0.25); border-radius: 12px;
  padding: 0.8rem 1.1rem;
  display: flex; align-items: flex-start; gap: 0.75rem;
  z-index: 10000; max-width: 320px;
  transform: translateY(12px) scale(0.96); opacity: 0; pointer-events: none;
  transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
  box-shadow: 0 12px 40px rgba(0,0,0,0.4);
}
#sx-toast.show { transform: translateY(0) scale(1); opacity: 1; }
#sx-toast-icon { font-size: 1.1rem; flex-shrink: 0; margin-top: 1px; }
#sx-toast-label { font-family: 'JetBrains Mono', monospace; font-size: 0.62rem; color: #f59e0b; letter-spacing: 0.08em; margin-bottom: 0.2rem; }
#sx-toast-text { font-size: 0.78rem; color: #cbd5e1; line-height: 1.4; font-family: inherit; }

/* ── Online indicator ── */
.sx-online-dot {
  display: inline-block; width: 7px; height: 7px;
  background: #22c55e; border-radius: 50%;
  margin-left: 0.4rem; vertical-align: middle;
  box-shadow: 0 0 0 2px rgba(34,197,94,0.2);
  animation: sxOnlinePulse 2s infinite;
}
@keyframes sxOnlinePulse {
  0%,100% { box-shadow: 0 0 0 2px rgba(34,197,94,0.2); }
  50%      { box-shadow: 0 0 0 5px rgba(34,197,94,0); }
}

@media (max-width: 480px) {
  #sx-chat-panel { width: calc(100vw - 2rem); right: 1rem; height: 72vh; bottom: 4.8rem; }
  #sx-chat-toggle { right: 1rem; bottom: 1rem; }
  #sx-toast { right: 1rem; max-width: calc(100vw - 2rem); }
}
`;

const styleEl = document.createElement('style');
styleEl.textContent = WIDGET_CSS;
document.head.appendChild(styleEl);

// ============================================================
// 2. INJECT HTML
// ============================================================
document.body.insertAdjacentHTML('beforeend', `
<!-- Nexrow Chat Widget -->
<button id="sx-chat-toggle" title="Open AI Chat Assistant">
  🤖
  <span id="sx-chat-badge"></span>
</button>

<div id="sx-chat-panel">
  <!-- Header -->
  <div id="sx-chat-header">
    <div style="display:flex;align-items:center">
      <div id="sx-chat-avatar">🤖</div>
      <div id="sx-chat-hinfo">
        <div id="sx-chat-htitle">Nexrow AI Agent <span class="sx-online-dot"></span></div>
        <div id="sx-chat-hsub">// REALTIME ESCROW ASSISTANT</div>
      </div>
    </div>
    <div id="sx-chat-hactions">
      <a id="sx-chat-fullpage" title="Open full chat" target="_blank">⛶ Expand</a>
      <button id="sx-chat-close" title="Close">✕</button>
    </div>
  </div>

  <!-- API Key Setup (shown optional) -->
  <div id="sx-api-setup">
    <div id="sx-api-setup-label">
      🤖 <strong>AI Agent is Active!</strong> (Optional: Add a <a href="https://aistudio.google.com/app/apikey" target="_blank">Gemini API key</a> for advanced custom responses)
    </div>
    <div id="sx-api-row">
      <input id="sx-api-input" type="password" placeholder="Paste Gemini API key (AIza...)">
      <button id="sx-api-save">Save Key</button>
    </div>
  </div>

  <!-- Deal context bar -->
  <div id="sx-deal-ctx"></div>

  <!-- Tabs -->
  <div class="sx-tabs">
    <button class="sx-tab active" data-tab="ai">🤖 AI Agent</button>
    <button class="sx-tab" data-tab="chat">💬 Live Chat <span class="sx-tab-badge" id="sx-chat-tab-badge" style="display:none"></span></button>
  </div>

  <!-- AI Pane -->
  <div class="sx-pane active" id="sx-pane-ai">
    <div class="sx-msgs" id="sx-ai-msgs">
      <div class="sx-empty" id="sx-ai-empty">
        <div class="sx-empty-icon">🤖</div>
        <div class="sx-empty-txt">Hi! I'm your Nexrow AI Agent.<br>I know your deal details and can help<br>with payments, disputes, and escrow.</div>
      </div>
    </div>
    <!-- Quick suggestion chips -->
    <div class="sx-suggestions" id="sx-suggestions"></div>
    <div class="sx-input-area">
      <textarea class="sx-input" id="sx-ai-input" rows="1" placeholder="Ask the AI agent anything..."></textarea>
      <button class="sx-send" id="sx-ai-send" title="Send">➤</button>
    </div>
  </div>

  <!-- Live Chat Pane -->
  <div class="sx-pane" id="sx-pane-chat">
    <div class="sx-msgs" id="sx-chat-msgs">
      <div class="sx-empty" id="sx-chat-empty">
        <div class="sx-empty-icon">💬</div>
        <div class="sx-empty-txt" id="sx-chat-empty-txt">Loading messages...</div>
      </div>
    </div>
    <div class="sx-input-area">
      <textarea class="sx-input" id="sx-chat-input" rows="1" placeholder="Send a message to the other party..."></textarea>
      <button class="sx-send" id="sx-chat-send" title="Send">➤</button>
    </div>
  </div>
</div>

<!-- Toast Notification -->
<div id="sx-toast">
  <span id="sx-toast-icon">🔔</span>
  <div id="sx-toast-body">
    <div id="sx-toast-label">SUPREMEX NOTIFICATION</div>
    <div id="sx-toast-text"></div>
  </div>
</div>
`);

// ============================================================
// 3. CACHE DOM REFS
// ============================================================
const $ = id => document.getElementById(id);
const E = {
  toggle:         $('sx-chat-toggle'),
  panel:          $('sx-chat-panel'),
  badge:          $('sx-chat-badge'),
  close:          $('sx-chat-close'),
  fullpage:       $('sx-chat-fullpage'),
  apiSetup:       $('sx-api-setup'),
  apiInput:       $('sx-api-input'),
  apiSave:        $('sx-api-save'),
  dealCtx:        $('sx-deal-ctx'),
  tabs:           document.querySelectorAll('.sx-tab'),
  aiPane:         $('sx-pane-ai'),
  chatPane:       $('sx-pane-chat'),
  aiMsgs:         $('sx-ai-msgs'),
  chatMsgs:       $('sx-chat-msgs'),
  aiInput:        $('sx-ai-input'),
  aiSend:         $('sx-ai-send'),
  chatInput:      $('sx-chat-input'),
  chatSend:       $('sx-chat-send'),
  chatEmpty:      $('sx-chat-empty'),
  chatEmptyTxt:   $('sx-chat-empty-txt'),
  chatTabBadge:   $('sx-chat-tab-badge'),
  suggestions:    $('sx-suggestions'),
  toast:          $('sx-toast'),
  toastIcon:      $('sx-toast-icon'),
  toastText:      $('sx-toast-text'),
};

// ============================================================
// 4. UTILITY FUNCTIONS
// ============================================================
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function timeStr(ts) {
  const d = ts ? new Date(ts) : new Date();
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

function scrollToBottom(el) {
  el.scrollTop = el.scrollHeight;
}

// ============================================================
// 5. LOCAL STORAGE CHAT SYNC FALLBACK (For zero-config local demo)
// ============================================================
const LOCAL_STORAGE_KEY = `sx_chat_messages_${DEAL_ID}`;

function getLocalMessages() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function saveLocalMessage(msg) {
  const msgs = getLocalMessages();
  msgs.push(msg);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(msgs));
  
  // Broadcast across tabs
  if (bc) {
    bc.postMessage({ type: 'NEW_CHAT_MESSAGE', msg });
  }
}

// ============================================================
// 6. BADGE & TOAST
// ============================================================
function addBadge() {
  unread++;
  E.badge.textContent = unread > 9 ? '9+' : unread;
  E.badge.classList.add('show');
  E.chatTabBadge.textContent = unread > 9 ? '9+' : unread;
  E.chatTabBadge.style.display = 'inline-flex';
}

function clearBadge() {
  unread = 0;
  E.badge.classList.remove('show');
  E.chatTabBadge.style.display = 'none';
}

function showToast(icon, label, text) {
  E.toastIcon.textContent = icon;
  $('sx-toast-label').textContent = label;
  E.toastText.textContent = text;
  E.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => E.toast.classList.remove('show'), 5000);
}

// ============================================================
// 7. PANEL TOGGLE & TABS
// ============================================================
E.toggle.addEventListener('click', () => {
  panelOpen = !panelOpen;
  E.panel.classList.toggle('open', panelOpen);
  if (panelOpen) {
    clearBadge();
    if (activeTab === 'chat') loadChatHistory();
  }
});

E.close.addEventListener('click', () => {
  panelOpen = false;
  E.panel.classList.remove('open');
});

E.tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    E.tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeTab = tab.dataset.tab;
    E.aiPane.classList.toggle('active',   activeTab === 'ai');
    E.chatPane.classList.toggle('active', activeTab === 'chat');
    if (activeTab === 'chat') {
      clearBadge();
      loadChatHistory();
    }
  });
});

// ============================================================
// 8. API KEY MANAGEMENT
// ============================================================
if (geminiKey) {
  E.apiInput.value = geminiKey;
}

E.apiSave.addEventListener('click', () => {
  const key = E.apiInput.value.trim();
  geminiKey = key;
  if (key) {
    localStorage.setItem('sx-gemini-key', key);
    showToast('🔑', 'GEMINI API ACTIVATED', 'Connected to Google Gemini AI Engine.');
  } else {
    localStorage.removeItem('sx-gemini-key');
    showToast('🤖', 'LOCAL AI ACTIVATED', 'Using SupremeX Local AI Assistant.');
  }
  renderSuggestions();
});

// ============================================================
// 9. AI AGENT (GEMINI + BUILT-IN LOCAL DEMO ENGINE)
// ============================================================
function buildSystemPrompt() {
  let p = `You are the SupremeX AI Agent — an intelligent assistant for the SupremeX Freelancer Escrow Platform.`;
  if (dealData) {
    p += `\n\n## CURRENT DEAL CONTEXT
- Title: ${dealData.title}
- Amount: ₹${Number(dealData.budget || dealData.amount || 0).toLocaleString('en-IN')}
- Status: ${dealData.status}
- Deadline: ${dealData.deadline || 'Not specified'}
- Description: ${dealData.description || 'Not provided'}
- Deal Code: ${dealData.unique_code || 'N/A'}
- Freelancer: ${dealData.freelancer_email || dealData.freelancer_name || 'Unknown'}
- Client: ${dealData.client_email || 'Not yet joined'}`;
  }
  return p;
}

async function callLocalDemoAI(userText) {
  const q = userText.toLowerCase();
  const status = dealData ? dealData.status : 'UNKNOWN';
  const code = dealData ? (dealData.unique_code || 'SUPX-DEMO') : 'SUPX-DEMO';
  const amount = dealData ? '₹' + Number(dealData.budget || dealData.amount || 1000).toLocaleString('en-IN') : '₹1,000.00';
  const title = dealData ? dealData.title : 'Project Deal';

  // Intelligent Local AI Assistant logic
  await new Promise(r => setTimeout(r, 600)); // Simulate smart processing

  if (q.includes('status') || q.includes('state') || q.includes('next')) {
    if (status === 'WAITING_FOR_CLIENT') {
      return `📋 **Current Status: Waiting for Client**\n\nThe deal "**${title}**" is waiting for the client to join.\n• **Action Needed:** Share the deal security code \`${code}\` with your client.\n• Once they enter the code, they can lock the payment in escrow.`;
    }
    if (status === 'CLIENT_JOINED' || status === 'PENDING') {
      return `🤝 **Current Status: Client Joined**\n\nClient is connected to deal "**${title}**".\n• **Next Step:** Client needs to lock ${amount} into the 256-Bit Escrow Vault.\n• Once locked, freelancer can safely start work!`;
    }
    if (status === 'LOCKED') {
      return `🔒 **Current Status: Payment Locked in Escrow**\n\nFunds (${amount}) are safely vaulted!\n• **Freelancer Action:** Complete the work and upload proof of delivery on the workspace.\n• **Client Protection:** Your money will remain locked in escrow until you verify the work with your OTP pin.`;
    }
    if (status === 'DELIVERED') {
      return `📦 **Current Status: Proof Delivered**\n\nWork delivery has been submitted!\n• **Client Action:** Review the uploaded proof. If satisfied, enter your 4-digit security OTP to release ${amount} to freelancer.\n• **Issue?** Click "Report Issue" to file a dispute.`;
    }
    if (status === 'RELEASED') {
      return `✅ **Current Status: Payment Released!**\n\nTransaction for **${title}** (${amount}) has been completed.\n• Funds have been transferred to the freelancer's account.`;
    }
    if (status === 'DISPUTED') {
      return `⚠️ **Current Status: Disputed**\n\nA dispute is active. Funds (${amount}) remain locked in escrow while our support team reviews the evidence.`;
    }
    return `📋 **Deal Overview:**\nTitle: ${title}\nAmount: ${amount}\nStatus: ${status}`;
  }

  if (q.includes('code') || q.includes('share') || q.includes('join')) {
    return `🔑 **Deal Security Code:** \`${code}\`\n\nSend this 9-character code to your client or freelancer so they can join the deal workspace!`;
  }

  if (q.includes('escrow') || q.includes('safe') || q.includes('protect') || q.includes('money')) {
    return `🛡️ **SupremeX Escrow Guarantee:**\n\n1. Funds are locked in a multi-signature smart escrow vault.\n2. Neither party can take the money unilaterally.\n3. Payment is ONLY released when client verifies delivery using their private OTP pin.`;
  }

  if (q.includes('otp') || q.includes('release') || q.includes('pay')) {
    return `🔐 **OTP Payment Release:**\n\nWhen freelancer uploads work proof, client gets/enters a 4-digit security OTP. Submitting this pin instantly releases ${amount} to the freelancer.`;
  }

  if (q.includes('dispute') || q.includes('problem') || q.includes('issue') || q.includes('cancel')) {
    return `⚖️ **Dispute Protection:**\n\nIf there is an issue with the delivered work, click "Report Issue" on the status page. Funds stay frozen in escrow until both parties reach an agreement or admin review.`;
  }

  if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
    return `👋 Hello! I am your SupremeX Escrow AI Agent.\n\nI can help you with deal status, payment locks, OTP verification, or freelancer/client communication for **${title}**. What would you like to know?`;
  }

  // Fallback intelligent answer
  return `🤖 **SupremeX Assistant:**\n\nRegarding "**${title}**" (${amount}, Status: **${status}**):\n\nI'm tracking your escrow process in real time. You can ask me about:\n• Current deal status & next steps\n• Escrow vault protection\n• OTP release process\n• How to share code \`${code}\``;
}

async function callGemini(userText) {
  if (!geminiKey) {
    return await callLocalDemoAI(userText);
  }

  aiHistory.push({ role: 'user', parts: [{ text: userText }] });

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: buildSystemPrompt() }] },
          contents: aiHistory,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          }
        })
      }
    );

    if (!res.ok) {
      // Fallback to local AI if key fails
      return await callLocalDemoAI(userText);
    }

    const data = await res.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) return await callLocalDemoAI(userText);

    aiHistory.push({ role: 'model', parts: [{ text: reply }] });
    return reply;

  } catch (err) {
    aiHistory.pop();
    return await callLocalDemoAI(userText);
  }
}

// Render quick suggestion chips based on deal status
function renderSuggestions() {
  const common = ['What is the status?', 'How does escrow work?', 'How is payment released?'];
  let chips = [];

  if (dealData) {
    const statusChips = {
      WAITING_FOR_CLIENT: ['What is the deal code?', 'How does client join?', 'What happens next?'],
      CLIENT_JOINED:      ['How to lock payment?', 'What should client do?', 'Is my money safe?'],
      LOCKED:             ['How to deliver proof?', 'What counts as proof?', 'What if deadline passes?'],
      DELIVERED:          ['How to verify OTP?', 'What if work is wrong?', 'How to raise dispute?'],
      RELEASED:           ['Is payment confirmed?', 'Get transaction receipt', 'How to rate freelancer?'],
      DISPUTED:           ['What happens in dispute?', 'How long does it take?', 'Evidence tips'],
    };
    chips = [...(statusChips[dealData.status] || []), ...common];
  } else {
    chips = ['How does SupremeX work?', 'How is payment protected?', 'How to create a deal?', 'Dispute process'];
  }

  E.suggestions.innerHTML = chips.slice(0, 4).map(c =>
    `<button class="sx-suggest" data-q="${esc(c)}">${esc(c)}</button>`
  ).join('');

  E.suggestions.querySelectorAll('.sx-suggest').forEach(btn => {
    btn.addEventListener('click', () => {
      E.aiInput.value = btn.dataset.q;
      sendAiMsg();
    });
  });
}

function appendAiMsg(role, text, time = null) {
  const empty = E.aiMsgs.querySelector('.sx-empty');
  if (empty) empty.remove();

  const div = document.createElement('div');
  div.className = `sx-msg ${role === 'user' ? 'me' : 'ai-msg'}`;

  const formatted = esc(text)
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(245,158,11,0.15);color:#f59e0b;padding:0.1rem 0.3rem;border-radius:4px;font-family:\'JetBrains Mono\',monospace">$1</code>');

  div.innerHTML = `
    <div class="sx-bubble">${formatted}</div>
    <div class="sx-meta">${role === 'user' ? 'You' : '🤖 AI Agent'} · ${time || timeStr()}</div>
  `;
  E.aiMsgs.appendChild(div);
  scrollToBottom(E.aiMsgs);
}

function showTyping() {
  const div = document.createElement('div');
  div.id = 'sx-typing';
  div.className = 'sx-typing';
  div.innerHTML = '<div class="sx-tdot"></div><div class="sx-tdot"></div><div class="sx-tdot"></div>';
  E.aiMsgs.appendChild(div);
  scrollToBottom(E.aiMsgs);
}

function removeTyping() {
  const t = $('sx-typing');
  if (t) t.remove();
}

async function sendAiMsg() {
  const text = E.aiInput.value.trim();
  if (!text) return;

  E.aiInput.value = '';
  E.aiInput.style.height = 'auto';
  E.aiSend.disabled = true;
  E.suggestions.innerHTML = '';

  appendAiMsg('user', text);
  showTyping();

  const reply = await callGemini(text);
  removeTyping();
  appendAiMsg('ai', reply);
  E.aiSend.disabled = false;
  E.aiInput.focus();
}

E.aiSend.addEventListener('click', sendAiMsg);
E.aiInput.addEventListener('input', () => autoResize(E.aiInput));
E.aiInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMsg(); }
});

// ============================================================
// 10. LIVE CHAT (SUPABASE REALTIME + LOCAL STORAGE SYNC FALLBACK)
// ============================================================
function appendChatMsg(msg) {
  const empty = E.chatMsgs.querySelector('.sx-empty');
  if (empty) empty.remove();

  const isMe = msg.sender_id === currentUser?.id;
  const roleLabel = {
    ai_agent:   '🤖 AI',
    client:     '👤 Client',
    freelancer: '🛠 Freelancer',
  }[msg.sender_role] || (isMe ? 'You' : 'Other');

  const div = document.createElement('div');
  div.className = `sx-msg ${isMe ? 'me' : 'them'}`;
  div.innerHTML = `
    <div class="sx-bubble">${esc(msg.message).replace(/\n/g,'<br>')}</div>
    <div class="sx-meta">${roleLabel} · ${timeStr(msg.created_at)}</div>
  `;
  E.chatMsgs.appendChild(div);
  scrollToBottom(E.chatMsgs);
}

async function loadChatHistory() {
  if (chatLoaded) return;
  chatLoaded = true;

  E.chatMsgs.innerHTML = '';

  let msgs = [];
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('deal_id', DEAL_ID)
      .order('created_at', { ascending: true });

    if (!error && data) {
      msgs = data;
    }
  } catch (e) {}

  // Merge local storage messages if Supabase has none or failed
  if (!msgs.length) {
    msgs = getLocalMessages();
  }

  if (!msgs.length) {
    E.chatMsgs.innerHTML = `
      <div class="sx-empty">
        <div class="sx-empty-icon">💬</div>
        <div class="sx-empty-txt">No messages yet.<br>Start the conversation below!</div>
      </div>`;
    return;
  }

  msgs.forEach(m => appendChatMsg(m));
}

async function sendChatMsg() {
  const text = E.chatInput.value.trim();
  if (!text) return;

  E.chatInput.value = '';
  E.chatInput.style.height = 'auto';
  E.chatSend.disabled = true;

  const role = (dealData?.freelancer_id === currentUser?.id) ? 'freelancer'
    : (dealData?.client_id === currentUser?.id) ? 'client'
    : 'user';

  const msgObj = {
    deal_id:     DEAL_ID,
    sender_id:   currentUser?.id || 'local-user-' + Math.random().toString(36).slice(2,7),
    sender_role: role,
    message:     text,
    created_at:  new Date().toISOString(),
  };

  // 1. Append locally in current UI
  appendChatMsg(msgObj);

  // 2. Save locally for instant cross-tab sync demo
  saveLocalMessage(msgObj);

  // 3. Save to Supabase if table exists
  try {
    await supabase.from('chat_messages').insert({
      deal_id:     DEAL_ID,
      sender_id:   msgObj.sender_id,
      sender_role: role,
      message:     text,
    });
  } catch (e) {}

  E.chatSend.disabled = false;
  E.chatInput.focus();
}

E.chatSend.addEventListener('click', sendChatMsg);
E.chatInput.addEventListener('input', () => autoResize(E.chatInput));
E.chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMsg(); }
});

// Listen for local broadcast channel messages across tabs
if (bc) {
  bc.onmessage = (event) => {
    if (event.data?.type === 'NEW_CHAT_MESSAGE') {
      const msg = event.data.msg;
      if (msg.sender_id === currentUser?.id) return;
      if (chatLoaded) appendChatMsg(msg);
      if (!panelOpen || activeTab !== 'chat') {
        addBadge();
        const who = { client: 'Client', freelancer: 'Freelancer', ai_agent: 'AI Agent' }[msg.sender_role] || 'Other party';
        showToast('💬', `NEW MESSAGE FROM ${who.toUpperCase()}`,
          msg.message.length > 80 ? msg.message.slice(0, 77) + '...' : msg.message
        );
      }
    }
  };
}

// Storage event listener fallback for older browsers
window.addEventListener('storage', (e) => {
  if (e.key === LOCAL_STORAGE_KEY && e.newValue) {
    try {
      const msgs = JSON.parse(e.newValue);
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg && lastMsg.sender_id !== currentUser?.id) {
        if (chatLoaded) appendChatMsg(lastMsg);
        if (!panelOpen || activeTab !== 'chat') {
          addBadge();
          const who = { client: 'Client', freelancer: 'Freelancer' }[lastMsg.sender_role] || 'Other party';
          showToast('💬', `NEW MESSAGE FROM ${who.toUpperCase()}`,
            lastMsg.message.length > 80 ? lastMsg.message.slice(0, 77) + '...' : lastMsg.message
          );
        }
      }
    } catch(err) {}
  }
});

// ============================================================
// 11. REALTIME SUBSCRIPTION (Supabase)
// ============================================================
function setupRealtime() {
  if (!DEAL_ID) return;

  try {
    realtimeChannel = supabase
      .channel(`deal-chat-${DEAL_ID}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `deal_id=eq.${DEAL_ID}` },
        payload => {
          const msg = payload.new;
          if (msg.sender_id === currentUser?.id) return;
          if (chatLoaded) appendChatMsg(msg);
          if (!panelOpen || activeTab !== 'chat') {
            addBadge();
            const who = { client: 'Client', freelancer: 'Freelancer', ai_agent: 'AI Agent' }[msg.sender_role] || 'Other party';
            showToast('💬', `NEW MESSAGE FROM ${who.toUpperCase()}`,
              msg.message.length > 80 ? msg.message.slice(0, 77) + '...' : msg.message
            );
          }
        }
      )
      .subscribe();
  } catch (e) {}
}

// ============================================================
// 12. INIT
// ============================================================
async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  currentUser = session?.user || null;

  if (DEAL_ID) {
    E.fullpage.href = `chat.html?id=${DEAL_ID}`;
  } else {
    E.fullpage.style.display = 'none';
  }

  if (DEAL_ID) {
    try {
      const { data } = await supabase.from('deals').select('*').eq('id', DEAL_ID).single();
      dealData = data;
    } catch (e) {}

    if (dealData) {
      const amount = Number(dealData.budget || dealData.amount || 0).toLocaleString('en-IN');
      E.dealCtx.style.display = 'block';
      E.dealCtx.textContent = `📋 ${dealData.title} · ₹${amount} · ${dealData.status}`;
      triggerStatusNotification();
    }
  }

  setupRealtime();
  renderSuggestions();

  // Welcome proactive message
  if (!sessionStorage.getItem(`sx-welcomed-${DEAL_ID}`)) {
    sessionStorage.setItem(`sx-welcomed-${DEAL_ID}`, '1');
    setTimeout(async () => {
      const statusMsg = await callLocalDemoAI('What is the status?');
      appendAiMsg('ai', statusMsg);
    }, 600);
  }
}

// ============================================================
// 13. PROACTIVE STATUS NOTIFICATIONS
// ============================================================
function triggerStatusNotification() {
  if (!dealData) return;

  const key = `sx-notif-${DEAL_ID}-${dealData.status}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');

  const notifs = {
    WAITING_FOR_CLIENT: ['⏳', 'ACTION NEEDED', `Share deal code ${dealData.unique_code || 'SUPX-CODE'} with your client.`],
    CLIENT_JOINED:      ['🤝', 'CLIENT JOINED!', 'Client joined the deal. Ask them to lock payment in escrow to begin.'],
    LOCKED:             ['🔒', 'PAYMENT LOCKED', 'Payment secured in escrow. Freelancer can now start work.'],
    DELIVERED:          ['📦', 'DELIVERY RECEIVED', 'Freelancer delivered work! Review & release payment via OTP.'],
    DISPUTED:           ['⚠️', 'DISPUTE ACTIVE', 'A dispute has been raised. Funds are frozen until resolved.'],
    RELEASED:           ['✅', 'PAYMENT RELEASED', 'Deal complete! Payment released to freelancer.'],
  };

  const n = notifs[dealData.status];
  if (n) {
    setTimeout(() => {
      showToast(n[0], n[1], n[2]);
      addBadge();
    }, 1200);
  }
}

init();
