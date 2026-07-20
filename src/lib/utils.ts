import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const accentClass = (section: string) =>
  ({
    algorithms: "text-accent-algorithms",
    os: "text-accent-os",
    networking: "text-accent-networking",
    systems: "text-accent-systems",
    languages: "text-accent-languages",
  })[section] ?? "text-muted";
