export { default as DropdownMenu } from "./DropdownMenu.vue";
export type { DropdownMenuProps } from "./DropdownMenu.vue";
export { default as DropdownMenuTrigger } from "./DropdownMenuTrigger.vue";
export type { DropdownMenuTriggerProps } from "./DropdownMenuTrigger.vue";
export { default as DropdownMenuContent } from "./DropdownMenuContent.vue";
export type { DropdownMenuContentProps } from "./DropdownMenuContent.vue";
export { default as DropdownMenuItem } from "./DropdownMenuItem.vue";
export type { DropdownMenuItemProps } from "./DropdownMenuItem.vue";
export { default as DropdownMenuSeparator } from "./DropdownMenuSeparator.vue";
export type { DropdownMenuSeparatorProps } from "./DropdownMenuSeparator.vue";
export { default as DropdownMenuLabel } from "./DropdownMenuLabel.vue";
export type { DropdownMenuLabelProps } from "./DropdownMenuLabel.vue";
export { default as DropdownMenuSub } from "./DropdownMenuSub.vue";
export type { DropdownMenuSubProps } from "./DropdownMenuSub.vue";
export { default as DropdownMenuSubTrigger } from "./DropdownMenuSubTrigger.vue";
export type { DropdownMenuSubTriggerProps } from "./DropdownMenuSubTrigger.vue";
export { default as DropdownMenuSubContent } from "./DropdownMenuSubContent.vue";
export type { DropdownMenuSubContentProps } from "./DropdownMenuSubContent.vue";

// The three context keys, kept because the source's own `index.ts` exports
// them (as `unique symbol`s there, as typed-key helpers here) — the public
// escape hatch for a consumer composing their own menu leaf.
export { MENU_KEY, SUB_KEY, DROPDOWN_MENU_KEY } from "./types.js";
export type {
	MenuContext,
	MenuCloseOptions,
	SubContext,
	DropdownMenuRootContext,
} from "./types.js";
