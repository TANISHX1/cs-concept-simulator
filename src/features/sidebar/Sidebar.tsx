import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { conceptTree, sectionLabels } from "../../lib/contentLoader";
import { accentClass } from "../../lib/utils";
import type { ConceptNode } from "../../lib/types";
function Node({ node, depth = 0 }: { node: ConceptNode; depth?: number }) {
  const [open, setOpen] = useState(true);
  const loc = useLocation();
  const active = loc.pathname.endsWith(node.path);
  return (
    <div>
      <div
        className={`flex items-center gap-1 ${active ? "bg-surface-hover" : ""}`}
        style={{ paddingLeft: 12 + depth * 14 }}
      >
        {node.children.length > 0 && (
          <button
            aria-label="Toggle folder"
            onClick={() => setOpen((v) => !v)}
            className="p-1 text-muted"
          >
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        )}
        <Link
          to={`/workspace/${node.path}`}
          className={`flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-3 text-xs ${active ? `font-semibold ${accentClass(node.section)}` : "text-muted hover:text-foreground"}`}
        >
          {node.children.length > 0 ? (
            <Folder size={14} />
          ) : (
            <FileCode2 size={14} />
          )}
          <span className="truncate">{node.title}</span>
        </Link>
      </div>
      {open &&
        node.children.map((c) => (
          <Node key={c.path} node={c} depth={depth + 1} />
        ))}
    </div>
  );
}
export function Sidebar() {
  const [hidden, setHidden] = useState(false);

  if (hidden) {
    return (
      <aside className="hidden w-12 shrink-0 border-r border-border bg-surface/40 lg:block">
        <button
          type="button"
          aria-label="Show Library sidebar"
          title="Show Library"
          onClick={() => setHidden(false)}
          className="m-2 rounded-lg p-2 text-muted transition hover:bg-surface-hover hover:text-foreground"
        >
          <PanelLeftOpen size={16} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="scrollbar hidden w-64 shrink-0 overflow-y-auto border-r border-border bg-surface/40 py-4 lg:block">
      <div className="flex items-center justify-between px-4 pb-3">
        <span className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
          Library
        </span>
        <button
          type="button"
          aria-label="Hide Library sidebar"
          title="Hide Library"
          onClick={() => setHidden(true)}
          className="rounded-md p-1 text-muted transition hover:bg-surface-hover hover:text-foreground"
        >
          <PanelLeftClose size={15} />
        </button>
      </div>
      {conceptTree.map((n) => (
        <div key={n.path}>
          <div
            className={`px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[.16em] ${accentClass(n.section)}`}
          >
            {sectionLabels[n.section] ?? n.section}
          </div>
          <Node node={n} />
        </div>
      ))}
    </aside>
  );
}
