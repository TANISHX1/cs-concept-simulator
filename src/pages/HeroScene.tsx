import { Float, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { gsap } from "gsap";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";

export type TraceSignal = {
  ndc: readonly [number, number];
  phase: "idle" | "start" | "cancel" | "confirm";
  sequence: number;
};

const MODEL_URL = new URL(
  "../../Meshy_AI_Something_in_the_Dark_0720221034_texture.glb",
  import.meta.url,
).href;

type TraceState = {
  flash: number;
  progress: number;
};

function SuppliedModel({
  reduceMotion,
  traceSignal,
}: Pick<HeroSceneProps, "reduceMotion" | "traceSignal">) {
  const { scene } = useGLTF(MODEL_URL);
  const rootRef = useRef<THREE.Group>(null);
  const traceLightRef = useRef<THREE.PointLight>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const autoYawRef = useRef(0);
  const traceTweenRef = useRef<gsap.core.Tween | null>(null);
  const flashTweenRef = useRef<gsap.core.Tween | null>(null);
  const traceRef = useRef<TraceState>({ flash: 0, progress: 0 });
  const { size } = useThree();
  const isCompact = size.width < 700;

  useEffect(() => {
    if (reduceMotion) {
      return undefined;
    }

    const updatePointer = (event: globalThis.PointerEvent) => {
      pointerRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.y = -((event.clientY / window.innerHeight) * 2 - 1);
    };

    window.addEventListener("pointermove", updatePointer, { passive: true });
    return () => window.removeEventListener("pointermove", updatePointer);
  }, [reduceMotion]);

  useEffect(() => {
    if (
      reduceMotion ||
      traceSignal.phase === "idle" ||
      traceSignal.sequence === 0
    ) {
      return;
    }

    const trace = traceRef.current;

    if (traceSignal.phase === "start") {
      traceTweenRef.current?.kill();
      trace.progress = 0;
      traceTweenRef.current = gsap.to(trace, {
        duration: 0.8,
        ease: "power2.inOut",
        progress: 1,
      });
    }

    if (traceSignal.phase === "cancel") {
      traceTweenRef.current?.kill();
      traceTweenRef.current = gsap.to(trace, {
        duration: 0.26,
        ease: "power2.out",
        progress: 0,
      });
    }

    if (traceSignal.phase === "confirm") {
      flashTweenRef.current?.kill();
      trace.flash = 1;
      flashTweenRef.current = gsap.to(trace, {
        duration: 0.42,
        ease: "power2.out",
        flash: 0,
      });
    }
  }, [reduceMotion, traceSignal]);

  useEffect(
    () => () => {
      traceTweenRef.current?.kill();
      flashTweenRef.current?.kill();
    },
    [],
  );

  useFrame(({ clock }, delta) => {
    const root = rootRef.current;

    if (!root || reduceMotion) {
      return;
    }

    const elapsed = clock.getElapsedTime();
    const damping = 1 - Math.exp(-3 * delta);
    const trace = traceRef.current;
    const traceEnergy = Math.sin(trace.progress * Math.PI);
    const pulse = traceEnergy + trace.flash * 0.9;
    const baseScale = isCompact ? 0.62 : 1.28;

    autoYawRef.current += delta * 0.045;
    root.rotation.y +=
      (0.34 + autoYawRef.current + pointerRef.current.x * 0.17 -
        root.rotation.y) *
      damping;
    root.rotation.x +=
      (-0.12 + pointerRef.current.y * 0.09 - root.rotation.x) * damping;
    root.rotation.z = Math.sin(elapsed * 0.35) * 0.018;
    root.position.y =
      (isCompact ? -0.92 : -0.04) + Math.sin(elapsed * 0.5) * 0.035;
    root.scale.setScalar(baseScale * (1 + pulse * 0.045));

    if (traceLightRef.current) {
      traceLightRef.current.intensity = 0.55 + pulse * 3.2;
    }
  });

  return (
    <Float
      floatIntensity={reduceMotion ? 0 : 0.08}
      rotationIntensity={0}
      speed={reduceMotion ? 0 : 0.45}
    >
      <group
        ref={rootRef}
        position={isCompact ? [0.42, -0.92, 0] : [0.8, -0.04, 0]}
        scale={isCompact ? 0.62 : 1.28}
      >
        <primitive dispose={null} object={scene} />
        <pointLight
          ref={traceLightRef}
          color="#a6d9ff"
          distance={4.5}
          intensity={0.55}
          position={[0.15, 0.1, 1.35]}
        />
      </group>
    </Float>
  );
}

export type HeroSceneProps = {
  reduceMotion: boolean;
  traceSignal: TraceSignal;
};

export function HeroScene({ reduceMotion, traceSignal }: HeroSceneProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-0 right-0 z-[1] opacity-25 sm:left-[28%] sm:opacity-100 lg:left-[40%]"
    >
      <Canvas
        camera={{ far: 40, fov: 40, near: 0.1, position: [0, 0, 6.7] }}
        dpr={[1, 2]}
        frameloop={reduceMotion ? "demand" : "always"}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.48} />
        <directionalLight color="#d9efff" intensity={1.7} position={[2.8, 3.2, 4]} />
        <directionalLight color="#315a7b" intensity={1.35} position={[-3.2, -1.8, 2.5]} />
        <pointLight color="#5d96c3" distance={8} intensity={1.25} position={[-2.2, 1.4, 3]} />
        <Suspense fallback={null}>
          <SuppliedModel reduceMotion={reduceMotion} traceSignal={traceSignal} />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_URL);

export default HeroScene;
