import { lazy, Suspense, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LandingMark } from "../components/LandingMark";
import { SettingsModal } from "../features/settings/SettingsModal";
import { useTheme } from "../features/theme/ThemeProvider";
import {
  getAiSettings,
  isLiveMode,
  setAiExperienceMode,
} from "../lib/apiClient";

const HeroScene = lazy(() => import("./HeroScene"));

export default function Landing() {
  const shouldReduceMotion = useReducedMotion();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isStartingLive, setIsStartingLive] = useState(false);

  const enterDemo = () => {
    setAiExperienceMode("demo");
    navigate("/workspace");
  };

  const enterLive = () => {
    if (getAiSettings()?.apiKey.trim()) {
      setAiExperienceMode("live");
      navigate("/workspace");
      return;
    }

    setIsStartingLive(true);
    setSettingsOpen(true);
  };

  const closeSettings = () => {
    setSettingsOpen(false);

    if (isStartingLive && isLiveMode()) {
      navigate("/workspace");
    }

    setIsStartingLive(false);
  };

  const hasSavedKey = Boolean(getAiSettings()?.apiKey.trim());

  return (
    <>
      <main className="min-h-screen overflow-hidden">
        <nav className="mx-auto flex w-full items-center px-8 py-5 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-[0.72rem] border border-border bg-surface/80 text-foreground shadow-panel backdrop-blur-sm">
              <LandingMark className="h-5 w-5" />
            </div>
            <span className="font-semibold tracking-tight">
              CS Concept Simulator
            </span>
          </div>
        </nav>

        <section className="relative min-h-[calc(100vh-5rem)] w-full overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="landing-topology-base absolute inset-0" />
            {!shouldReduceMotion && (
              <Suspense fallback={null}>
                <div className="absolute inset-[-6%] translate-x-[7%] scale-[1.06]">
                  <HeroScene theme={theme} reduceMotion={false} />
                </div>
              </Suspense>
            )}
            <div className="landing-topology-scrim absolute inset-0" />
          </div>
          <motion.div
            className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[1500px] items-center px-8 py-20 lg:px-10"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: "easeOut" }}
          >
            <div className="max-w-3xl -translate-x-3 lg:-translate-x-6">
              <p className="mb-6 font-mono text-[11px] uppercase tracking-[.25em] text-accent-algorithms">
                An interactive CS lab
              </p>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[.98] tracking-[-.05em] sm:text-7xl">
                Make the invisible parts of computing{" "}
                <span className="text-muted">visible.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-muted">
                Explore curated concepts or create an interactive simulation from your own prompt.
              </p>
              <div className="mt-9 grid max-w-2xl gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={enterDemo}
                  className="group rounded-2xl border border-border bg-surface/90 p-5 text-left shadow-panel transition hover:-translate-y-0.5 hover:bg-surface-hover"
                >
                  <BookOpen
                    className="text-accent-algorithms"
                    size={20}
                    aria-hidden="true"
                  />
                  <p className="mt-6 font-mono text-[10px] uppercase tracking-[.16em] text-muted">
                    No key required
                  </p>
                  <h2 className="mt-2 font-semibold">Explore Demo Library</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Learn from the curated concept library with no AI setup.
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium">
                    Browse concepts
                    <ArrowRight
                      size={15}
                      className="transition group-hover:translate-x-1"
                    />
                  </span>
                </button>
                <button
                  type="button"
                  onClick={enterLive}
                  className="group rounded-2xl border border-border bg-surface/90 p-5 text-left shadow-panel transition hover:-translate-y-0.5 hover:bg-surface-hover"
                >
                  <Sparkles
                    className="text-accent-algorithms"
                    size={20}
                    aria-hidden="true"
                  />
                  <p className="mt-6 font-mono text-[10px] uppercase tracking-[.16em] text-muted">
                    Bring your provider
                  </p>
                  <h2 className="mt-2 font-semibold">Create with AI</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    Generate and keep custom simulations alongside the library.
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium">
                    {hasSavedKey ? "Open Live AI" : "Set up Live AI"}
                    <ArrowRight
                      size={15}
                      className="transition group-hover:translate-x-1"
                    />
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </section>
      </main>
      <SettingsModal open={settingsOpen} onClose={closeSettings} />
    </>
  );
}
