import ContextMenu, { type ContextMenuProps } from "./ContextMenu.svelte";
import ContextMenuTrigger, { type ContextMenuTriggerProps } from "./ContextMenuTrigger.svelte";
import ContextMenuContent, { type ContextMenuContentProps } from "./ContextMenuContent.svelte";

// `Item`, `Separator`, `Label`, `Sub`, `SubTrigger` and `SubContent` are
// identical between the two families once a panel is open — same markup,
// same menu-focus wiring, same submenu intent-delay behaviour. Rather than
// keep a second copy in sync with the first, this family re-exports
// `dropdown-menu`'s implementations under its own names. See README.md,
// "Shared implementation", for exactly what that covers and what genuinely
// differs (the root, the trigger, and how the content anchors itself).
import DropdownMenuItem, {
	type DropdownMenuItemProps,
} from "../dropdown-menu/DropdownMenuItem.svelte";
import DropdownMenuSeparator, {
	type DropdownMenuSeparatorProps,
} from "../dropdown-menu/DropdownMenuSeparator.svelte";
import DropdownMenuLabel, {
	type DropdownMenuLabelProps,
} from "../dropdown-menu/DropdownMenuLabel.svelte";
import DropdownMenuSub, {
	type DropdownMenuSubProps,
} from "../dropdown-menu/DropdownMenuSub.svelte";
import DropdownMenuSubTrigger, {
	type DropdownMenuSubTriggerProps,
} from "../dropdown-menu/DropdownMenuSubTrigger.svelte";
import DropdownMenuSubContent, {
	type DropdownMenuSubContentProps,
} from "../dropdown-menu/DropdownMenuSubContent.svelte";

export {
	ContextMenu,
	type ContextMenuProps,
	ContextMenuTrigger,
	type ContextMenuTriggerProps,
	ContextMenuContent,
	type ContextMenuContentProps,
	DropdownMenuItem as ContextMenuItem,
	type DropdownMenuItemProps as ContextMenuItemProps,
	DropdownMenuSeparator as ContextMenuSeparator,
	type DropdownMenuSeparatorProps as ContextMenuSeparatorProps,
	DropdownMenuLabel as ContextMenuLabel,
	type DropdownMenuLabelProps as ContextMenuLabelProps,
	DropdownMenuSub as ContextMenuSub,
	type DropdownMenuSubProps as ContextMenuSubProps,
	DropdownMenuSubTrigger as ContextMenuSubTrigger,
	type DropdownMenuSubTriggerProps as ContextMenuSubTriggerProps,
	DropdownMenuSubContent as ContextMenuSubContent,
	type DropdownMenuSubContentProps as ContextMenuSubContentProps,
};
export { CONTEXT_MENU_KEY, type ContextMenuRootContext } from "./types.js";
export { MENU_KEY, type MenuContext, SUB_KEY, type SubContext } from "../dropdown-menu/types.js";
