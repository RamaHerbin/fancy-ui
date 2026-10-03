<!--
	CompositionFrame — a product screen assembled from library components. The
	stage keeps its size before the screen mounts (near the viewport, through
	`inView`), so the page never shifts; below it, the components it is built
	from, each a link to its docs.
-->
<script lang="ts">
	import { onMount, type Snippet } from "svelte";
	import { RimLight } from "$lib/components/site/materials/index.js";
	import { inView } from "$lib/fancy-ui/_internals/motion/in-view.js";
	import { createFrameworkState } from "$lib/stores/framework.svelte.js";
	import { FRAMEWORK_LABELS, type Framework } from "$lib/inspiration/types.js";

	interface Props {
		title: string;
		description: string;
		/** Library components used, first one is the "View docs" target. */
		parts: { slug: string; name: string }[];
		seed?: number;
		paused?: boolean;
		children: Snippet;
	}

	let { title, description, parts, seed = 0, paused = false, children }: Props = $props();

	const store = createFrameworkState();
	let mounted = $state(false);
	onMount(() => (mounted = true));
	const framework = $derived<Framework>(mounted ? store.framework : "svelte");

	let visible = $state(false);
	let active = $state(false);
	const uid = $props.id();
</script>

<article class="comp" aria-labelledby="comp-{uid}">
	<div
		class="stage"
		use:inView={{ rootMargin: "240px", onChange: (v) => v && (visible = true) }}
		onpointerenter={() => (active = true)}
		onpointerleave={() => (active = false)}
		onfocusin={() => (active = true)}
		onfocusout={(e) => {
			if (!e.currentTarget.contains(e.relatedTarget as Node | null)) active = false;
		}}
	>
		{#if visible}
			{@render children()}
		{/if}
		<RimLight tier="card" {seed} {active} {paused} />
	</div>
	<div class="meta">
		<div class="head">
			<h3 id="comp-{uid}">{title}</h3>
			<a href="/docs/components/{parts[0].slug}" class="code"
				>View {FRAMEWORK_LABELS[framework]} docs <span aria-hidden="true">→</span></a
			>
		</div>
		<p class="desc">{description}</p>
		<ul class="chips" aria-label="Built from">
			<li class="fx-mono label" aria-hidden="true">Built from</li>
			{#each parts as part (part.slug + part.name)}
				<li><a href="/docs/components/{part.slug}" class="fx-mono">{part.name}</a></li>
			{/each}
		</ul>
	</div>
</article>

<style>
	.comp {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.stage {
		position: relative;
		height: 420px;
		padding: 20px;
		border-radius: 16px;
		background:
			radial-gradient(120% 80% at 50% 0%, rgb(255 255 255 / 0.03), transparent 60%), var(--fx-card);
		box-shadow: inset 0 0 0 1px var(--fx-hairline);
		overflow: hidden;
	}

	.meta {
		padding: 14px 4px 0;
	}

	.head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 16px;
	}

	h3 {
		font-size: 15px;
		line-height: 20px;
		font-weight: 600;
	}

	.code {
		flex: none;
		font-size: 13px;
		color: var(--fx-ink-2);
		transition: color 180ms var(--fx-ease);
	}

	.code:hover {
		color: var(--fx-ink);
	}

	.desc {
		margin-top: 2px;
		font-size: 13px;
		line-height: 18px;
		color: var(--fx-ink-3);
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		margin-top: 12px;
	}

	.label {
		margin-right: 4px;
		font-size: 10.5px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--fx-ink-3);
	}

	.chips a {
		display: inline-flex;
		align-items: center;
		height: 22px;
		padding: 0 8px;
		border-radius: 6px;
		font-size: 11px;
		color: var(--fx-ink-2);
		box-shadow: inset 0 0 0 1px var(--fx-hairline);
		transition: color 180ms var(--fx-ease);
	}

	.chips a:hover {
		color: var(--fx-ink);
		box-shadow: inset 0 0 0 1px var(--fx-hairline-strong);
	}

	@media (max-width: 700px) {
		.stage {
			height: 380px;
			padding: 12px;
		}
		.head {
			flex-direction: column;
			gap: 2px;
		}
	}
</style>
