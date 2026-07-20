import { Command } from "cmdk";
import { Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { flatConceptIndex, sectionLabels } from "../../lib/contentLoader";
import {
  CUSTOM_SIMULATIONS_LABEL,
  CUSTOM_SIMULATIONS_SECTION,
  useGeneratedConcepts,
} from "../generate/GeneratedConceptsContext";
import { TraceKernelMark } from "../../components/TraceKernelMark";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommandPalette({
  open,
  onOpenChange,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const { generatedConcepts } = useGeneratedConcepts();
  const [search, setSearch] = useState("");

  const close = () => {
    setSearch("");
    onOpenChange(false);
  };

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        onOpenChange(true);
      }
    };

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [onOpenChange]);

  return (
    <Command.Dialog
      label="Search concepts"
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setSearch("");
        onOpenChange(nextOpen);
      }}
      loop
      overlayClassName="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
      contentClassName="fixed left-1/2 top-[18vh] z-50 w-[calc(100%_-_2rem)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface/90 shadow-panel backdrop-blur"
    >
      <div className="flex items-center gap-3 border-b border-border px-4">
        <Search size={18} className="shrink-0 text-muted" aria-hidden="true" />
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Search concepts, tags, and topics…"
          className="min-w-0 flex-1 bg-transparent py-4 text-sm text-foreground outline-none placeholder:text-muted"
        />
        <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted">
          ESC
        </kbd>
      </div>

      <Command.List className="scrollbar max-h-[min(60vh,30rem)] overflow-y-auto p-2">
        <Command.Empty className="px-3 py-10 text-center text-sm text-muted">
          No concepts match that search.
        </Command.Empty>
        {Object.entries(sectionLabels).map(([section, label]) => {
          const concepts = flatConceptIndex.filter(
            (concept) => concept.section === section,
          );

          if (concepts.length === 0) return null;

          return (
            <Command.Group
              key={section}
              heading={label}
              className="mb-2 last:mb-0 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[.16em] [&_[cmdk-group-heading]]:text-muted"
            >
              {concepts.map((concept) => (
                <Command.Item
                  key={concept.path}
                  value={concept.path}
                  keywords={[concept.title, ...concept.tags, concept.summary]}
                  onSelect={() => {
                    navigate(`/workspace/${concept.path}`);
                    close();
                  }}
                  className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3 text-sm outline-none transition data-[selected=true]:bg-surface-hover"
                >
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-border bg-background text-muted">
                    <TraceKernelMark className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground">
                      {concept.title}
                    </span>
                    <span className="mt-1 block truncate text-xs leading-relaxed text-muted">
                      {concept.summary}
                    </span>
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          );
        })}
        {generatedConcepts.length > 0 ? (
          <Command.Group
            heading={CUSTOM_SIMULATIONS_LABEL}
            className="mb-2 last:mb-0 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[.16em] [&_[cmdk-group-heading]]:text-muted"
          >
            {generatedConcepts.map(({ slug, spec }) => (
              <Command.Item
                key={slug}
                value={`${CUSTOM_SIMULATIONS_SECTION}/${slug}`}
                keywords={[
                  spec.title,
                  spec.visualType,
                  "custom",
                  "simulation",
                  "generated",
                ]}
                onSelect={() => {
                  navigate(`/workspace/${CUSTOM_SIMULATIONS_SECTION}/${slug}`);
                  close();
                }}
                className="flex cursor-pointer items-start gap-3 rounded-xl px-3 py-3 text-sm outline-none transition data-[selected=true]:bg-surface-hover"
              >
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-border bg-background text-muted">
                  <Sparkles size={14} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">
                    {spec.title}
                  </span>
                  <span className="mt-1 block truncate text-xs leading-relaxed text-muted">
                    {spec.visualType} simulation · {spec.steps.length} step
                    {spec.steps.length === 1 ? "" : "s"}
                  </span>
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        ) : null}
      </Command.List>
    </Command.Dialog>
  );
}
