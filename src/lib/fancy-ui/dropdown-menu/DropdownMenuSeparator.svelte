<script lang="ts" module>
	export interface DropdownMenuSeparatorProps {
		/** Additional CSS classes. */
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let { class: className }: DropdownMenuSeparatorProps = $props();
</script>

<!-- Not a menuitem, never registered with the menu-focus core: purely a visual/semantic divider. -->
<div
	role="separator"
	class={cn("ft-dropdown-menu-separator bg-border my-[4px] h-px", className)}
></div>
