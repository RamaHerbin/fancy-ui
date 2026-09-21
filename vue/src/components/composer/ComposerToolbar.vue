<!--
	The bottom rail of a composer: one row, one gap, no opinions about what sits
	on it. A model picker, an attach button and a send button are all just
	children here, laid out left to right in source order.

	Props
	-----
	- default slot  — the controls on the rail, in the order they appear.
	- `class?`      — merged over the row's own layout classes.

	The trailing spacer convention
	------------------------------
	The rail lays everything out from the left. Anything that belongs on the
	right — the send button, a token meter — is pushed there by a spacer the
	integrator writes into the slot, rather than by a second slot this
	component would have to invent:

	```vue
	<ComposerToolbar>
		<ComposerModelPicker :models="models" />
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
<script lang="ts">
import type { HTMLAttributes } from "vue";

/**
 * Props for ComposerToolbar
 */
export interface ComposerToolbarProps {
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { cn } from "../../utils.js";

defineOptions({ name: "ComposerToolbar", inheritAttrs: false });

const { class: className } = defineProps<ComposerToolbarProps>();

defineSlots<{
	/** The controls on the rail, laid out left to right in source order. */
	default?(): unknown;
}>();
</script>

<template>
	<div :class="cn('ft-composer-toolbar flex items-center gap-1', className)">
		<slot />
	</div>
</template>
