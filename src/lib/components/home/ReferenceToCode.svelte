<!--
	ReferenceToCode — how an entry goes from something seen to something
	installed, in three steps. One beam laps the strip: the only moving light
	in the section (parked under reduced motion by the component itself, and
	frozen with the site's motion switch through `data-decorative`). No glow:
	the hero panel keeps the page's only halo.
-->
<script lang="ts">
	import { BorderBeam } from "$lib/fancy-ui/border-beam/index.js";

	const STEPS = [
		{
			n: "01",
			title: "Reference",
			body: "An interaction worth keeping, captured with who made it and where it lives.",
		},
		{
			n: "02",
			title: "Analysis",
			body: "Why it works, when it earns its place, and what to watch on touch and motion.",
		},
		{
			n: "03",
			title: "Implementation",
			body: "The closest component, with its import line for React, Svelte, or Vue.",
		},
	];
</script>

<div class="strip">
	<ol>
		{#each STEPS as step (step.n)}
			<li>
				<span class="n fx-mono">{step.n}</span>
				<h3>{step.title}</h3>
				<p>{step.body}</p>
			</li>
		{/each}
	</ol>
	<div class="beam" data-decorative>
		<BorderBeam
			duration={18}
			size={160}
			borderWidth={1}
			colorFrom="#22d3ee"
			colorTo="#8b5cf6"
			tail={0.2}
			glow={0}
			anchor={8}
		/>
	</div>
</div>

<style>
	.strip {
		position: relative;
		border-radius: 16px;
		background: var(--fx-card);
		box-shadow: inset 0 0 0 1px var(--fx-hairline);
		--border-beam-radius: 16px;
	}

	ol {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	li {
		position: relative;
		padding: 28px 28px 32px;
	}

	li + li {
		box-shadow: inset 1px 0 0 var(--fx-hairline);
	}

	.n {
		font-size: 11px;
		letter-spacing: 0.16em;
		color: var(--fx-ink-3);
	}

	h3 {
		margin-top: 40px;
		font-size: 20px;
		line-height: 1.2;
		font-weight: 650;
		letter-spacing: -0.02em;
	}

	p {
		margin-top: 8px;
		max-width: 340px;
		font-size: 15px;
		line-height: 1.5;
		color: var(--fx-ink-2);
	}

	.beam {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
	}

	:global(html[data-motion="paused"]) .beam :global(*) {
		animation-play-state: paused !important;
	}

	@media (max-width: 700px) {
		ol {
			grid-template-columns: minmax(0, 1fr);
		}
		li {
			padding: 20px 20px 22px 20px;
		}
		li + li {
			box-shadow: inset 0 1px 0 var(--fx-hairline);
		}
		h3 {
			margin-top: 14px;
			font-size: 18px;
		}
	}
</style>
