import { Line } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

type HeroSceneProps = {
  theme: "dark" | "light";
  reduceMotion: boolean;
};

type Palette = {
  core: string;
  coreGlow: string;
  panel: string;
  rail: string;
  railMuted: string;
  signalA: string;
  signalB: string;
  signalC: string;
  node: string;
};

type Vector3Tuple = [number, number, number];

const palettes: Record<HeroSceneProps["theme"], Palette> = {
  dark: {
    core: "#dae6f3",
    coreGlow: "#70baff",
    panel: "#142033",
    rail: "#31455e",
    railMuted: "#182638",
    signalA: "#63c9ff",
    signalB: "#c99cff",
    signalC: "#f4c76b",
    node: "#b8d7f2",
  },
  light: {
    core: "#2d3b50",
    coreGlow: "#245a9c",
    panel: "#e7e1d7",
    rail: "#8d9bb0",
    railMuted: "#c9d0db",
    signalA: "#245a9c",
    signalB: "#8f3f9f",
    signalC: "#8b6400",
    node: "#42516a",
  },
};

const guidePaths: Array<{ points: Vector3Tuple[]; tone: keyof Pick<Palette, "signalA" | "signalB" | "signalC" | "railMuted"> }> = [
  {
    tone: "signalA",
    points: [[-3.7, 1.12, -0.8], [-2.1, 0.62, -0.25], [-0.7, 0.78, 0.16], [0.56, 1.34, -0.3]],
  },
  {
    tone: "signalB",
    points: [[-3.05, -1.55, -0.6], [-1.62, -0.94, 0.2], [-0.58, -1.35, -0.1], [0.84, -0.86, 0.12]],
  },
  {
    tone: "signalC",
    points: [[0.4, 1.58, -0.5], [1.34, 0.68, 0.12], [2.75, 0.96, -0.12], [3.85, 0.2, -0.6]],
  },
  {
    tone: "railMuted",
    points: [[0.25, -1.82, -0.7], [1.36, -1.24, 0.08], [2.5, -1.56, -0.18], [3.75, -0.78, -0.72]],
  },
];

const bladeLayout: Array<{
  color: keyof Pick<Palette, "signalA" | "signalB" | "signalC">;
  phase: number;
  position: Vector3Tuple;
  rotation: Vector3Tuple;
}> = [
  {
    color: "signalA",
    phase: 0,
    position: [-0.88, 0.6, 0.18],
    rotation: [0.22, -0.35, 0.56],
  },
  {
    color: "signalB",
    phase: 2.1,
    position: [0.7, 0.22, -0.18],
    rotation: [-0.31, 0.42, -1.58],
  },
  {
    color: "signalC",
    phase: 4.2,
    position: [-0.02, -0.88, 0.02],
    rotation: [0.44, -0.16, -0.49],
  },
];

function makeNodeField() {
  const count = 72;
  const positions = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const ring = 1.6 + (index % 8) * 0.32;
    const angle = index * 2.399963229728653;
    const depth = -1.5 + (index % 5) * 0.46;
    const offset = index % 2 === 0 ? 0.28 : -0.18;

    positions[index * 3] = Math.cos(angle) * ring + offset;
    positions[index * 3 + 1] = Math.sin(angle) * ring * 0.58;
    positions[index * 3 + 2] = depth;
  }

  return positions;
}

function CoreBlade({
  color,
  highlight,
  panel,
  phase,
  position,
  reduceMotion,
  rotation,
}: {
  color: string;
  highlight: string;
  panel: string;
  phase: number;
  position: Vector3Tuple;
  reduceMotion: boolean;
  rotation: Vector3Tuple;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!group.current || reduceMotion) return;

    const time = clock.getElapsedTime();
    group.current.position.y = position[1] + Math.sin(time * 0.72 + phase) * 0.075;
    group.current.rotation.z = rotation[2] + Math.sin(time * 0.54 + phase) * 0.07;
  });

  return (
    <group ref={group} position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[1.82, 0.16, 0.13]} />
        <meshStandardMaterial
          color={panel}
          emissive={color}
          emissiveIntensity={0.08}
          metalness={0.82}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0, 0.047, 0.082]}>
        <boxGeometry args={[1.62, 0.022, 0.018]} />
        <meshBasicMaterial color={color} opacity={0.9} transparent />
      </mesh>
      <mesh position={[0.58, -0.02, 0.081]}>
        <boxGeometry args={[0.32, 0.032, 0.02]} />
        <meshBasicMaterial color={highlight} opacity={0.76} transparent />
      </mesh>
      <mesh position={[-0.68, -0.005, 0.09]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

function StateNode({ color, position }: { color: string; position: Vector3Tuple }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.09, 14, 14]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh scale={1.9}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshBasicMaterial color={color} opacity={0.11} transparent />
      </mesh>
    </group>
  );
}

function ConceptTopology({ palette, reduceMotion }: { palette: Palette; reduceMotion: boolean }) {
  const root = useRef<THREE.Group>(null);
  const cursor = useRef({ x: 0, y: 0 });
  const { viewport } = useThree();
  const pointPositions = useMemo(makeNodeField, []);
  const compact = viewport.width < 9;

  useEffect(() => {
    if (reduceMotion) return;

    const updateCursor = (event: PointerEvent) => {
      cursor.current.x = (event.clientX / window.innerWidth - 0.5) * 2;
      cursor.current.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener("pointermove", updateCursor, { passive: true });
    return () => window.removeEventListener("pointermove", updateCursor);
  }, [reduceMotion]);

  useFrame(({ clock }, delta) => {
    if (!root.current || reduceMotion) return;

    const easing = 1 - Math.exp(-2.2 * delta);
    root.current.rotation.y = THREE.MathUtils.lerp(
      root.current.rotation.y,
      0.15 + cursor.current.x * 0.14,
      easing,
    );
    root.current.rotation.x = THREE.MathUtils.lerp(
      root.current.rotation.x,
      -0.04 - cursor.current.y * 0.08,
      easing,
    );
    root.current.position.y = Math.sin(clock.getElapsedTime() * 0.28) * 0.065;
  });

  return (
    <group
      ref={root}
      position={[compact ? 0.55 : 1.55, compact ? -0.16 : 0, 0]}
      scale={compact ? 0.72 : 1}
    >
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[pointPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={palette.node}
          depthWrite={false}
          opacity={0.34}
          size={0.03}
          sizeAttenuation
          transparent
        />
      </points>

      {guidePaths.map((path) => (
        <Line
          key={path.tone + path.points[0][0]}
          color={palette[path.tone]}
          lineWidth={1}
          opacity={path.tone === "railMuted" ? 0.28 : 0.56}
          points={path.points}
          transparent
        />
      ))}

      <group rotation={[0.16, -0.25, -0.07]}>
        <mesh>
          <octahedronGeometry args={[0.48, 1]} />
          <meshStandardMaterial
            color={palette.core}
            emissive={palette.coreGlow}
            emissiveIntensity={0.18}
            metalness={0.74}
            roughness={0.2}
          />
        </mesh>
        <mesh rotation={[0.4, 0.62, 0]} scale={1.34}>
          <icosahedronGeometry args={[0.48, 1]} />
          <meshBasicMaterial color={palette.rail} opacity={0.38} transparent wireframe />
        </mesh>
      </group>

      {bladeLayout.map((blade) => (
        <CoreBlade
          key={blade.color}
          color={palette[blade.color]}
          highlight={palette.core}
          panel={palette.panel}
          phase={blade.phase}
          position={blade.position}
          reduceMotion={reduceMotion}
          rotation={blade.rotation}
        />
      ))}

      <StateNode color={palette.signalA} position={[-2.12, 0.65, -0.25]} />
      <StateNode color={palette.signalB} position={[-1.61, -0.94, 0.2]} />
      <StateNode color={palette.signalC} position={[2.75, 0.96, -0.12]} />
      <StateNode color={palette.node} position={[2.5, -1.56, -0.18]} />
    </group>
  );
}

export default function HeroScene({ reduceMotion, theme }: HeroSceneProps) {
  const palette = palettes[theme];

  return (
    <Canvas
      camera={{ fov: 39, position: [0, 0, 8] }}
      dpr={[1, 1.35]}
      frameloop={reduceMotion ? "demand" : "always"}
      gl={{ alpha: true, antialias: false, powerPreference: "high-performance" }}
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.65} />
      <pointLight color={palette.signalA} intensity={5.2} position={[-3, 2.6, 3.4]} />
      <pointLight color={palette.signalB} intensity={3.4} position={[2.8, -2.1, 2.5]} />
      <ConceptTopology palette={palette} reduceMotion={reduceMotion} />
    </Canvas>
  );
}
