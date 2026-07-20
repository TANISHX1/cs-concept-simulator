import { ThemeProvider } from "../features/theme/ThemeProvider";
import { GeneratedConceptsProvider } from "../features/generate/GeneratedConceptsContext";
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <GeneratedConceptsProvider>{children}</GeneratedConceptsProvider>
    </ThemeProvider>
  );
}
