type TraceKernelMarkProps = {
  className?: string;
};

/** The visible Trace Kernel product mark, served from the public SVG asset. */
export function TraceKernelMark({ className }: TraceKernelMarkProps) {
  return (
    <img
      aria-hidden="true"
      alt=""
      className={`object-contain ${className ?? ""}`}
      decoding="async"
      src="/trace-kernel-mark.svg"
    />
  );
}
