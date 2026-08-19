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
	}
</script>

<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { cn } from "$lib/utils.js";
	import { portal } from "../_internals/portal.js";
	import { toastStore, clearAllToastTimers, rearmToastTimers } from "./store.svelte.js";
	import type { ToastItem } from "./store.svelte.js";
	import Toast from "./Toast.svelte";

	let {
		position = "bottom-right",
		class: className,
		ref = $bindable(null),
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
		for (const item of current) {
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
