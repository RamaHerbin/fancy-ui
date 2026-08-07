<!--
	The bottom rail of a composer: one row, one gap, no opinions about what sits
	on it. A model picker, an attach button and a send button are all just
	children here, laid out left to right in source order.

	Props
	-----
	- `children?: Snippet` — the controls on the rail, in the order they appear.
	- `class?: string`     — merged over the row's own layout classes.

	The trailing spacer convention
	------------------------------
	The rail lays everything out from the left. Anything that belongs on the
	right — the send button, a token meter — is pushed there by a spacer the
	integrator writes into `children`, rather than by a second slot this
	component would have to invent:

	```svelte
	<ComposerToolbar>
		<ComposerModelPicker {models} />
		<div class="flex-1"></div>
		<ComposerSubmit />
	</ComposerToolbar>
	```

	One flexible box, any number of groups, and the split stays visible in the
	consumer's markup instead of being buried in ours.

	Deliberately not `role="toolbar"`: that role promises arrow-key roving focus
	between its controls, and a row that announces itself as a toolbar without
	implementing that is worse for a keyboard user than a plain row of tab stops.
-->
<script lang="ts" module>
	import type { Snippet } from "svelte";

	/**
	 * Props for ComposerToolbar
	 */
	export interface ComposerToolbarProps {
		/** The controls on the rail, laid out left to right in source order. */
		children?: Snippet;
		/** Additional CSS classes */
		class?: string;
	}
</script>

<script lang="ts">
	import { cn } from "$lib/utils.js";

	let { children, class: className }: ComposerToolbarProps = $props();
</script>

<div class={cn("ft-composer-toolbar flex items-center gap-1", className)}>
	{@render children?.()}
</div>
