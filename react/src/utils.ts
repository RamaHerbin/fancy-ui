import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge class names with Tailwind-aware conflict resolution. Mirrors src/lib/utils.ts. */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}
