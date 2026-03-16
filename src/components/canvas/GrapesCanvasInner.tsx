'use client'

import grapesjs from 'grapesjs'
import 'grapesjs/dist/css/grapes.min.css'
import type { FC } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { CanvasEditorBridge } from '@/components/canvas/GrapesCanvas'
import { bindEditorSyncBridge } from '@/lib/canvas/editor-sync-bridge'
import { useEditorUiStore } from '@/store/editor-ui-store'
import { useBackendGraphStore } from '@/store/backend-graph-store'
import { useRoutesGraphStore } from '@/store/routes-graph-store'
import { usePagesStore } from '@/store/pages-store'

type GrapesCanvasInnerProps = {
  className?: string
  onEditorReady?: (bridge: CanvasEditorBridge) => void
  blocksContainer: HTMLDivElement | null
  layersContainer: HTMLDivElement | null
  rightPanelOpen?: boolean
  onToggleRightPanel?: () => void
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Dark theme CSS
   ═══════════════════════════════════════════════════════════════════════════════ */
const DARK_THEME_CSS = `
  .gjs-editor { background: #111113 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }

  /* Canvas: subtle dot grid */
  .gjs-cv-canvas {
    background-color: #111113 !important;
    background-image: radial-gradient(#1e1e22 1px, transparent 1px) !important;
    background-size: 20px 20px !important;
  }
  .gjs-frame-wrapper { box-shadow: 0 4px 32px rgba(0,0,0,.5); border-radius: 4px; }
  .gjs-frame { border: none !important; }
  .gjs-pn-panels, .gjs-pn-panel { background: transparent !important; border: none !important; }

  /* ═══ Blocks ═══ */
  .gjs-blocks-cs { padding: 8px 12px 14px; background: transparent; }
  .gjs-blocks-c {
    background: transparent; padding: 0;
    display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;
  }
  .gjs-block {
    background: #1e1e22; border: 1px solid #2a2a2e; color: #888;
    border-radius: 10px; padding: 13px 10px 10px; text-align: center; cursor: grab;
    min-height: 80px; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 6px; transition: all .15s ease;
  }
  .gjs-block:hover { background: #262629; border-color: #3a3a3e; color: #ccc; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.3); }
  .gjs-block__media { font-size: 24px; color: #555; margin: 0; line-height: 1; }
  .gjs-block__media svg { width: 28px; height: 28px; color: #555; }
  .gjs-block:hover .gjs-block__media, .gjs-block:hover .gjs-block__media svg { color: #aaa; }
  .gjs-block-label { font-size: 11px; color: #666; }
  .gjs-block:hover .gjs-block-label { color: #bbb; }

  /* Block categories */
  .gjs-block-categories { background: transparent; }
  .gjs-block-category { border: none !important; margin-bottom: 2px; }
  .gjs-category-title, .gjs-title {
    background: transparent !important; color: #555 !important; border: none !important;
    font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
    padding: 12px 12px 8px; cursor: pointer;
  }
  .gjs-category-title:hover { color: #888 !important; }
  .gjs-block-category.gjs-open > .gjs-title { color: #999 !important; }
  .gjs-block-category .gjs-caret-icon { color: #444; }

  /* ═══ Layers ═══ */
  .gjs-layers { background: transparent !important; padding: 4px 0; }
  .gjs-layer { background: transparent !important; border: none !important; border-bottom: 1px solid #1e1e22 !important; color: #888; padding: 6px 8px 6px 14px; }
  .gjs-layer:hover { background: #1a1a1e !important; }
  .gjs-layer.gjs-selected { background: #1e1e22 !important; color: #e0e0e0; border-left: 2px solid #3b82f6 !important; }
  .gjs-layer__name { color: #999; font-size: 12px; }
  .gjs-layer.gjs-selected .gjs-layer__name { color: #e0e0e0; }
  .gjs-layer__icon, .gjs-layer__move { color: #444; }

  /* ═══ Style Manager ═══ */
  .gjs-sm-sectors { background: transparent !important; }
  .gjs-sm-sector { border: none !important; border-bottom: 1px solid #1e1e22 !important; }
  .gjs-sm-sector-title {
    background: transparent !important; color: #555 !important; border: none !important;
    font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
    padding: 10px 12px; cursor: pointer;
  }
  .gjs-sm-sector-title:hover { color: #999 !important; }
  .gjs-sm-sector.gjs-sm-open .gjs-sm-sector-title { color: #bbb !important; }
  .gjs-sm-properties { background: transparent; padding: 4px 10px 12px; }
  .gjs-sm-property { margin-bottom: 8px; }
  .gjs-sm-label { color: #666 !important; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 4px; }

  /* All inputs */
  .gjs-field, .gjs-sm-field, .gjs-field input, .gjs-field select,
  .gjs-sm-field input, .gjs-sm-field select, .gjs-field-integer input,
  .gjs-trt-trait__wrp input, .gjs-trt-trait__wrp select, .gjs-trt-trait__wrp textarea {
    background: #141416 !important; border: 1px solid #2a2a2e !important;
    color: #ccc !important; border-radius: 4px; font-size: 12px; padding: 4px 8px; outline: none;
  }
  .gjs-field:focus-within, .gjs-sm-field:focus-within { border-color: #3b82f6 !important; }
  .gjs-sm-field.gjs-sm-composite { background: #141416 !important; border-color: #2a2a2e !important; }
  .gjs-sm-btn-c, .gjs-sm-btn { background: #1e1e22 !important; border: 1px solid #2a2a2e !important; color: #888 !important; border-radius: 4px; }
  .gjs-sm-btn:hover { background: #262629 !important; color: #ccc !important; }
  .gjs-sm-btn.gjs-sm-btn-active { background: #3b82f6 !important; border-color: #3b82f6 !important; color: #fff !important; }
  .gjs-radio-item { background: #141416 !important; border: 1px solid #2a2a2e !important; }
  .gjs-radio-item input:checked + .gjs-radio-item-label { background: #3b82f6 !important; color: #fff !important; }
  .gjs-radio-item-label { color: #888; font-size: 11px; padding: 3px 8px; }

  /* Traits */
  .gjs-trt-traits { background: transparent !important; }
  .gjs-trt-trait { border: none !important; border-bottom: 1px solid #1e1e22 !important; padding: 8px 12px; }
  .gjs-trt-trait__label { color: #666 !important; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }

  /* Color */
  .gjs-field-color-picker { background: #141416 !important; border: 1px solid #2a2a2e !important; border-radius: 4px; }

  /* Toolbar */
  .gjs-toolbar { background: #1b1b1f !important; border: 1px solid #2a2a2e; border-radius: 6px; padding: 2px; box-shadow: 0 8px 24px rgba(0,0,0,.6); }
  .gjs-toolbar-item { color: #ccc; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border-radius: 4px; }
  .gjs-toolbar-item:hover { background: #3b82f6; color: #fff; }
  .gjs-badge { background: #3b82f6 !important; color: #fff !important; font-size: 10px; border-radius: 4px; padding: 2px 6px; font-weight: 600; }

  /* Selection */
  .gjs-selected { outline: 2px solid #3b82f6 !important; outline-offset: 0 !important; }
  .gjs-hovered { outline: 1px dashed rgba(59,130,246,.5) !important; }
  .gjs-resizer-c { border-color: #3b82f6 !important; }
  .gjs-resizer-c .gjs-resizer-h { background: #3b82f6; width: 8px; height: 8px; border-radius: 50%; border: 2px solid #111113; }

  /* Placeholder */
  .gjs-placeholder, .gjs-placeholder-int { border: 2px dashed #3b82f6 !important; background: rgba(59,130,246,.06) !important; }

  /* Scrollbars */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2a2a2e; border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: #3a3a3e; }
`

/* ═══════════════════════════════════════════════════════════════════════════════
   Blocks
   ═══════════════════════════════════════════════════════════════════════════════ */
/* ── Auth Flow template HTML ── */
const AUTH_LOGIN_PAGE_HTML = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%);font-family:Inter,system-ui,-apple-system,sans-serif;">
  <div style="width:100%;max-width:420px;padding:40px;background:rgba(30,41,59,0.8);border:1px solid rgba(148,163,184,0.1);border-radius:20px;backdrop-filter:blur(12px);box-shadow:0 25px 50px rgba(0,0,0,0.5);">
    <div style="text-align:center;margin-bottom:32px;">
      <div style="width:56px;height:56px;margin:0 auto 16px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:16px;display:flex;align-items:center;justify-content:center;">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
      </div>
      <h1 style="font-size:24px;font-weight:700;color:#f1f5f9;margin:0 0 6px;">Welcome back</h1>
      <p style="font-size:14px;color:#94a3b8;margin:0;">Sign in to your account</p>
    </div>
    <div id="login-error" style="display:none;padding:12px 16px;margin-bottom:20px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:10px;color:#fca5a5;font-size:13px;text-align:center;">Invalid email or password</div>
    <form id="login-form" style="display:flex;flex-direction:column;gap:16px;" onsubmit="return false;">
      <div>
        <label style="display:block;font-size:13px;font-weight:600;color:#cbd5e1;margin-bottom:6px;">Email</label>
        <input id="login-email" type="email" placeholder="admin@lumio.dev" style="width:100%;padding:12px 16px;background:#0f172a;border:1px solid #334155;border-radius:10px;color:#f1f5f9;font-size:14px;outline:none;box-sizing:border-box;" />
      </div>
      <div>
        <label style="display:block;font-size:13px;font-weight:600;color:#cbd5e1;margin-bottom:6px;">Password</label>
        <input id="login-password" type="password" placeholder="••••••••" style="width:100%;padding:12px 16px;background:#0f172a;border:1px solid #334155;border-radius:10px;color:#f1f5f9;font-size:14px;outline:none;box-sizing:border-box;" />
      </div>
      <button type="submit" id="login-btn" style="width:100%;padding:14px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;margin-top:4px;transition:opacity 0.2s;">Sign In</button>
    </form>
    <p style="text-align:center;margin-top:20px;font-size:13px;color:#64748b;">Demo credentials: <span style="color:#94a3b8;">admin@lumio.dev</span> / <span style="color:#94a3b8;">lumio123</span></p>
  </div>
</div>`

const AUTH_SUCCESS_PAGE_HTML = `<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#052e16 0%,#14532d 50%,#052e16 100%);font-family:Inter,system-ui,-apple-system,sans-serif;">
  <div style="width:100%;max-width:480px;padding:48px;background:rgba(20,83,45,0.6);border:1px solid rgba(74,222,128,0.15);border-radius:20px;backdrop-filter:blur(12px);box-shadow:0 25px 50px rgba(0,0,0,0.4);text-align:center;">
    <div style="width:72px;height:72px;margin:0 auto 24px;background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:50%;display:flex;align-items:center;justify-content:center;">
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
    </div>
    <h1 style="font-size:28px;font-weight:800;color:#f0fdf4;margin:0 0 10px;">Login Successful!</h1>
    <p style="font-size:16px;color:#86efac;margin:0 0 8px;">Welcome back, <span id="user-name" style="font-weight:700;color:#4ade80;">Admin</span></p>
    <p style="font-size:14px;color:#6ee7b7;opacity:0.7;margin:0 0 32px;">You have been authenticated successfully.</p>
    <div style="padding:20px;background:rgba(0,0,0,0.2);border-radius:12px;margin-bottom:24px;text-align:left;">
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(74,222,128,0.1);"><span style="color:#86efac;font-size:13px;">Role</span><span style="color:#f0fdf4;font-size:13px;font-weight:600;">Administrator</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(74,222,128,0.1);"><span style="color:#86efac;font-size:13px;">Session</span><span style="color:#f0fdf4;font-size:13px;font-weight:600;">Active</span></div>
      <div style="display:flex;justify-content:space-between;padding:8px 0;"><span style="color:#86efac;font-size:13px;">Token</span><span style="color:#f0fdf4;font-size:13px;font-weight:600;font-family:monospace;">jwt_•••••</span></div>
    </div>
    <button style="padding:14px 32px;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;">Go to Dashboard</button>
  </div>
</div>`

const BASIC_BLOCKS = [
  {
    id: '1-col', label: '1 Column', category: 'Basic', content: '<div style="padding:16px;min-height:80px;"></div>',
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`
  },
  {
    id: '2-cols', label: '2 Columns', category: 'Basic',
    content: `<div style="display:flex;gap:8px;padding:8px;min-height:80px;"><div style="flex:1;min-height:64px;border:1px dashed #ddd;border-radius:4px;"></div><div style="flex:1;min-height:64px;border:1px dashed #ddd;border-radius:4px;"></div></div>`,
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="3" width="9" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="3" width="9" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`
  },
  {
    id: '3-cols', label: '3 Columns', category: 'Basic',
    content: `<div style="display:flex;gap:8px;padding:8px;min-height:80px;"><div style="flex:1;min-height:64px;border:1px dashed #ddd;border-radius:4px;"></div><div style="flex:1;min-height:64px;border:1px dashed #ddd;border-radius:4px;"></div><div style="flex:1;min-height:64px;border:1px dashed #ddd;border-radius:4px;"></div></div>`,
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="1" y="3" width="6" height="18" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="3" width="6" height="18" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="17" y="3" width="6" height="18" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`
  },
  {
    id: '2-cols-3/7', label: '2 Columns 3/7', category: 'Basic',
    content: `<div style="display:flex;gap:8px;padding:8px;min-height:80px;"><div style="flex:3;min-height:64px;border:1px dashed #ddd;border-radius:4px;"></div><div style="flex:7;min-height:64px;border:1px dashed #ddd;border-radius:4px;"></div></div>`,
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="3" width="7" height="18" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="11" y="3" width="11" height="18" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`
  },
  {
    id: 'section', label: 'Section', category: 'Basic', content: '<section style="padding:48px 24px;min-height:120px;"></section>',
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="1" y="5" width="22" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`
  },
  {
    id: 'divider', label: 'Divider', category: 'Basic', content: '<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>',
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
  },
  {
    id: 'heading', label: 'Heading', category: 'Basic', content: '<h1 style="font-size:2rem;font-weight:700;margin:0;">Heading</h1>',
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><text x="5" y="18" font-family="serif" font-size="18" font-weight="bold" fill="currentColor">H</text></svg>`
  },
  {
    id: 'text', label: 'Text', category: 'Basic', content: '<p style="font-size:1rem;line-height:1.7;margin:0;color:#374151;">Insert your text here.</p>',
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><text x="6" y="18" font-family="serif" font-size="18" fill="currentColor">T</text></svg>`
  },
  {
    id: 'link', label: 'Link', category: 'Basic', content: '<a href="#" style="color:#3b82f6;text-decoration:underline;">Click here</a>',
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
  },
  {
    id: 'image', label: 'Image', category: 'Basic', content: '<img src="https://placehold.co/600x300/f3f4f6/9ca3af?text=Image" style="max-width:100%;display:block;border-radius:8px;" alt="Image"/>',
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" opacity=".6"/><path d="M21 15l-5-5L5 21" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`
  },
  {
    id: 'video', label: 'Video', category: 'Basic', content: '<video controls style="max-width:100%;display:block;"><source src="" type="video/mp4"/></video>',
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="4" width="15" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M17 9l5-3v12l-5-3V9z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`
  },
  {
    id: 'button', label: 'Button', category: 'Basic', content: '<button style="padding:10px 24px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">Button</button>',
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="7" width="20" height="10" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`
  },

  // Contact & Forms
  {
    id: 'form', label: 'Form', category: 'Contact & Forms',
    content: `<form style="display:flex;flex-direction:column;gap:12px;max-width:400px;padding:24px;background:#fff;border-radius:12px;border:1px solid #e5e7eb;"><input type="text" placeholder="Your name" style="padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px;font-size:.9rem;"/><input type="email" placeholder="Your email" style="padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px;font-size:.9rem;"/><button type="submit" style="padding:10px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Submit</button></form>`,
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="7" y1="8" x2="17" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="7" y="15" width="6" height="3" rx="1.5" fill="currentColor" opacity=".4"/></svg>`
  },
  {
    id: 'input', label: 'Input', category: 'Contact & Forms',
    content: '<input type="text" placeholder="Enter text..." style="padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px;font-size:.9rem;width:100%;max-width:400px;"/>',
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="7" width="20" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="6" y1="12" x2="10" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
  },

  // Components
  {
    id: 'navbar', label: 'Navbar', category: 'Components',
    content: `<nav style="display:flex;align-items:center;justify-content:space-between;padding:16px 32px;background:#fff;border-bottom:1px solid #e5e7eb;"><span style="font-weight:800;font-size:1.25rem;color:#111;">Brand</span><div style="display:flex;gap:32px;"><a href="#" style="color:#374151;text-decoration:none;font-size:.9rem;">Home</a><a href="#" style="color:#374151;text-decoration:none;font-size:.9rem;">About</a><a href="#" style="color:#374151;text-decoration:none;font-size:.9rem;">Contact</a></div><button style="padding:8px 20px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-size:.875rem;font-weight:600;cursor:pointer;">Get Started</button></nav>`,
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="5" width="20" height="6" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`
  },
  {
    id: 'hero', label: 'Hero', category: 'Components',
    content: `<section style="padding:96px 32px;text-align:center;background:linear-gradient(160deg,#eff6ff,#dbeafe);"><h1 style="font-size:3.5rem;font-weight:800;color:#1e3a5f;margin:0 0 20px;">Hero Heading</h1><p style="font-size:1.2rem;color:#6b7280;max-width:560px;margin:0 auto 36px;">Your compelling subtitle goes here.</p><button style="padding:14px 36px;background:#3b82f6;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;">Get Started</button></section>`,
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="2" width="20" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="7" y1="10" x2="17" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
  },
  {
    id: 'card', label: 'Card', category: 'Components',
    content: `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:28px;max-width:320px;box-shadow:0 1px 3px rgba(0,0,0,.08);"><h3 style="color:#111;margin:0 0 10px;font-size:1.1rem;font-weight:700;">Card Title</h3><p style="color:#6b7280;margin:0 0 20px;font-size:.875rem;line-height:1.6;">Card description text goes here.</p><button style="padding:8px 18px;background:#3b82f6;color:#fff;border:none;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;">Learn More</button></div>`,
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`
  },
  {
    id: 'footer', label: 'Footer', category: 'Components',
    content: `<footer style="background:#111;padding:48px 32px 24px;"><div style="display:flex;justify-content:space-between;margin-bottom:32px;"><span style="font-weight:800;font-size:1.2rem;color:#fff;">Brand</span><div style="display:flex;gap:24px;"><a href="#" style="color:#9ca3af;text-decoration:none;font-size:.875rem;">Privacy</a><a href="#" style="color:#9ca3af;text-decoration:none;font-size:.875rem;">Terms</a><a href="#" style="color:#9ca3af;text-decoration:none;font-size:.875rem;">Contact</a></div></div><div style="border-top:1px solid #1f2937;padding-top:16px;"><p style="font-size:.8rem;color:#6b7280;margin:0;">© 2025 Brand Inc.</p></div></footer>`,
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="14" width="20" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`
  },

  // Templates
  { id: 'tpl-hackathon-template', label: 'Hackathon Template', category: 'Templates', content: `<div style="font-family:Inter,system-ui,-apple-system,sans-serif;background:#0b1020;color:#e2e8f0;"><header style="position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;padding:16px 28px;background:rgba(15,23,42,.9);backdrop-filter:blur(8px);border-bottom:1px solid #1f2a44;"><strong style="font-size:18px;color:#93c5fd;">HackathonX</strong><nav style="display:flex;gap:18px;"><a href="#tracks" style="color:#cbd5e1;text-decoration:none;">Tracks</a><a href="#timeline" style="color:#cbd5e1;text-decoration:none;">Timeline</a><a href="#prizes" style="color:#cbd5e1;text-decoration:none;">Prizes</a><a href="#faq" style="color:#cbd5e1;text-decoration:none;">FAQ</a></nav><button style="padding:10px 16px;background:#22d3ee;color:#042f3a;border:none;border-radius:8px;font-weight:700;">Register</button></header><section style="padding:88px 34px;background:linear-gradient(135deg,#1e3a8a,#7c3aed);"><h1 style="font-size:48px;line-height:1.05;margin:0 0 14px;color:#eef2ff;">Build. Pitch. Win the Hackathon.</h1><p style="max-width:700px;font-size:18px;color:#dbeafe;margin:0 0 22px;">Join 48 hours of fast shipping, mentoring, and demo day energy with builders from across domains.</p><div style="display:flex;gap:12px;flex-wrap:wrap;"><button style="padding:12px 22px;background:#38bdf8;color:#082f49;border:none;border-radius:10px;font-weight:700;">Apply Now</button><button style="padding:12px 22px;background:transparent;color:#e2e8f0;border:1px solid #93c5fd;border-radius:10px;font-weight:600;">View Rulebook</button></div></section><section id="tracks" style="padding:56px 34px;background:#111a33;"><h2 style="font-size:30px;margin:0 0 18px;color:#bfdbfe;">Tracks</h2><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;"><div style="padding:18px;background:#1c2a4a;border:1px solid #334d7d;border-radius:12px;"><h3 style="margin:0 0 8px;color:#e0f2fe;">AI + Productivity</h3><p style="margin:0;color:#cbd5e1;">Ship tools that save teams hours every week.</p></div><div style="padding:18px;background:#1c2a4a;border:1px solid #334d7d;border-radius:12px;"><h3 style="margin:0 0 8px;color:#e0f2fe;">Climate + Impact</h3><p style="margin:0;color:#cbd5e1;">Build practical products for measurable outcomes.</p></div><div style="padding:18px;background:#1c2a4a;border:1px solid #334d7d;border-radius:12px;"><h3 style="margin:0 0 8px;color:#e0f2fe;">DevTools</h3><p style="margin:0;color:#cbd5e1;">Improve developer speed, visibility, and reliability.</p></div></div></section><section id="timeline" style="padding:56px 34px;background:#0f172a;"><h2 style="font-size:30px;margin:0 0 18px;color:#c4b5fd;">Timeline</h2><ul style="margin:0;padding-left:18px;color:#cbd5e1;line-height:1.8;"><li>Day 1: Kickoff + team formation</li><li>Day 2: Build sprint + mentor office hours</li><li>Day 3: Final demos + judging + awards</li></ul></section><section id="prizes" style="padding:56px 34px;background:linear-gradient(135deg,#4c1d95,#0f172a);"><h2 style="font-size:30px;margin:0 0 18px;color:#e9d5ff;">Prizes</h2><div style="display:flex;gap:14px;flex-wrap:wrap;"><div style="padding:16px 20px;border-radius:12px;background:#6d28d9;color:#f5f3ff;font-weight:700;">1st • $5,000</div><div style="padding:16px 20px;border-radius:12px;background:#7c3aed;color:#f5f3ff;font-weight:700;">2nd • $2,500</div><div style="padding:16px 20px;border-radius:12px;background:#8b5cf6;color:#f5f3ff;font-weight:700;">3rd • $1,000</div></div></section><section id="faq" style="padding:56px 34px;background:#111827;"><h2 style="font-size:30px;margin:0 0 18px;color:#93c5fd;">FAQ</h2><p style="margin:0 0 10px;color:#cbd5e1;"><strong>Who can join?</strong> Students, indie hackers, and early teams.</p><p style="margin:0 0 10px;color:#cbd5e1;"><strong>Can I join solo?</strong> Yes, we support team matching at kickoff.</p><p style="margin:0;color:#cbd5e1;"><strong>Do I keep my IP?</strong> Yes, your project remains yours.</p></section><footer style="padding:24px 34px;background:#0b1020;border-top:1px solid #1f2a44;color:#94a3b8;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;"><span>© 2026 HackathonX</span><span>contact@hackathonx.dev</span></footer></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M4 11l8-7 8 7v9H4z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-lander-1', label: 'Lander 1', category: 'Templates', content: `<div><section style="padding:88px 34px;background:linear-gradient(135deg,#0f172a,#1d4ed8);color:#dbeafe;"><h1 style="font-size:44px;margin:0 0 12px;line-height:1.1;">Launch your product with confidence</h1><p style="max-width:640px;color:#dbeafe;opacity:.9;">High-converting hero, clear value proposition, and action-first CTA.</p><button style="margin-top:18px;padding:12px 24px;background:#38bdf8;color:#082f49;border:none;border-radius:10px;">Get Started</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="3" width="20" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-lander-2', label: 'Lander 2', category: 'Templates', content: `<div><section style="padding:88px 34px;background:linear-gradient(135deg,#312e81,#9333ea);color:#ede9fe;"><h1 style="font-size:44px;margin:0 0 12px;line-height:1.1;">Turn visitors into paying users</h1><p style="max-width:640px;color:#ede9fe;opacity:.9;">Story-driven headline with strong social proof and signup prompt.</p><button style="margin-top:18px;padding:12px 24px;background:#22d3ee;color:#083344;border:none;border-radius:10px;">Start Free Trial</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="3" width="20" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-lander-3', label: 'Lander 3', category: 'Templates', content: `<div><section style="padding:88px 34px;background:linear-gradient(135deg,#065f46,#16a34a);color:#dcfce7;"><h1 style="font-size:44px;margin:0 0 12px;line-height:1.1;">Grow faster with automation</h1><p style="max-width:640px;color:#dcfce7;opacity:.9;">Focused layout for features, outcomes, and conversion CTA.</p><button style="margin-top:18px;padding:12px 24px;background:#4ade80;color:#14532d;border:none;border-radius:10px;">See How</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="3" width="20" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-lander-4', label: 'Lander 4', category: 'Templates', content: `<div><section style="padding:88px 34px;background:linear-gradient(135deg,#7c2d12,#ea580c);color:#ffedd5;"><h1 style="font-size:44px;margin:0 0 12px;line-height:1.1;">Create urgency, boost conversion</h1><p style="max-width:640px;color:#ffedd5;opacity:.9;">Great for launch campaigns, waitlists, and limited offers.</p><button style="margin-top:18px;padding:12px 24px;background:#fb923c;color:#431407;border:none;border-radius:10px;">Join Waitlist</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="3" width="20" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-lander-5', label: 'Lander 5', category: 'Templates', content: `<div><section style="padding:88px 34px;background:linear-gradient(135deg,#701a75,#c026d3);color:#fae8ff;"><h1 style="font-size:44px;margin:0 0 12px;line-height:1.1;">Beautiful UI, strong CTA flow</h1><p style="max-width:640px;color:#fae8ff;opacity:.9;">Premium style landing section for agencies and creative products.</p><button style="margin-top:18px;padding:12px 24px;background:#e879f9;color:#4a044e;border:none;border-radius:10px;">Book Demo</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="3" width="20" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-lander-6', label: 'Lander 6', category: 'Templates', content: `<div><section style="padding:88px 34px;background:linear-gradient(135deg,#164e63,#0e7490);color:#cffafe;"><h1 style="font-size:44px;margin:0 0 12px;line-height:1.1;">Designed for modern mobile users</h1><p style="max-width:640px;color:#cffafe;opacity:.9;">Clean, app-focused hero with clear value and install CTA.</p><button style="margin-top:18px;padding:12px 24px;background:#67e8f9;color:#083344;border:none;border-radius:10px;">Download App</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="3" width="20" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-lander-7', label: 'Lander 7', category: 'Templates', content: `<div><section style="padding:88px 34px;background:linear-gradient(135deg,#1f2937,#0891b2);color:#e0f2fe;"><h1 style="font-size:44px;margin:0 0 12px;line-height:1.1;">Make your offer impossible to ignore</h1><p style="max-width:640px;color:#e0f2fe;opacity:.9;">Ideal structure for webinars, launches, and promotional funnels.</p><button style="margin-top:18px;padding:12px 24px;background:#38bdf8;color:#082f49;border:none;border-radius:10px;">Reserve Spot</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="3" width="20" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-lander-8', label: 'Lander 8', category: 'Templates', content: `<div><section style="padding:88px 34px;background:linear-gradient(135deg,#7f1d1d,#be123c);color:#ffe4e6;"><h1 style="font-size:44px;margin:0 0 12px;line-height:1.1;">Stand out with bold brand visuals</h1><p style="max-width:640px;color:#ffe4e6;opacity:.9;">High-impact color system for ecommerce and direct response pages.</p><button style="margin-top:18px;padding:12px 24px;background:#fb7185;color:#4c0519;border:none;border-radius:10px;">Shop Now</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="3" width="20" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-lander-9', label: 'Lander 9', category: 'Templates', content: `<div><section style="padding:88px 34px;background:linear-gradient(135deg,#111827,#334155);color:#e2e8f0;"><h1 style="font-size:44px;margin:0 0 12px;line-height:1.1;">Enterprise-ready, conversion-focused</h1><p style="max-width:640px;color:#e2e8f0;opacity:.9;">Perfect for B2B products needing trust-first presentation and CTA.</p><button style="margin-top:18px;padding:12px 24px;background:#94a3b8;color:#0f172a;border:none;border-radius:10px;">Contact Sales</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="3" width="20" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-auth-flow', label: 'Auth Login Flow', category: 'Templates',
    content: AUTH_LOGIN_PAGE_HTML,
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="5" y="3" width="14" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="10" r="2.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 16c0-2.2 1.8-4 4-4s4 1.8 4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
  },
  { id: 'tpl-lander-10', label: 'Lander 10', category: 'Templates', content: `<div><section style="padding:88px 34px;background:linear-gradient(135deg,#052e16,#15803d);color:#dcfce7;"><h1 style="font-size:44px;margin:0 0 12px;line-height:1.1;">Simple page, high-quality results</h1><p style="max-width:640px;color:#dcfce7;opacity:.9;">Balanced hero section designed for quick edits and strong visual appeal.</p><button style="margin-top:18px;padding:12px 24px;background:#4ade80;color:#14532d;border:none;border-radius:10px;">Launch Now</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="3" width="20" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
]

/* ═══════════════════════════════════════════════════════════════════════════════
   Style sectors
   ═══════════════════════════════════════════════════════════════════════════════ */
const STYLE_SECTORS = [
  {
    name: 'Layout', open: true, properties: [
      {
        name: 'Display', property: 'display', type: 'select', defaults: 'block', list: [
          { value: 'block', name: 'Block' }, { value: 'flex', name: 'Flex' }, { value: 'inline', name: 'Inline' },
          { value: 'inline-block', name: 'Inline Block' }, { value: 'grid', name: 'Grid' }, { value: 'none', name: 'None' },
        ]
      },
      {
        name: 'Position', property: 'position', type: 'select', defaults: 'static', list: [
          { value: 'static', name: 'Static' }, { value: 'relative', name: 'Relative' },
          { value: 'absolute', name: 'Absolute' }, { value: 'fixed', name: 'Fixed' }, { value: 'sticky', name: 'Sticky' },
        ]
      },
      'top', 'right', 'bottom', 'left',
    ]
  },
  {
    name: 'Flex', open: false, properties: [
      { property: 'flex-direction', type: 'select', list: [{ value: 'row', name: 'Row' }, { value: 'column', name: 'Column' }] },
      { property: 'justify-content', type: 'select', list: [{ value: 'flex-start', name: 'Start' }, { value: 'center', name: 'Center' }, { value: 'flex-end', name: 'End' }, { value: 'space-between', name: 'Between' }] },
      { property: 'align-items', type: 'select', list: [{ value: 'flex-start', name: 'Start' }, { value: 'center', name: 'Center' }, { value: 'flex-end', name: 'End' }, { value: 'stretch', name: 'Stretch' }] },
      'flex-wrap', 'gap',
    ]
  },
  { name: 'Size', open: true, properties: ['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height'] },
  { name: 'Space', open: true, properties: ['margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left'] },
  { name: 'Typography', open: false, properties: ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', { property: 'color', type: 'color' }, { property: 'text-align', type: 'select', list: [{ value: 'left', name: 'Left' }, { value: 'center', name: 'Center' }, { value: 'right', name: 'Right' }] }, 'text-decoration'] },
  { name: 'Decorations', open: false, properties: [{ property: 'background-color', type: 'color' }, 'border-radius', 'border', { property: 'border-color', type: 'color' }, 'box-shadow', 'opacity'] },
]

/* ═══════════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════════ */
const GrapesCanvasInner: FC<GrapesCanvasInnerProps> = ({
  className,
  onEditorReady,
  blocksContainer,
  layersContainer,
  rightPanelOpen = true,
  onToggleRightPanel,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const stylesRef = useRef<HTMLDivElement>(null)
  const traitsRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<ReturnType<typeof grapesjs.init> | null>(null)

  const onEditorReadyRef = useRef(onEditorReady)
  onEditorReadyRef.current = onEditorReady

  const [rightTab, setRightTab] = useState<'design' | 'content' | 'animate'>('design')

  const setCanUndo = useEditorUiStore((s) => s.setCanUndo)
  const setCanRedo = useEditorUiStore((s) => s.setCanRedo)
  const setDirty = useEditorUiStore((s) => s.setDirty)
  const uiBridge = useMemo(() => ({ setCanUndo, setCanRedo, setDirty }), [setCanUndo, setCanRedo, setDirty])

  useEffect(() => {
    const existing = document.getElementById('gjs-dark-theme') as HTMLStyleElement | null
    if (existing) {
      existing.textContent = DARK_THEME_CSS
      return
    }

    const el = document.createElement('style')
    el.id = 'gjs-dark-theme'
    el.textContent = DARK_THEME_CSS
    document.head.appendChild(el)
    return () => { el.remove() }
  }, [])

  useEffect(() => {
    if (!canvasRef.current || !blocksContainer || !layersContainer || !stylesRef.current || !traitsRef.current) return

    const editor = grapesjs.init({
      container: canvasRef.current,
      fromElement: false,
      height: '100%',
      width: 'auto',
      storageManager: false,
      avoidInlineStyle: false,
      panels: { defaults: [] },
      blockManager: { appendTo: blocksContainer, blocks: BASIC_BLOCKS },
      layerManager: { appendTo: layersContainer },
      selectorManager: { componentFirst: true },
      styleManager: { appendTo: stylesRef.current, sectors: STYLE_SECTORS },
      traitManager: { appendTo: traitsRef.current },
      deviceManager: {
        devices: [
          { name: 'Desktop', width: '' },
          { name: 'Tablet', width: '768px', widthMedia: '992px' },
          { name: 'Mobile', width: '375px', widthMedia: '480px' },
        ]
      },
      canvas: { styles: [] },
      protectedCss: '* { box-sizing: border-box; } body { margin: 0; }',
    })

    editorRef.current = editor

    onEditorReadyRef.current?.({
      getHtml: () => editor.getHtml(),
      getCss: () => editor.getCss() ?? '',
      setHtml: (v) => { editor.setComponents(v) },
      setCss: (v) => { editor.setStyle(v) },
      editor,
      undo: () => { editor.runCommand('core:undo') },
      redo: () => { editor.runCommand('core:redo') },
      setDevice: (name: string) => { editor.setDevice(name) },
      getPages: () => {
        const pm = editor.Pages
        if (!pm) return [{ id: 'default', name: 'Home' }]
        return pm.getAll().map((p: { getId: () => string; getName: () => string }) => ({
          id: p.getId(),
          name: p.getName() || 'Untitled',
        }))
      },
      addPage: (name: string) => {
        const pm = editor.Pages
        if (!pm) return ''
        const page = pm.add({ name })
        return page?.getId?.() ?? ''
      },
      selectPage: (id: string) => {
        const pm = editor.Pages
        if (!pm) return
        pm.select(id)
      },
      removePage: (id: string) => {
        const pm = editor.Pages
        if (!pm) return
        pm.remove(id)
      },
      getSelectedPageId: () => {
        const pm = editor.Pages
        if (!pm) return 'default'
        return pm.getSelected()?.getId?.() ?? 'default'
      },
      filterBlocks: (query: string) => {
        const bm = editor.BlockManager
        if (!bm) return

        const raw = query.trim()
        const templatesOnly = raw.startsWith('__templates_only__')
        const addOnly = raw.startsWith('__add_only__')
        const modePrefix = templatesOnly ? '__templates_only__' : addOnly ? '__add_only__' : ''
        const q = (modePrefix ? raw.replace(modePrefix, '').replace(/^:/, '') : raw).toLowerCase()
        const allBlockModels = bm.getAll().models

        const filtered = allBlockModels.filter((b) => {
          const label = String(b.get('label') ?? '').toLowerCase()
          const rawCategory = b.get('category') as unknown
          const categoryName = (() => {
            if (typeof rawCategory === 'string') return rawCategory
            if (rawCategory && typeof rawCategory === 'object') {
              const categoryRecord = rawCategory as {
                id?: unknown
                attributes?: { id?: unknown; label?: unknown }
                get?: (key: string) => unknown
              }

              const maybeId = categoryRecord.id ?? categoryRecord.attributes?.id ?? categoryRecord.get?.('id')
              if (typeof maybeId === 'string' && maybeId.trim()) return maybeId

              const maybeLabel = categoryRecord.attributes?.label ?? categoryRecord.get?.('label')
              if (typeof maybeLabel === 'string' && maybeLabel.trim()) return maybeLabel
            }
            return ''
          })().toLowerCase()

          if (templatesOnly && categoryName !== 'templates') return false
          if (addOnly && categoryName === 'templates') return false
          if (!q) return true
          return label.includes(q) || categoryName.includes(q)
        })

        bm.render(filtered)
      },
    })

    /* ── Auth Flow template: auto-scaffold pages + backend + routes on drop ── */
    editor.on('block:drag:stop', (component: unknown, block: { getId?: () => string } | undefined) => {
      const blockId = block?.getId?.()
      if (blockId !== 'tpl-auth-flow') return

      // 1. Create the "Login Success" page
      const pm = editor.Pages
      if (pm) {
        const successPage = pm.add({ name: 'Login Success' })
        if (successPage) {
          const mainComp = successPage.getMainComponent?.()
          if (mainComp) {
            mainComp.components(AUTH_SUCCESS_PAGE_HTML)
          }
        }
      }

      // 2. Sync pages to store
      const allPages = pm
        ? pm.getAll().map((p: { getId: () => string; getName: () => string }, i: number) => ({
            id: p.getId(),
            name: p.getName() || 'Untitled',
            path: i === 0 ? '/' : `/${(p.getName() || 'untitled').toLowerCase().replace(/\s+/g, '-')}`,
          }))
        : []
      usePagesStore.getState().setPages(allPages)

      // 3. Add backend auth nodes
      const backendStore = useBackendGraphStore.getState()
      const authNodes = [
        { id: 'auth-jwt', type: 'JWT' as const, label: 'JWT Auth', config: {} },
        { id: 'auth-model-user', type: 'Model' as const, label: 'User', config: { model: 'User', fields: 'email,password,name' } },
        { id: 'auth-post-login', type: 'POST' as const, label: 'POST /auth/login', config: { path: '/auth/login' } },
        { id: 'auth-get-me', type: 'GET' as const, label: 'GET /auth/me', config: { path: '/auth/me' } },
      ]
      const authEdges = [
        { id: 'auth-edge-jwt-login', source: 'auth-jwt', target: 'auth-post-login' },
        { id: 'auth-edge-jwt-me', source: 'auth-jwt', target: 'auth-get-me' },
        { id: 'auth-edge-model-login', source: 'auth-model-user', target: 'auth-post-login' },
      ]
      const existingIds = new Set(backendStore.nodes.map((n) => n.id))
      const newNodes = authNodes.filter((n) => !existingIds.has(n.id))
      const existingEdgeIds = new Set(backendStore.edges.map((e) => e.id))
      const newEdges = authEdges.filter((e) => !existingEdgeIds.has(e.id))
      if (newNodes.length > 0 || newEdges.length > 0) {
        backendStore.setNodes([...backendStore.nodes, ...newNodes])
        backendStore.setEdges([...backendStore.edges, ...newEdges])
      }

      // 4. Add route graph nodes (login page → auth service)
      const routesStore = useRoutesGraphStore.getState()
      const loginPage = allPages.find((p: { name: string }) => p.name === 'Login Success') ?? allPages[allPages.length - 1]
      const firstPage = allPages[0]
      if (firstPage) {
        routesStore.addPageNode({
          id: firstPage.id,
          name: firstPage.name,
          path: firstPage.path,
          elements: ['Sign In Button', 'Email Input', 'Password Input'],
        })
      }
      if (loginPage) {
        routesStore.addPageNode({
          id: loginPage.id,
          name: loginPage.name,
          path: loginPage.path,
          elements: ['Go to Dashboard'],
        })
      }
      routesStore.addServiceNode({
        id: 'auth',
        label: 'Auth Service',
        port: 3001,
        endpoints: ['POST /auth/login', 'GET /auth/me'],
        authNodes: ['JWT'],
      })
    })

    const cleanupBridge = bindEditorSyncBridge(editor, uiBridge)
    return () => { cleanupBridge(); editor.destroy(); editorRef.current = null }
  }, [uiBridge, blocksContainer, layersContainer]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`flex overflow-hidden bg-[#111113] ${className ?? ''}`} data-testid="grapes-canvas-root">

      {/* ═══ Canvas ═══ */}
      <div ref={canvasRef} data-testid="grapes-canvas-inner" className="flex-1 min-w-0" />

      {/* ═══ Right panel — Design / Content / Animate (like Image 9) ═══ */}
      <div
        data-testid="builder-right-panel"
        className={`flex-shrink-0 bg-[#1b1b1f] border-l border-[#232326] flex flex-col overflow-hidden transition-[width] duration-150 ${rightPanelOpen ? 'w-[260px]' : 'w-8'
          }`}
      >
        {/* Tab bar */}
        <div className="flex items-center border-b border-[#232326] flex-shrink-0 min-h-10">
          {rightPanelOpen && (['design', 'content', 'animate'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setRightTab(tab)}
              className={[
                'flex-1 py-2.5 text-[11px] font-medium capitalize transition-colors text-center',
                rightTab === tab
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5'
                  : 'text-zinc-600 hover:text-zinc-400 border-b-2 border-transparent',
              ].join(' ')}
            >
              {tab}
            </button>
          ))}
          <button
            type="button"
            title={rightPanelOpen ? 'Close right panel' : 'Open right panel'}
            data-testid="builder-toggle-right-panel"
            onClick={onToggleRightPanel}
            className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
          >
            {rightPanelOpen ? (
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 4L4 12M4 4l8 8" strokeLinecap="round" /></svg>
            ) : (
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 3l6 5-6 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            )}
          </button>
        </div>

        {/* Panel content — refs always mounted for GrapesJS appendTo */}
        <div className="flex-1 overflow-y-auto relative" style={{ display: rightPanelOpen ? 'block' : 'none' }}>
          <div
            ref={stylesRef}
            className="absolute inset-0 overflow-y-auto"
            style={{ display: rightTab === 'design' ? 'block' : 'none' }}
          />
          <div
            ref={traitsRef}
            className="absolute inset-0 overflow-y-auto"
            style={{ display: rightTab === 'content' ? 'block' : 'none' }}
          />
          {rightTab === 'animate' && (
            <div className="p-4 text-[11px] text-zinc-600 text-center mt-8">
              Animations & interactions<br />coming soon.
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

export default GrapesCanvasInner
