type LandingMarkProps = {
  className?: string;
};

/** A project-specific mark: three linked execution paths around one state node. */
export function LandingMark({ className }: LandingMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7 7.5h6.4a2.6 2.6 0 0 1 2.6 2.6v3.4M25 7.5h-6.4a2.6 2.6 0 0 0-2.6 2.6v3.4M16 18.5v3.4a2.6 2.6 0 0 1-2.6 2.6H7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.15"
      />
      <circle cx="7" cy="24.5" fill="currentColor" r="2.35" />
      <circle cx="25" cy="7.5" fill="currentColor" r="2.35" />
      <circle cx="16" cy="16" fill="currentColor" r="3.15" />
    </svg>
  );
}
