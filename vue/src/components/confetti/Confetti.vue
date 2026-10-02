<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { GlobalOptions as ConfettiGlobalOptions, Options as ConfettiOptions } from "canvas-confetti";

export interface ConfettiProps {
	/** Default confetti options, merged under every `fire()` call. */
	options?: ConfettiOptions;
	/** Canvas creation options, read once when the instance is created. */
	globalOptions?: ConfettiGlobalOptions;
	/** Skip the automatic fire on mount. */
	manualStart?: boolean;
	/** Canvas CSS classes. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef } from "vue";
import { createConfetti, type ConfettiEngine } from "./confetti-core.js";
import { CONFETTI_CONTEXT } from "./context.js";

defineOptions({ name: "Confetti", inheritAttrs: false });

const {
	options = {},
	globalOptions = {},
	manualStart = false,
	class: className = "",
} = defineProps<ConfettiProps>();

defineSlots<{ default?: () => unknown }>();

const canvasRef = useTemplateRef<HTMLCanvasElement>("canvasRef");
let engine: ConfettiEngine | null = null;

// `options` is read synchronously inside `fire()`, the same call site the
// Svelte source reads it from, rather than being pushed from a deferred
// watcher: mutating the object already handed to this component is therefore
// visible to the very next `fire()`. Reassigning the prop to a NEW object is
// not — Vue delivers that only on the parent's next render, so a parent that
// swaps `options` and calls `fire()` in one handler still bursts with the
// previous object. That is a declared divergence from Svelte, where the same
// shape bursts with the new one; see `ConfettiFire.test.ts`.
function fire(opts: ConfettiOptions = {}) {
	engine?.setOptions({ options });
	engine?.fire(opts);
}

CONFETTI_CONTEXT.provide({ fire });

defineExpose({ fire });

onMounted(() => {
	const canvas = canvasRef.value;
	if (!canvas) return;

	// C-7's fail-quiet clause, applied at the wrapper because `confetti-core`
	// creates its instance deliberately unguarded. jsdom — and a browser that
	// refuses to back the surface, a lost or budget-exhausted 2D context — hands
	// back `null` here. canvas-confetti still builds an instance from such a
	// canvas and only dereferences the context later: inside the burst, and
	// inside the `reset()` that `destroy()` calls, which is where an unguarded
	// mount turns the next unmount into a `clearRect of null` throw. Probing
	// first leaves the component inert instead — the same shape a `null` engine
	// already has, and the same shape the Svelte source has when its canvas
	// cannot paint, only reached without the throw.
	if (!canvas.getContext("2d")) return;

	engine = createConfetti({ canvas }, { globalOptions, manualStart, options });
});

onBeforeUnmount(() => {
	engine?.destroy();
	engine = null;
});
</script>

<template>
	<div>
		<canvas ref="canvasRef" :class="className" aria-hidden="true"></canvas>
		<slot v-if="$slots.default" />
	</div>
</template>
