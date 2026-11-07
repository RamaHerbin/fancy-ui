import { attribute, type PlaygroundScalar } from "$lib/docs/playground-code.js";
import type { Framework } from "$lib/inspiration/types.js";

const DEFAULTS: Record<string, PlaygroundScalar> = {
	variant: "curtain",
	sweep: "right",
	colors: "broadcast",
	seed: 1,
	columns: 11,
	power: 1.65,
	tiles: 15,
	coverDuration: 380,
	revealDuration: 480,
	stagger: 28,
	speed: 1,
};

/**
 * The usage per framework: the overlay does nothing until `cover()` and
 * `reveal()` are called on it, so the export carries a handle to it and a
 * function that runs both. The preview draws it inside a box (`contained`);
 * the export is the page-level overlay, which is how it is used for a route
 * change.
 */
export function datamoshTransitionCode(
	values: Record<string, PlaygroundScalar>,
	framework: Framework
): string {
	const attrs: string[] = [];
	for (const [name, fallback] of Object.entries(DEFAULTS)) {
		const value = values[name];
		if (value !== undefined && value !== fallback) attrs.push(attribute(name, value, framework));
	}
	const rest = attrs.map((a) => `\n\t${a}`).join("");
	const close = rest ? "\n/>" : " />";

	if (framework === "react") {
		return `const transition = useRef<DatamoshTransitionHandle>(null);

async function run() {
	await transition.current?.cover();
	// swap the page here
	await transition.current?.reveal();
}

<button type="button" onClick={run}>Run the transition</button>
<DatamoshTransition ref={transition}${rest}${close}`;
	}
	if (framework === "vue") {
		return `<script setup lang="ts">
import { ref } from "vue";

const transition = ref<InstanceType<typeof DatamoshTransition> | null>(null);

async function run() {
	await transition.value?.cover();
	// swap the page here
	await transition.value?.reveal();
}
</script>

<button type="button" @click="run">Run the transition</button>
<DatamoshTransition ref="transition"${rest}${close}`;
	}
	return `<script lang="ts">
let transition: ReturnType<typeof DatamoshTransition> | undefined = $state();

async function run() {
	await transition?.cover();
	// swap the page here
	await transition?.reveal();
}
</script>

<button type="button" onclick={run}>Run the transition</button>
<DatamoshTransition bind:this={transition}${rest}${close}`;
}
