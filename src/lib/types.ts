/**
 * Shared component types for FancyUI
 *
 * These types provide a consistent foundation for all implemented components.
 */

import type { Snippet } from "svelte";
import type { HTMLAttributes } from "svelte/elements";

/**
 * Base props shared by all FancyUI components
 */
export interface BaseComponentProps {
	/** Additional CSS classes to apply */
	class?: string;
	/** Component content (Svelte 5 snippet) */
	children?: Snippet;
}

/**
 * Props for components with animation capabilities
 */
export interface AnimatedComponentProps extends BaseComponentProps {
	/** Animation duration in seconds */
	duration?: number;
	/** Animation delay in seconds */
	delay?: number;
	/** Whether animation is paused */
	paused?: boolean;
}

/**
 * Props for components that track mouse/pointer position
 */
export interface InteractiveComponentProps extends BaseComponentProps {
	/** Whether interaction is disabled */
	disabled?: boolean;
}

/**
 * Props for polymorphic components (button/anchor)
 */
export interface PolymorphicButtonProps extends BaseComponentProps {
	/** Render as anchor element when href is provided */
	href?: string;
	/** Button type attribute */
	type?: "button" | "submit" | "reset";
	/** Whether the element is disabled */
	disabled?: boolean;
	/** Element reference */
	ref?: HTMLButtonElement | HTMLAnchorElement | null;
}

/**
 * Common event handler types
 */
export type MouseEventHandler = (event: MouseEvent) => void;
export type KeyboardEventHandler = (event: KeyboardEvent) => void;
export type FocusEventHandler = (event: FocusEvent) => void;

/**
 * Utility type to extract props from a component while excluding HTML attributes
 */
export type ComponentProps<T> = Omit<T, keyof HTMLAttributes<HTMLElement>>;

/**
 * Component status for registry tracking
 */
export type ComponentStatus = "done" | "in-progress" | "planned";

/**
 * Component category for organization
 */
export type ComponentCategory =
	| "buttons"
	| "cards"
	| "backgrounds"
	| "text"
	| "layout"
	| "feedback"
	| "data-display"
	| "navigation"
	| "media"
	| "effects";

/**
 * Component metadata for registry
 */
export interface ComponentMeta {
	/** Component display name */
	name: string;
	/** URL-friendly slug */
	slug: string;
	/** Short description */
	description: string;
	/** Component category */
	category: ComponentCategory;
	/** Porting status */
	status: ComponentStatus;
	/** Dependencies on other fancy-ui components */
	dependencies?: string[];
	/** Credits for the original design/implementation */
	credits?: Array<{
		source: string;
		url?: string;
	}>;
}
