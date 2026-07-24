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
	| "effects"
	| "actions"
	| "forms"
	| "overlays"
	| "display";

/**
 * Component prop definition for documentation
 */
export interface PropDef {
	name: string;
	type: string;
	default?: string;
	description: string;
	required?: boolean;
}

/**
 * Component slot definition for documentation
 */
export interface SlotDef {
	name: string;
	description: string;
}

/**
 * Component event definition for documentation
 */
export interface EventDef {
	name: string;
	detail: string;
	description: string;
}

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
	/** Component group: "core" = foundational primitives, "fancy" = animated showcase components */
	group: "core" | "fancy";
	/** Porting status */
	status: ComponentStatus;
	/** Dependencies on other fancy-ui components */
	dependencies?: string[];
	/** Credits for the original design/implementation */
	credits?: Array<{
		source: string;
		url?: string;
	}>;
	/** Searchable tags */
	tags?: string[];
	/** Component props documentation */
	props?: PropDef[];
	/** Component slots documentation */
	slots?: SlotDef[];
	/** Component events documentation */
	events?: EventDef[];
	/** Version when component was added */
	since?: string;
	/** Kept only as a backwards-compatible alias; hidden from generated docs */
	deprecated?: boolean;
}
