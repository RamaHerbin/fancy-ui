<script lang="ts" module>
	export type ToasterPosition =
		| "top-left"
		| "top-center"
		| "top-right"
		| "bottom-left"
		| "bottom-center"
		| "bottom-right";

	export interface ToasterProps {
		/** Corner (or edge-center) the stack anchors to. Defaults to `"bottom-right"`. */
		position?: ToasterPosition;
		/** Additional classes for the viewport that stacks the toasts. */
		class?: string;
		/** Element reference for the root node. */
		ref?: HTMLDivElement | null;
		/**
		 * Plays the `success`/`error` cue through the sound controller when a
		 * toast of that variant appears. Off by default; only audible once the
		 * user has enabled sound.
		 */
		sound?: boolean;
	}

	// Ids already sounded, kept at *module* scope — unlike `announcedIds`
	// below, which is per-instance and thrown away the moment a `<Toaster>`
	// unmounts, while `toastStore.items` (a module-level singleton) survives
	// that unmount untouched. Without this, a remount while a success/error
	// toast is still on screen replays its cue: the announce effect reruns on
	// the fresh instance with an empty `announcedIds`, so a toast that has
	// already sounded once looks unseen to the sound check too. The live
	// region legitimately wants a fresh instance to re-announce (a screen
	// reader is not attached to the old, destroyed region), so this is
	// checked separately rather than folded into `announcedIds`. Pruned to
	// the current stack on every effect run, same bounding `announcedIds`
	// already does, so this never grows for the life of the page — ids are
	// monotonic and never reused (see `store.svelte.ts`'s `toast()`).
	const soundedIds = new Set<string>();
</script>

<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { cn } from "$lib/utils.js";
	import { portal } from "../_internals/portal.js";
	import { toastStore, clearAllToastTimers, rearmToastTimers } from "./store.svelte.js";
	import type { ToastItem } from "./store.svelte.js";
	import Toast from "./Toast.svelte";
	import { sound as soundFx } from "../sound/sound.svelte.js";

	let {
		position = "bottom-right",
		class: className,
		ref = $bindable(null),
		sound = false,
	}: ToasterProps = $props();

	// Two regions, mounted empty and never re-created — only their *content*
	// changes. A live region created at the moment of the announcement is not
	// reliably picked up by screen readers; existing from mount and being
	// updated in place is what makes the announcement land. Two of them, not
	// one, because politeness is fixed per region: `polite` must never be
	// upgraded to `assertive` (or the reverse) by mutating the same element's
	// aria-live attribute, which most screen readers do not pick up reliably
	// after the region already exists.
	let politeAnnouncement = $state("");
	let assertiveAnnouncement = $state("");

	// Ids already announced, refreshed to exactly the current stack on every
	// run — bounded to "currently visible", rather than growing forever for
	// the life of the page.
	let announcedIds = new Set<string>();

	function announcementText(item: ToastItem): string {
		return item.description ? `${item.title}. ${item.description}` : item.title;
	}

	$effect(() => {
		const current = toastStore.items;

		// Forget any sounded id that has left the stack (dismissed, auto-
		// dismissed, or evicted past `MAX_VISIBLE`) — bounds `soundedIds` to
		// "currently visible", same as `announcedIds` below, instead of
		// growing forever for the life of the page.
		const currentIds = new Set(current.map((item) => item.id));
		for (const id of soundedIds) {
			if (!currentIds.has(id)) soundedIds.delete(id);
		}

		for (const item of current) {
			// Only success/error toasts get a cue — info and loading stay silent.
			// `sound` lives on `<Toaster>`, never on `toast()`'s own options: the
			// caller who raises the toast has no per-call say over whether it
			// plays. Gated on the module-level `soundedIds`, not the
			// per-instance `announcedIds`, so a remount can't replay a cue for a
			// toast that already got one.
			// The ID is recorded whether or not sound is currently opted in:
			// the cue marks a toast APPEARING, so flipping `sound` on later
			// must not retroactively replay outcomes already on screen.
			if (item.variant === "success" || item.variant === "error") {
				if (sound && !soundedIds.has(item.id)) {
					soundFx.play(item.variant);
				}
				soundedIds.add(item.id);
			}
			if (announcedIds.has(item.id)) continue;
			if (item.variant === "error") {
				assertiveAnnouncement = announcementText(item);
			} else {
				politeAnnouncement = announcementText(item);
			}
		}
		announcedIds = new Set(current.map((item) => item.id));
	});

	// The other half of `onDestroy` below: a toast that was already ticking
	// down when the *previous* `<Toaster>` unmounted has a real deadline but
	// no live timer counting toward it (that timer was cleared, deliberately
	// — see `clearAllToastTimers`). Re-arming on mount is what stops such a
	// toast from being stuck on screen forever with nothing left to dismiss
	// it — `onMount` rather than a bare call in the script body so this only
	// ever runs in the browser, never during SSR.
	onMount(() => {
		rearmToastTimers();
	});

	// Stops the live timers, not the toasts or their deadlines — see
	// `clearAllToastTimers`'s own doc comment for why unmounting isn't
	// treated as pausing.
	onDestroy(() => {
		clearAllToastTimers();
	});

	const POSITION_CLASSES: Record<ToasterPosition, string> = {
		"top-left": "top-4 left-4 items-start",
		"top-center": "top-4 left-1/2 -translate-x-1/2 items-center",
		"top-right": "top-4 right-4 items-end",
		"bottom-left": "bottom-4 left-4 items-start",
		"bottom-center": "bottom-4 left-1/2 -translate-x-1/2 items-center",
		"bottom-right": "bottom-4 right-4 items-end",
	};
</script>

<div bind:this={ref} class={cn("ft-toaster contents", className)} use:portal>
	<div aria-live="polite" aria-atomic="true" class="sr-only">{politeAnnouncement}</div>
	<div aria-live="assertive" aria-atomic="true" class="sr-only">{assertiveAnnouncement}</div>

	<div
		class={cn(
			"ft-toaster-viewport pointer-events-none fixed z-50 flex flex-col gap-2",
			POSITION_CLASSES[position]
		)}
	>
		{#each toastStore.items as item (item.id)}
			<div class="pointer-events-auto">
				<Toast {item} />
			</div>
		{/each}
	</div>
</div>
