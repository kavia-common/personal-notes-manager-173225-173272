# Ocean Notes (Next.js)

A modern personal notes application built with Next.js App Router and TypeScript. Notes are stored in the browser's localStorage — no backend required.

Features
- Create, view, edit, and delete notes
- Autosave with debounce and persistent storage via localStorage
- Real-time search (title and content)
- Keyboard shortcuts:
  - Ctrl/Cmd+N — New note
  - Ctrl/Cmd+S — Save (confirms save; data is already persisted)
- Ocean Professional theme: blue primary, amber secondary, subtle shadows, rounded corners, gradients
- Responsive layout with header, sidebar, and editor

Getting started
- Development: npm run dev (port 3000)
- Build: npm run build
- Start: npm start

Notes on storage
- Data is saved to localStorage key ocean-notes. On first run, the app seeds a few examples.
- If you need to clear everything, open DevTools → Application → Local Storage and delete the ocean-notes entry.

Dependencies
- No additional runtime dependencies were added beyond Next.js/React/TypeScript (already present).

Implementation details
- App Router with client components for the main page.
- Hydration-safe access to localStorage by gating on typeof window !== "undefined".
- Debounced updates to minimize write frequency.
- Lightweight toasts implemented with a simple hook and CSS.

Folder structure
- src/app/layout.tsx: App metadata and root layout
- src/app/page.tsx: The main notes UI (header, sidebar, editor)
- src/app/globals.css: Theme variables and base styles
- public/favicon.ico: App icon (placeholder)

Keyboard shortcuts
- Ctrl/Cmd+N: Create a new note
- Ctrl/Cmd+S: Save changes (notes already persist automatically; shows a toast)
