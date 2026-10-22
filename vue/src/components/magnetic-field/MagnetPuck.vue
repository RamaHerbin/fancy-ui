<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { MagneticPoint } from "./magnetic-field-core.js";

/**
 * The puck's centre is the `position` model (`v-model:position`): in px,
 * relative to its positioned parent (the field's padding box when it sits
 * inside a `MagneticField`). Dragging and the arrow keys update it.
 */
export interface MagnetPuckProps {
	/** Called with each new position while the puck is dragged or moved with the keyboard. */
	onPositionChange?: (position: MagneticPoint) => void;
	/** Diameter in px. */
	size?: number;
	/**
	 * Whether the puck keeps attracting once released. By default it attracts
	 * only while held, and the items spring back when it is let go.
	 */
	sticky?: boolean;
	/**
	 * Accessible name. The puck is also described by a built-in hint naming
	 * its keys; pass `aria-describedby` to replace it.
	 */
	label?: string;
	/** Called when the puck is picked up (pointer down, or Space/Enter) and put down. */
	onHeldChange?: (held: boolean) => void;
	/** Additional CSS classes. */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useAttrs, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { useFancyId } from "../../internals/use-id.js";
import { MAGNETIC_FIELD_KEY } from "./types.js";

defineOptions({ name: "MagnetPuck", inheritAttrs: false });

/** Read after the name, so keyboard and screen-reader users learn the keys. */
const KEY_HINT = "Space or Enter picks it up and puts it down; the arrow keys move it.";

/** Arrow-key step, px; Shift multiplies it by four. */
const KEY_STEP = 8;
const KEY_STEP_LARGE = 32;

const attrs = useAttrs();
const hintId = `${useFancyId()}-hint`;

const {
	onPositionChange,
	size = 40,
	sticky = false,
	label = "Magnet",
	onHeldChange,
	class: className,
} = defineProps<MagnetPuckProps>();

/** The puck's centre, px. */
const position = defineModel<MagneticPoint>("position", { default: () => ({ x: 48, y: 48 }) });

defineSlots<{
	/** A custom face. Leave it out for the default black disc. */
	default?(): unknown;
}>();

const el = useTemplateRef<HTMLDivElement>("el");
defineExpose({ ref: el });

// Undefined outside a MagneticField: the puck is then a plain draggable,
// and the consumer feeds `position` into a `source="manual"` field.
const ctx = MAGNETIC_FIELD_KEY.useOptional();

/** Who holds the puck: a pointer drag, the keyboard (Space/Enter), or nobody. */
const holder = ref<"pointer" | "keyboard" | null>(null);
const held = computed(() => holder.value !== null);

let activePointerId: number | null = null;
let dragStartX = 0;
let dragStartY = 0;
let dragOrigin: MagneticPoint = { x: 0, y: 0 };

const puckStyle = computed(() => ({
	width: `${size}px`,
	height: `${size}px`,
	transform: `translate3d(${position.value.x - size / 2}px, ${position.value.y - size / 2}px, 0)`,
}));

function setHolder(next: "pointer" | "keyboard" | null) {
	const was = holder.value !== null;
	holder.value = next;
	if (was !== (next !== null)) onHeldChange?.(next !== null);
}

/**
 * Keeps the whole disc inside the positioned parent's padding box, the box
 * `position` is measured in. An axis whose size reads 0 (not laid out yet,
 * or jsdom) is left unclamped rather than pinned to the corner.
 */
function clampToParent(p: MagneticPoint): MagneticPoint {
	const node = el.value;
	const parent = (node?.offsetParent as HTMLElement | null) ?? node?.parentElement ?? null;
	if (!parent) return p;
	const half = size / 2;
	const w = parent.clientWidth;
	const h = parent.clientHeight;
	return {
		x: w > 0 ? Math.min(Math.max(p.x, half), Math.max(half, w - half)) : p.x,
		y: h > 0 ? Math.min(Math.max(p.y, half), Math.max(half, h - half)) : p.y,
	};
}

function moveTo(p: MagneticPoint) {
	const next = clampToParent(p);
	if (next.x === position.value.x && next.y === position.value.y) return;
	position.value = next;
	onPositionChange?.(next);
}

function releasePointer() {
	if (activePointerId === null) return;
	// Cleared first: releasing capture may dispatch `lostpointercapture`
	// synchronously, and that handler must find nothing left to end.
	const id = activePointerId;
	activePointerId = null;
	el.value?.releasePointerCapture?.(id);
}

function release() {
	releasePointer();
	setHolder(null);
}

function handlePointerDown(event: PointerEvent) {
	if (event.pointerType === "mouse" && event.button !== 0) return;
	if (activePointerId !== null) return;
	activePointerId = event.pointerId;
	dragStartX = event.clientX;
	dragStartY = event.clientY;
	dragOrigin = { x: position.value.x, y: position.value.y };
	// Keeps pointermove/pointerup flowing to the puck even when a fast drag
	// outruns it. Optional call: jsdom implements neither capture method.
	el.value?.setPointerCapture?.(event.pointerId);
	setHolder("pointer");
}

function handlePointerMove(event: PointerEvent) {
	if (event.pointerId !== activePointerId) return;
	moveTo({
		x: dragOrigin.x + event.clientX - dragStartX,
		y: dragOrigin.y + event.clientY - dragStartY,
	});
}

function handlePointerEnd(event: PointerEvent) {
	if (event.pointerId !== activePointerId) return;
	release();
}

function handleKeyDown(event: KeyboardEvent) {
	const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
	let dx = 0;
	let dy = 0;
	switch (event.key) {
		case "ArrowLeft":
			dx = -step;
			break;
		case "ArrowRight":
			dx = step;
			break;
		case "ArrowUp":
			dy = -step;
			break;
		case "ArrowDown":
			dy = step;
			break;
		case " ":
		case "Enter":
			event.preventDefault();
			if (event.repeat) return;
			if (held.value) release();
			else setHolder("keyboard");
			return;
		case "Escape":
			if (!held.value) return;
			event.preventDefault();
			release();
			return;
		default:
			return;
	}
	event.preventDefault();
	moveTo({ x: position.value.x + dx, y: position.value.y + dy });
}

function handleBlur() {
	// A keyboard hold has nothing left to end it once focus moves away.
	if (holder.value === "keyboard") release();
}

// Feeds the field's "puck" channel while the puck attracts: held, or
// released with `sticky`. A plain object is passed so the core never keeps
// a reactive proxy of the position. No per-run cleanup: clearing between two
// positions of one drag would blink the channel to null.
function syncSource() {
	if (!ctx) return;
	const { x, y } = position.value;
	ctx.setSource(held.value || sticky ? { x, y } : null, "puck");
}

onMounted(syncSource);
watch([() => position.value.x, () => position.value.y, held, () => sticky], syncSource, {
	flush: "post",
});

// A window that loses focus mid-drag (Alt+Tab, a system dialog) may never
// deliver the pointerup: drop the puck rather than leave it stuck in hand.
watch(
	held,
	(isHeld, _old, onCleanup) => {
		if (!isHeld) return;
		const onBlur = () => release();
		window.addEventListener("blur", onBlur);
		onCleanup(() => window.removeEventListener("blur", onBlur));
	},
	{ flush: "post" }
);

// Unmounting a held or sticky puck lets the items go.
onBeforeUnmount(() => ctx?.setSource(null, "puck"));
</script>

<template>
	<div
		ref="el"
		@pointerdown="handlePointerDown"
		@pointermove="handlePointerMove"
		@pointerup="handlePointerEnd"
		@pointercancel="handlePointerEnd"
		@lostpointercapture="handlePointerEnd"
		@keydown="handleKeyDown"
		@blur="handleBlur"
		v-bind="attrs"
		:class="cn('ft-magnet-puck', className)"
		role="button"
		tabindex="0"
		:aria-label="label"
		:aria-describedby="(attrs['aria-describedby'] as string | undefined) ?? hintId"
		:aria-pressed="held ? 'true' : 'false'"
		:data-held="held || undefined"
		:style="puckStyle"
	>
		<slot>
			<span class="ft-magnet-puck-face" aria-hidden="true"></span>
		</slot>
		<span :id="hintId" class="ft-magnet-puck-hint">{{ KEY_HINT }}</span>
	</div>
</template>

<style scoped>
.ft-magnet-puck {
	position: absolute;
	left: 0;
	top: 0;
	z-index: 1;
	display: grid;
	place-items: center;
	border-radius: 9999px;
	touch-action: none;
	user-select: none;
	-webkit-user-select: none;
	-webkit-tap-highlight-color: transparent;
	cursor: grab;
}

.ft-magnet-puck[data-held] {
	cursor: grabbing;
}

.ft-magnet-puck:focus {
	outline: none;
}

.ft-magnet-puck:focus-visible {
	outline: 2px solid
		var(--ft-accent, light-dark(oklch(0.5432 0.2528 300.22), oklch(0.604 0.2606 301.75)));
	outline-offset: 3px;
}

/* A matte black disc: a soft top-left sheen, an inner rim and a cast shadow
   that deepens when it is lifted. Readable on light and dark surfaces: the rim
   and the sheen brighten under a dark color scheme. */
.ft-magnet-puck-face {
	width: 100%;
	height: 100%;
	border-radius: inherit;
	background: radial-gradient(
		circle at 34% 28%,
		light-dark(#3b3b3d, #4a4a4d) 0%,
		#161617 46%,
		#050505 100%
	);
	box-shadow:
		inset 0 1px 1px rgb(255 255 255 / 0.16),
		inset 0 -3px 6px rgb(0 0 0 / 0.55),
		0 0 0 1px light-dark(rgb(255 255 255 / 0.07), rgb(255 255 255 / 0.16)),
		0 6px 14px -6px rgb(0 0 0 / 0.55);
	transition:
		scale 160ms ease-out,
		box-shadow 160ms ease-out;
}

.ft-magnet-puck[data-held] .ft-magnet-puck-face {
	scale: 1.06;
	box-shadow:
		inset 0 1px 1px rgb(255 255 255 / 0.18),
		inset 0 -3px 6px rgb(0 0 0 / 0.55),
		0 0 0 1px light-dark(rgb(255 255 255 / 0.08), rgb(255 255 255 / 0.2)),
		0 14px 24px -8px rgb(0 0 0 / 0.6);
}

/* The keyboard hint the puck is described by: read, never seen. */
.ft-magnet-puck-hint {
	position: absolute;
	width: 1px;
	height: 1px;
	margin: -1px;
	padding: 0;
	overflow: hidden;
	clip-path: inset(50%);
	white-space: nowrap;
	border: 0;
}

@media (prefers-reduced-motion: reduce) {
	.ft-magnet-puck-face {
		transition: none;
	}
}
</style>
