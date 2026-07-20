import { useGSAP } from "@gsap/react";
import { useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Globe2,
  Menu,
  Sparkles,
} from "lucide-react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { useNavigate } from "react-router-dom";

import { TraceKernelMark } from "@/components/TraceKernelMark";
import { setAiExperienceMode } from "@/lib/apiClient";

import type { TraceSignal } from "./HeroScene";

const HeroScene = lazy(() => import("./HeroScene"));

gsap.registerPlugin(useGSAP, SplitText, ScrollTrigger);

const ambientLines = Array.from({ length: 18 }, (_, index) => ({
  delay: `${-(index % 7) * 1.35}s`,
  duration: `${18 + (index % 5) * 3.5}s`,
  left: `${(index * 19) % 122 - 12}%`,
  rotation: -27 + ((index * 13) % 42),
  top: `${(index * 31) % 108 - 4}%`,
  width: `${42 + (index % 5) * 16}vw`,
}));

type TraceNdc = readonly [number, number];

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

function toNdc(clientX: number, clientY: number): TraceNdc {
  return [
    (clientX / window.innerWidth) * 2 - 1,
    -((clientY / window.innerHeight) * 2 - 1),
  ];
}

export function Landing() {
  const navigate = useNavigate();
  const reducedMotion = Boolean(useReducedMotion());
  const landingRef = useRef<HTMLElement>(null);
  const heroCopyRef = useRef<HTMLDivElement>(null);
  const choicesSectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const ctaUnderlineRef = useRef<HTMLSpanElement>(null);
  const ctaArrowRef = useRef<HTMLSpanElement>(null);
  const ctaTweensRef = useRef<gsap.core.Tween[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const holdingRef = useRef(false);
  const confirmedSequenceRef = useRef(0);
  const sequenceRef = useRef(0);
  const lastNdcRef = useRef<TraceNdc>([0, 0]);
  const [isTracing, setIsTracing] = useState(false);
  const [traceSignal, setTraceSignal] = useState<TraceSignal>({
    ndc: [0, 0],
    phase: "idle",
    sequence: 0,
  });

  const clearHoldTimer = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const getAudioContext = useCallback(() => {
    const audioWindow = window as AudioWindow;
    const AudioContextClass =
      audioWindow.AudioContext ?? audioWindow.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    if (
      !audioContextRef.current ||
      audioContextRef.current.state === "closed"
    ) {
      audioContextRef.current = new AudioContextClass();
    }

    return audioContextRef.current;
  }, []);

  const playConfirmTone = useCallback(() => {
    const audioContext = getAudioContext();

    if (!audioContext) {
      return;
    }

    void audioContext.resume().then(() => {
      if (audioContext.state !== "running") {
        return;
      }

      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const now = audioContext.currentTime;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(600, now);
      oscillator.frequency.exponentialRampToValueAtTime(900, now + 0.1);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.055, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.125);
      oscillator.addEventListener(
        "ended",
        () => {
          oscillator.disconnect();
          gain.disconnect();
        },
        { once: true },
      );
    });
  }, [getAudioContext]);

  const beginTrace = useCallback(
    (ndc: TraceNdc) => {
      if (reducedMotion || holdingRef.current) {
        return;
      }

      const sequence = sequenceRef.current + 1;
      sequenceRef.current = sequence;
      lastNdcRef.current = ndc;
      holdingRef.current = true;
      setIsTracing(true);
      setTraceSignal({ ndc, phase: "start", sequence });

      const audioContext = getAudioContext();
      void audioContext?.resume();

      clearHoldTimer();
      holdTimerRef.current = window.setTimeout(() => {
        if (!holdingRef.current || sequenceRef.current !== sequence) {
          return;
        }

        confirmedSequenceRef.current = sequence;
        setTraceSignal({ ndc, phase: "confirm", sequence });
        setIsTracing(false);
        playConfirmTone();
      }, 800);
    },
    [clearHoldTimer, getAudioContext, playConfirmTone, reducedMotion],
  );

  const endTrace = useCallback(() => {
    if (!holdingRef.current) {
      return;
    }

    const sequence = sequenceRef.current;
    holdingRef.current = false;
    clearHoldTimer();

    if (confirmedSequenceRef.current !== sequence) {
      setTraceSignal({
        ndc: lastNdcRef.current,
        phase: "cancel",
        sequence,
      });
    }

    setIsTracing(false);
  }, [clearHoldTimer]);

  const animateCtaHover = useCallback((isActive: boolean) => {
    const underline = ctaUnderlineRef.current;
    const arrow = ctaArrowRef.current;

    if (!underline || !arrow) {
      return;
    }

    ctaTweensRef.current.forEach((tween) => tween.kill());
    ctaTweensRef.current = [
      gsap.to(underline, {
        duration: isActive ? 0.34 : 0.28,
        ease: "power2.out",
        scaleX: isActive ? 1 : 0,
        transformOrigin: isActive ? "left center" : "right center",
      }),
      gsap.to(arrow, {
        duration: isActive ? 0.28 : 0.24,
        ease: "power2.out",
        x: isActive ? 4 : 0,
      }),
    ];
  }, []);

  useGSAP(
    () => {
      const heading = headingRef.current;
      const paragraph = paragraphRef.current;
      const cta = ctaRef.current;

      if (!heading || !paragraph || !cta) {
        return undefined;
      }

      if (reducedMotion) {
        return gsap.fromTo(
          [heading, paragraph, cta],
          { autoAlpha: 0 },
          {
            autoAlpha: 1,
            duration: 0.28,
            ease: "power1.out",
            stagger: 0.06,
          },
        );
      }

      const split = SplitText.create(heading, {
        tag: "span",
        type: "words",
        wordsClass: "landing-hero-word",
      });
      const timeline = gsap.timeline();

      timeline
        .set([paragraph, cta], { autoAlpha: 0 })
        .fromTo(
          split.words,
          { autoAlpha: 0, filter: "blur(8px)", y: 20 },
          {
            autoAlpha: 1,
            duration: 0.72,
            ease: "power3.out",
            filter: "blur(0px)",
            stagger: 0.05,
            y: 0,
          },
        )
        .to(
          [paragraph, cta],
          {
            autoAlpha: 1,
            duration: 0.42,
            ease: "power2.out",
            stagger: 0.08,
          },
          "+=0.28",
        );

      return () => {
        timeline.kill();
        split.revert();
      };
    },
    {
      dependencies: [reducedMotion],
      revertOnUpdate: true,
      scope: landingRef,
    },
  );

  useGSAP(
    () => {
      const choicesSection = choicesSectionRef.current;

      if (!choicesSection) {
        return undefined;
      }

      const revealTargets = gsap.utils.toArray<HTMLElement>(
        "[data-landing-choice-reveal]",
        choicesSection,
      );

      if (reducedMotion) {
        return gsap.set(revealTargets, { autoAlpha: 1, y: 0 });
      }

      return gsap.fromTo(
        revealTargets,
        { autoAlpha: 0, y: 26 },
        {
          autoAlpha: 1,
          duration: 0.66,
          ease: "power3.out",
          stagger: 0.16,
          scrollTrigger: {
            trigger: choicesSection,
            start: "top 74%",
            once: true,
          },
        },
      );
    },
    {
      dependencies: [reducedMotion],
      revertOnUpdate: true,
      scope: landingRef,
    },
  );

  useEffect(() => {
    if (reducedMotion || !heroCopyRef.current) {
      return undefined;
    }

    const heroCopy = heroCopyRef.current;
    const lenis = new Lenis({
      autoRaf: false,
      lerp: 0.085,
      smoothWheel: true,
    });
    const setHeroOpacity = gsap.quickTo(heroCopy, "opacity", {
      duration: 0.22,
      ease: "power2.out",
    });
    const unsubscribe = lenis.on("scroll", (instance) => {
      const start = window.innerHeight * 0.3;
      const distance = Math.max(0, instance.scroll - start);
      const opacity = gsap.utils.clamp(
        0.3,
        1,
        1 - (distance / (window.innerHeight * 0.3)) * 0.7,
      );

      setHeroOpacity(opacity);
      ScrollTrigger.update();
    });
    const tick = (time: number) => lenis.raf(time * 1000);

    gsap.ticker.add(tick);
    ScrollTrigger.refresh();

    return () => {
      unsubscribe();
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, [reducedMotion]);

  useEffect(
    () => () => {
      clearHoldTimer();
      ctaTweensRef.current.forEach((tween) => tween.kill());

      if (audioContextRef.current?.state !== "closed") {
        void audioContextRef.current?.close();
      }
    },
    [clearHoldTimer],
  );

  const handleTracePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    beginTrace(toNdc(event.clientX, event.clientY));
  };

  const handleTracePointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    endTrace();
  };

  return (
    <main
      ref={landingRef}
      className="relative min-h-screen overflow-clip bg-[#0a0a0a] text-[#e7ebef]"
    >
      <section className="relative min-h-svh overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="landing-trace-field absolute inset-0 overflow-hidden">
            {ambientLines.map((line, index) => (
              <span
                key={index}
                className="absolute block origin-left"
                style={{
                  left: line.left,
                  top: line.top,
                  transform: `rotate(${line.rotation}deg)`,
                  width: line.width,
                }}
              >
                <span
                  className="landing-trace-field-line"
                  style={{
                    animationDelay: line.delay,
                    animationDuration: line.duration,
                  }}
                />
              </span>
            ))}
          </div>
          <div className="landing-trace-veil absolute inset-0" />
        </div>

        <Suspense fallback={<div className="absolute inset-0 bg-[#0a0a0a]" />}>
          <HeroScene reduceMotion={reducedMotion} traceSignal={traceSignal} />
        </Suspense>

        <nav className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-7 lg:px-10 lg:py-8">
          <div className="flex items-center gap-3 font-mono text-[0.68rem] font-medium uppercase tracking-[0.2em] text-[#f1f4f6] sm:text-xs">
            <TraceKernelMark className="h-7 w-7 text-[#e9edf1]" />
            <span>Trace Kernel</span>
          </div>
          <button
            type="button"
            className="group inline-flex items-center gap-2 rounded-full border border-white/20 px-3.5 py-2 font-mono text-[0.65rem] tracking-[0.16em] text-white/75 transition-colors hover:border-white/45 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            MENU
            <Menu
              aria-hidden="true"
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-90"
            />
          </button>
        </nav>

        <div
          ref={heroCopyRef}
          className="absolute left-5 top-[47%] z-10 w-[min(72rem,calc(100vw-2.5rem))] -translate-y-1/2 sm:left-8 lg:left-[clamp(2.5rem,6vw,8.5rem)]"
        >
          <p className="mb-5 font-mono text-[0.62rem] uppercase tracking-[0.27em] text-sky-300/75 sm:text-[0.68rem]">
            An interactive CS lab
          </p>
          <h1
            ref={headingRef}
            className="max-w-[72rem] text-[clamp(3.1rem,5.6vw,6.7rem)] font-semibold leading-[0.9] tracking-[-0.075em] text-[#e7ebef]"
          >
            <span className="block">Make the invisible parts</span>
            <span className="block">of computing visible.</span>
          </h1>
          <p
            ref={paragraphRef}
            className="mt-7 max-w-[34rem] text-base leading-7 text-[#a3aab2] sm:text-lg"
          >
            Explore algorithms, systems, and protocols as living diagrams.
            Change a step. Watch the model respond. Build intuition that
            sticks.
          </p>
          <button
            ref={ctaRef}
            type="button"
            onClick={() => {
              setAiExperienceMode("demo");
              navigate("/workspace");
            }}
            onMouseEnter={() => animateCtaHover(true)}
            onMouseLeave={() => animateCtaHover(false)}
            className="group relative mt-9 inline-flex items-center gap-3 py-2 font-mono text-xs font-medium tracking-[0.13em] text-[#f3f5f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            ENTER THE LAB
            <span ref={ctaArrowRef} aria-hidden="true" className="text-base">
              →
            </span>
            <span
              ref={ctaUnderlineRef}
              aria-hidden="true"
              className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-white/80"
            />
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-20 grid grid-cols-[1fr_auto_1fr] items-end gap-3 px-5 pb-5 sm:px-8 sm:pb-7 lg:px-10 lg:pb-8">
          <div
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/65"
          >
            <ChevronDown className="landing-scroll-hint h-4 w-4" />
          </div>

          <button
            type="button"
            disabled={reducedMotion}
            onPointerCancel={handleTracePointerEnd}
            onPointerDown={handleTracePointerDown}
            onPointerUp={handleTracePointerEnd}
            onKeyDown={(event) => {
              if (
                !event.repeat &&
                (event.key === "Enter" || event.key === " ")
              ) {
                event.preventDefault();
                beginTrace([0, 0]);
              }
            }}
            onKeyUp={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                endTrace();
              }
            }}
            className="group flex max-w-[15rem] flex-col items-center rounded-md px-3 py-2 text-center font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-default disabled:opacity-60"
            aria-label="Hold to trace the network"
          >
            <span
              className={`text-[0.63rem] font-medium tracking-[0.16em] transition-colors sm:text-[0.68rem] ${
                isTracing ? "text-sky-200" : "text-[#e5e8ec]"
              }`}
            >
              HOLD TO <span aria-hidden="true">⚡</span> TRACE
            </span>
            <span className="mt-1 text-[0.58rem] italic leading-4 text-[#818a94] sm:text-[0.62rem]">
              an interactive network, waiting to be traced.
            </span>
          </button>

          <div className="ml-auto flex items-center gap-2.5 border-l border-white/15 pl-3 text-right font-mono text-[0.57rem] leading-4 tracking-[0.13em] text-[#aab2ba] sm:pl-4 sm:text-[0.62rem]">
            <Globe2 aria-hidden="true" className="h-5 w-5 text-sky-200/80" />
            <span>AN INTERACTIVE CS LAB</span>
          </div>
        </div>
      </section>

      <section
        ref={choicesSectionRef}
        aria-label="Choose how to start"
        className="relative z-10 min-h-[96svh] overflow-hidden px-5 py-20 sm:px-8 sm:py-24 lg:px-[clamp(2.5rem,6vw,8.5rem)]"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="landing-trace-field absolute inset-0 overflow-hidden opacity-70">
            {ambientLines.map((line, index) => (
              <span
                key={`choice-line-${index}`}
                className="absolute block origin-left"
                style={{
                  left: line.left,
                  top: line.top,
                  transform: `rotate(${line.rotation}deg)`,
                  width: line.width,
                }}
              >
                <span
                  className="landing-trace-field-line"
                  style={{
                    animationDelay: line.delay,
                    animationDuration: line.duration,
                  }}
                />
              </span>
            ))}
          </div>
          <div className="landing-choice-veil absolute inset-0" />
          <div className="absolute bottom-[26%] left-[10%] hidden h-px w-[43%] bg-gradient-to-r from-sky-200/45 via-sky-200/10 to-transparent lg:block" />
          <span className="absolute bottom-[calc(26%-0.22rem)] left-[53%] hidden h-2 w-2 rounded-full bg-sky-200/70 shadow-[0_0_1.25rem_rgba(125,211,252,0.72)] lg:block" />
        </div>

        <div className="relative mx-auto w-full max-w-[108rem]">
          <article
            data-landing-choice-reveal
            className="group max-w-[44rem] pt-3 lg:pt-8"
          >
            <div className="flex items-center gap-3 font-mono text-[0.65rem] tracking-[0.18em] text-sky-200/85">
              <span>01 / CURATED LAB</span>
              <span aria-hidden="true" className="h-px w-12 bg-sky-200/35" />
              <BookOpen
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110"
              />
            </div>
            <h2 className="mt-7 text-[clamp(3.45rem,6.2vw,7.6rem)] font-semibold leading-[0.83] tracking-[-0.075em] text-[#e7ebef]">
              Enter the lab.
            </h2>
            <p className="mt-7 max-w-md text-base leading-7 text-[#9da6af] sm:text-lg">
              Walk through the ready-made concepts first. Change a step and see the model respond.
            </p>
            <button
              type="button"
              onClick={() => {
                setAiExperienceMode("demo");
                navigate("/workspace");
              }}
              className="relative mt-9 inline-flex items-center gap-3 py-2 font-mono text-xs font-medium tracking-[0.14em] text-sky-100 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              EXPLORE CONCEPTS
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              />
              <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-sky-100/80 transition-transform duration-300 group-hover:scale-x-100" />
            </button>
          </article>

          <article
            data-landing-choice-reveal
            className="group ml-auto mt-[clamp(8rem,17svh,15rem)] max-w-[35rem] lg:mr-[5vw]"
          >
            <div className="flex items-center gap-3 font-mono text-[0.65rem] tracking-[0.18em] text-violet-200/90">
              <Sparkles
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110"
              />
              <span aria-hidden="true" className="h-px w-12 bg-violet-200/35" />
              <span>02 / YOUR PROMPT</span>
            </div>
            <h2 className="mt-7 text-[clamp(3rem,5.1vw,6.1rem)] font-semibold leading-[0.86] tracking-[-0.07em] text-[#e7ebef]">
              Custom simulation.
            </h2>
            <p className="mt-7 max-w-md text-base leading-7 text-[#9da6af] sm:text-lg">
              Describe the concept you want to understand and build a step-by-step model in this browser session.
            </p>
            <button
              type="button"
              onClick={() => {
                setAiExperienceMode("live");
                navigate("/workspace/generated");
              }}
              className="relative mt-9 inline-flex items-center gap-3 py-2 font-mono text-xs font-medium tracking-[0.14em] text-violet-100 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
            >
              CREATE A SIMULATION
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              />
              <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-violet-100/80 transition-transform duration-300 group-hover:scale-x-100" />
            </button>
          </article>
        </div>
      </section>
    </main>
  );
}

export default Landing;
