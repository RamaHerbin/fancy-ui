<script lang="ts">
import type { Component, HTMLAttributes } from "vue";

export interface AppleCardData {
	/** Category label shown above the title */
	category: string;
	/** Main card title */
	title: string;
	/** URL of the card background image */
	src: string;
	/** Short description shown in the expanded view */
	description?: string;
	/** Rich content shown in the expanded view (takes precedence over description) */
	content?: Component;
}

/** Shared transition duration — must stay in sync with the CSS transition below */
export const TRANSITION_MS = 400;

export interface AppleCardProps {
	card: AppleCardData;
	index: number;
	expandedIndex: number;
	reducedMotion: boolean;
	onExpand: (index: number) => void;
	onCollapse: () => void;
	class?: HTMLAttributes["class"];
	/**
	 * Plays the matching open/close cue through the sound controller. Off by
	 * default; only audible once the user has enabled sound.
	 */
	sound?: boolean;
}
</script>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from "vue";
import { useSoundCue } from "../../sound/use-sound.js";
import { cn } from "../../utils.js";

defineOptions({ name: "AppleCard", inheritAttrs: false });

const {
	card,
	index,
	expandedIndex,
	reducedMotion,
	onExpand,
	onCollapse,
	class: className = "",
	sound = false,
} = defineProps<AppleCardProps>();

const cardEl = useTemplateRef<HTMLDivElement>("cardEl");
const dialogEl = useTemplateRef<HTMLDivElement>("dialogEl");
const closeBtn = useTemplateRef<HTMLButtonElement>("closeBtn");
const rect = ref<{ top: number; left: number; width: number; height: number } | null>(null);
const overlayVisible = ref(false);
const fullyExpanded = ref(false);
// Collapse-in-progress latch. Not reactive: nothing renders off it — it only
// dedupes handleCollapse calls (Escape + backdrop click) during the exit
// window, and gates the close cue on the overlay actually being open
// rather than on the entrance animation having finished.
let closing = false;
let previousFocus: HTMLElement | null = null;

// A no-op while `sound` is false, so the two call sites below stay unguarded.
const playCue = useSoundCue(() => sound);

const backdropStyle = computed(() => ({
	opacity: fullyExpanded.value ? 1 : 0,
	transition: `opacity ${reducedMotion ? 0 : TRANSITION_MS}ms ease`,
}));

// Built here rather than inline in the template so the geometry read is
// narrowed once; the branch is only ever rendered while `rect` is non-null, so
// the fallback below is unreachable and exists purely for the type.
const dialogStyle = computed(() => {
	const r = rect.value ?? { top: 0, left: 0, width: 0, height: 0 };
	return {
		top: fullyExpanded.value ? "0px" : `${r.top}px`,
		left: fullyExpanded.value ? "0px" : `${r.left}px`,
		width: fullyExpanded.value ? "100vw" : `${r.width}px`,
		height: fullyExpanded.value ? "100vh" : `${r.height}px`,
		borderRadius: fullyExpanded.value ? "0px" : "1.5rem",
		transition: reducedMotion
			? "none"
			: `top ${TRANSITION_MS}ms cubic-bezier(0.32,0.72,0,1), left ${TRANSITION_MS}ms cubic-bezier(0.32,0.72,0,1), width ${TRANSITION_MS}ms cubic-bezier(0.32,0.72,0,1), height ${TRANSITION_MS}ms cubic-bezier(0.32,0.72,0,1), border-radius ${TRANSITION_MS}ms cubic-bezier(0.32,0.72,0,1)`,
	};
});

async function handleExpand() {
	if (expandedIndex !== -1) return;
	playCue("open");
	previousFocus = document.activeElement as HTMLElement;
	const r = cardEl.value!.getBoundingClientRect();
	rect.value = { top: r.top, left: r.left, width: r.width, height: r.height };
	overlayVisible.value = true;
	onExpand(index);

	// Wait for the overlay to be in the DOM before focusing
	await nextTick();
	closeBtn.value?.focus();

	if (reducedMotion) {
		fullyExpanded.value = true;
	} else {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				fullyExpanded.value = true;
			});
		});
	}
}

function handleCollapse() {
	if (!overlayVisible.value || closing) return;
	closing = true;
	// Gated on the overlay being open, not on `fullyExpanded` — a dismissal
	// during the two entrance frames (Escape right after Enter) must still
	// pair the `open` cue with a `close`.
	playCue("close");
	fullyExpanded.value = false;
	const delay = reducedMotion ? 0 : TRANSITION_MS;
	setTimeout(() => {
		overlayVisible.value = false;
		closing = false;
		onCollapse();
		rect.value = null;
		previousFocus?.focus();
		previousFocus = null;
	}, delay);
}

function handleCardKeydown(e: KeyboardEvent) {
	if (e.key === "Enter" || e.key === " ") {
		e.preventDefault();
		handleExpand();
	}
}

function handleOverlayKeydown(e: KeyboardEvent) {
	if (e.key === "Escape") {
		handleCollapse();
		return;
	}
	// Simple focus trap: cycle focus within the dialog on Tab
	if (e.key === "Tab" && dialogEl.value) {
		const focusable = Array.from(
			dialogEl.value.querySelectorAll<HTMLElement>(
				'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		);
		if (focusable.length === 0) return;
		const first = focusable[0]!;
		const last = focusable[focusable.length - 1]!;
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}
}
</script>

<template>
	<!-- Collapsed card in the carousel -->
	<div
		ref="cardEl"
		:class="
			cn(
				'relative h-80 w-56 shrink-0 cursor-pointer snap-start overflow-hidden rounded-3xl md:h-96 md:w-72',
				className
			)
		"
		role="button"
		tabindex="0"
		:aria-label="`Open ${card.title}`"
		@click="handleExpand"
		@keydown="handleCardKeydown"
	>
		<img
			:src="card.src"
			:alt="card.title"
			class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 hover:scale-105"
			draggable="false"
		/>
		<div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
		<div class="absolute bottom-0 left-0 p-5">
			<p class="mb-1 text-xs font-semibold tracking-widest text-white/70 uppercase">
				{{ card.category }}
			</p>
			<h3 class="text-base font-semibold text-white md:text-lg">{{ card.title }}</h3>
		</div>
	</div>

	<!-- Expanded overlay -->
	<template v-if="overlayVisible && rect !== null">
		<div
			class="fixed inset-0 z-40 bg-black/80"
			aria-hidden="true"
			:style="backdropStyle"
			@click="handleCollapse"
		></div>

		<div
			ref="dialogEl"
			role="dialog"
			aria-modal="true"
			:aria-label="card.title"
			tabindex="-1"
			class="fixed z-50 overflow-y-auto bg-white dark:bg-neutral-900"
			:style="dialogStyle"
			@keydown="handleOverlayKeydown"
		>
			<!-- Close button -->
			<button
				ref="closeBtn"
				class="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/20 backdrop-blur-sm transition-colors hover:bg-black/30"
				aria-label="Close"
				@click="handleCollapse"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="white"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M18 6 6 18" />
					<path d="m6 6 12 12" />
				</svg>
			</button>

			<!-- Hero image -->
			<div class="relative h-72 w-full shrink-0 md:h-96">
				<img
					:src="card.src"
					:alt="card.title"
					class="h-full w-full object-cover"
					draggable="false"
				/>
				<div
					class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"
				></div>
				<div class="absolute bottom-0 left-0 p-6 md:p-8">
					<p class="mb-2 text-xs font-semibold tracking-widest text-white/70 uppercase">
						{{ card.category }}
					</p>
					<h2 class="text-2xl font-bold text-white md:text-3xl">{{ card.title }}</h2>
				</div>
			</div>

			<!-- Content area -->
			<div class="p-6 md:p-8">
				<component :is="card.content" v-if="card.content" />
				<p
					v-else-if="card.description"
					class="leading-relaxed text-gray-600 dark:text-neutral-400"
				>
					{{ card.description }}
				</p>
			</div>
		</div>
	</template>
</template>
