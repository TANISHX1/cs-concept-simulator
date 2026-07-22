import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { conceptTree as staticConceptTree } from "../../lib/contentLoader";
import {
  SimulationSpecSchema,
  type SimulationSpec,
} from "../../lib/simulationSpec";
import type { ConceptNode } from "../../lib/types";
import quickSortFixture from "../../content/seed/quick-sort.fixture.json";
import dijkstraFixture from "../../content/seed/dijkstra.fixture.json";
import dfsFixture from "../../content/seed/dfs.fixture.json";

const STORAGE_PREFIX = "generated:";

export const CUSTOM_SIMULATIONS_SECTION = "generated";
export const CUSTOM_SIMULATIONS_LABEL = "Custom Simulations";

const DEMO_FIXTURES: SimulationSpec[] = [
  SimulationSpecSchema.parse(quickSortFixture),
  SimulationSpecSchema.parse(dijkstraFixture),
  SimulationSpecSchema.parse(dfsFixture),
];

export type GeneratedConcept = {
  slug: string;
  spec: SimulationSpec;
};

type GeneratedConceptsContextValue = {
  generatedConcepts: GeneratedConcept[];
  conceptTree: ConceptNode[];
  getGeneratedConcept: (slug: string) => GeneratedConcept | undefined;
  addGeneratedConcept: (spec: SimulationSpec) => GeneratedConcept;
  replaceGeneratedConcept: (slug: string, spec: SimulationSpec) => void;
  clearGeneratedConcepts: () => void;
};

const GeneratedConceptsContext = createContext<
  GeneratedConceptsContextValue | undefined
>(undefined);

function toSlug(title: string) {
  const slug = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "generated-concept";
}

function createSuffix() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 4);
  }

  return Math.random().toString(36).slice(2, 6).padEnd(4, "0");
}

function readStoredConcepts(): GeneratedConcept[] {
  if (typeof window === "undefined") return [];

  try {
    const storedConcepts: GeneratedConcept[] = [];

    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);

      if (!key?.startsWith(STORAGE_PREFIX)) continue;

      const value = window.sessionStorage.getItem(key);
      if (!value) continue;

      try {
        const parsed = SimulationSpecSchema.safeParse(JSON.parse(value));

        if (parsed.success) {
          storedConcepts.push({
            slug: key.slice(STORAGE_PREFIX.length),
            spec: parsed.data,
          });
        }
      } catch {
        // A stale or malformed session entry should never prevent app startup.
      }
    }

    return storedConcepts;
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
    return [];
  }
}

function createGeneratedTree(generatedConcepts: GeneratedConcept[]): ConceptNode[] {
  const children: ConceptNode[] = generatedConcepts.map(({ slug, spec }, index) => ({
    id: `generated:${slug}`,
    title: spec.title,
    section: CUSTOM_SIMULATIONS_SECTION,
    parentPath: CUSTOM_SIMULATIONS_SECTION,
    order: index,
    difficulty: "intermediate",
    tags: [spec.visualType, "Custom simulation"],
    prerequisites: [],
    summary: "A custom interactive concept created in this session.",
    accentSection: "algorithms",
    path: `${CUSTOM_SIMULATIONS_SECTION}/${slug}`,
    children: [],
    references: [],
    hasCodeTrace: false,
    codeTrace: null,
  }));

  return [
    ...staticConceptTree,
    {
      id: CUSTOM_SIMULATIONS_SECTION,
      title: CUSTOM_SIMULATIONS_LABEL,
      section: CUSTOM_SIMULATIONS_SECTION,
      order: Number.MAX_SAFE_INTEGER,
      difficulty: "beginner",
      tags: [],
      prerequisites: [],
      summary: "Interactive simulations created in this browser session.",
      accentSection: "algorithms",
      path: CUSTOM_SIMULATIONS_SECTION,
      children,
      references: [],
      hasCodeTrace: false,
      codeTrace: null,
    },
  ];
}

export function GeneratedConceptsProvider({ children }: { children: ReactNode }) {
  const [generatedConcepts, setGeneratedConcepts] = useState<GeneratedConcept[]>(
    readStoredConcepts,
  );
  const hasSeededDemoFixtures = useRef(false);

  const addGeneratedConcept = useCallback((spec: SimulationSpec) => {
    const baseSlug = toSlug(spec.title);
    let slug = baseSlug;
    const existingSlugs = new Set(
      generatedConcepts.map((generatedConcept) => generatedConcept.slug),
    );

    try {
      while (
        existingSlugs.has(slug) ||
        window.sessionStorage.getItem(`${STORAGE_PREFIX}${slug}`) !== null
      ) {
        slug = `${baseSlug}-${createSuffix()}`;
      }

      window.sessionStorage.setItem(`${STORAGE_PREFIX}${slug}`, JSON.stringify(spec));
    } catch {
      // Keep the generated concept usable for this render even if storage is blocked.
      while (existingSlugs.has(slug)) {
        slug = `${baseSlug}-${createSuffix()}`;
      }
    }

    const generatedConcept = { slug, spec };
    setGeneratedConcepts((concepts) => [...concepts, generatedConcept]);
    return generatedConcept;
  }, [generatedConcepts]);

  useEffect(() => {
    if (hasSeededDemoFixtures.current) return;

    hasSeededDemoFixtures.current = true;

    if (readStoredConcepts().length > 0) return;

    DEMO_FIXTURES.forEach((fixture) => addGeneratedConcept(fixture));
  }, []);

  const conceptTree = useMemo(
    () => createGeneratedTree(generatedConcepts),
    [generatedConcepts],
  );

  const replaceGeneratedConcept = useCallback(
    (slug: string, spec: SimulationSpec) => {
      const existing = generatedConcepts.find(
        (generatedConcept) => generatedConcept.slug === slug,
      );

      if (!existing) return;

      try {
        window.sessionStorage.setItem(
          `${STORAGE_PREFIX}${slug}`,
          JSON.stringify(spec),
        );
      } catch {
        // Keep the replacement available in memory if browser storage is unavailable.
      }

      setGeneratedConcepts((concepts) =>
        concepts.map((concept) =>
          concept.slug === slug ? { slug, spec } : concept,
        ),
      );
    },
    [generatedConcepts],
  );

  const clearGeneratedConcepts = useCallback(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
    } catch {
      // Ignore storage errors
    }
    
    // Reset to demo fixtures
    setGeneratedConcepts([]);
    hasSeededDemoFixtures.current = false;
    // Re-seed demo fixtures
    DEMO_FIXTURES.forEach((fixture) => addGeneratedConcept(fixture));
  }, [addGeneratedConcept]);

  const getGeneratedConcept = useCallback(
    (slug: string) =>
      generatedConcepts.find((generatedConcept) => generatedConcept.slug === slug),
    [generatedConcepts],
  );

  const value = useMemo(
    () => ({
      generatedConcepts,
      conceptTree,
      getGeneratedConcept,
      addGeneratedConcept,
      replaceGeneratedConcept,
      clearGeneratedConcepts,
    }),
    [
      addGeneratedConcept,
      conceptTree,
      generatedConcepts,
      getGeneratedConcept,
      replaceGeneratedConcept,
      clearGeneratedConcepts,
    ],
  );

  return (
    <GeneratedConceptsContext.Provider value={value}>
      {children}
    </GeneratedConceptsContext.Provider>
  );
}

export function useGeneratedConcepts() {
  const context = useContext(GeneratedConceptsContext);

  if (!context) {
    throw new Error(
      "useGeneratedConcepts must be used within GeneratedConceptsProvider",
    );
  }

  return context;
}
