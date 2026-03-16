<p align="center">
  <img src="https://img.shields.io/badge/Lumio-AI%20Website%20Builder-blue?style=for-the-badge" alt="Lumio AI" />
</p>

<h1 align="center">Lumio AI</h1>

<p align="center">
  <b>Design. Connect. Deploy.</b><br/>
  A visual website builder with AI assistance, backend graph wiring, and one-click deploy.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/GrapesJS-Canvas-orange" alt="GrapesJS" />
  <img src="https://img.shields.io/badge/React%20Flow-Routes-818cf8" alt="React Flow" />
  <img src="https://img.shields.io/badge/Zustand-State-brown" alt="Zustand" />
</p>

---

## What is Lumio?

Lumio is a **full-stack visual builder** that lets you design frontend pages, wire up backend APIs, and connect routes — all from a single canvas. No code switching, no context loss.

### Key Features

| Feature | Description |
|---|---|
| **Visual Page Editor** | Drag-and-drop page builder powered by GrapesJS with dark theme, responsive preview, and live style editing |
| **AI Assistant** | Built-in chat panel that can read and modify your canvas in real time |
| **Backend Graph Builder** | Node-based graph editor to define API endpoints, models, auth guards, and service architecture |
| **Routes Canvas** | React Flow powered routing graph — connect pages to backend services visually |
| **Smart Templates** | Drop an "Auth Login Flow" template and it auto-scaffolds login + success pages, JWT backend, and route connections |
| **One-Click Deploy** | Publish directly to Vercel from the editor |
| **Full Code Export** | Export complete frontend HTML/CSS and backend source files |

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/your-username/lumio-ai.git
cd lumio-ai

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Open **http://localhost:3000** and navigate to `/builder` to launch the studio.

---

## Architecture

```
lumio-ai/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes (deploy, generate, push)
│   │   └── builder/            # Studio page
│   ├── components/
│   │   ├── canvas/             # GrapesJS visual editor
│   │   └── studio/             # Builder shell, panels, modals
│   │       ├── BuilderStudio   # Main orchestrator
│   │       ├── TopBar          # Header with undo/redo, preview, publish
│   │       ├── BackendPanel    # Node graph for API design
│   │       ├── RoutesPanel     # React Flow routing canvas
│   │       ├── ChatPanel       # AI assistant
│   │       └── routes-nodes    # Custom page & service nodes
│   ├── store/                  # Zustand state stores
│   │   ├── pages-store         # Page management
│   │   ├── backend-graph-store # Backend node graph
│   │   └── routes-graph-store  # Route connections
│   ├── lib/
│   │   └── backend/            # Code generation & templates
│   └── types/                  # Shared TypeScript types
```

---

## Builder Overview

### Left Sidebar

| Tab | Purpose |
|---|---|
| **Add** | Basic elements — columns, text, images, buttons, forms |
| **Templates** | Pre-built page templates including Auth Login Flow |
| **Pages** | Manage multi-page projects |
| **Layers** | Component tree inspector |
| **Global** | Custom CSS variables and global styles |
| **Code** | Raw HTML/CSS editor with live sync |
| **Routes** | Page-to-service connection sidebar |
| **Backend** | API node graph builder |

### Auth Login Flow Template

Drop it from Templates and it automatically:

1. Creates a **Login page** with email/password form
2. Creates a **Login Success page** with session info
3. Wires up **JWT + User model** backend nodes
4. Connects **route edges** from pages to Auth Service endpoints

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| UI | React 19, Tailwind CSS 4 |
| Visual Editor | GrapesJS |
| Graph Canvas | React Flow (@xyflow/react) |
| State | Zustand |
| AI | Claude API |
| Deploy | Vercel API |

---

## Scripts

```bash
npm run dev        # Start dev server (Turbopack)
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint
npm run typecheck  # TypeScript check
npm run test       # Run unit tests (Vitest)
npm run test:e2e   # Run E2E tests (Playwright)
```

---

## License

Built for the IET Hackathon.
