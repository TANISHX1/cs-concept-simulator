import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export type ActiveSimulationContextValue = {
  conceptId: string;
  currentStep: number;
  setStep: Dispatch<SetStateAction<number>>;
  isPlaying: boolean;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  groundingContext: SimulationGroundingContext | null;
  setGroundingContext: Dispatch<
    SetStateAction<SimulationGroundingContext | null>
  >;
};

export type SimulationGroundingContext = {
  conceptId: string;
  currentStep: number;
  stateSnapshot: Record<string, unknown>;
};

export const ActiveSimulationContext = createContext<
  ActiveSimulationContextValue | undefined
>(undefined);

function clampStep(step: number, maxStep: number) {
  return Math.min(maxStep, Math.max(0, Math.trunc(step)));
}

export function ActiveSimulationProvider({
  children,
  conceptId,
  maxStep,
  resetKey,
}: {
  children: ReactNode;
  conceptId: string;
  maxStep: number;
  resetKey?: unknown;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [groundingContext, setGroundingContext] =
    useState<SimulationGroundingContext | null>(null);
  const boundedMaxStep = Math.max(0, Math.trunc(maxStep));

  const setStep = useCallback<Dispatch<SetStateAction<number>>>(
    (nextStep) => {
      setCurrentStep((current) =>
        clampStep(
          typeof nextStep === "function" ? nextStep(current) : nextStep,
          boundedMaxStep,
        ),
      );
    },
    [boundedMaxStep],
  );

  useEffect(() => {
    setCurrentStep((current) => clampStep(current, boundedMaxStep));
  }, [boundedMaxStep]);

  useEffect(() => {
    setCurrentStep(0);
    setIsPlaying(false);
    setGroundingContext(null);
  }, [resetKey]);

  const value = useMemo(
    () => ({
      conceptId,
      currentStep,
      setStep,
      isPlaying,
      setIsPlaying,
      groundingContext,
      setGroundingContext,
    }),
    [conceptId, currentStep, groundingContext, isPlaying, setStep],
  );

  return (
    <ActiveSimulationContext.Provider value={value}>
      {children}
    </ActiveSimulationContext.Provider>
  );
}

export function useActiveSimulation() {
  return useContext(ActiveSimulationContext);
}

export function useRequiredActiveSimulation() {
  const simulation = useActiveSimulation();

  if (!simulation) {
    throw new Error(
      "A visualizer must be rendered within ActiveSimulationProvider",
    );
  }

  return simulation;
}
