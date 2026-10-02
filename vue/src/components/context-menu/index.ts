export { default as ContextMenu } from "./ContextMenu.vue";
export type { ContextMenuProps } from "./ContextMenu.vue";
export { default as ContextMenuTrigger } from "./ContextMenuTrigger.vue";
export type { ContextMenuTriggerProps } from "./ContextMenuTrigger.vue";
export { default as ContextMenuContent } from "./ContextMenuContent.vue";
export type { ContextMenuContentProps } from "./ContextMenuContent.vue";

// `Item`, `Separator`, `Label`, `Sub`, `SubTrigger` and `SubContent` are
// identical between the two families once a panel is open — same markup,
// same menu-focus wiring, same submenu intent-delay behaviour. Rather than
// keep a second copy in sync with the first, this family re-exports
// `dropdown-menu`'s implementations under its own names. See README.md,
// "Shared implementation", for exactly what that covers and what genuinely
// differs (the root, the trigger, and how the content anchors itself).
export { default as ContextMenuItem } from "../dropdown-menu/DropdownMenuItem.vue";
export type { DropdownMenuItemProps as ContextMenuItemProps } from "../dropdown-menu/DropdownMenuItem.vue";
export { default as ContextMenuSeparator } from "../dropdown-menu/DropdownMenuSeparator.vue";
export type { DropdownMenuSeparatorProps as ContextMenuSeparatorProps } from "../dropdown-menu/DropdownMenuSeparator.vue";
export { default as ContextMenuLabel } from "../dropdown-menu/DropdownMenuLabel.vue";
export type { DropdownMenuLabelProps as ContextMenuLabelProps } from "../dropdown-menu/DropdownMenuLabel.vue";
export { default as ContextMenuSub } from "../dropdown-menu/DropdownMenuSub.vue";
export type { DropdownMenuSubProps as ContextMenuSubProps } from "../dropdown-menu/DropdownMenuSub.vue";
export { default as ContextMenuSubTrigger } from "../dropdown-menu/DropdownMenuSubTrigger.vue";
export type { DropdownMenuSubTriggerProps as ContextMenuSubTriggerProps } from "../dropdown-menu/DropdownMenuSubTrigger.vue";
export { default as ContextMenuSubContent } from "../dropdown-menu/DropdownMenuSubContent.vue";
export type { DropdownMenuSubContentProps as ContextMenuSubContentProps } from "../dropdown-menu/DropdownMenuSubContent.vue";

export { CONTEXT_MENU_KEY } from "./types.js";
export type { ContextMenuRootContext } from "./types.js";
export { MENU_KEY, SUB_KEY } from "../dropdown-menu/types.js";
export type { MenuContext, SubContext } from "../dropdown-menu/types.js";
