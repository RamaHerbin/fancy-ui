/**
 * Builder registry types.
 *
 * PropSchema describes the editable properties of a component.
 * BuilderComponentMeta extends the base registry with builder-specific metadata.
 */

export type PropType = "string" | "number" | "boolean" | "color" | "select" | "json" | "image";

export interface PropSchemaBase {
	/** Display label in the property panel */
	label: string;
	/** Property type */
	type: PropType;
	/** Default value */
	default?: unknown;
	/** Optional description / tooltip */
	description?: string;
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
	options: { label: string; value: string }[];
}

export interface JsonPropSchema extends PropSchemaBase {
	type: "json";
	default?: unknown;
}

export interface ImagePropSchema extends PropSchemaBase {
	type: "image";
	default?: string;
}

export type PropSchema =
	| StringPropSchema
	| NumberPropSchema
	| BooleanPropSchema
	| ColorPropSchema
	| SelectPropSchema
	| JsonPropSchema
	| ImagePropSchema;

/** Palette category for grouping in the editor sidebar */
export type PaletteCategory =
	| "layout"
	| "text"
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
