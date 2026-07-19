import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { conceptTree as staticConceptTree } from "../../lib/contentLoader";
import {
  SimulationSpecSchema,
  type SimulationSpec,
} from "../../lib/simulationSpec";
import type { ConceptNode } from "../../lib/types";

const STORAGE_PREFIX = "generated:";

export type GeneratedConcept = {
  slug: string;
  spec: SimulationSpec;
};

type GeneratedConceptsContextValue = {
  generatedConcepts: GeneratedConcept[];
  conceptTree: ConceptNode[];
  getGeneratedConcept: (slug: string) => GeneratedConcept | undefined;
  addGeneratedConcept: (spec: SimulationSpec) => GeneratedConcept;
  replaceGeneratedConcept: (
    slug: string,
    spec: SimulationSpec,
  ) => GeneratedConcept | undefined;
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
  if (generatedConcepts.length === 0) return staticConceptTree;

  const children: ConceptNode[] = generatedConcepts.map(({ slug, spec }, index) => ({
    id: `generated:${slug}`,
    title: spec.title,
    section: "generated",
    parentPath: "generated",
    order: index,
    difficulty: "intermediate",
    tags: [spec.visualType, "AI-generated"],
    prerequisites: [],
    summary: "A session-generated interactive concept.",
    accentSection: "algorithms",
    path: `generated/${slug}`,
    children: [],
    references: [],
  }));

  return [
    ...staticConceptTree,
    {
      id: "generated",
      title: "Generated",
      section: "generated",
      order: Number.MAX_SAFE_INTEGER,
      difficulty: "beginner",
      tags: [],
      prerequisites: [],
      summary: "Concepts generated during this session.",
      accentSection: "algorithms",
      path: "generated",
      children,
      references: [],
    },
  ];
}

export function GeneratedConceptsProvider({ children }: { children: ReactNode }) {
  const [generatedConcepts, setGeneratedConcepts] = useState<GeneratedConcept[]>(
    readStoredConcepts,
  );

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

  const conceptTree = useMemo(
    () => createGeneratedTree(generatedConcepts),
    [generatedConcepts],
  );

  const replaceGeneratedConcept = useCallback(
    (slug: string, spec: SimulationSpec) => {
      const existing = generatedConcepts.find(
        (generatedConcept) => generatedConcept.slug === slug,
      );

      if (!existing) return undefined;

      try {
        window.sessionStorage.setItem(
          `${STORAGE_PREFIX}${slug}`,
          JSON.stringify(spec),
        );
      } catch {
        // Keep the replacement available in memory if browser storage is unavailable.
      }

      const generatedConcept = { slug, spec };
      setGeneratedConcepts((concepts) =>
        concepts.map((concept) =>
          concept.slug === slug ? generatedConcept : concept,
        ),
      );
      return generatedConcept;
    },
    [generatedConcepts],
  );

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
    }),
    [
      addGeneratedConcept,
      conceptTree,
      generatedConcepts,
      getGeneratedConcept,
      replaceGeneratedConcept,
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
