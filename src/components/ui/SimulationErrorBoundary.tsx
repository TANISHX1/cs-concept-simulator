import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

type SimulationErrorBoundaryProps = {
  children: ReactNode;
  resetKey?: unknown;
};

type SimulationErrorBoundaryState = {
  hasError: boolean;
};

/** Keeps a malformed simulation from taking down the surrounding workspace. */
export class SimulationErrorBoundary extends Component<
  SimulationErrorBoundaryProps,
  SimulationErrorBoundaryState
> {
  state: SimulationErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SimulationErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Simulation failed to render", error, errorInfo);
  }

  componentDidUpdate(previousProps: SimulationErrorBoundaryProps) {
    if (
      this.state.hasError &&
      previousProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <section
        role="alert"
        className="rounded-2xl border border-border bg-surface p-6 text-center"
      >
        <h2 className="text-lg font-semibold">
          This simulation couldn&apos;t render.
        </h2>
        <p className="mt-2 text-sm text-muted">
          Try modifying it or generating a new one.
        </p>
        <Link
          to="/workspace"
          className="mt-5 inline-flex rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
        >
          Generate New
        </Link>
      </section>
    );
  }
}
