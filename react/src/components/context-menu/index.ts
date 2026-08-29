export { ContextMenu } from "./ContextMenu.js";
export type { ContextMenuProps } from "./ContextMenu.js";
export { ContextMenuTrigger } from "./ContextMenuTrigger.js";
export type { ContextMenuTriggerProps } from "./ContextMenuTrigger.js";
export { ContextMenuContent } from "./ContextMenuContent.js";
export type { ContextMenuContentProps } from "./ContextMenuContent.js";

// `Item`, `Separator`, `Label`, `Sub`, `SubTrigger` and `SubContent` are
// identical between the two menu families once a panel is open — same markup,
// same menu-focus wiring, same submenu intent-delay behaviour. Rather than
// keep a second copy in sync with the first, this family re-exports
// `dropdown-menu`'s implementations under its own names. What genuinely
// differs is the root, the trigger, and how the content anchors itself.
export { DropdownMenuItem as ContextMenuItem } from "../dropdown-menu/DropdownMenuItem.js";
export type { DropdownMenuItemProps as ContextMenuItemProps } from "../dropdown-menu/DropdownMenuItem.js";
export { DropdownMenuSeparator as ContextMenuSeparator } from "../dropdown-menu/DropdownMenuSeparator.js";
export type { DropdownMenuSeparatorProps as ContextMenuSeparatorProps } from "../dropdown-menu/DropdownMenuSeparator.js";
export { DropdownMenuLabel as ContextMenuLabel } from "../dropdown-menu/DropdownMenuLabel.js";
export type { DropdownMenuLabelProps as ContextMenuLabelProps } from "../dropdown-menu/DropdownMenuLabel.js";
export { DropdownMenuSub as ContextMenuSub } from "../dropdown-menu/DropdownMenuSub.js";
export type { DropdownMenuSubProps as ContextMenuSubProps } from "../dropdown-menu/DropdownMenuSub.js";
export { DropdownMenuSubTrigger as ContextMenuSubTrigger } from "../dropdown-menu/DropdownMenuSubTrigger.js";
export type { DropdownMenuSubTriggerProps as ContextMenuSubTriggerProps } from "../dropdown-menu/DropdownMenuSubTrigger.js";
export { DropdownMenuSubContent as ContextMenuSubContent } from "../dropdown-menu/DropdownMenuSubContent.js";
export type { DropdownMenuSubContentProps as ContextMenuSubContentProps } from "../dropdown-menu/DropdownMenuSubContent.js";
export { CONTEXT_MENU_KEY, type ContextMenuRootContext } from "./types.js";
export { MENU_KEY, type MenuContext, SUB_KEY, type SubContext } from "../dropdown-menu/types.js";
