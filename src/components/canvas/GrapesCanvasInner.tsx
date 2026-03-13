'use client'

import grapesjs from 'grapesjs'
import 'grapesjs/dist/css/grapes.min.css'
import type { FC } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { CanvasEditorBridge } from '@/components/canvas/GrapesCanvas'
import { bindEditorSyncBridge } from '@/lib/canvas/editor-sync-bridge'
import { useEditorUiStore } from '@/store/editor-ui-store'

type GrapesCanvasInnerProps = {
  className?: string
  onEditorReady?: (bridge: CanvasEditorBridge) => void
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Dark theme — injected once into <head>
   ═══════════════════════════════════════════════════════════════════════════════ */
const DARK_THEME_CSS = `
  /* ── Editor root ── */
  .gjs-editor { background: #0e0e0e !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

  /* ── Canvas area: dot grid pattern ── */
  .gjs-cv-canvas {
    background-color: #111 !important;
    background-image: radial-gradient(#1e1e1e 1px, transparent 1px) !important;
    background-size: 20px 20px !important;
  }

  /* ── Canvas frame shadow ── */
  .gjs-frame-wrapper { box-shadow: 0 8px 40px rgba(0,0,0,.6); border-radius: 4px; }
  .gjs-frame { border: none !important; }

  /* ── Panels: suppress all defaults ── */
  .gjs-pn-panels, .gjs-pn-panel { background: transparent !important; border: none !important; }

  /* ═══ LEFT PANEL: Blocks ═══ */
  .gjs-blocks-cs { padding: 8px; background: transparent; }
  .gjs-blocks-c {
    background: transparent;
    padding: 0;
    display: grid !important;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .gjs-block {
    background: #1a1a1a;
    border: 1px solid #262626;
    color: #888;
    border-radius: 8px;
    padding: 16px 8px 12px;
    text-align: center;
    cursor: grab;
    min-height: 70px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: all .15s ease;
  }
  .gjs-block:hover {
    background: #222;
    border-color: #3a3a3a;
    color: #ccc;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,.3);
  }
  .gjs-block__media { font-size: 24px; color: #555; margin: 0; line-height: 1; }
  .gjs-block__media svg { width: 28px; height: 28px; color: #555; }
  .gjs-block:hover .gjs-block__media, .gjs-block:hover .gjs-block__media svg { color: #aaa; }
  .gjs-block-label { font-size: 11px; color: #666; letter-spacing: .02em; line-height: 1.2; margin: 0; }
  .gjs-block:hover .gjs-block-label { color: #bbb; }

  /* ── Block categories ── */
  .gjs-block-categories { background: transparent; }
  .gjs-block-category { border: none !important; margin-bottom: 2px; }
  .gjs-category-title, .gjs-title {
    background: transparent !important;
    color: #555 !important;
    border: none !important;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    padding: 10px 12px 6px;
    cursor: pointer;
  }
  .gjs-category-title:hover { color: #888 !important; }
  .gjs-block-category.gjs-open > .gjs-title { color: #999 !important; }
  .gjs-block-category .gjs-caret-icon { color: #444; font-size: 8px; }

  /* ── Search ── */
  .gjs-blocks-cs input[type="text"],
  .gjs-blocks-cs input[type="search"] {
    background: #151515 !important;
    border: 1px solid #262626 !important;
    color: #aaa !important;
    border-radius: 6px;
    padding: 7px 10px;
    font-size: 12px;
    width: 100%;
    box-sizing: border-box;
    margin-bottom: 4px;
    outline: none;
  }
  .gjs-blocks-cs input:focus { border-color: #7c3aed !important; }

  /* ═══ LEFT PANEL: Layers ═══ */
  .gjs-layers { background: transparent !important; padding: 4px 0; }
  .gjs-layer {
    background: transparent !important;
    border: none !important;
    border-bottom: 1px solid #1a1a1a !important;
    color: #888;
    padding: 6px 8px 6px 14px;
    transition: background .1s;
  }
  .gjs-layer:hover { background: #181818 !important; }
  .gjs-layer.gjs-selected { background: #1c1c1c !important; color: #e0e0e0; border-left: 2px solid #7c3aed !important; }
  .gjs-layer__name { color: #999; font-size: 12px; }
  .gjs-layer.gjs-selected .gjs-layer__name { color: #e0e0e0; }
  .gjs-layer__icon, .gjs-layer__move { color: #444; }
  .gjs-layer-count { color: #444; font-size: 9px; }

  /* ═══ RIGHT PANEL: Style Manager ═══ */
  .gjs-sm-sectors { background: transparent !important; }
  .gjs-sm-sector { border: none !important; border-bottom: 1px solid #1a1a1a !important; }
  .gjs-sm-sector-title {
    background: transparent !important;
    color: #555 !important;
    border: none !important;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .06em;
    text-transform: uppercase;
    padding: 10px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .gjs-sm-sector-title:hover { color: #999 !important; }
  .gjs-sm-sector.gjs-sm-open .gjs-sm-sector-title { color: #bbb !important; }
  .gjs-sm-properties { background: transparent; padding: 4px 10px 12px; }
  .gjs-sm-property { margin-bottom: 8px; }
  .gjs-sm-label {
    color: #666 !important;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .04em;
    margin-bottom: 4px;
    display: block;
  }

  /* ── All input fields ── */
  .gjs-field,
  .gjs-sm-field,
  .gjs-field input,
  .gjs-field select,
  .gjs-sm-field input,
  .gjs-sm-field select,
  .gjs-field-integer input,
  .gjs-trt-trait__wrp input,
  .gjs-trt-trait__wrp select,
  .gjs-trt-trait__wrp textarea {
    background: #151515 !important;
    border: 1px solid #262626 !important;
    color: #ccc !important;
    border-radius: 4px;
    font-size: 12px;
    padding: 4px 8px;
    outline: none;
  }
  .gjs-field:focus-within,
  .gjs-sm-field:focus-within { border-color: #7c3aed !important; }
  .gjs-sm-field.gjs-sm-composite { background: #151515 !important; border-color: #262626 !important; }

  /* ── Unit / suffix controls ── */
  .gjs-field .gjs-field-units,
  .gjs-field-integer .gjs-field-units,
  .gjs-sm-field .gjs-field-units { border-left: 1px solid #262626; }
  .gjs-field .gjs-d-s-arrow { color: #555; }

  /* ── Select dropdowns ── */
  .gjs-sm-field select, .gjs-field select { appearance: none; cursor: pointer; }

  /* ── Buttons (radio, toggle) ── */
  .gjs-sm-btn-c, .gjs-sm-btn {
    background: #1a1a1a !important;
    border: 1px solid #262626 !important;
    color: #888 !important;
    border-radius: 4px;
    font-size: 11px;
  }
  .gjs-sm-btn:hover { background: #222 !important; color: #ccc !important; }
  .gjs-sm-btn.gjs-sm-btn-active { background: #7c3aed !important; border-color: #7c3aed !important; color: #fff !important; }
  .gjs-radio-item { background: #151515 !important; border: 1px solid #262626 !important; }
  .gjs-radio-item input:checked + .gjs-radio-item-label { background: #7c3aed !important; color: #fff !important; }
  .gjs-radio-item-label { color: #888; font-size: 11px; padding: 3px 8px; }

  /* ═══ RIGHT PANEL: Trait Manager ═══ */
  .gjs-trt-traits { background: transparent !important; }
  .gjs-trt-trait {
    border: none !important;
    border-bottom: 1px solid #1a1a1a !important;
    padding: 8px 12px;
  }
  .gjs-trt-trait__label {
    color: #666 !important;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .04em;
    margin-bottom: 4px;
  }
  .gjs-trt-trait__wrp input:focus,
  .gjs-trt-trait__wrp select:focus,
  .gjs-trt-trait__wrp textarea:focus { border-color: #7c3aed !important; }

  /* ── Colour picker ── */
  .gjs-field-color-picker { background: #151515 !important; border: 1px solid #262626 !important; border-radius: 4px; }
  .sp-replacer { background: #151515 !important; border: 1px solid #262626 !important; }
  .sp-preview { border-radius: 3px; }

  /* ── Element toolbar (on selected) ── */
  .gjs-toolbar {
    background: #1a1a1a !important;
    border: 1px solid #333;
    border-radius: 6px;
    padding: 2px;
    box-shadow: 0 8px 24px rgba(0,0,0,.6);
  }
  .gjs-toolbar-item {
    color: #ccc;
    width: 26px; height: 26px;
    display: flex; align-items: center; justify-content: center;
    border-radius: 4px;
    transition: all .1s;
  }
  .gjs-toolbar-item:hover { background: #7c3aed; color: #fff; }
  .gjs-badge {
    background: #7c3aed !important;
    color: #fff !important;
    font-size: 10px;
    border-radius: 4px;
    padding: 2px 6px;
    font-weight: 600;
  }

  /* ── Resizer handles ── */
  .gjs-resizer-c { border-color: #7c3aed !important; }
  .gjs-resizer-c .gjs-resizer-h { background: #7c3aed; width: 8px; height: 8px; border-radius: 50%; border: 2px solid #0e0e0e; }

  /* ── Selection & hover ── */
  .gjs-selected { outline: 2px solid #7c3aed !important; outline-offset: 0 !important; }
  .gjs-hovered { outline: 1px dashed rgba(124,58,237,.5) !important; }

  /* ── Drop placeholder ── */
  .gjs-placeholder, .gjs-placeholder-int {
    border: 2px dashed #7c3aed !important;
    background: rgba(124,58,237,.06) !important;
  }

  /* ── "No element selected" hint ── */
  .gjs-sm-sector:only-child .gjs-sm-sector-title { color: #444 !important; }

  /* ── Thin scrollbars ── */
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #262626; border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: #333; }
`

/* ═══════════════════════════════════════════════════════════════════════════════
   Blocks configuration
   ═══════════════════════════════════════════════════════════════════════════════ */
const BASIC_BLOCKS = [
  // ── Layout ──
  {
    id: '1-col', label: '1 Column', category: 'Basic',
    content: '<div style="padding:16px;min-height:80px;"></div>',
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`,
  },
  {
    id: '2-cols', label: '2 Columns', category: 'Basic',
    content: `<div style="display:flex;gap:8px;padding:8px;min-height:80px;"><div style="flex:1;min-height:64px;border:1px dashed #ddd;border-radius:4px;"></div><div style="flex:1;min-height:64px;border:1px dashed #ddd;border-radius:4px;"></div></div>`,
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="3" width="9" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="3" width="9" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`,
  },
  {
    id: '3-cols', label: '3 Columns', category: 'Basic',
    content: `<div style="display:flex;gap:8px;padding:8px;min-height:80px;"><div style="flex:1;min-height:64px;border:1px dashed #ddd;border-radius:4px;"></div><div style="flex:1;min-height:64px;border:1px dashed #ddd;border-radius:4px;"></div><div style="flex:1;min-height:64px;border:1px dashed #ddd;border-radius:4px;"></div></div>`,
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="1" y="3" width="6" height="18" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="3" width="6" height="18" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="17" y="3" width="6" height="18" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`,
  },
  {
    id: '2-cols-3/7', label: '2 Columns 3/7', category: 'Basic',
    content: `<div style="display:flex;gap:8px;padding:8px;min-height:80px;"><div style="flex:3;min-height:64px;border:1px dashed #ddd;border-radius:4px;"></div><div style="flex:7;min-height:64px;border:1px dashed #ddd;border-radius:4px;"></div></div>`,
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="3" width="7" height="18" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="11" y="3" width="11" height="18" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`,
  },
  {
    id: 'section', label: 'Section', category: 'Basic',
    content: '<section style="padding:48px 24px;min-height:120px;"></section>',
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="1" y="5" width="22" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="1" y1="9" x2="23" y2="9" stroke="currentColor" stroke-width="1"/></svg>`,
  },
  {
    id: 'divider', label: 'Divider', category: 'Basic',
    content: '<hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;"/>',
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  // ── Typography / Media ──
  {
    id: 'heading', label: 'Heading', category: 'Basic',
    content: '<h1 style="font-size:2rem;font-weight:700;margin:0;line-height:1.2;">Heading</h1>',
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><text x="5" y="18" font-family="serif" font-size="18" font-weight="bold" fill="currentColor">H</text></svg>`,
  },
  {
    id: 'text', label: 'Text', category: 'Basic',
    content: '<p style="font-size:1rem;line-height:1.7;margin:0;color:#374151;">Insert your text here.</p>',
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><text x="6" y="18" font-family="serif" font-size="18" fill="currentColor">T</text></svg>`,
  },
  {
    id: 'link', label: 'Link', category: 'Basic',
    content: '<a href="#" style="color:#7c3aed;text-decoration:underline;font-size:1rem;">Click here</a>',
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'image', label: 'Image', category: 'Basic',
    content: '<img src="https://placehold.co/600x300/f3f4f6/9ca3af?text=Image" style="max-width:100%;display:block;border-radius:8px;" alt="Image"/>',
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" opacity=".6"/><path d="M21 15l-5-5L5 21" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`,
  },
  {
    id: 'video', label: 'Video', category: 'Basic',
    content: '<video controls style="max-width:100%;display:block;border-radius:8px;"><source src="" type="video/mp4"/></video>',
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="4" width="15" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M17 9l5-3v12l-5-3V9z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`,
  },
  {
    id: 'button', label: 'Button', category: 'Basic',
    content: '<button style="display:inline-flex;align-items:center;padding:10px 24px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">Button</button>',
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="7" width="20" height="10" rx="5" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  },
  // ── Components ──
  {
    id: 'navbar', label: 'Navbar', category: 'Components',
    content: `<nav style="display:flex;align-items:center;justify-content:space-between;padding:16px 32px;background:#fff;border-bottom:1px solid #e5e7eb;"><span style="font-weight:800;font-size:1.25rem;color:#111;">Brand</span><div style="display:flex;gap:32px;"><a href="#" style="color:#374151;text-decoration:none;font-size:.9rem;font-weight:500;">Home</a><a href="#" style="color:#374151;text-decoration:none;font-size:.9rem;font-weight:500;">About</a><a href="#" style="color:#374151;text-decoration:none;font-size:.9rem;font-weight:500;">Contact</a></div><button style="padding:8px 20px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:.875rem;font-weight:600;cursor:pointer;">Get Started</button></nav>`,
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="5" width="20" height="6" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="5" y1="8" x2="9" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'hero', label: 'Hero', category: 'Components',
    content: `<section style="padding:96px 32px;text-align:center;background:linear-gradient(160deg,#f5f3ff,#ede9fe);"><h1 style="font-size:3.5rem;font-weight:800;color:#1e1b4b;margin:0 0 20px;line-height:1.15;">Hero Heading</h1><p style="font-size:1.2rem;color:#6b7280;max-width:560px;margin:0 auto 36px;line-height:1.6;">Your compelling subtitle goes here.</p><button style="padding:14px 36px;background:#7c3aed;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;">Get Started</button></section>`,
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="2" width="20" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="7" y1="10" x2="17" y2="10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="9" y="14" width="6" height="3" rx="1.5" fill="currentColor" opacity=".4"/></svg>`,
  },
  {
    id: 'card', label: 'Card', category: 'Components',
    content: `<div style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:28px;max-width:320px;box-shadow:0 1px 3px rgba(0,0,0,.08);"><h3 style="color:#111;margin:0 0 10px;font-size:1.1rem;font-weight:700;">Card Title</h3><p style="color:#6b7280;margin:0 0 20px;font-size:.875rem;line-height:1.6;">Card description text goes here.</p><button style="padding:8px 18px;background:#7c3aed;color:#fff;border:none;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;">Learn More</button></div>`,
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="7" y1="9" x2="17" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  },
  // ── Templates ──
  {
    id: 'tpl-saas-landing', label: 'SaaS Landing', category: 'Templates',
    content: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><nav style="display:flex;align-items:center;justify-content:space-between;padding:18px 48px;background:#fff;border-bottom:1px solid #f0f0f0;"><span style="font-weight:800;font-size:1.3rem;color:#111;">SaaSify</span><div style="display:flex;gap:28px;align-items:center;"><a href="#" style="color:#555;text-decoration:none;font-size:.9rem;">Features</a><a href="#" style="color:#555;text-decoration:none;font-size:.9rem;">Pricing</a><button style="padding:8px 20px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:.875rem;font-weight:600;cursor:pointer;">Start Free</button></div></nav><section style="padding:100px 48px;text-align:center;background:linear-gradient(160deg,#f5f3ff 0%,#fff 60%);"><span style="display:inline-block;background:#ede9fe;color:#7c3aed;font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:4px 14px;border-radius:100px;margin-bottom:24px;">Now in Public Beta</span><h1 style="font-size:3.75rem;font-weight:900;color:#111;margin:0 0 24px;line-height:1.1;">Build faster.<br/>Ship smarter.</h1><p style="font-size:1.2rem;color:#6b7280;max-width:520px;margin:0 auto 40px;line-height:1.7;">The all-in-one platform for your team.</p><div style="display:flex;gap:14px;justify-content:center;"><button style="padding:15px 36px;background:#7c3aed;color:#fff;border:none;border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer;">Get Started Free</button><button style="padding:15px 28px;background:transparent;color:#374151;border:1.5px solid #d1d5db;border-radius:10px;font-size:1rem;font-weight:600;cursor:pointer;">Watch Demo</button></div></section><section style="padding:80px 48px;background:#fff;"><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:960px;margin:0 auto;"><div style="padding:28px;border:1px solid #f3f4f6;border-radius:16px;"><div style="width:44px;height:44px;background:#ede9fe;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:22px;">⚡</div><h3 style="font-size:1rem;font-weight:700;color:#111;margin:0 0 8px;">Lightning Fast</h3><p style="font-size:.875rem;color:#6b7280;margin:0;line-height:1.6;">Deploy in seconds.</p></div><div style="padding:28px;border:1px solid #f3f4f6;border-radius:16px;"><div style="width:44px;height:44px;background:#ecfdf5;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:22px;">🛡️</div><h3 style="font-size:1rem;font-weight:700;color:#111;margin:0 0 8px;">Secure</h3><p style="font-size:.875rem;color:#6b7280;margin:0;line-height:1.6;">Enterprise-grade security.</p></div><div style="padding:28px;border:1px solid #f3f4f6;border-radius:16px;"><div style="width:44px;height:44px;background:#fff7ed;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;font-size:22px;">📈</div><h3 style="font-size:1rem;font-weight:700;color:#111;margin:0 0 8px;">Scales</h3><p style="font-size:.875rem;color:#6b7280;margin:0;line-height:1.6;">Grows with your needs.</p></div></div></section></div>`,
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="2" width="20" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="2" y1="7" x2="22" y2="7" stroke="currentColor" stroke-width="1"/><line x1="7" y1="13" x2="17" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'tpl-pricing', label: 'Pricing', category: 'Templates',
    content: `<section style="padding:80px 32px;background:#f9fafb;font-family:-apple-system,sans-serif;"><div style="text-align:center;margin-bottom:56px;"><h2 style="font-size:2.5rem;font-weight:800;color:#111;margin:0 0 14px;">Simple Pricing</h2><p style="font-size:1.1rem;color:#6b7280;margin:0;">No hidden fees.</p></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:900px;margin:0 auto;"><div style="background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:32px;text-align:center;"><h3 style="font-size:1rem;font-weight:700;color:#374151;margin:0 0 8px;text-transform:uppercase;">Starter</h3><div style="font-size:3rem;font-weight:900;color:#111;margin:16px 0 6px;">$0<span style="font-size:1rem;color:#9ca3af;">/mo</span></div><button style="width:100%;padding:11px;background:#f3f4f6;color:#374151;border:none;border-radius:9px;font-weight:600;cursor:pointer;margin:20px 0;">Get Started</button><p style="font-size:.875rem;color:#6b7280;">3 projects · 5GB</p></div><div style="background:#7c3aed;border-radius:20px;padding:32px;text-align:center;box-shadow:0 20px 60px rgba(124,58,237,.35);"><h3 style="font-size:1rem;font-weight:700;color:rgba(255,255,255,.7);margin:0 0 8px;text-transform:uppercase;">Pro</h3><div style="font-size:3rem;font-weight:900;color:#fff;margin:16px 0 6px;">$29<span style="font-size:1rem;color:rgba(255,255,255,.6);">/mo</span></div><button style="width:100%;padding:11px;background:#fff;color:#7c3aed;border:none;border-radius:9px;font-weight:700;cursor:pointer;margin:20px 0;">Start Trial</button><p style="font-size:.875rem;color:rgba(255,255,255,.7);">Unlimited · 100GB</p></div><div style="background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:32px;text-align:center;"><h3 style="font-size:1rem;font-weight:700;color:#374151;margin:0 0 8px;text-transform:uppercase;">Enterprise</h3><div style="font-size:3rem;font-weight:900;color:#111;margin:16px 0 6px;">$99<span style="font-size:1rem;color:#9ca3af;">/mo</span></div><button style="width:100%;padding:11px;background:#f3f4f6;color:#374151;border:none;border-radius:9px;font-weight:600;cursor:pointer;margin:20px 0;">Contact Sales</button><p style="font-size:.875rem;color:#6b7280;">SSO · Dedicated support</p></div></div></section>`,
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="1" y="5" width="6" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="9" y="3" width="6" height="18" rx="2" fill="currentColor" opacity=".15" stroke="currentColor" stroke-width="1.5"/><rect x="17" y="5" width="6" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`,
  },
  {
    id: 'tpl-contact', label: 'Contact Form', category: 'Templates',
    content: `<section style="padding:80px 48px;background:#fff;font-family:-apple-system,sans-serif;"><div style="max-width:560px;margin:0 auto;text-align:center;"><h2 style="font-size:2.25rem;font-weight:800;color:#111;margin:0 0 12px;">Get in Touch</h2><p style="font-size:1rem;color:#6b7280;margin:0 0 40px;">We'd love to hear from you.</p><form style="display:flex;flex-direction:column;gap:16px;text-align:left;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;"><input type="text" placeholder="First name" style="padding:12px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:.9rem;color:#111;outline:none;"/><input type="text" placeholder="Last name" style="padding:12px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:.9rem;color:#111;outline:none;"/></div><input type="email" placeholder="Email address" style="padding:12px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:.9rem;color:#111;outline:none;"/><textarea rows="4" placeholder="Your message..." style="padding:12px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:.9rem;color:#111;resize:vertical;font-family:inherit;outline:none;"></textarea><button type="submit" style="padding:13px;background:#7c3aed;color:#fff;border:none;border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer;">Send Message</button></form></div></section>`,
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="5" width="20" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2 8l10 7 10-7" stroke="currentColor" stroke-width="1.5"/></svg>`,
  },
  {
    id: 'tpl-cta', label: 'CTA Banner', category: 'Templates',
    content: `<section style="padding:80px 48px;background:linear-gradient(135deg,#7c3aed,#4f46e5);text-align:center;font-family:-apple-system,sans-serif;"><h2 style="font-size:2.75rem;font-weight:900;color:#fff;margin:0 0 18px;">Ready to get started?</h2><p style="font-size:1.15rem;color:rgba(255,255,255,.75);margin:0 0 40px;">Join 50,000+ teams already building with us.</p><div style="display:flex;gap:14px;justify-content:center;"><button style="padding:14px 36px;background:#fff;color:#7c3aed;border:none;border-radius:10px;font-size:1rem;font-weight:800;cursor:pointer;">Start for Free</button><button style="padding:14px 28px;background:transparent;color:#fff;border:2px solid rgba(255,255,255,.4);border-radius:10px;font-size:1rem;font-weight:600;cursor:pointer;">Learn More</button></div></section>`,
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="6" width="20" height="12" rx="4" fill="currentColor" opacity=".15" stroke="currentColor" stroke-width="1.5"/><path d="M14 9l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  },
  {
    id: 'tpl-footer', label: 'Footer', category: 'Templates',
    content: `<footer style="background:#111;padding:64px 48px 32px;font-family:-apple-system,sans-serif;"><div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-bottom:48px;"><div><span style="font-weight:800;font-size:1.3rem;color:#fff;">Brand</span><p style="font-size:.875rem;color:#9ca3af;margin:16px 0;line-height:1.7;max-width:260px;">Building the future, one feature at a time.</p></div><div><p style="font-size:.75rem;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;margin:0 0 16px;">Product</p><p style="margin:0;"><a href="#" style="color:#9ca3af;text-decoration:none;font-size:.875rem;line-height:2;">Features</a></p><p style="margin:0;"><a href="#" style="color:#9ca3af;text-decoration:none;font-size:.875rem;line-height:2;">Pricing</a></p></div><div><p style="font-size:.75rem;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;margin:0 0 16px;">Company</p><p style="margin:0;"><a href="#" style="color:#9ca3af;text-decoration:none;font-size:.875rem;line-height:2;">About</a></p><p style="margin:0;"><a href="#" style="color:#9ca3af;text-decoration:none;font-size:.875rem;line-height:2;">Blog</a></p></div><div><p style="font-size:.75rem;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;margin:0 0 16px;">Legal</p><p style="margin:0;"><a href="#" style="color:#9ca3af;text-decoration:none;font-size:.875rem;line-height:2;">Privacy</a></p><p style="margin:0;"><a href="#" style="color:#9ca3af;text-decoration:none;font-size:.875rem;line-height:2;">Terms</a></p></div></div><div style="border-top:1px solid #1f2937;padding-top:28px;text-align:center;"><p style="font-size:.8rem;color:#6b7280;margin:0;">© 2025 Brand Inc. All rights reserved.</p></div></footer>`,
    media: `<svg viewBox="0 0 24 24" width="28" height="28"><rect x="2" y="14" width="20" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="2" y1="17" x2="22" y2="17" stroke="currentColor" stroke-width="1"/></svg>`,
  },
]

/* ═══════════════════════════════════════════════════════════════════════════════
   Style Manager sectors
   ═══════════════════════════════════════════════════════════════════════════════ */
const STYLE_SECTORS = [
  {
    name: 'Layout', open: true,
    properties: [
      { name: 'Display', property: 'display', type: 'select', defaults: 'block', list: [
        { value: 'block', name: 'Block' }, { value: 'flex', name: 'Flex' },
        { value: 'inline', name: 'Inline' }, { value: 'inline-block', name: 'Inline Block' },
        { value: 'grid', name: 'Grid' }, { value: 'none', name: 'None' },
      ]},
      { name: 'Position', property: 'position', type: 'select', defaults: 'static', list: [
        { value: 'static', name: 'Static' }, { value: 'relative', name: 'Relative' },
        { value: 'absolute', name: 'Absolute' }, { value: 'fixed', name: 'Fixed' },
        { value: 'sticky', name: 'Sticky' },
      ]},
      'top', 'right', 'bottom', 'left',
    ],
  },
  {
    name: 'Flex', open: false,
    properties: [
      { property: 'flex-direction', type: 'select', list: [
        { value: 'row', name: 'Row' }, { value: 'column', name: 'Column' },
        { value: 'row-reverse', name: 'Row Reverse' }, { value: 'column-reverse', name: 'Col Rev' },
      ]},
      { property: 'justify-content', type: 'select', list: [
        { value: 'flex-start', name: 'Start' }, { value: 'center', name: 'Center' },
        { value: 'flex-end', name: 'End' }, { value: 'space-between', name: 'Between' },
        { value: 'space-around', name: 'Around' },
      ]},
      { property: 'align-items', type: 'select', list: [
        { value: 'flex-start', name: 'Start' }, { value: 'center', name: 'Center' },
        { value: 'flex-end', name: 'End' }, { value: 'stretch', name: 'Stretch' },
      ]},
      'flex-wrap', 'gap',
    ],
  },
  {
    name: 'Size', open: true,
    properties: ['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height'],
  },
  {
    name: 'Space', open: true,
    properties: [
      'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    ],
  },
  {
    name: 'Typography', open: false,
    properties: [
      'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing',
      { property: 'color', type: 'color' },
      { property: 'text-align', type: 'select', list: [
        { value: 'left', name: 'Left' }, { value: 'center', name: 'Center' },
        { value: 'right', name: 'Right' }, { value: 'justify', name: 'Justify' },
      ]},
      'text-decoration',
    ],
  },
  {
    name: 'Decorations', open: false,
    properties: [
      { property: 'background-color', type: 'color' },
      'border-radius', 'border',
      { property: 'border-color', type: 'color' },
      'box-shadow', 'opacity',
    ],
  },
]

/* ═══════════════════════════════════════════════════════════════════════════════
   SVG icon components for the icon rail
   ═══════════════════════════════════════════════════════════════════════════════ */
const BlocksIcon = () => (
  <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="2" width="7" height="7" rx="1.5"/><rect x="11" y="2" width="7" height="7" rx="1.5"/>
    <rect x="2" y="11" width="7" height="7" rx="1.5"/><rect x="11" y="11" width="7" height="7" rx="1.5"/>
  </svg>
)
const LayersIcon = () => (
  <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M10 3l8 5-8 5-8-5z"/><path d="M2 13l8 5 8-5" opacity=".5"/>
  </svg>
)
const StylesIcon = () => (
  <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="10" cy="10" r="7"/><path d="M10 3v3M10 14v3M3 10h3M14 10h3" strokeLinecap="round"/>
  </svg>
)
const PropsIcon = () => (
  <svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 6h12M4 10h8M4 14h10" strokeLinecap="round"/>
  </svg>
)

/* ═══════════════════════════════════════════════════════════════════════════════
   Main component — Artify-style layout
   ═══════════════════════════════════════════════════════════════════════════════ */
const GrapesCanvasInner: FC<GrapesCanvasInnerProps> = ({ className, onEditorReady }) => {
  const canvasRef = useRef<HTMLDivElement>(null)
  const blocksRef = useRef<HTMLDivElement>(null)
  const layersRef = useRef<HTMLDivElement>(null)
  const stylesRef = useRef<HTMLDivElement>(null)
  const traitsRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<ReturnType<typeof grapesjs.init> | null>(null)

  const onEditorReadyRef = useRef(onEditorReady)
  onEditorReadyRef.current = onEditorReady

  // null = collapsed
  const [leftPanel, setLeftPanel]   = useState<'blocks' | 'layers' | null>('blocks')
  const [rightPanel, setRightPanel] = useState<'styles' | 'properties' | null>('styles')
  const rightPanelRef = useRef<'styles' | 'properties' | null>('styles')

  useEffect(() => {
    rightPanelRef.current = rightPanel
  }, [rightPanel])

  const setCanUndo = useEditorUiStore((s) => s.setCanUndo)
  const setCanRedo = useEditorUiStore((s) => s.setCanRedo)
  const setDirty   = useEditorUiStore((s) => s.setDirty)
  const uiBridge   = useMemo(() => ({ setCanUndo, setCanRedo, setDirty }), [setCanUndo, setCanRedo, setDirty])

  // Inject dark theme
  useEffect(() => {
    if (document.getElementById('gjs-dark-theme')) return
    const el = document.createElement('style')
    el.id = 'gjs-dark-theme'
    el.textContent = DARK_THEME_CSS
    document.head.appendChild(el)
    return () => { el.remove() }
  }, [])

  // Init GrapesJS
  useEffect(() => {
    if (!canvasRef.current || !blocksRef.current || !layersRef.current || !stylesRef.current || !traitsRef.current) return

    const editor = grapesjs.init({
      container: canvasRef.current,
      fromElement: false,
      height: '100%',
      width: 'auto',
      storageManager: false,
      avoidInlineStyle: false,
      panels: { defaults: [] },
      blockManager:  { appendTo: blocksRef.current, blocks: BASIC_BLOCKS },
      layerManager:  { appendTo: layersRef.current },
      styleManager:  { appendTo: stylesRef.current, sectors: STYLE_SECTORS },
      traitManager:  { appendTo: traitsRef.current },
      deviceManager: {
        devices: [
          { name: 'Desktop', width: '' },
          { name: 'Tablet', width: '768px', widthMedia: '992px' },
          { name: 'Mobile', width: '375px', widthMedia: '480px' },
        ],
      },
      canvas: {
        styles: [`
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; }
          [data-gjs-type="wrapper"] { min-height: 100vh; }
        `],
      },
    })

    editorRef.current = editor

    // Auto-open right styles panel when component is selected
    editor.on('component:selected', () => {
      if (rightPanelRef.current === null) setRightPanel('styles')
    })

    onEditorReadyRef.current?.({
      getHtml: () => editor.getHtml(),
      getCss:  () => editor.getCss() ?? '',
      setHtml: (v) => { editor.setComponents(v) },
      setCss:  (v) => { editor.setStyle(v) },
      editor,
    })

    const cleanupBridge = bindEditorSyncBridge(editor, uiBridge)
    return () => { cleanupBridge(); editor.destroy(); editorRef.current = null }
  }, [uiBridge]) // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle helpers
  const toggleLeft  = useCallback((t: 'blocks' | 'layers')       => setLeftPanel(p  => p === t ? null : t), [])
  const toggleRight = useCallback((t: 'styles' | 'properties')   => setRightPanel(p => p === t ? null : t), [])

  /* ── Icon-rail button ── */
  const iconBtn = (active: boolean, onClick: () => void, title: string, icon: React.ReactNode) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className={[
        'w-9 h-9 flex items-center justify-center rounded-md transition-all duration-100',
        active
          ? 'bg-violet-500/15 text-violet-400'
          : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/[.06]',
      ].join(' ')}
    >
      {icon}
    </button>
  )

  const leftOpen  = leftPanel  !== null
  const rightOpen = rightPanel !== null

  return (
    <div className={`flex overflow-hidden bg-[#0e0e0e] ${className ?? ''}`} data-testid="grapes-canvas-root">

      {/* ═══ Left icon rail ═══ */}
      <div className="w-[44px] flex-shrink-0 bg-[#0e0e0e] border-r border-[#1a1a1a] flex flex-col items-center pt-2 gap-1">
        {iconBtn(leftPanel === 'blocks', () => toggleLeft('blocks'), 'Blocks', <BlocksIcon />)}
        {iconBtn(leftPanel === 'layers', () => toggleLeft('layers'), 'Layers', <LayersIcon />)}
      </div>

      {/* ═══ Left panel ═══ */}
      <div
        className="flex-shrink-0 bg-[#131313] border-r border-[#1a1a1a] flex flex-col overflow-hidden transition-[width] duration-150"
        style={{ width: leftOpen ? 260 : 0 }}
      >
        {/* Panel header — always rendered so refs stay mounted */}
        <div className="flex items-center justify-between px-3 h-9 border-b border-[#1a1a1a] flex-shrink-0">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest select-none">
            {leftPanel === 'layers' ? 'Layers' : 'Blocks'}
          </span>
          <button
            type="button"
            aria-label="Close left panel"
            onClick={() => setLeftPanel(null)}
            className="text-zinc-700 hover:text-zinc-400 transition-colors"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4L4 12M4 4l8 8" strokeLinecap="round"/></svg>
          </button>
        </div>

        {/* Content containers — NEVER unmounted, visibility toggled via style */}
        <div className="flex-1 overflow-hidden relative">
          <div
            ref={blocksRef}
            data-testid="grapes-canvas-inner"
            className="absolute inset-0 overflow-y-auto"
            style={{ display: leftPanel === 'blocks' ? 'block' : 'none' }}
          />
          <div
            ref={layersRef}
            className="absolute inset-0 overflow-y-auto"
            style={{ display: leftPanel === 'layers' ? 'block' : 'none' }}
          />
        </div>
      </div>

      {/* ═══ Canvas ═══ */}
      <div ref={canvasRef} className="flex-1 min-w-0" />

      {/* ═══ Right panel ═══ */}
      <div
        className="flex-shrink-0 bg-[#131313] border-l border-[#1a1a1a] flex flex-col overflow-hidden transition-[width] duration-150"
        style={{ width: rightOpen ? 260 : 0 }}
      >
        <div className="flex items-center gap-2 px-3 h-9 border-b border-[#1a1a1a] flex-shrink-0">
          <button
            type="button"
            onClick={() => setRightPanel('styles')}
            className={`text-[11px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded transition-colors ${
              rightPanel === 'styles' ? 'text-violet-400 bg-violet-500/10' : 'text-zinc-600 hover:text-zinc-400'
            }`}
          >Styles</button>
          <button
            type="button"
            onClick={() => setRightPanel('properties')}
            className={`text-[11px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded transition-colors ${
              rightPanel === 'properties' ? 'text-violet-400 bg-violet-500/10' : 'text-zinc-600 hover:text-zinc-400'
            }`}
          >Properties</button>
          <div className="flex-1"/>
          <button
            type="button"
            aria-label="Close right panel"
            onClick={() => setRightPanel(null)}
            className="text-zinc-700 hover:text-zinc-400 transition-colors"
          >
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4L4 12M4 4l8 8" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <div
            ref={stylesRef}
            className="absolute inset-0 overflow-y-auto"
            style={{ display: rightPanel === 'styles' ? 'block' : 'none' }}
          />
          <div
            ref={traitsRef}
            className="absolute inset-0 overflow-y-auto"
            style={{ display: rightPanel === 'properties' ? 'block' : 'none' }}
          />
        </div>
      </div>

      {/* ═══ Right icon rail ═══ */}
      <div className="w-[44px] flex-shrink-0 bg-[#0e0e0e] border-l border-[#1a1a1a] flex flex-col items-center pt-2 gap-1">
        {iconBtn(rightPanel === 'styles',     () => toggleRight('styles'),     'Styles',     <StylesIcon />)}
        {iconBtn(rightPanel === 'properties', () => toggleRight('properties'), 'Properties', <PropsIcon />)}
      </div>

    </div>
  )
}

export default GrapesCanvasInner
