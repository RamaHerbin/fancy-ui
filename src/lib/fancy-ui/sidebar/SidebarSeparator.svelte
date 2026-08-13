<script lang="ts" module>
	export interface SidebarSeparatorProps {
		/** Additional CSS classes */
		class?: string;
		/** Element reference */
		ref?: HTMLHRElement | null;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let { class: className, ref = $bindable(null) }: SidebarSeparatorProps = $props();
</script>

<!-- `<hr>` is `role="separator"` implicitly — no extra ARIA needed. -->
<hr bind:this={ref} class={cn("ft-sidebar-separator border-border my-2 w-full", className)} />
