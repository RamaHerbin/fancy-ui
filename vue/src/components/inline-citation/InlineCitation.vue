<script lang="ts">
import type { HTMLAttributes } from "vue";
import type { SourceData } from "../../internals/ai-types.js";

/**
 * Props for InlineCitation
 */
export interface InlineCitationProps {
	/** The document being cited. Its title, domain and snippet fill the preview. */
	source: SourceData;
	/** The reference number shown in the marker, e.g. `3` renders `[3]` */
	index: number;
	/** Link target. Defaults to `source.url`; pass `""` to render an unlinked marker. */
	href?: string;
	/** Called each time the preview is shown, once per appearance */
	onOpen?: () => void;
	/** Additional CSS classes */
	class?: HTMLAttributes["class"];
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from "vue";
import { cn } from "../../utils.js";
import { useFloat } from "../../internals/use-float.js";
import { useFancyId } from "../../internals/use-id.js";
import { sanitizeHref } from "../../internals/markdown.js";
import { SourceCard } from "../sources/index.js";

defineOptions({ name: "InlineCitation", inheritAttrs: false });

const { source, index, href, onOpen, class: className } = defineProps<InlineCitationProps>();

const slots = defineSlots<{
	/** Replaces the default preview card body. Receives the source. */
	preview?(props: { source: SourceData }): unknown;
}>();

/** How long the pointer must rest on the marker before the card appears. */
const OPEN_DELAY_MS = 150;
/** How long the card survives after the pointer leaves, so it can be walked into. */
const CLOSE_GRACE_MS = 250;

const uid = useFancyId();
const previewId = `${uid}-preview`;

// An explicit `""` is the opt-out, which is why this is `??` and not `||`:
// only an omitted prop falls through to the source's own URL. Whatever it
// ends up being clears the same scheme check every link in this family runs
// through, since a url on a source is as model-supplied as the prose around it.
// A bare host ("docs.example.dev/guide") is promoted to `https://` first, the
// way SourceCard does it for the preview this marker opens: left as is, the
// browser resolves it against this app's own origin instead of the cited site.
// A genuine relative path ("/local/guide") is left alone.
const resolvedHref = computed(() => resolveHref(href ?? source.url ?? "") ?? "");
const isLink = computed(() => resolvedHref.value !== "");

function resolveHref(raw: string): string | null {
	if (raw === "") return null;
	const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith("//");
	const host = raw.split(/[/?#]/, 1)[0] as string;
	const looksHostLike = !hasScheme && !raw.startsWith("/") && host.includes(".");
	return sanitizeHref(looksHostLike ? `https://${raw}` : raw);
}

const open = ref(false);
// Plain lets: the timers must not wake anything that writes them.
let openTimer: ReturnType<typeof setTimeout> | undefined;
let closeTimer: ReturnType<typeof setTimeout> | undefined;

function cancelOpen() {
	if (openTimer === undefined) return;
	clearTimeout(openTimer);
	openTimer = undefined;
}

function cancelClose() {
	if (closeTimer === undefined) return;
	clearTimeout(closeTimer);
	closeTimer = undefined;
}

function show() {
	cancelOpen();
	cancelClose();
	// `onOpen` reports appearances, not intentions: a card already on screen
	// has nothing new to announce.
	if (open.value) return;
	open.value = true;
	onOpen?.();
}

function hide() {
	cancelOpen();
	cancelClose();
	open.value = false;
}

function scheduleShow() {
	// A pointer that comes back during the grace window keeps the card it
	// already has rather than starting the open delay over.
	cancelClose();
	if (open.value || openTimer !== undefined) return;
	openTimer = setTimeout(() => {
		openTimer = undefined;
		show();
	}, OPEN_DELAY_MS);
}

function scheduleHide() {
	cancelOpen();
	if (!open.value || closeTimer !== undefined) return;
	closeTimer = setTimeout(() => {
		closeTimer = undefined;
		hide();
	}, CLOSE_GRACE_MS);
}

// Escape is bound to the window rather than the marker so it also dismisses a
// card that was opened by hover, when nothing on the page holds focus.
watch(
	open,
	(isOpen, _prev, onCleanup) => {
		if (!isOpen) return;
		const onKeydown = (event: KeyboardEvent) => {
			if (event.key === "Escape") hide();
		};
		window.addEventListener("keydown", onKeydown);
		onCleanup(() => window.removeEventListener("keydown", onKeydown));
	},
	{ flush: "post" }
);

// The Svelte effect that reads nothing and whose teardown is the unmount
// cleanup: here it is only the unmount cleanup, with no effect around it.
onBeforeUnmount(() => {
	cancelOpen();
	cancelClose();
});

const marker = useTemplateRef<HTMLElement>("marker");
defineExpose({ ref: marker });

// In the DOM only while it is on screen, so the composable is handed `null` —
// and does nothing at all — for as long as the card is closed. The anchor is
// read through a getter so the float re-measures the marker on every scroll and
// resize tick instead of holding a stale element rect.
const previewEl = useTemplateRef<HTMLSpanElement>("preview");
useFloat(previewEl, () => ({
	anchor: () => marker.value?.getBoundingClientRect() ?? null,
	placement: "top",
	offset: 8,
}));

// The superscript is done in the scoped stylesheet rather than with utilities:
// its font size, line height and lift are one setting, and splitting them
// across two files is how a marker ends up taller than the line it sits on.
const markerClass = computed(() =>
	cn(
		"ft-citation-marker inline-flex cursor-pointer items-center rounded px-[0.2em] font-medium tabular-nums no-underline transition-colors focus-visible:ring-1 focus-visible:outline-none",
		className
	)
);

// The card is a SourceCard, which already carries a border, a surface and its
// own padding. Wrapping that in a second bordered, padded box would draw a card
// inside a card, so the chrome here is only put back for a body we do not
// control.
//
// A plain function rather than a `computed`: the source's `preview && …` is a
// truthiness test on a reactive snippet prop, while `$slots` is not a reactive
// source. A cached `computed` over it has nothing to invalidate and would keep
// whichever chrome the first render saw, even after the parent starts or stops
// passing a `preview` slot. Called from the template, every render reads the
// slots the parent passes now.
function previewClass(): string {
	return cn(
		"ft-citation-preview text-popover-foreground z-50 block rounded-lg text-left text-sm shadow-lg",
		slots.preview && "border p-3"
	);
}

// The marker's text is a bare number; on its own it names nothing, so the
// title rides along as the accessible name and the card stays supplementary.
const markerLabel = computed(() => `Source ${index}: ${source.title}`);
</script>

<template>
	<!--
		The marker block and the card block below carry no text between them on
		purpose. A whitespace text node there lands between the marker and whatever
		the sentence does next — which is how `read[3].` becomes `read[3] .` in
		every sentence ending on a citation. The marker's own `[n]` is written
		flush against its tags for the same reason: the template compiler condenses
		a run of indentation into a single space rather than dropping it. The
		formatter treats a button's inner whitespace as insignificant and would
		break it onto its own line, hence the ignore directive on that branch. The
		tests named for it are the guard; keep them touching.
	-->
	<a
		v-if="isLink"
		ref="marker"
		:href="resolvedHref"
		target="_blank"
		rel="noopener noreferrer nofollow ugc"
		:class="markerClass"
		:aria-label="markerLabel"
		:aria-describedby="open ? previewId : undefined"
		@mouseenter="scheduleShow"
		@mouseleave="scheduleHide"
		@focus="show"
		@blur="hide"
		>[{{ index }}]</a
	>
	<!-- prettier-ignore -->
	<button
		v-else
		ref="marker"
		type="button"
		:class="markerClass"
		:aria-label="markerLabel"
		:aria-describedby="open ? previewId : undefined"
		@mouseenter="scheduleShow"
		@mouseleave="scheduleHide"
		@focus="show"
		@blur="hide"
		@click="show"
	>[{{ index }}]</button>
	<!--
		Rendered only while it is on screen: a tooltip that lives in the DOM
		permanently is a hidden paragraph every crawler and every screen-reader
		element list has to step over, mid-sentence, once per citation.
	-->
	<span
		v-if="open"
		ref="preview"
		:id="previewId"
		role="tooltip"
		:class="previewClass()"
		@mouseenter="cancelClose"
		@mouseleave="scheduleHide"
	>
		<!--
			The same card the sources list shows, so a document a reader met in one
			place is recognisable in the other and there is one set of rules for
			deriving its host and its monogram — but in its plain, non-anchor shape:
			this preview is dismissed on blur, so a link inside it is one no keyboard
			can ever reach. The marker itself is already that link. A consumer's own
			`preview` slot is theirs to compose and is left alone.
		-->
		<slot name="preview" :source="source">
			<SourceCard :source="source" :interactive="false" />
		</slot>
	</span>
</template>

<style scoped>
/*
 * Both surfaces read their variables at the point of use with a fallback
 * rather than declaring them on a root, so a value set anywhere up the tree —
 * a wrapper's `style`, a theme class, `:root` — wins without having to
 * out-specify these scoped rules.
 */
/*
 * A hand-made superscript, because `vertical-align: super` is not one: it lifts
 * the box without shrinking the line it belongs to, so a marker inheriting the
 * prose line-height stretches the line box it sits in and leaves the paragraph
 * with uneven leading — wider gaps under exactly the lines that carry a
 * citation. Here the box is `0.75em × 1`, comfortably shorter than any line
 * height it lands in, and the lift is a relative offset, which moves the paint
 * without touching layout at all.
 */
.ft-citation-marker {
	position: relative;
	top: -0.35em;
	vertical-align: baseline;
	font-size: 0.75em;
	line-height: 1;
	color: var(--ft-citation-fg, var(--color-primary, currentColor));
}

/*
 * The pill is mixed from `currentColor`, so retinting the marker retints its
 * hover state with it and the two can never drift apart.
 */
.ft-citation-marker:hover,
.ft-citation-marker:focus-visible {
	background: var(--ft-citation-bg, color-mix(in oklab, currentColor 14%, transparent));
}

.ft-citation-preview {
	width: var(--ft-citation-preview-width, 16rem);
	max-width: calc(100vw - 1rem);
	background: var(--ft-citation-preview-bg, var(--color-popover, canvas));
	border-color: var(--ft-citation-preview-border, var(--color-border, currentColor));
}

/*
 * The entrance lives entirely inside `no-preference`, so reduced motion is not
 * a degraded variant to keep in sync: the card simply appears, already placed.
 */
@media (prefers-reduced-motion: no-preference) {
	.ft-citation-preview {
		animation: ft-citation-in 140ms cubic-bezier(0.4, 0, 0.2, 1);
	}
}

@keyframes ft-citation-in {
	from {
		opacity: 0;
		transform: translateY(3px);
	}
	to {
		opacity: 1;
		transform: none;
	}
}
</style>
