/**
 * Builder registry types.
 *
 * PropSchema describes the editable properties of a component.
 * BuilderComponentMeta extends the base registry with builder-specific metadata.
 */

export type PropType =
	| "string"
	| "number"
	| "boolean"
	| "color"
	| "select"
	| "json"
	| "image"
	| "link"
	| "icon"
	| "spacing"
	| "class";

export interface PropSchemaBase {
	/** Display label in the property panel */
	label: string;
	/** Property type */
	type: PropType;
	/** Default value */
	default?: unknown;
	/** Optional description / tooltip */
	description?: string;
	/** Accordion group name (e.g. "Layout", "Style", "Content") */
	group?: string;
	/** Conditional visibility — show this prop only when another prop matches a value */
	showWhen?: { prop: string; equals: unknown };
	/** If true, routes to a collapsed "Advanced" group */
	advanced?: boolean;
}

export interface StringPropSchema extends PropSchemaBase {
	type: "string";
	default?: string;
	/** If true, renders a textarea instead of an input */
	multiline?: boolean;
	/** Placeholder text */
	placeholder?: string;
}

export interface NumberPropSchema extends PropSchemaBase {
	type: "number";
	default?: number;
	min?: number;
	max?: number;
	step?: number;
}

export interface BooleanPropSchema extends PropSchemaBase {
	type: "boolean";
	default?: boolean;
}

export interface ColorPropSchema extends PropSchemaBase {
	type: "color";
	default?: string;
}

export interface SelectPropSchema extends PropSchemaBase {
	type: "select";
	default?: string;
	options: { label: string; value: string; icon?: string }[];
	/** Render as icon toggle buttons instead of a dropdown */
	display?: "dropdown" | "icon-buttons";
}

export interface JsonPropSchema extends PropSchemaBase {
	type: "json";
	default?: unknown;
}

export interface ImagePropSchema extends PropSchemaBase {
	type: "image";
	default?: string;
}

export interface LinkValue {
	href: string;
	target: "_self" | "_blank";
	pageSlug?: string;
}

export interface LinkPropSchema extends PropSchemaBase {
	type: "link";
	default?: LinkValue;
}

export interface IconPropSchema extends PropSchemaBase {
	type: "icon";
	default?: string;
}

export interface SpacingPropSchema extends PropSchemaBase {
	type: "spacing";
	default?: string;
	/** Which spacing layers to show (defaults to ["padding"]) */
	properties?: Array<"padding" | "margin">;
}

export interface ClassPropSchema extends PropSchemaBase {
	type: "class";
	default?: string;
	/** Restrict suggestion categories */
	categories?: string[];
}

export type PropSchema =
	| StringPropSchema
	| NumberPropSchema
	| BooleanPropSchema
	| ColorPropSchema
	| SelectPropSchema
	| JsonPropSchema
	| ImagePropSchema
	| LinkPropSchema
	| IconPropSchema
	| SpacingPropSchema
	| ClassPropSchema;

/** Palette category for grouping in the editor sidebar */
export type PaletteCategory =
	| "layout"
	| "text"
	| "content"
	| "cards"
	| "effects"
	| "backgrounds"
	| "buttons"
	| "media"
	| "navigation"
	| "feedback"
	| "data-display";

export interface BuilderComponentMeta {
	/** Display name */
	name: string;
	/** Slug matching the fancy-ui registry or a layout primitive (_section, etc.) */
	slug: string;
	/** Short description */
	description: string;
	/** Lucide icon name for the palette */
	icon: string;
	/** Palette category for grouping */
	paletteCategory: PaletteCategory;
	/** Whether this component can have child blocks */
	acceptsChildren: boolean;
	/** Which component types are allowed as children (empty = any, undefined = none) */
	allowedChildTypes?: string[];
	/** Editable prop schemas */
	propSchemas: Record<string, PropSchema>;
}
