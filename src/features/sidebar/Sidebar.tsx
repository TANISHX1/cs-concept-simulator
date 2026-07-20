import {
  Box,
  ChevronDown,
  ChevronRight,
  FileCode2,
  Folder,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Terminal,
  Workflow,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { sectionLabels } from "../../lib/contentLoader";
import type { ConceptNode } from "../../lib/types";
import { accentClass } from "../../lib/utils";
import {
  CUSTOM_SIMULATIONS_LABEL,
  CUSTOM_SIMULATIONS_SECTION,
  useGeneratedConcepts,
} from "../generate/GeneratedConceptsContext";

type SidebarVariant = "desktop" | "mobile";

type SidebarProps = {
  variant?: SidebarVariant;
  onNavigate?: () => void;
};

const sectionItems = [
  { key: "algorithms", label: sectionLabels.algorithms, icon: Workflow },
  { key: "os", label: sectionLabels.os, icon: Box },
  { key: "networking", label: sectionLabels.networking, icon: Network },
  { key: "systems", label: sectionLabels.systems, icon: Terminal },
  { key: "languages", label: sectionLabels.languages, icon: Zap },
  {
    key: CUSTOM_SIMULATIONS_SECTION,
    label: CUSTOM_SIMULATIONS_LABEL,
    icon: Sparkles,
  },
] as const;

function getContentPath(pathname: string) {
  return pathname.replace(/^\/workspace\/?/, "").replace(/\/$/, "");
}

function countLeafConcepts(node: ConceptNode): number {
  if (node.children.length === 0) return 1;

  return node.children.reduce(
    (count, child) =>
      count + (child.children.length > 0 ? countLeafConcepts(child) : 1),
    0,
  );
}

function containsActivePath(node: ConceptNode, contentPath: string): boolean {
  return (
    node.path === contentPath ||
    node.children.some((child) => containsActivePath(child, contentPath))
  );
}

function ConceptNodeLink({
  node,
  depth,
  contentPath,
  onNavigate,
}: {
  node: ConceptNode;
  depth: number;
  contentPath: string;
  onNavigate?: () => void;
}) {
  const hasChildren = node.children.length > 0;
  const [open, setOpen] = useState(() => containsActivePath(node, contentPath));
  const isActive = contentPath === node.path;

  useEffect(() => {
    if (containsActivePath(node, contentPath)) setOpen(true);
  }, [contentPath, node]);

  return (
    <div>
      <div
        className={`flex items-center gap-1 ${
          isActive ? "bg-surface-hover" : ""
        }`}
        style={{ paddingLeft: 26 + depth * 14 }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={`Toggle ${node.title}`}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="rounded p-1 text-muted transition hover:bg-surface-hover hover:text-foreground"
          >
            {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        ) : (
          <span className="w-5" aria-hidden="true" />
        )}
        <Link
          to={`/workspace/${node.path}`}
          onClick={onNavigate}
          className={`flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-3 text-xs ${
            isActive
              ? `font-semibold ${accentClass(node.section)}`
              : "text-muted hover:text-foreground"
          }`}
        >
          {hasChildren ? <Folder size={14} /> : <FileCode2 size={14} />}
          <span className="truncate">{node.title}</span>
        </Link>
      </div>
      {hasChildren && open
        ? node.children.map((child) => (
            <ConceptNodeLink
              key={child.path}
              node={child}
              depth={depth + 1}
              contentPath={contentPath}
              onNavigate={onNavigate}
            />
          ))
        : null}
    </div>
  );
}

export function Sidebar({ variant = "desktop", onNavigate }: SidebarProps) {
  const [hidden, setHidden] = useState(false);
  const { conceptTree } = useGeneratedConcepts();
  const location = useLocation();
  const contentPath = getContentPath(location.pathname);
  const activeSection = contentPath.split("/")[0];
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => new Set(activeSection ? [activeSection] : []),
  );

  useEffect(() => {
    if (!activeSection) return;

    setOpenSections((sections) => {
      if (sections.has(activeSection)) return sections;

      const nextSections = new Set(sections);
      nextSections.add(activeSection);
      return nextSections;
    });
  }, [activeSection]);

  if (variant === "desktop" && hidden) {
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
    <aside
      className={
        variant === "desktop"
          ? "scrollbar hidden w-64 shrink-0 overflow-y-auto border-r border-border bg-surface/40 py-4 lg:block"
          : "scrollbar min-h-0 flex-1 w-full overflow-y-auto bg-surface py-4"
      }
    >
      {variant === "desktop" ? (
        <div className="flex items-center justify-between px-4 pb-3">
          <Link
            to="/workspace"
            onClick={onNavigate}
            className="font-mono text-[10px] uppercase tracking-[.2em] text-muted transition hover:text-foreground"
          >
            Library
          </Link>
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
      ) : null}

      <nav aria-label="Concept library" className="space-y-1 px-2">
        {sectionItems.map(({ key, label, icon: Icon }) => {
          const sectionRoots = conceptTree.filter((node) => node.section === key);
          const sectionNodes = sectionRoots.flatMap((node) =>
            node.path === key ? node.children : [node],
          );
          const count = sectionRoots.reduce(
            (total, node) => total + countLeafConcepts(node),
            0,
          );
          const open = openSections.has(key);
          const isActiveSection = activeSection === key;
          const isEmpty = count === 0;

          return (
            <div key={key} className={isEmpty ? "opacity-70" : undefined}>
              <div
                className={`flex items-center gap-1 rounded-lg ${
                  isActiveSection ? "bg-surface-hover" : ""
                }`}
              >
                <button
                  type="button"
                  aria-label={`Toggle ${label}`}
                  aria-expanded={open}
                  onClick={() =>
                    setOpenSections((sections) => {
                      const nextSections = new Set(sections);

                      if (nextSections.has(key)) {
                        nextSections.delete(key);
                      } else {
                        nextSections.add(key);
                      }

                      return nextSections;
                    })
                  }
                  className="rounded p-1.5 text-muted transition hover:bg-surface-hover hover:text-foreground"
                >
                  {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <Link
                  to={`/workspace/${key}`}
                  onClick={onNavigate}
                  className={`flex min-w-0 flex-1 items-center gap-2 py-2 text-xs font-medium ${
                    isActiveSection
                      ? accentClass(key)
                      : "text-foreground hover:text-muted"
                  }`}
                >
                  <Icon size={14} aria-hidden="true" />
                  <span className="truncate">{label}</span>
                  <span className="ml-auto rounded-full bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted">
                    {count}
                  </span>
                </Link>
              </div>
              {open
                ? sectionNodes.map((child) => (
                    <ConceptNodeLink
                      key={child.path}
                      node={child}
                      depth={0}
                      contentPath={contentPath}
                      onNavigate={onNavigate}
                    />
                  ))
                : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
