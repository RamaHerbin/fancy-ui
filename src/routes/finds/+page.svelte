<script lang="ts">
	import { browser } from "$app/environment";
	import { page } from "$app/state";
	import { replaceState } from "$app/navigation";
	import LandingHeader from "$lib/components/landing/LandingHeader.svelte";
	import LandingFonts from "$lib/components/landing/LandingFonts.svelte";
	import FooterCta from "$lib/components/landing/FooterCta.svelte";
	import CommandSearch from "$lib/components/docs/CommandSearch.svelte";
	import Seo from "$lib/components/Seo.svelte";
	import FindsHeader from "$lib/components/finds/FindsHeader.svelte";
	import FindCard from "$lib/components/finds/FindCard.svelte";
	import TunePanel from "$lib/components/finds/TunePanel.svelte";
	import EmptyState from "$lib/components/finds/EmptyState.svelte";
	import { FINDS, filterFinds, gesturesWithCounts } from "$lib/finds/finds.js";
	import type { Find, Gesture, LiveFind, PlaygroundValues } from "$lib/finds/types.js";
	import { createSavedState } from "$lib/stores";
	import "$lib/components/landing/landing.css";

	const savedState = createSavedState();
	const gestures = gesturesWithCounts();

	let searchOpen = $state(false);
	let gesture = $state<Gesture | "all">("all");
	let query = $state("");

	/* The Saved view lives in the URL (?view=saved) so it can be linked and
	   survives a reload. Shallow routing keeps the prerendered page, but
	   `page.url` does not follow replaceState, so the view is local state
	   seeded from the URL and re-read whenever a real navigation lands. The
	   seed is browser-only: a prerendered route may not read searchParams. */
	const viewFromUrl = (url: URL): "all" | "saved" =>
		url.searchParams.get("view") === "saved" ? "saved" : "all";
	let view = $state<"all" | "saved">(browser ? viewFromUrl(page.url) : "all");
	$effect(() => {
		view = viewFromUrl(page.url);
	});

	function setView(next: "all" | "saved") {
		view = next;
		const url = new URL(page.url);
		if (next === "saved") url.searchParams.set("view", "saved");
		else url.searchParams.delete("view");
		replaceState(url, {});
	}

	const visible = $derived.by(() =>
		filterFinds({ gesture, query, ids: view === "saved" ? savedState.ids : undefined })
	);

	/* Tune state: per-find overrides, created the first time a card is tuned. */
	let tuned = $state<Record<string, PlaygroundValues>>({});
	let activeTune = $state<LiveFind | null>(null);
	let tuneOpen = $state(false);
	let tuneTrigger = $state<HTMLElement | null>(null);

	function valuesFor(find: Find): PlaygroundValues {
		if (find.kind !== "live") return {};
		return tuned[find.id] ?? find.defaults ?? {};
	}

	function openTune(find: Find, trigger: HTMLButtonElement) {
		if (find.kind !== "live") return;
		tuned[find.id] ??= { ...(find.defaults ?? {}) };
		activeTune = find;
		tuneTrigger = trigger;
		tuneOpen = true;
	}

	function changeKnob(key: string, value: string | number | boolean) {
		if (!activeTune) return;
		tuned[activeTune.id] = { ...tuned[activeTune.id], [key]: value };
	}

	function resetKnobs() {
		if (!activeTune) return;
		tuned[activeTune.id] = { ...(activeTune.defaults ?? {}) };
	}

	const ordinal = (index: number) => String(index + 1).padStart(2, "0");
</script>

<Seo
	title="Finds — UI interactions worth studying | FancyUI"
	description="A curated gallery of UI interactions: live specimens from the library you can retune in place, and references from elsewhere, each with one line on what to observe and the clues to build it."
	path="/finds"
/>
<LandingFonts />

<div class="lp-root dark">
	<div class="p-3.5">
		<div class="lp-line mx-auto flex max-w-[1536px] flex-col border">
			<LandingHeader onSearchClick={() => (searchOpen = true)} />
			<main class="flex min-h-0 flex-1 flex-col">
				<FindsHeader
					{gestures}
					total={FINDS.length}
					{gesture}
					{query}
					{view}
					savedCount={savedState.count}
					onGesture={(next) => (gesture = next)}
					onQuery={(next) => (query = next)}
					onView={setView}
				/>

				{#if visible.length === 0}
					<EmptyState {view} />
				{:else}
					<div class="overflow-hidden">
						<div class="finds-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{#each visible as find, index (find.id)}
								<FindCard
									{find}
									index={ordinal(index)}
									values={valuesFor(find)}
									saved={savedState.isSaved(find.id)}
									onToggleSaved={(entry) => savedState.toggleSaved(entry.id)}
									onTune={openTune}
								/>
							{/each}
						</div>
					</div>
				{/if}

				<div
					class="lp-line flex h-9 flex-none items-center justify-between border-t px-6 sm:px-[46px]"
				>
					<span class="lp-mono text-[10.5px] tracking-[0.16em]" style="color:var(--lp-grey-4)"
						>{visible.length} OF {FINDS.length} FINDS</span
					>
					<span class="lp-mono text-[10.5px] tracking-[0.16em]" style="color:var(--lp-grey-5)"
						>HOVER A CARD — PRESS THE BOOKMARK TO SAVE</span
					>
				</div>
			</main>
		</div>
	</div>
	<FooterCta />

	<TunePanel
		find={activeTune}
		values={activeTune ? valuesFor(activeTune) : {}}
		open={tuneOpen}
		returnTo={tuneTrigger}
		onchange={changeKnob}
		onreset={resetKnobs}
		onclose={() => (tuneOpen = false)}
	/>
</div>

<CommandSearch bind:open={searchOpen} />

<style>
	/* Every cell draws its own right and bottom hairline; the wrapper clips the
	   doubled edge against the frame, so the grid stays clean whatever the
	   count or the breakpoint, and an incomplete last row shows no filler. */
	.finds-grid {
		margin-right: -1px;
		margin-bottom: -1px;
	}

	.finds-grid > :global(.finds-card) {
		border-right: 1px solid var(--lp-line);
		border-bottom: 1px solid var(--lp-line);
	}
</style>
