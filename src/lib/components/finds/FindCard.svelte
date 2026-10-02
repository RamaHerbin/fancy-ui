<!--
	One cell of the Finds grid: a mono head strip (ordinal, title, gesture), a
	4:3 stage — the live demo, the external media, or a typographic study
	card — and a foot strip that always shows the implementation clues (touch
	never hovers, and the reading is the point). The overlay with the why line,
	bookmark, ↗ link and tune button appears on hover and on focus-within; its
	centre stays pointer-transparent so hover demos keep receiving the cursor.
-->
<script lang="ts">
	import type { Find, PlaygroundValues } from "$lib/finds/types.js";
	import { GESTURE_LABELS } from "$lib/finds/types.js";
	import FindDemo from "./FindDemo.svelte";

	interface Props {
		find: Find;
		/** Two-digit ordinal in the current grid, e.g. "01". */
		index: string;
		values: PlaygroundValues;
		saved: boolean;
		onToggleSaved: (find: Find) => void;
		onTune?: (find: Find, trigger: HTMLButtonElement) => void;
		/** Mount the demo immediately (tests, previews). */
		eager?: boolean;
	}

	let { find, index, values, saved, onToggleSaved, onTune, eager = false }: Props = $props();

	let tuneButton = $state<HTMLButtonElement | null>(null);

	const isLive = $derived(find.kind === "live");
	const href = $derived(find.kind === "live" ? `/docs/components/${find.slug}` : find.source.url);
	const linkLabel = $derived(find.kind === "live" ? "Docs" : "Source");
	const canTune = $derived(find.kind === "live" && (find.knobs?.length ?? 0) > 0);
</script>

<article
	class="finds-card group relative flex min-w-0 flex-col"
	data-find={find.id}
	data-gesture={find.gesture}
>
	<div class="lp-panel-head">
		<span class="flex min-w-0 items-center px-3.5" style="color:var(--lp-grey-1)"
			><span class="truncate whitespace-nowrap">{index} — {find.title.toUpperCase()}</span></span
		>
		<span class="flex-1"></span>
		<span
			class="lp-line flex items-center border-l px-3 whitespace-nowrap"
			style="color:var(--lp-grey-3)"
			data-testid="gesture">{GESTURE_LABELS[find.gesture].toUpperCase()}</span
		>
	</div>

	<div
		class="finds-stage-wrap relative aspect-[4/3] overflow-hidden"
		style="background:var(--lp-panel)"
	>
		{#if find.kind === "live"}
			<FindDemo {find} {values} {eager} />
		{:else if find.media?.type === "video"}
			<!-- svelte-ignore a11y_media_has_caption -->
			<video
				class="absolute inset-0 h-full w-full object-cover"
				src={find.media.src}
				poster={find.media.poster}
				muted
				loop
				autoplay
				playsinline
				aria-label={find.media.alt}
			></video>
		{:else if find.media?.type === "image"}
			<img
				class="absolute inset-0 h-full w-full object-cover"
				src={find.media.src}
				alt={find.media.alt}
			/>
		{:else}
			<!-- Typographic study card: no media yet, the reading carries the card. -->
			<div class="finds-study absolute inset-0 flex flex-col justify-between p-5">
				<span class="lp-mono text-[10px] tracking-[0.18em]" style="color:var(--lp-grey-4)"
					>SEEN AT — {find.source.name.toUpperCase()}</span
				>
				<span class="finds-study-title">{find.title}</span>
				<span class="lp-mono text-[10px] tracking-[0.16em]" style="color:var(--lp-grey-4)"
					>{find.tags.slice(0, 3).join(" · ").toUpperCase()}</span
				>
			</div>
		{/if}

		<!-- Hover / focus overlay. The layer itself never takes the pointer. -->
		<div class="finds-overlay pointer-events-none absolute inset-0">
			<div class="finds-scrim absolute inset-x-0 bottom-0 h-[58%]"></div>

			<button
				type="button"
				class="finds-action pointer-events-auto absolute top-2.5 right-2.5"
				aria-pressed={saved}
				aria-label={saved ? `Remove ${find.title} from saved` : `Save ${find.title}`}
				onclick={() => onToggleSaved(find)}
			>
				<svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
					<path
						d="M6 3h12v18l-6-4.5L6 21z"
						fill={saved ? "currentColor" : "none"}
						stroke="currentColor"
						stroke-width="2"
						stroke-linejoin="round"
					/>
				</svg>
			</button>

			<div class="absolute right-2.5 bottom-2.5 left-2.5 flex items-end gap-2">
				<div class="flex min-w-0 flex-1 flex-col gap-2">
					<p class="finds-why">{find.why}</p>
					<span class="finds-pill lp-mono">
						<span class="truncate">{find.title}</span>
						<span style="color:var(--lp-grey-4)">· {GESTURE_LABELS[find.gesture]}</span>
					</span>
				</div>
				<div class="flex shrink-0 items-center gap-1.5">
					<a
						{href}
						class="finds-action lp-mono pointer-events-auto"
						target={isLive ? undefined : "_blank"}
						rel={isLive ? undefined : "noopener noreferrer"}
						aria-label="{linkLabel} for {find.title}">{linkLabel} ↗</a
					>
					{#if canTune}
						<button
							type="button"
							bind:this={tuneButton}
							class="finds-action pointer-events-auto"
							aria-label="Tune {find.title}"
							onclick={() => tuneButton && onTune?.(find, tuneButton)}
						>
							<svg
								width="13"
								height="13"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								aria-hidden="true"
							>
								<path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
								<circle cx="16" cy="7" r="2.5" />
								<circle cx="10" cy="17" r="2.5" />
							</svg>
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<div class="lp-panel-foot finds-foot">
		<span class="truncate" title={find.clues.join(" · ")}
			>{find.clues.join(" · ").toUpperCase()}</span
		>
	</div>
</article>

<style>
	.finds-card {
		background: var(--lp-bg);
	}

	.finds-overlay {
		opacity: 0;
		transition: opacity 0.25s ease;
	}

	.finds-card:hover .finds-overlay,
	.finds-card:focus-within .finds-overlay {
		opacity: 1;
	}

	/* Keyboard users see the overlay the moment any control has focus; the
	   demo's own controls (a button inside the stage) count too, which is fine:
	   the overlay never blocks them. */
	@media (hover: none) {
		.finds-overlay {
			opacity: 1;
		}
	}

	.finds-scrim {
		background: linear-gradient(to top, rgba(6, 6, 6, 0.92), rgba(6, 6, 6, 0.55) 55%, transparent);
	}

	.finds-why {
		margin: 0;
		font-size: 12.5px;
		line-height: 1.4;
		color: var(--lp-grey-1);
		text-wrap: pretty;
	}

	.finds-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		max-width: 100%;
		padding: 5px 9px;
		border: 1px solid var(--lp-line-strong);
		border-radius: 2px;
		background: rgba(8, 8, 8, 0.85);
		font-size: 10.5px;
		letter-spacing: 0.08em;
		color: var(--lp-ink);
		white-space: nowrap;
	}

	.finds-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 4px;
		min-width: 28px;
		height: 28px;
		padding: 0 8px;
		border: 1px solid var(--lp-line-strong);
		border-radius: 2px;
		background: rgba(8, 8, 8, 0.85);
		font-size: 10.5px;
		letter-spacing: 0.1em;
		color: var(--lp-grey-2);
		cursor: pointer;
		transition:
			color 0.15s ease,
			border-color 0.15s ease;
	}

	.finds-action:hover,
	.finds-action:focus-visible {
		color: var(--lp-ink);
		border-color: var(--lp-accent);
		outline: none;
	}

	.finds-action[aria-pressed="true"] {
		color: var(--lp-ink);
		border-color: var(--lp-accent);
	}

	.finds-foot {
		padding-right: 12px;
		overflow: hidden;
	}

	.finds-study-title {
		font-family: var(--lp-font-serif);
		font-style: italic;
		font-size: clamp(24px, 3vw, 32px);
		line-height: 1.05;
		letter-spacing: -0.01em;
		color: var(--lp-ink);
		text-wrap: balance;
	}
</style>
