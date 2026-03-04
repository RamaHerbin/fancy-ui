export type { PageDocument, PageMeta, PageStatus, BlockNode } from "./page.js";
export type {
	PropType,
	PropSchema,
	PropSchemaBase,
	StringPropSchema,
	NumberPropSchema,
	BooleanPropSchema,
	ColorPropSchema,
	SelectPropSchema,
	JsonPropSchema,
	ImagePropSchema,
	LinkPropSchema,
	LinkValue,
	IconPropSchema,
	SpacingPropSchema,
	ClassPropSchema,
	PaletteCategory,
	BuilderComponentMeta,
} from "./registry.js";
export type { NavItem, SiteConfig } from "./site.js";
export { createDefaultSiteConfig, isValidSiteConfig } from "./site.js";
