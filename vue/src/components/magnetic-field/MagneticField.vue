<script lang="ts">
import type { HTMLAttributes } from "vue";
import type {
	MagneticFieldSource,
	MagneticPoint,
	MagneticSpring,
	MagneticSpringPreset,
} from "./magnetic-field-core.js";

export interface MagneticFieldProps {
	/** Where the magnet comes from. `"pointer"` follows a mouse or pen anywhere within `radius` of an item (touch is ignored); `"manual"` reads `position` instead. A `MagnetPuck` placed inside the field drives it in either mode while it is held. */
	source?: MagneticFieldSource;
	/** The magnet's position in px, relative to the field's padding box, used when `source` is `"manual"`. `null` means no magnet, and the items spring back to rest. */
	position?: MagneticPoint | null;
	/** Falloff distance from the item's edge, in px: an item pulls hardest when the magnet touches or overlaps it, and not at all once the magnet is `radius` px beyond its nearest edge. */
	radius?: number;
	/** Global pull multiplier, applied on top of each item's own `strength`. `0` turns the effect off without detaching anything. */
	strength?: number;
	/** Largest distance, in px, that any item travels toward the magnet. */
	maxTranslate?: number;
	/** Largest lean, in degrees. Items lean toward the magnet's side like a crowd turning its head: clockwise when it is to their left, counter-clockwise when it is to their right. */
	maxRotate?: number;
	/** How items move and settle: `"soft"`, `"default"` or `"snappy"`, or your own `{ stiffness, damping, mass }` (missing keys come from `"default"`). */
	spring?: MagneticSpringPreset | Partial<MagneticSpring>;
	/** `1` attracts and `-1` repels. Only translation flips; the lean stays the same. */
	polarity?: 1 | -1;
	/** Detaches every listener and springs each item back to rest. */
	disabled?: boolean;
	/** Called when the field wakes up (a magnet is engaged or an item is still settling) and when it goes back to sleep. */
	onActiveChange?: (active: boolean) => void;
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, useAttrs, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { inView } from "../../internals/motion/in-view.js";
import { useReducedMotion } from "../../internals/motion/use-media-query.js";
import {
	createMagneticFieldCore,
	createMagneticFieldHub,
	MAGNETIC_FIELD_DEFAULTS,
	resolveSpring,
	type MagneticFieldCore,
	type MagneticFieldOptions,
} from "./magnetic-field-core.js";
import { attachLayoutInvalidation, attachPointerSource } from "./magnetic-field-source.js";
import { MAGNETIC_FIELD_KEY, type MagneticFieldContext } from "./types.js";

defineOptions({ name: "MagneticField", inheritAttrs: false });

const attrs = useAttrs();

const {
	source = "pointer",
	position = null,
	radius = MAGNETIC_FIELD_DEFAULTS.radius,
	strength = MAGNETIC_FIELD_DEFAULTS.strength,
	maxTranslate = MAGNETIC_FIELD_DEFAULTS.maxTranslate,
	maxRotate = MAGNETIC_FIELD_DEFAULTS.maxRotate,
	spring = "default",
	polarity = 1,
	disabled = false,
	onActiveChange,
	class: className,
} = defineProps<MagneticFieldProps>();

defineSlots<{
	/** The content. Wrap each element that should react in a `MagneticItem`. */
	default?(): unknown;
}>();

const root = useTemplateRef<HTMLDivElement>("root");
defineExpose({ ref: root });

// One hub for the field's whole life: items and pucks register through it
// whether or not the core exists yet, and it replays them into each core.
// Children mount (and register) before this component's own `onMounted`.
const hub = createMagneticFieldHub();
const context: MagneticFieldContext = hub;
MAGNETIC_FIELD_KEY.provide(context);

// Started by the composable's own `onMounted`, registered before ours, so it
// is answered by the time the core is created.
const reduced = useReducedMotion();

const core = shallowRef<MagneticFieldCore | null>(null);
const active = ref(false);

function handleActive(next: boolean) {
	active.value = next;
	onActiveChange?.(next);
}

function currentOptions(): Partial<MagneticFieldOptions> {
	return {
		radius,
		strength,
		maxTranslate,
		maxRotate,
		spring: resolveSpring(spring),
		polarity,
		reducedMotion: reduced.value,
		disabled,
		onActiveChange: handleActive,
	};
}

// The controlled magnet. Read through the hub so it survives a core swap.
function syncManual() {
	const point = source === "manual" && position ? { x: position.x, y: position.y } : null;
	hub.setSource(point, "manual");
}

/** Teardown of whatever `buildSources()` last attached. */
let teardownSources: (() => void) | null = null;
/** What the in-view observer reports to, while sources are built. */
let onVisible: ((visible: boolean) => void) | null = null;
/** Teardown of the in-view observer `buildObserver()` last created. */
let teardownObserver: (() => void) | null = null;

// The in-view observer alone depends on `radius`: a new margin replaces it
// without detaching the pointer, so a resting pointer keeps pulling.
function buildObserver() {
	teardownObserver?.();
	teardownObserver = null;
	const node = root.value;
	if (!node || !onVisible) return;
	const io = inView(node, {
		once: false,
		threshold: 0,
		rootMargin: `${radius}px`,
		onChange: onVisible,
	}) as { destroy?: () => void } | void;
	teardownObserver = () => io?.destroy?.();
}

// Listeners exist only while something can move: the field is enabled,
// motion is allowed, and the field (inflated by `radius`) is on screen.
function buildSources() {
	teardownSources?.();
	teardownSources = null;
	const c = core.value;
	const node = root.value;
	if (!c || !node) return;
	const usePointer = source === "pointer";
	if (disabled || reduced.value || !usePointer) c.clearSource("pointer");
	if (disabled || reduced.value) return;

	let detachPointer: (() => void) | null = null;
	let detachLayout: (() => void) | null = null;

	onVisible = (visible) => {
		if (visible) {
			detachLayout ??= attachLayoutInvalidation(c);
			if (usePointer) detachPointer ??= attachPointerSource(c, node.ownerDocument, node);
		} else {
			detachPointer?.();
			detachPointer = null;
			detachLayout?.();
			detachLayout = null;
			c.clearSource("pointer");
		}
	};
	buildObserver();

	teardownSources = () => {
		teardownObserver?.();
		teardownObserver = null;
		onVisible = null;
		detachPointer?.();
		detachLayout?.();
		c.clearSource("pointer");
	};
}

// The core lives exactly as long as the root node. Items and pucks have
// already mounted (and registered with the hub) by the time this runs.
onMounted(() => {
	syncManual();
	const node = root.value;
	if (!node) return;
	const next = createMagneticFieldCore(node, currentOptions());
	core.value = next;
	hub.attach(next);
	buildSources();
});

onBeforeUnmount(() => {
	teardownSources?.();
	teardownSources = null;
	const c = core.value;
	if (!c) return;
	hub.detach();
	c.destroy();
	core.value = null;
	active.value = false;
});

// Every prop change goes through one update; the core ignores no-ops.
watch(
	[
		() => radius,
		() => strength,
		() => maxTranslate,
		() => maxRotate,
		() => spring,
		() => polarity,
		() => disabled,
		reduced,
	],
	() => core.value?.update(currentOptions()),
	{ flush: "post" }
);

watch([() => source, () => position?.x, () => position?.y], syncManual, { flush: "post" });

watch([() => source, () => disabled, reduced], buildSources, { flush: "post" });

watch(() => radius, buildObserver, { flush: "post" });
</script>

<template>
	<div
		ref="root"
		:class="cn('ft-magnetic-field', className)"
		v-bind="attrs"
		:data-source="source"
		:data-active="active || undefined"
	>
		<slot />
	</div>
</template>

<style scoped>
.ft-magnetic-field {
	position: relative;
}
</style>
