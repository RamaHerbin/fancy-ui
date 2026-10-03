<!--
	A reference in the grid. One link (the title, stretched over the card via
	`::after`); the save and play buttons are its siblings, raised above it, so
	nothing interactive is nested in the link.

	FancyUI references can go live: hovering or focusing the card claims the
	page's single live stage after a short delay, and Play claims it outright.
	Under paused motion, or for `mount: "intent"` demos (WebGL, canvas), only
	Play does.

	The saved state comes from localStorage, so the pressed look is applied
	after mount — the prerendered markup is always "not saved".
-->
<script lang="ts">
	import { onMount } from "svelte";
	import { RimLight } from "$lib/components/site/materials/index.js";
	import { createMotionState } from "$lib/stores/motion.svelte.js";
	import { FRAMEWORK_LABELS, type Framework, type Reference } from "$lib/inspiration/types.js";
	import InspirationStage from "./InspirationStage.svelte";
	import Poster from "./Poster.svelte";
	import { liveStage } from "./live-stage.svelte.js";
	import { BADGE_ORDER, cardTags, originBadge } from "./labels.js";

	interface Props {
		entry: Reference;
		/** Position in the grid: seeds the rim light. */
		index: number;
		poster: { src: string; width: number; height: number; alt: string } | null;
		/** Frameworks to light among R S V. */
		frameworks: Framework[];
		saved: boolean;
		onToggleSaved: (entry: Reference) => void;
		/** False in "Related" rows: posters only, no live stage. */
		allowLive?: boolean;
		/** Poster loads eagerly (first row). */
		eager?: boolean;
	}

	let {
		entry,
		index,
		poster,
		frameworks,
		saved,
		onToggleSaved,
		allowLive = true,
		eager = false,
	}: Props = $props();

	const CLAIM_DELAY_MS = 150;

	const motion = createMotionState();
	let mounted = $state(false);
	onMount(() => (mounted = true));

	const pressed = $derived(mounted && saved);
	const live = $derived(allowLive && entry.origin === "fancyui" ? entry : null);
	const playing = $derived(live !== null && liveStage.active === entry.slug);
	const autoClaim = $derived(live !== null && !motion.paused && live.demo.mount !== "intent");

	let hover = $state(false);
	let angle = $state<number | undefined>(undefined);
	let claimTimer: ReturnType<typeof setTimeout> | undefined;

	// Stopped (Escape, Stop, tab hidden) while the pointer is still here: no
	// auto-claim until it leaves. Chrome re-fires pointerenter when the demo
	// node under the pointer is removed, which would restart it at once.
	let dismissed = false;
	let wasPlaying = false;
	$effect(() => {
		if (wasPlaying && !playing && hover) dismissed = true;
		wasPlaying = playing;
	});

	function scheduleClaim() {
		if (!autoClaim || claimTimer || dismissed) return;
		claimTimer = setTimeout(() => {
			claimTimer = undefined;
			liveStage.claim(entry.slug);
		}, CLAIM_DELAY_MS);
	}

	function cancelClaim() {
		clearTimeout(claimTimer);
		claimTimer = undefined;
	}

	$effect(() => cancelClaim);

	function pointerAngle(event: PointerEvent): number {
		const r = (event.currentTarget as HTMLElement).getBoundingClientRect();
		const dx = event.clientX - (r.left + r.width / 2);
		const dy = event.clientY - (r.top + r.height / 2);
		return (Math.atan2(dx, -dy) * 180) / Math.PI;
	}

	function togglePlay(event: MouseEvent) {
		event.stopPropagation();
		cancelClaim();
		if (playing) liveStage.release(entry.slug);
		else liveStage.claim(entry.slug);
	}

	function toggleSaved(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		onToggleSaved(entry);
	}

	const byline = $derived([entry.creator, entry.product].filter(Boolean).join(" · "));
	const available = $derived(BADGE_ORDER.filter((fw) => frameworks.includes(fw)));
	const tags = $derived(cardTags(entry));
</script>

<article
	class="ic"
	data-slug={entry.slug}
	data-styles={entry.styleTags.join(" ")}
	data-saved={pressed || undefined}
	onpointerenter={(e) => {
		hover = true;
		angle = pointerAngle(e);
		scheduleClaim();
	}}
	onpointermove={(e) => (angle = pointerAngle(e))}
	onpointerleave={() => {
		hover = false;
		dismissed = false;
		cancelClaim();
	}}
	onfocusin={() => {
		hover = true;
		scheduleClaim();
	}}
	onfocusout={(e) => {
		if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
			hover = false;
			dismissed = false;
			cancelClaim();
		}
	}}
>
	<div class="stage">
		<Poster {poster} decorative {eager} />
		{#if live}
			<InspirationStage entry={live} />
		{/if}
		<span class="origin fx-mono">{originBadge(entry)}</span>
		<button
			type="button"
			class="save"
			aria-pressed={pressed}
			aria-label="Save {entry.title}"
			onclick={toggleSaved}
		>
			<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
				<path
					d="M4 2.5h8v11l-4-2.8-4 2.8z"
					fill={pressed ? "currentColor" : "none"}
					stroke="currentColor"
					stroke-width="1.4"
					stroke-linejoin="round"
				/>
			</svg>
		</button>
		{#if live}
			<button
				type="button"
				class="play"
				aria-pressed={playing}
				aria-label="Preview {entry.title}"
				onclick={togglePlay}
			>
				{#if playing}
					<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
						<rect x="4" y="4" width="8" height="8" rx="1.2" fill="currentColor" />
					</svg>
				{:else}
					<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
						<path d="M5 3.2v9.6L12.6 8z" fill="currentColor" />
					</svg>
				{/if}
			</button>
		{/if}
	</div>

	<div class="meta">
		<h3><a href="/inspiration/{entry.slug}" class="stretched">{entry.title}</a></h3>
		{#if byline}<p class="byline">{byline}</p>{/if}
		<div class="badges">
			<span class="fws fx-mono">
				{#each BADGE_ORDER as fw (fw)}
					<span aria-hidden="true" data-on={frameworks.includes(fw) || undefined}
						>{FRAMEWORK_LABELS[fw][0]}</span
					>
				{/each}
				{#if available.length}
					<span class="sr-only"
						>Available for {available.map((fw) => FRAMEWORK_LABELS[fw]).join(", ")}</span
					>
				{/if}
			</span>
			{#if tags.length}
				<span class="tags">
					{#each tags as tag (tag)}<span>#{tag}</span>{/each}
				</span>
			{/if}
		</div>
	</div>

	{#if pressed}
		<RimLight tier="selected" seed={index} />
	{:else}
		<RimLight tier="card" seed={index} active={hover} {angle} />
	{/if}
</article>

<style>
	.ic {
		position: relative;
		display: flex;
		flex-direction: column;
		min-width: 0;
		padding: 8px;
		border-radius: 16px;
		background: var(--fx-card);
		box-shadow: inset 0 0 0 1px var(--fx-hairline);
		transition: background-color 200ms var(--fx-ease);
	}

	.ic:hover,
	.ic:focus-within {
		background: var(--fx-card-raised);
	}

	.stage {
		position: relative;
		border-radius: 12px;
		overflow: hidden;
		aspect-ratio: 16 / 10;
		background: var(--fx-canvas);
		/* No stacking context here: the buttons must stack against the
		   stretched link's ::after. The live layer (z-index 2) forms its own,
		   so nothing a demo draws can climb over them. */
	}

	.origin {
		position: absolute;
		top: 10px;
		left: 10px;
		z-index: 3;
		display: inline-flex;
		align-items: center;
		height: 20px;
		padding: 0 7px;
		border-radius: 6px;
		font-size: 10px;
		letter-spacing: 0.12em;
		color: var(--fx-ink);
		background: rgb(9 9 11 / 0.6);
		box-shadow: inset 0 0 0 1px rgb(242 241 236 / 0.35);
		backdrop-filter: blur(8px);
		pointer-events: none;
	}

	.save,
	.play {
		position: absolute;
		z-index: 3;
		display: grid;
		place-items: center;
		border-radius: 999px;
		color: var(--fx-ink);
		background: rgb(9 9 11 / 0.55);
		box-shadow: inset 0 0 0 1px var(--fx-hairline-strong);
		backdrop-filter: blur(8px);
		cursor: pointer;
		transition:
			opacity 180ms var(--fx-ease),
			background-color 180ms var(--fx-ease);
	}

	.save:hover,
	.play:hover {
		background: rgb(9 9 11 / 0.8);
	}

	.save {
		top: 8px;
		right: 8px;
		width: 32px;
		height: 32px;
		opacity: 0;
	}

	.play {
		right: 10px;
		bottom: 10px;
		width: 40px;
		height: 40px;
		opacity: 0;
	}

	.ic:hover .save,
	.ic:focus-within .save,
	.save[aria-pressed="true"],
	.ic:hover .play,
	.ic:focus-within .play,
	.play[aria-pressed="true"] {
		opacity: 1;
	}

	@media (hover: none) {
		.save,
		.play {
			opacity: 1;
		}
	}

	.meta {
		display: flex;
		flex-direction: column;
		flex: 1;
		padding: 12px 6px 4px;
	}

	h3 {
		font-size: 15px;
		line-height: 20px;
		font-weight: 600;
		letter-spacing: -0.005em;
	}

	.stretched::after {
		content: "";
		position: absolute;
		inset: 0;
		z-index: 1;
		border-radius: 16px;
	}

	.stretched:focus-visible {
		outline: none;
	}

	.ic:has(.stretched:focus-visible) {
		outline: 1px solid var(--fx-ink);
		outline-offset: 2px;
	}

	.byline {
		margin-top: 2px;
		font-size: 13px;
		line-height: 18px;
		color: var(--fx-ink-3);
	}

	.badges {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: auto;
		padding-top: 10px;
	}

	.fws {
		display: flex;
		gap: 4px;
	}

	.fws > span[aria-hidden] {
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		border-radius: 5px;
		font-size: 10px;
		color: var(--fx-ink-3);
		box-shadow: inset 0 0 0 1px rgb(242 241 236 / 0.06);
	}

	/* Off stays legible (ink-3); on is set apart by full ink and a stronger edge. */
	.fws > span[data-on] {
		color: var(--fx-ink);
		box-shadow: inset 0 0 0 1px var(--fx-hairline-strong);
	}

	.tags {
		display: flex;
		gap: 10px;
		min-width: 0;
		font-size: 12px;
		color: var(--fx-ink-3);
		white-space: nowrap;
	}

	/* Touch: the 32 px save button keeps its look but gets a 44 px hit area. */
	@media (pointer: coarse) {
		.save::before {
			content: "";
			position: absolute;
			inset: -6px;
		}
	}
</style>
