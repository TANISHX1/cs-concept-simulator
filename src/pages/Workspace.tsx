import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  Bot,
  Command,
  LockKeyhole,
  Menu,
  Network,
  LoaderCircle,
  Search,
  Sparkles,
  Terminal,
  Workflow,
  X,
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
import { SettingsModal } from "../features/settings/SettingsModal";
import { GenerateInput } from "../features/generate/GenerateInput";
import {
  CUSTOM_SIMULATIONS_LABEL,
  CUSTOM_SIMULATIONS_SECTION,
  useGeneratedConcepts,
} from "../features/generate/GeneratedConceptsContext";
import { VariationInput } from "../features/generate/VariationInput";
import { CommandPalette } from "../features/search/CommandPalette";
import { DynamicSimulation } from "../components/simulation/DynamicSimulation";
import { SimulationErrorBoundary } from "../components/ui/SimulationErrorBoundary";
import { SimulationStepExplanation } from "../components/simulation/SimulationStepExplanation";
import {
  ActiveSimulationProvider,
  useRequiredActiveSimulation,
} from "../components/simulation/ActiveSimulationContext";
import type { SimulationSpec } from "../lib/simulationSpec";
import { isLiveMode } from "../lib/apiClient";
import { GeneratedConceptLogic } from "../features/generate/GeneratedConceptLogic";
import { modifyGeneratedSimulation } from "../features/generate/modifyGeneratedSimulation";
import { ConceptWorkbench } from "../features/code-trace/ConceptWorkbench";
import { TraceKernelMark } from "../components/TraceKernelMark";

const sectionVisuals = {
  algorithms: { icon: Workflow, accent: "text-accent-algorithms" },
  os: { icon: Box, accent: "text-accent-os" },
  networking: { icon: Network, accent: "text-accent-networking" },
  systems: { icon: Terminal, accent: "text-accent-systems" },
  languages: { icon: Zap, accent: "text-accent-languages" },
  [CUSTOM_SIMULATIONS_SECTION]: {
    icon: Sparkles,
    accent: "text-accent-algorithms",
  },
} as const;

const librarySections = [
  ...Object.entries(sectionLabels),
  [CUSTOM_SIMULATIONS_SECTION, CUSTOM_SIMULATIONS_LABEL],
] as const;

function SectionOverview({
  section,
  liveMode,
  onOpenSettings,
}: {
  section?: string;
  liveMode: boolean;
  onOpenSettings: () => void;
}) {
  const { generatedConcepts } = useGeneratedConcepts();
  const concepts = section ? flatConceptIndex.filter((item) => item.section === section) : [];
  const title = section ? sectionLabels[section] : "Concept library";

  return (
    <div>
      {section && (
        <Link
          to="/workspace"
          className="mb-5 inline-flex items-center gap-1 text-xs text-muted transition hover:text-foreground"
        >
          <ArrowLeft size={13} aria-hidden="true" />
          All sections
        </Link>
      )}
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
      {!section &&
        (liveMode ? (
          <GenerateInput variant="panel" />
        ) : (
          <LiveAiSetupPanel onOpenSettings={onOpenSettings} className="mt-8" />
        ))}
      {!section ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {librarySections.map(([key, label]) => {
            const isCustomSection = key === CUSTOM_SIMULATIONS_SECTION;
            const count = isCustomSection
              ? generatedConcepts.length
              : flatConceptIndex.filter((item) => item.section === key).length;
            const visual = sectionVisuals[key as keyof typeof sectionVisuals];
            const Icon = visual.icon;
            return (
              <Link
                key={key}
                to={`/workspace/${key}`}
                className="group rounded-2xl border border-card-border bg-surface/60 p-5 shadow-card transition hover:-translate-y-0.5 hover:border-card-border-hover hover:bg-surface-hover hover:shadow-card-hover"
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
                      {isCustomSection ? "Your workspace" : "Section"}
                    </p>
                    <h2 className="mt-2 font-medium">{label}</h2>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-muted transition group-hover:translate-x-1 group-hover:text-foreground"
                  />
                </div>
                <p className="mt-4 text-sm text-muted">
                  {isCustomSection
                    ? liveMode
                      ? `${count} custom simulation${count === 1 ? "" : "s"} this session`
                      : "Configure Live AI to create simulations"
                    : count === 0
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
              className="group rounded-2xl border border-card-border bg-surface/60 p-5 shadow-card transition hover:-translate-y-0.5 hover:border-card-border-hover hover:bg-surface-hover hover:shadow-card-hover"
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

function LiveAiSetupPanel({
  onOpenSettings,
  className = "",
}: {
  onOpenSettings: () => void;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-dashed border-border bg-surface/45 p-5 ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-lg bg-background p-2 text-muted">
          <LockKeyhole size={16} aria-hidden="true" />
        </span>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-muted">
            Live AI required
          </p>
          <h2 className="mt-1 text-lg font-semibold">Generate a custom simulation</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Add a provider key to turn your prompt into an interactive lesson.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenSettings}
        className="mt-4 rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background transition hover:opacity-90"
      >
        Configure Live AI
      </button>
    </section>
  );
}

function CustomSimulationsOverview({
  liveMode,
  onOpenSettings,
}: {
  liveMode: boolean;
  onOpenSettings: () => void;
}) {
  const { generatedConcepts } = useGeneratedConcepts();

  return (
    <div>
      <div className="mb-8">
        <p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
          Your workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {CUSTOM_SIMULATIONS_LABEL}
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Interactive lessons created in this browser session.
        </p>
      </div>
      {liveMode ? (
        <GenerateInput variant="panel" />
      ) : (
        <LiveAiSetupPanel onOpenSettings={onOpenSettings} className="mt-8" />
      )}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {generatedConcepts.map(({ slug, spec }) => (
          <Link
            key={slug}
            to={`/workspace/${CUSTOM_SIMULATIONS_SECTION}/${slug}`}
            className="group flex min-h-64 flex-col rounded-2xl border border-card-border bg-surface/60 p-5 shadow-card transition hover:-translate-y-0.5 hover:border-card-border-hover hover:bg-surface-hover hover:shadow-card-hover"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.16em] text-muted">
                  {spec.visualType} simulation
                </p>
                <h2 className="mt-2 font-medium">{spec.title}</h2>
              </div>
              <ArrowRight
                size={16}
                className="text-muted transition group-hover:translate-x-1 group-hover:text-foreground"
              />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {spec.steps.length} step{spec.steps.length === 1 ? "" : "s"} · {spec.complexity.time} time
            </p>
            <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
              <span className="rounded-full bg-background px-2 py-1 font-mono text-[10px] text-muted">
                Custom
              </span>
              <span className="rounded-full bg-background px-2 py-1 font-mono text-[10px] text-muted">
                {spec.visualType}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function WorkspaceTabs({ pathname, tab }: { pathname: string; tab: string }) {
  return (
    <div className="mb-5 flex gap-1 border-b border-border">
      <Link
        to={pathname + "?tab=simulation"}
        className={`px-3 py-2 text-sm ${tab === "simulation" ? "border-b-2 border-foreground text-foreground" : "text-muted"}`}
      >
        Simulation
      </Link>
      <Link
        to={pathname + "?tab=logic"}
        className={`px-3 py-2 text-sm ${tab === "logic" ? "border-b-2 border-foreground text-foreground" : "text-muted"}`}
      >
        Logic
      </Link>
      <Link
        to={pathname + "?tab=references"}
        className={`px-3 py-2 text-sm ${tab === "references" ? "border-b-2 border-foreground text-foreground" : "text-muted"}`}
      >
        References
      </Link>
    </div>
  );
}

function MissingConceptContent() {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center">
      <p className="font-mono text-xs uppercase tracking-[.2em] text-muted">
        No concept at this path
      </p>
      <h1 className="mt-3 text-2xl font-semibold">
        Choose a topic from the library
      </h1>
      <Link
        to="/workspace"
        className="mt-6 inline-block rounded-lg bg-foreground px-4 py-2 text-sm text-background"
      >
        Return to library
      </Link>
    </div>
  );
}

function GeneratedConceptRouteFallback() {
  const [isPreparing, setIsPreparing] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setIsPreparing(false), 400);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!isPreparing) {
    return <MissingConceptContent />;
  }

  return (
    <div
      className="flex min-h-[18rem] flex-col items-center justify-center gap-3 text-center"
      role="status"
      aria-live="polite"
    >
      <LoaderCircle
        className="animate-spin text-muted"
        size={20}
        aria-hidden="true"
      />
      <p className="text-sm text-muted">Preparing simulation...</p>
    </div>
  );
}

function MobileNavigationDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm lg:hidden"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <aside
        aria-label="Library navigation"
        aria-modal="true"
        className="fixed inset-y-0 left-0 flex w-[min(20rem,calc(100vw-2rem))] flex-col border-r border-border bg-surface shadow-panel"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <Link
            to="/workspace"
            onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-[.2em] text-muted transition hover:text-foreground"
          >
            Library
          </Link>
          <button
            autoFocus
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="rounded-lg p-2 text-muted transition hover:bg-surface-hover hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
        <Sidebar variant="mobile" onNavigate={onClose} />
      </aside>
    </div>
  );
}

function GeneratedConceptContent({
  slug,
  spec,
  tab,
  pathname,
}: {
  slug: string;
  spec: SimulationSpec;
  tab: string;
  pathname: string;
}) {
  const { conceptId, currentStep, setGroundingContext } =
    useRequiredActiveSimulation();

  return (
    <>
      <Link
        to={`/workspace/${CUSTOM_SIMULATIONS_SECTION}`}
        className="mb-3 inline-flex items-center gap-1 text-xs text-muted transition hover:text-foreground"
      >
        <ArrowLeft size={13} aria-hidden="true" />
        Back to {CUSTOM_SIMULATIONS_LABEL}
      </Link>
      <div className="mb-7">
        <p className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
          Custom · {spec.visualType} simulation
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{spec.title}</h1>
        <p className="mt-3 max-w-2xl text-muted">
          An interactive concept created for this browser session.
        </p>
      </div>
      <WorkspaceTabs pathname={pathname} tab={tab} />
      {tab === "references" ? (
        <article className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-background p-2 text-accent-algorithms">
              <Bot size={16} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold">Custom simulation</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                This lesson was created from your prompt and is stored only for the current browser session.
              </p>
            </div>
          </div>
        </article>
      ) : tab === "logic" ? (
        <GeneratedConceptLogic
          spec={spec}
          conceptId={conceptId}
          currentStep={currentStep}
          onSelectLine={(lineNumber, text) =>
            setGroundingContext({
              conceptId,
              currentStep,
              stateSnapshot: {
                visualType: spec.visualType,
                selectedPseudocodeLine: { number: lineNumber, text },
              },
            })
          }
        />
      ) : (
        <>
          <SimulationErrorBoundary resetKey={spec}>
            <DynamicSimulation spec={spec} />
          </SimulationErrorBoundary>
          <SimulationStepExplanation spec={spec} currentStep={currentStep} />
          <VariationInput
            slug={slug}
            currentSpec={spec}
          />
        </>
      )}
    </>
  );
}

export default function Workspace() {
  const shouldReduceMotion = useReducedMotion();
  const [chatOpen, setChatOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [liveMode, setLiveMode] = useState(isLiveMode);
  const {
    getGeneratedConcept,
    replaceGeneratedConcept,
  } = useGeneratedConcepts();
  const loc = useLocation();
  const path = loc.pathname.replace(/^\/workspace\/?/, "").replace(/\/$/, "");
  const trail = path.split("/").filter(Boolean);
  const isGeneratedRoute =
    trail[0] === CUSTOM_SIMULATIONS_SECTION && trail.length === 2;
  const generatedConcept = isGeneratedRoute
    ? getGeneratedConcept(trail[1])
    : undefined;
  const concept = generatedConcept ? undefined : getConceptByPath(path);
  const Simulation = concept?.simulation ? lazy(concept.simulation) : null;
  const Logic = concept?.logic ? lazy(concept.logic) : null;
  const tab = new URLSearchParams(loc.search).get("tab") ?? "simulation";
  const codeTraceForCurrentConcept =
    concept?.section !== "networking" &&
    concept?.hasCodeTrace &&
    concept.codeTrace;
  const usesWideSimulationLayout = Boolean(
    tab === "simulation" &&
      (concept?.section === "networking" || codeTraceForCurrentConcept),
  );
  const contentKey = `${loc.pathname}${loc.search}`;
  const isSectionRoute = trail.length === 1 && Boolean(sectionLabels[trail[0]]);
  const isCustomSectionRoute =
    trail.length === 1 && trail[0] === CUSTOM_SIMULATIONS_SECTION;
  const modifyCurrentGeneratedConcept = useCallback(
    async (modificationRequest: string) => {
      if (!generatedConcept) {
        throw new Error("This simulation is no longer available.");
      }

      const newSpec = await modifyGeneratedSimulation(
        generatedConcept.spec,
        modificationRequest,
      );
      replaceGeneratedConcept(generatedConcept.slug, newSpec);
      return newSpec;
    },
    [generatedConcept, replaceGeneratedConcept],
  );
  const closeSettings = () => {
    setSettingsOpen(false);
    setLiveMode(isLiveMode());
  };

  const workspace = (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/45 px-4">
        <Link to="/" className="flex items-center gap-2.5 text-sm">
          <TraceKernelMark className="h-7 w-7 text-foreground" />
          <span className="hidden font-mono text-[0.7rem] font-medium uppercase tracking-[0.18em] sm:inline">
            Trace Kernel
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="hidden items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:bg-surface-hover sm:flex"
          >
            <Search size={14} /> Search{" "}
            <kbd className="font-mono text-[10px]">
              <Command size={10} className="inline" />K
            </kbd>
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition hover:bg-surface-hover ${liveMode ? "" : "border-border text-muted hover:text-foreground"}`}
            style={
              liveMode
                ? { borderColor: "var(--success)", color: "var(--success)" }
                : undefined
            }
          >
            {liveMode ? "⚡ Live AI" : "🎭 Demo"}
          </button>
          <button
            type="button"
            aria-label="Open Trace Kernel Copilot"
            onClick={() => setChatOpen(true)}
            className="rounded-lg border border-border p-2 text-muted transition hover:bg-surface-hover hover:text-foreground"
          >
            <Bot size={16} />
          </button>
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="rounded-lg border border-border p-2 text-muted lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={16} />
          </button>
          <ThemeToggle />
        </div>
      </header>
      <MobileNavigationDrawer
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="scrollbar min-w-0 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" initial={!shouldReduceMotion}>
            <motion.div
              key={contentKey}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.18, ease: "easeOut" }}
            >
              <div
                className={
                  usesWideSimulationLayout
                    ? "w-full px-5 py-8 sm:px-8 xl:px-10"
                    : "mx-auto max-w-4xl px-5 py-8 sm:px-8"
                }
              >
                {generatedConcept ? (
              <GeneratedConceptContent
                slug={generatedConcept.slug}
                spec={generatedConcept.spec}
                tab={tab}
                pathname={loc.pathname}
              />
                ) : concept ? (
              <>
                <Link
                  to={`/workspace/${concept.section}`}
                  className="mb-3 inline-flex items-center gap-1 text-xs text-muted transition hover:text-foreground"
                >
                  <ArrowLeft size={13} aria-hidden="true" />
                  Back to {sectionLabels[concept.section] ?? concept.section}
                </Link>
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
                <WorkspaceTabs pathname={loc.pathname} tab={tab} />
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
                    {Simulation && (
                      <SimulationErrorBoundary resetKey={path}>
                        {codeTraceForCurrentConcept ? (
                          <ConceptWorkbench
                            Simulation={Simulation}
                            trace={codeTraceForCurrentConcept}
                            accentSection={concept.accentSection}
                          />
                        ) : (
                          <Simulation />
                        )}
                      </SimulationErrorBoundary>
                    )}
                  </Suspense>
                )}
              </>
                ) : isGeneratedRoute ? (
              <GeneratedConceptRouteFallback key={trail[1]} />
                ) : isCustomSectionRoute ? (
              <CustomSimulationsOverview
                liveMode={liveMode}
                onOpenSettings={() => setSettingsOpen(true)}
              />
                ) : path === "" || isSectionRoute ? (
              <SectionOverview
                section={isSectionRoute ? trail[0] : undefined}
                liveMode={liveMode}
                onOpenSettings={() => setSettingsOpen(true)}
              />
                ) : (
              <MissingConceptContent />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
        <ChatPanel
          concept={
            generatedConcept
              ? { title: generatedConcept.spec.title }
              : concept
          }
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          onModifySimulation={
            generatedConcept ? modifyCurrentGeneratedConcept : undefined
          }
        />
        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
        />
        <SettingsModal open={settingsOpen} onClose={closeSettings} />
      </div>
    </div>
  );

  return generatedConcept ? (
    <ActiveSimulationProvider
      key={generatedConcept.slug}
      conceptId={generatedConcept.slug}
      maxStep={generatedConcept.spec.steps.length}
      resetKey={generatedConcept.spec}
    >
      {workspace}
    </ActiveSimulationProvider>
  ) : (
    workspace
  );
}
