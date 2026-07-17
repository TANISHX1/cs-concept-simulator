import { lazy, Suspense, useState } from "react";
import {
  ArrowRight,
  Box,
  Bot,
  Command,
  Menu,
  Network,
  Search,
  Terminal,
  Workflow,
  Zap,
} from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import {
  flatConceptIndex,
  getConceptByPath,
  sectionLabels,
} from "../lib/contentLoader";
import { Sidebar } from "../features/sidebar/Sidebar";
import { ChatPanel } from "../features/chat/ChatPanel";
import { ReferencesList } from "../features/references/ReferencesList";
import { ThemeToggle } from "../features/theme/ThemeToggle";

const sectionVisuals = {
  algorithms: { icon: Workflow, accent: "text-accent-algorithms" },
  os: { icon: Box, accent: "text-accent-os" },
  networking: { icon: Network, accent: "text-accent-networking" },
  systems: { icon: Terminal, accent: "text-accent-systems" },
  languages: { icon: Zap, accent: "text-accent-languages" },
} as const;

function SectionOverview({ section }: { section?: string }) {
  const concepts = section
    ? flatConceptIndex.filter((item) => item.section === section)
    : flatConceptIndex;
  const title = section ? sectionLabels[section] : "Concept library";

  return (
    <div>
      <div className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
          {section ? "Section overview" : "Workspace overview"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 max-w-2xl text-muted">
          {section
            ? `Explore the interactive concepts currently available in ${title}.`
            : "Choose a section to start exploring interactive computer science concepts."}
        </p>
      </div>
      {!section ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(sectionLabels).map(([key, label]) => {
            const count = flatConceptIndex.filter(
              (item) => item.section === key,
            ).length;
            const visual = sectionVisuals[key as keyof typeof sectionVisuals];
            const Icon = visual.icon;
            return (
              <Link
                key={key}
                to={`/workspace/${key}`}
                className="group rounded-2xl border border-border bg-surface/45 p-5 transition hover:-translate-y-0.5 hover:bg-surface-hover"
              >
                <div className="relative mb-8 flex h-16 items-center justify-between overflow-hidden rounded-xl bg-background px-4">
                  <Icon className={visual.accent} size={22} strokeWidth={1.7} />
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 150 44"
                    className={`h-12 w-36 opacity-70 transition duration-500 group-hover:scale-105 ${visual.accent}`}
                    fill="none"
                  >
                    <path
                      d="M2 34 C18 34 20 12 36 12 S53 30 69 30 S87 8 103 8 S120 22 148 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeDasharray="5 5"
                      className="animate-[dash_4s_linear_infinite]"
                    />
                    <circle cx="103" cy="8" r="3" fill="currentColor" />
                  </svg>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[.16em] text-muted">
                      Section
                    </p>
                    <h2 className="mt-2 font-medium">{label}</h2>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-muted transition group-hover:translate-x-1 group-hover:text-foreground"
                  />
                </div>
                <p className="mt-4 text-sm text-muted">
                  {count === 0
                    ? "No concepts yet"
                    : `${count} concept${count === 1 ? "" : "s"} available`}
                </p>
              </Link>
            );
          })}
        </div>
      ) : concepts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="font-mono text-xs uppercase tracking-[.2em] text-muted">
            No concepts yet
          </p>
          <h2 className="mt-3 text-xl font-semibold">
            This section is waiting for its first simulation.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
            Add a concept folder with metadata, simulation, logic, and
            references to make it appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {concepts.map((item) => (
            <Link
              key={item.path}
              to={`/workspace/${item.path}`}
              className="group rounded-2xl border border-border bg-surface/45 p-5 transition hover:-translate-y-0.5 hover:bg-surface-hover"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[.16em] text-muted">
                    {item.difficulty}
                  </p>
                  <h2 className="mt-2 font-medium">{item.title}</h2>
                </div>
                <ArrowRight
                  size={16}
                  className="text-muted transition group-hover:translate-x-1 group-hover:text-foreground"
                />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {item.summary}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {item.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-background px-2 py-1 font-mono text-[10px] text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Workspace() {
  const [chatOpen, setChatOpen] = useState(false);
  const loc = useLocation();
  const path = loc.pathname.replace(/^\/workspace\/?/, "").replace(/\/$/, "");
  const concept = getConceptByPath(path);
  const Simulation = concept?.simulation ? lazy(concept.simulation) : null;
  const Logic = concept?.logic ? lazy(concept.logic) : null;
  const tab = new URLSearchParams(loc.search).get("tab") ?? "simulation";
  const trail = path.split("/").filter(Boolean);
  const isSectionRoute = trail.length === 1 && Boolean(sectionLabels[trail[0]]);
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/45 px-4">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground text-background font-mono text-xs">
            ∷
          </span>
          <span className="hidden sm:inline">CS Simulator</span>
        </Link>
        <div className="hidden items-center gap-1 text-xs text-muted md:flex">
          /{" "}
          <Link to="/workspace" className="hover:text-foreground">
            workspace
          </Link>
          {trail.map((t, i) => (
            <span key={t}>
              {" "}
              /{" "}
              <span className={i === trail.length - 1 ? "text-foreground" : ""}>
                {i === 0 ? (sectionLabels[t] ?? t) : (concept?.title ?? t)}
              </span>
            </span>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="hidden items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface-hover sm:flex">
            <Search size={14} /> Search{" "}
            <kbd className="font-mono text-[10px]">
              <Command size={10} className="inline" />K
            </kbd>
          </button>
          <button
            type="button"
            aria-label="Open concept copilot"
            onClick={() => setChatOpen(true)}
            className="rounded-lg border border-border p-2 text-muted transition hover:bg-surface-hover hover:text-foreground"
          >
            <Bot size={16} />
          </button>
          <button
            className="rounded-lg border border-border p-2 text-muted lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={16} />
          </button>
          <ThemeToggle />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        {trail.length > 0 && <Sidebar />}
        <main className="scrollbar min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
            {concept ? (
              <>
                <div className="mb-7">
                  <p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
                    {sectionLabels[concept.section] ?? concept.section} ·{" "}
                    {concept.difficulty}
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                    {concept.title}
                  </h1>
                  <p className="mt-3 max-w-2xl text-muted">{concept.summary}</p>
                </div>
                <div className="mb-5 flex gap-1 border-b border-border">
                  <Link
                    to={loc.pathname + "?tab=simulation"}
                    className={`px-3 py-2 text-sm ${tab === "simulation" ? "border-b-2 border-foreground text-foreground" : "text-muted"}`}
                  >
                    Simulation
                  </Link>
                  <Link
                    to={loc.pathname + "?tab=logic"}
                    className={`px-3 py-2 text-sm ${tab === "logic" ? "border-b-2 border-foreground text-foreground" : "text-muted"}`}
                  >
                    Logic
                  </Link>
                  <Link
                    to={loc.pathname + "?tab=references"}
                    className={`px-3 py-2 text-sm ${tab === "references" ? "border-b-2 border-foreground text-foreground" : "text-muted"}`}
                  >
                    References
                  </Link>
                </div>
                {tab === "references" ? (
                  <ReferencesList references={concept.references} />
                ) : tab === "logic" ? (
                  <Suspense
                    fallback={
                      <div className="text-muted">Loading explanation…</div>
                    }
                  >
                    {Logic && (
                      <article className="prose prose-invert max-w-none text-foreground [&_h1]:text-2xl [&_p]:text-muted [&_code]:font-mono [&_code]:text-accent-algorithms">
                        <Logic />
                      </article>
                    )}
                  </Suspense>
                ) : (
                  <Suspense
                    fallback={
                      <div className="h-72 animate-pulse rounded-2xl bg-surface" />
                    }
                  >
                    {Simulation && <Simulation />}
                  </Suspense>
                )}
              </>
            ) : path === "" || isSectionRoute ? (
              <SectionOverview section={isSectionRoute ? trail[0] : undefined} />
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                <p className="font-mono text-xs uppercase tracking-[.2em] text-muted">
                  No concept at this path
                </p>
                <h1 className="mt-3 text-2xl font-semibold">
                  Choose a topic from the library
                </h1>
                <Link
                  to="/workspace/algorithms/sorting/merge-sort"
                  className="mt-6 inline-block rounded-lg bg-foreground px-4 py-2 text-sm text-background"
                >
                  Open Merge Sort
                </Link>
              </div>
            )}
          </div>
        </main>
        <ChatPanel
          concept={concept}
          open={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      </div>
    </div>
  );
}
