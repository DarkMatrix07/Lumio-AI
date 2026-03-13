'use client'

import grapesjs from 'grapesjs'
import 'grapesjs/dist/css/grapes.min.css'
import type { FC } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import type { CanvasEditorBridge } from '@/components/canvas/GrapesCanvas'
import { bindEditorSyncBridge } from '@/lib/canvas/editor-sync-bridge'
import { useEditorUiStore } from '@/store/editor-ui-store'

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
  {
    id: 'tpl-landing', label: 'SaaS Landing', category: 'Templates',
    content: `<div><nav style="display:flex;align-items:center;justify-content:space-between;padding:18px 48px;background:#fff;border-bottom:1px solid #f0f0f0;"><span style="font-weight:800;font-size:1.3rem;color:#111;">SaaSify</span><div style="display:flex;gap:28px;align-items:center;"><a href="#" style="color:#555;text-decoration:none;font-size:.9rem;">Features</a><a href="#" style="color:#555;text-decoration:none;font-size:.9rem;">Pricing</a><button style="padding:8px 20px;background:#3b82f6;color:#fff;border:none;border-radius:8px;font-size:.875rem;font-weight:600;cursor:pointer;">Start Free</button></div></nav><section style="padding:100px 48px;text-align:center;background:linear-gradient(160deg,#eff6ff,#fff);"><h1 style="font-size:3.75rem;font-weight:900;color:#111;margin:0 0 24px;line-height:1.1;">Build faster.<br/>Ship smarter.</h1><p style="font-size:1.2rem;color:#6b7280;max-width:520px;margin:0 auto 40px;">The all-in-one platform for your team.</p><div style="display:flex;gap:14px;justify-content:center;"><button style="padding:15px 36px;background:#3b82f6;color:#fff;border:none;border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer;">Get Started Free</button><button style="padding:15px 28px;background:transparent;color:#374151;border:1.5px solid #d1d5db;border-radius:10px;font-size:1rem;font-weight:600;cursor:pointer;">Watch Demo</button></div></section></div>`,
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="2" width="20" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="2" y1="7" x2="22" y2="7" stroke="currentColor" stroke-width="1"/></svg>`
  },
  {
    id: 'tpl-pricing', label: 'Pricing', category: 'Templates',
    content: `<section style="padding:80px 32px;background:#f9fafb;"><div style="text-align:center;margin-bottom:56px;"><h2 style="font-size:2.5rem;font-weight:800;color:#111;margin:0 0 14px;">Simple Pricing</h2></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:900px;margin:0 auto;"><div style="background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:32px;text-align:center;"><h3 style="font-size:1rem;font-weight:700;color:#374151;margin:0 0 8px;text-transform:uppercase;">Starter</h3><div style="font-size:3rem;font-weight:900;color:#111;margin:16px 0;">$0<span style="font-size:1rem;color:#9ca3af;">/mo</span></div><button style="width:100%;padding:11px;background:#f3f4f6;color:#374151;border:none;border-radius:9px;font-weight:600;cursor:pointer;">Get Started</button></div><div style="background:#3b82f6;border-radius:20px;padding:32px;text-align:center;box-shadow:0 20px 60px rgba(59,130,246,.35);"><h3 style="font-size:1rem;font-weight:700;color:rgba(255,255,255,.7);margin:0 0 8px;text-transform:uppercase;">Pro</h3><div style="font-size:3rem;font-weight:900;color:#fff;margin:16px 0;">$29<span style="font-size:1rem;color:rgba(255,255,255,.6);">/mo</span></div><button style="width:100%;padding:11px;background:#fff;color:#3b82f6;border:none;border-radius:9px;font-weight:700;cursor:pointer;">Start Trial</button></div><div style="background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:32px;text-align:center;"><h3 style="font-size:1rem;font-weight:700;color:#374151;margin:0 0 8px;text-transform:uppercase;">Enterprise</h3><div style="font-size:3rem;font-weight:900;color:#111;margin:16px 0;">$99<span style="font-size:1rem;color:#9ca3af;">/mo</span></div><button style="width:100%;padding:11px;background:#f3f4f6;color:#374151;border:none;border-radius:9px;font-weight:600;cursor:pointer;">Contact Sales</button></div></div></section>`,
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="1" y="5" width="6" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="3" width="6" height="18" rx="2" fill="currentColor" opacity=".15" stroke="currentColor" stroke-width="1.5"/><rect x="17" y="5" width="6" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`
  },
  {
    id: 'tpl-contact', label: 'Contact Form', category: 'Templates',
    content: `<section style="padding:80px 48px;background:#fff;"><div style="max-width:560px;margin:0 auto;text-align:center;"><h2 style="font-size:2.25rem;font-weight:800;color:#111;margin:0 0 40px;">Contact Us</h2><form style="display:flex;flex-direction:column;gap:16px;text-align:left;"><input type="text" placeholder="Your name" style="padding:12px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:.9rem;"/><input type="email" placeholder="Your email" style="padding:12px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:.9rem;"/><textarea rows="4" placeholder="Your message..." style="padding:12px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:.9rem;resize:vertical;font-family:inherit;"></textarea><button type="submit" style="padding:13px;background:#3b82f6;color:#fff;border:none;border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer;">Send Message</button></form></div></section>`,
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="5" width="20" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2 8l10 7 10-7" stroke="currentColor" stroke-width="1.5"/></svg>`
  },

  { id: 'tpl-fs-api-platform', label: 'Fullstack API Platform', category: 'Templates', content: `<div><nav style="display:flex;justify-content:space-between;padding:16px 28px;border-bottom:1px solid #e5e7eb;"><strong>StackForge</strong><span>API • Auth • Dashboard</span></nav><section style="padding:72px 28px;background:#f8fbff;"><h1 style="font-size:44px;margin:0 0 14px;">Build your API platform fast</h1><p style="max-width:640px;color:#556;">Ship auth, endpoints, docs, and monitoring in one fullstack workflow.</p><button style="margin-top:18px;padding:12px 24px;border-radius:10px;border:none;background:#2563eb;color:#fff;">Start Building</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="2" width="20" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-fs-devops-cloud', label: 'Fullstack DevOps Cloud', category: 'Templates', content: `<div><section style="padding:82px 30px;background:linear-gradient(160deg,#eff6ff,#fff);"><h1 style="font-size:42px;margin:0 0 12px;">Cloud deploys without friction</h1><p style="color:#5b6170;max-width:600px;">Provision infra, push apps, and monitor uptime from one control center.</p><button style="margin-top:18px;padding:12px 24px;background:#0f172a;color:#fff;border:none;border-radius:10px;">Deploy Now</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M7 18h10a4 4 0 001-7.9A5 5 0 006 8a4 4 0 001 10z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-fs-auth-db', label: 'Fullstack Auth + DB', category: 'Templates', content: `<div><section style="padding:76px 30px;"><h1 style="font-size:40px;margin:0 0 12px;">Secure auth and scalable data</h1><p style="color:#5b6170;max-width:620px;">JWT sessions, role rules, and managed Postgres in a single starter stack.</p><div style="display:flex;gap:12px;margin-top:20px;"><button style="padding:11px 20px;background:#2563eb;color:#fff;border:none;border-radius:9px;">Get Started</button><button style="padding:11px 20px;border:1px solid #cbd5e1;background:#fff;border-radius:9px;">View Docs</button></div></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 10h8M8 14h8" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-fs-realtime-chat', label: 'Fullstack Realtime Chat', category: 'Templates', content: `<div><section style="padding:78px 30px;background:#f8fafc;"><h1 style="font-size:40px;margin:0 0 12px;">Realtime messaging stack</h1><p style="max-width:620px;color:#5b6170;">WebSockets, notifications, and presence powered by a production backend.</p><button style="margin-top:18px;padding:12px 22px;background:#111827;color:#fff;border:none;border-radius:9px;">Launch App</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M4 5h16v10H8l-4 4z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-fs-ai-workspace', label: 'Fullstack AI Workspace', category: 'Templates', content: `<div><section style="padding:78px 30px;background:linear-gradient(160deg,#f5f3ff,#fff);"><h1 style="font-size:40px;margin:0 0 12px;">AI workspace for modern teams</h1><p style="max-width:640px;color:#5b6170;">Prompt flows, vector search, and secure API orchestration in one page.</p><button style="margin-top:18px;padding:12px 24px;background:#7c3aed;color:#fff;border:none;border-radius:9px;">Try AI Stack</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-fs-analytics-hub', label: 'Fullstack Analytics Hub', category: 'Templates', content: `<div><section style="padding:78px 30px;"><h1 style="font-size:40px;margin:0 0 12px;">Product analytics fullstack</h1><p style="max-width:620px;color:#5b6170;">Track events, build cohorts, and monitor KPIs with live dashboards.</p><button style="margin-top:18px;padding:12px 24px;background:#2563eb;color:#fff;border:none;border-radius:9px;">View Demo</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M4 19V5M10 19v-8M16 19v-4M22 19v-12" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-fs-security-suite', label: 'Fullstack Security Suite', category: 'Templates', content: `<div><section style="padding:78px 30px;background:#f8fafc;"><h1 style="font-size:40px;margin:0 0 12px;">Security built into every layer</h1><p style="max-width:620px;color:#5b6170;">Threat detection, audit logs, and compliance automation for enterprise apps.</p><button style="margin-top:18px;padding:12px 24px;background:#0f172a;color:#fff;border:none;border-radius:9px;">Secure Your Stack</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 3l8 3v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V6z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-fs-microservices', label: 'Fullstack Microservices', category: 'Templates', content: `<div><section style="padding:78px 30px;"><h1 style="font-size:40px;margin:0 0 12px;">Microservices without complexity</h1><p style="max-width:630px;color:#5b6170;">Connect APIs, queues, workers, and observability with opinionated defaults.</p><button style="margin-top:18px;padding:12px 24px;background:#2563eb;color:#fff;border:none;border-radius:9px;">Get Architecture</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="3" y="4" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="14" y="4" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="8.5" y="13" width="7" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-fs-cicd-console', label: 'Fullstack CI/CD Console', category: 'Templates', content: `<div><section style="padding:78px 30px;background:#f8fafc;"><h1 style="font-size:40px;margin:0 0 12px;">CI/CD for every push</h1><p style="max-width:620px;color:#5b6170;">Run tests, lint, and multi-env deploys from a clean pipeline dashboard.</p><button style="margin-top:18px;padding:12px 24px;background:#111827;color:#fff;border:none;border-radius:9px;">Run Pipeline</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M3 7h8l2 3h8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M3 17h18" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-fs-observability', label: 'Fullstack Observability', category: 'Templates', content: `<div><section style="padding:78px 30px;"><h1 style="font-size:40px;margin:0 0 12px;">Observe everything in production</h1><p style="max-width:620px;color:#5b6170;">Logs, traces, metrics, and incident alerts centralized in one interface.</p><button style="margin-top:18px;padding:12px 24px;background:#2563eb;color:#fff;border:none;border-radius:9px;">Open Dashboard</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 12h8M12 8v8" stroke="currentColor" stroke-width="1.5"/></svg>` },

  { id: 'tpl-saas-crm-suite', label: 'SaaS CRM Suite', category: 'Templates', content: `<div><section style="padding:72px 30px;"><h1 style="font-size:40px;">CRM that grows with your team</h1><p style="max-width:600px;color:#5b6170;">Manage leads, deals, and workflows with one clean pipeline view.</p><button style="margin-top:16px;padding:12px 24px;background:#2563eb;color:#fff;border:none;border-radius:9px;">Start Free</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="3" y="4" width="18" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-saas-hr-platform', label: 'SaaS HR Platform', category: 'Templates', content: `<div><section style="padding:72px 30px;background:#f8fafc;"><h1 style="font-size:40px;">Modern HR operations</h1><p style="max-width:610px;color:#5b6170;">Hiring, onboarding, payroll sync, and reviews in one portal.</p><button style="margin-top:16px;padding:12px 24px;background:#111827;color:#fff;border:none;border-radius:9px;">Book Demo</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><circle cx="8" cy="9" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="9" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4 19c1-3 3-5 4-5s3 2 4 5M12 19c1-3 3-5 4-5s3 2 4 5" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-saas-helpdesk', label: 'SaaS Helpdesk', category: 'Templates', content: `<div><section style="padding:72px 30px;"><h1 style="font-size:40px;">Support at startup speed</h1><p style="max-width:620px;color:#5b6170;">Ticketing, automations, and CSAT analytics for customer teams.</p><button style="margin-top:16px;padding:12px 24px;background:#2563eb;color:#fff;border:none;border-radius:9px;">Try Helpdesk</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M5 6h14v9H9l-4 4z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-saas-automation', label: 'SaaS Automation', category: 'Templates', content: `<div><section style="padding:72px 30px;background:#f8fafc;"><h1 style="font-size:40px;">Automate repetitive work</h1><p style="max-width:620px;color:#5b6170;">Build no-code flows for approvals, alerts, and sync tasks.</p><button style="margin-top:16px;padding:12px 24px;background:#111827;color:#fff;border:none;border-radius:9px;">Build Flow</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M4 12h5l3-6 3 12 2-6h3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-saas-billing', label: 'SaaS Billing', category: 'Templates', content: `<div><section style="padding:72px 30px;"><h1 style="font-size:40px;">Subscription billing made simple</h1><p style="max-width:620px;color:#5b6170;">Plans, invoices, tax, and dunning workflows in one product.</p><button style="margin-top:16px;padding:12px 24px;background:#2563eb;color:#fff;border:none;border-radius:9px;">Start Billing</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 9h8M8 13h8" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-saas-marketing', label: 'SaaS Marketing', category: 'Templates', content: `<div><section style="padding:72px 30px;background:#f8fafc;"><h1 style="font-size:40px;">Marketing suite for growth</h1><p style="max-width:620px;color:#5b6170;">Campaigns, attribution, and conversion insights in real time.</p><button style="margin-top:16px;padding:12px 24px;background:#111827;color:#fff;border:none;border-radius:9px;">Launch Campaign</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M4 12l8-8 8 8-8 8z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-saas-edtech', label: 'SaaS EdTech', category: 'Templates', content: `<div><section style="padding:72px 30px;"><h1 style="font-size:40px;">Online learning platform</h1><p style="max-width:620px;color:#5b6170;">Courses, assignments, quizzes, and cohorts on one LMS stack.</p><button style="margin-top:16px;padding:12px 24px;background:#2563eb;color:#fff;border:none;border-radius:9px;">Start Teaching</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M3 8l9-4 9 4-9 4z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 10v5c0 2 3 3 6 3s6-1 6-3v-5" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-saas-healthtech', label: 'SaaS HealthTech', category: 'Templates', content: `<div><section style="padding:72px 30px;background:#f8fafc;"><h1 style="font-size:40px;">Digital care operations</h1><p style="max-width:620px;color:#5b6170;">Appointments, records, and telehealth workflows for clinics.</p><button style="margin-top:16px;padding:12px 24px;background:#111827;color:#fff;border:none;border-radius:9px;">Request Demo</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 20s-7-4.5-7-10a4 4 0 017-2 4 4 0 017 2c0 5.5-7 10-7 10z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-saas-project-tracker', label: 'SaaS Project Tracker', category: 'Templates', content: `<div><section style="padding:72px 30px;"><h1 style="font-size:40px;">Project tracking for agile teams</h1><p style="max-width:620px;color:#5b6170;">Roadmaps, sprints, and reports in one collaborative workspace.</p><button style="margin-top:16px;padding:12px 24px;background:#2563eb;color:#fff;border:none;border-radius:9px;">Open Workspace</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 9h10M7 13h6" stroke="currentColor" stroke-width="1.5"/></svg>` },

  { id: 'tpl-store-fashion', label: 'Storefront Fashion', category: 'Templates', content: `<div><section style="padding:72px 30px;"><h1 style="font-size:40px;">Fashion drop landing page</h1><p style="max-width:620px;color:#5b6170;">Highlight seasonal collections with hero, lookbook, and cart CTA.</p><button style="margin-top:16px;padding:12px 24px;background:#111827;color:#fff;border:none;border-radius:9px;">Shop Collection</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M7 8l2-3h6l2 3v12H7z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-store-electronics', label: 'Storefront Electronics', category: 'Templates', content: `<div><section style="padding:72px 30px;background:#f8fafc;"><h1 style="font-size:40px;">Electronics product showcase</h1><p style="max-width:620px;color:#5b6170;">Launch gadgets with specs, comparisons, and checkout prompts.</p><button style="margin-top:16px;padding:12px 24px;background:#2563eb;color:#fff;border:none;border-radius:9px;">Buy Now</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="4" y="5" width="16" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9 20h6" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-store-beauty', label: 'Storefront Beauty', category: 'Templates', content: `<div><section style="padding:72px 30px;"><h1 style="font-size:40px;">Beauty brand launch page</h1><p style="max-width:620px;color:#5b6170;">Showcase bundles, testimonials, and ingredient highlights.</p><button style="margin-top:16px;padding:12px 24px;background:#be185d;color:#fff;border:none;border-radius:9px;">Explore Products</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 3c3 4 6 6.5 6 10a6 6 0 11-12 0c0-3.5 3-6 6-10z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-store-home-decor', label: 'Storefront Home Decor', category: 'Templates', content: `<div><section style="padding:72px 30px;background:#f8fafc;"><h1 style="font-size:40px;">Home decor ecommerce page</h1><p style="max-width:620px;color:#5b6170;">Promote curated sets with room previews and featured products.</p><button style="margin-top:16px;padding:12px 24px;background:#111827;color:#fff;border:none;border-radius:9px;">Shop Decor</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M4 11l8-7 8 7v9H4z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-store-fitness', label: 'Storefront Fitness', category: 'Templates', content: `<div><section style="padding:72px 30px;"><h1 style="font-size:40px;">Fitness gear storefront</h1><p style="max-width:620px;color:#5b6170;">Drive conversion with hero videos, specs, and social proof.</p><button style="margin-top:16px;padding:12px 24px;background:#16a34a;color:#fff;border:none;border-radius:9px;">Start Training</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M3 12h4l2-3h6l2 3h4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-store-pet-shop', label: 'Storefront Pet Shop', category: 'Templates', content: `<div><section style="padding:72px 30px;background:#f8fafc;"><h1 style="font-size:40px;">Pet supplies landing page</h1><p style="max-width:620px;color:#5b6170;">Feature best-sellers, subscription boxes, and bundle deals.</p><button style="margin-top:16px;padding:12px 24px;background:#2563eb;color:#fff;border:none;border-radius:9px;">Shop Pet Care</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="8" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 16c0-2 2-3 6-3s6 1 6 3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-store-food-delivery', label: 'Storefront Food Delivery', category: 'Templates', content: `<div><section style="padding:72px 30px;"><h1 style="font-size:40px;">Food delivery landing page</h1><p style="max-width:620px;color:#5b6170;">Menu highlights, promo codes, and fast checkout sections.</p><button style="margin-top:16px;padding:12px 24px;background:#ea580c;color:#fff;border:none;border-radius:9px;">Order Now</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M6 4v8M10 4v8M4 12h8M15 4v7a3 3 0 006 0V4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },

  { id: 'tpl-agency-creative', label: 'Agency Creative', category: 'Templates', content: `<div><section style="padding:74px 30px;"><h1 style="font-size:40px;">Creative agency website</h1><p style="max-width:620px;color:#5b6170;">Case studies, services, and lead capture for studio teams.</p><button style="margin-top:16px;padding:12px 24px;background:#111827;color:#fff;border:none;border-radius:9px;">View Work</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-agency-growth', label: 'Agency Growth', category: 'Templates', content: `<div><section style="padding:74px 30px;background:#f8fafc;"><h1 style="font-size:40px;">Growth agency landing</h1><p style="max-width:620px;color:#5b6170;">Performance metrics, funnel strategy, and consultation CTA.</p><button style="margin-top:16px;padding:12px 24px;background:#2563eb;color:#fff;border:none;border-radius:9px;">Book Strategy Call</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M4 18l6-6 4 3 6-7" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-agency-video', label: 'Agency Video', category: 'Templates', content: `<div><section style="padding:74px 30px;"><h1 style="font-size:40px;">Video production studio</h1><p style="max-width:620px;color:#5b6170;">Showreel-first page with pricing packages and inquiry form.</p><button style="margin-top:16px;padding:12px 24px;background:#111827;color:#fff;border:none;border-radius:9px;">Watch Reel</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="3" y="5" width="14" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M17 10l4-2v8l-4-2z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-portfolio-developer', label: 'Portfolio Developer', category: 'Templates', content: `<div><section style="padding:74px 30px;background:#f8fafc;"><h1 style="font-size:40px;">Developer portfolio</h1><p style="max-width:620px;color:#5b6170;">Project cards, tech stack, and contact CTA for freelancers.</p><button style="margin-top:16px;padding:12px 24px;background:#2563eb;color:#fff;border:none;border-radius:9px;">See Projects</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M8 7l-4 5 4 5M16 7l4 5-4 5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-portfolio-designer', label: 'Portfolio Designer', category: 'Templates', content: `<div><section style="padding:74px 30px;"><h1 style="font-size:40px;">Designer portfolio page</h1><p style="max-width:620px;color:#5b6170;">Gallery blocks, testimonials, and booking CTA for clients.</p><button style="margin-top:16px;padding:12px 24px;background:#be185d;color:#fff;border:none;border-radius:9px;">View Gallery</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="13" width="18" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },

  { id: 'tpl-product-waitlist', label: 'Product Waitlist', category: 'Templates', content: `<div><section style="padding:74px 30px;"><h1 style="font-size:40px;">Join the product waitlist</h1><p style="max-width:620px;color:#5b6170;">Collect signups before launch with social proof and roadmap teaser.</p><button style="margin-top:16px;padding:12px 24px;background:#2563eb;color:#fff;border:none;border-radius:9px;">Join Waitlist</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 9h10M7 13h6" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-product-launch', label: 'Product Launch', category: 'Templates', content: `<div><section style="padding:74px 30px;background:#f8fafc;"><h1 style="font-size:40px;">Launch day landing page</h1><p style="max-width:620px;color:#5b6170;">Feature highlights, pricing table, and conversion CTA for release day.</p><button style="margin-top:16px;padding:12px 24px;background:#111827;color:#fff;border:none;border-radius:9px;">Get Access</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M12 3l3 6 6 3-6 3-3 6-3-6-6-3 6-3z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-mobile-app-promo', label: 'Mobile App Promo', category: 'Templates', content: `<div><section style="padding:74px 30px;"><h1 style="font-size:40px;">Mobile app promo page</h1><p style="max-width:620px;color:#5b6170;">Show screenshots, app store links, and key feature benefits.</p><button style="margin-top:16px;padding:12px 24px;background:#2563eb;color:#fff;border:none;border-radius:9px;">Download App</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="7" y="3" width="10" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-webinar-event', label: 'Webinar Event', category: 'Templates', content: `<div><section style="padding:74px 30px;background:#f8fafc;"><h1 style="font-size:40px;">Webinar registration page</h1><p style="max-width:620px;color:#5b6170;">Speakers, agenda, and registration form in one focused layout.</p><button style="margin-top:16px;padding:12px 24px;background:#111827;color:#fff;border:none;border-radius:9px;">Reserve Seat</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7 9h10M7 13h7" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-online-course', label: 'Online Course', category: 'Templates', content: `<div><section style="padding:74px 30px;"><h1 style="font-size:40px;">Online course sales page</h1><p style="max-width:620px;color:#5b6170;">Curriculum preview, testimonials, and checkout CTA for creators.</p><button style="margin-top:16px;padding:12px 24px;background:#2563eb;color:#fff;border:none;border-radius:9px;">Enroll Now</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M4 6h8v12H4zM12 6h8v12h-8z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>` },
  { id: 'tpl-docs-product', label: 'Docs Product', category: 'Templates', content: `<div><section style="padding:74px 30px;background:#f8fafc;"><h1 style="font-size:40px;">Product docs home</h1><p style="max-width:620px;color:#5b6170;">Quickstart, API references, and guides in a docs-first template.</p><button style="margin-top:16px;padding:12px 24px;background:#111827;color:#fff;border:none;border-radius:9px;">Open Documentation</button></section></div>`, media: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M6 3h9l3 3v15H6z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M15 3v3h3" stroke="currentColor" stroke-width="1.5"/></svg>` },
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
