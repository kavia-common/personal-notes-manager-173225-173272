"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Types */
type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
};

type Toast = { id: number; message: string };

/** Storage helpers (SSR safe) */
// PUBLIC_INTERFACE
function isBrowser(): boolean {
  /** Returns true if window is available (hydration-safe). */
  return typeof window !== "undefined";
}

// PUBLIC_INTERFACE
function loadNotes(): Note[] {
  /** Load notes from localStorage; seed with examples on first run. */
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem("ocean-notes");
  if (!raw) {
    const seed = seedNotes();
    window.localStorage.setItem("ocean-notes", JSON.stringify(seed));
    return seed;
  }
  try {
    const parsed: Note[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// PUBLIC_INTERFACE
function saveNotes(notes: Note[]) {
  /** Persist notes array to localStorage. */
  if (!isBrowser()) return;
  window.localStorage.setItem("ocean-notes", JSON.stringify(notes));
}

function seedNotes(): Note[] {
  const now = Date.now();
  return [
    {
      id: cryptoRandomId(),
      title: "Welcome to Ocean Notes",
      content:
        "This is your personal notes app.\n\n- Create a new note with Cmd/Ctrl+N\n- Save changes with Cmd/Ctrl+S\n- Use the search box to find notes\n- Click the trash icon to delete (with confirmation)\n\nYour notes are stored locally in your browser.",
      createdAt: now - 1000 * 60 * 60 * 24,
      updatedAt: now - 1000 * 60 * 60 * 2,
    },
    {
      id: cryptoRandomId(),
      title: "Ocean Professional Theme",
      content:
        "Colors:\n- Primary: #2563EB\n- Secondary: #F59E0B\n- Error: #EF4444\n\nDesign:\n- Subtle shadows, rounded corners, gradients\n- Clean and modern layout\n",
      createdAt: now - 1000 * 60 * 60 * 23,
      updatedAt: now - 1000 * 60 * 60 * 1,
    },
  ];
}

function cryptoRandomId(): string {
  if (isBrowser() && "crypto" in window && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback
  return Math.random().toString(36).slice(2);
}

/** Debounce hook */
// PUBLIC_INTERFACE
function useDebouncedCallback<TArgs extends unknown[]>(
  cb: (...args: TArgs) => void,
  delay = 400
): (...args: TArgs) => void {
  /** Returns a debounced function stable across renders. */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback((...args: TArgs) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => cb(...args), delay);
  }, [cb, delay]);
}

/** Toast hook (lightweight) */
function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 2000);
  }, []);
  return { toasts, push };
}

/** Main Page */
export default function Home() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const { toasts, push } = useToast();

  // Load on mount (client only)
  useEffect(() => {
    const ns = loadNotes();
    setNotes(ns);
    setActiveId(ns[0]?.id ?? null);
    setHydrated(true);
  }, []);

  // Persist on changes
  useEffect(() => {
    if (!hydrated) return;
    saveNotes(notes);
  }, [notes, hydrated]);

  const active = useMemo(
    () => notes.find((n) => n.id === activeId) || null,
    [notes, activeId]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
    );
  }, [notes, query]);

  const createNote = useCallback(() => {
    const now = Date.now();
    const n: Note = {
      id: cryptoRandomId(),
      title: "Untitled",
      content: "",
      createdAt: now,
      updatedAt: now,
    };
    setNotes((prev) => [n, ...prev]);
    setActiveId(n.id);
    push("New note created");
  }, [push]);

  const deleteNote = useCallback(
    (id: string) => {
      const n = notes.find((x) => x.id === id);
      const name = n?.title || "this note";
      if (!confirm(`Delete "${name}"? This action cannot be undone.`)) return;
      setNotes((prev) => prev.filter((x) => x.id !== id));
      setActiveId((cur) => {
        if (cur === id) {
          const remaining = notes.filter((x) => x.id !== id);
          return remaining[0]?.id ?? null;
        }
        return cur;
      });
      push("Note deleted");
    },
    [notes, push]
  );

  const updateNote = useCallback(
    (id: string, patch: Partial<Note>) => {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n
        )
      );
    },
    []
  );

  // Keyboard shortcuts: Cmd/Ctrl+N (new), Cmd/Ctrl+S (save -> push toast)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        createNote();
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        // Data is already persisted on change; just inform
        push("All changes saved");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createNote, push]);

  const debouncedUpdate = useDebouncedCallback(
    (id: string, patch: Partial<Note>) => updateNote(id, patch),
    350
  );

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="header">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              aria-hidden
              className="h-9 w-9 rounded-xl"
              style={{
                background: "var(--ocean-gradient)",
                boxShadow: "var(--ocean-shadow)",
              }}
            />
            <div>
              <h1 className="text-lg font-semibold">Ocean Notes</h1>
              <p className="text-xs muted">Modern personal notes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-outline"
              onClick={createNote}
              aria-label="Create new note (Ctrl/Cmd+N)"
              title="New (Ctrl/Cmd+N)"
            >
              <span>＋</span>
              New
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="sidebar p-3">
        <div className="surface p-3">
          <div className="flex items-center gap-2 mb-2">
            <input
              className="input"
              placeholder="Search notes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search notes"
            />
          </div>
          <div
            role="list"
            aria-label="Notes list"
            className="mt-2 flex flex-col gap-1"
          >
            {filtered.length === 0 && (
              <div className="text-sm muted p-2">No notes found.</div>
            )}
            {filtered.map((n) => (
              <button
                key={n.id}
                className={
                  "list-item text-left flex items-center justify-between " +
                  (n.id === activeId ? "active" : "")
                }
                onClick={() => setActiveId(n.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{n.title || "Untitled"}</div>
                  <div className="text-xs muted truncate">
                    {new Date(n.updatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="ml-3">
                  <button
                    className="badge"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNote(n.id);
                    }}
                    aria-label={`Delete note ${n.title || ""}`}
                    title="Delete note"
                  >
                    Delete
                  </button>
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main editor area */}
      <main className="main">
        <div className="mx-auto max-w-5xl p-4">
          {!active && (
            <div className="surface p-10 text-center">
              <h2 className="text-xl font-semibold mb-2">No note selected</h2>
              <p className="muted">
                Create a new note or select one from the sidebar.
              </p>
              <div className="mt-4">
                <button className="btn btn-primary" onClick={createNote}>
                  New note
                </button>
              </div>
            </div>
          )}
          {active && (
            <div className="surface p-5">
              <input
                className="editor-title"
                value={active.title}
                placeholder="Title"
                onChange={(e) =>
                  debouncedUpdate(active.id, { title: e.target.value })
                }
              />
              <div className="h-px w-full my-2" style={{ background: "var(--ocean-border)" }} />
              <textarea
                className="editor-textarea"
                placeholder="Start writing..."
                value={active.content}
                onChange={(e) =>
                  debouncedUpdate(active.id, { content: e.target.value })
                }
              />
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs muted">
                  Created {new Date(active.createdAt).toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      push("All changes saved");
                    }}
                    title="Save (Ctrl/Cmd+S)"
                    aria-label="Save note"
                  >
                    Save
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => createNote()}
                    aria-label="Create new note"
                  >
                    New
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Toasts */}
      {toasts.map((t) => (
        <div key={t.id} role="status" aria-live="polite" className="toast">
          {t.message}
        </div>
      ))}
    </div>
  );
}
