<!--
	HomeHero — the first screen: the promise, the framework choice, the two
	ways in, and the glass search panel (the only surface on the page with an
	outer halo).
-->
<script lang="ts">
	import { Button } from "$lib/fancy-ui/button/index.js";
	import {
		GlassPanel,
		IridescentText,
		RimLight,
		SearchGlow,
	} from "$lib/components/site/materials/index.js";
	import { FrameworkSwitch } from "$lib/components/site/index.js";
	import { PACKAGE_VERSION } from "$lib/site.js";

	interface Props {
		/** Library component count, from the page data. */
		components: number;
		/** Freeze the decorative loops. */
		paused?: boolean;
	}

	let { components, paused = false }: Props = $props();

	const NEEDS = [
		"A button that answers the press",
		"A thinking state for a chat reply",
		"An edge that catches the light",
		"A card that tilts toward the pointer",
	];

	let heading: HTMLElement | undefined = $state();
</script>

<div class="hero-band">
	<section class="hero" bind:this={heading} aria-labelledby="home-title">
		<div class="copy">
			<p class="eyebrow fx-mono">
				<span class="eyebrow-mark">FANCY UI</span> / v{PACKAGE_VERSION}
			</p>
			<h1 id="home-title">
				Interfaces <br />that <IridescentText {paused} follow={heading}
					>feel <br /><span class="serif">alive.</span></IridescentText
				>
			</h1>
			<p class="lede">UI inspiration and expressive components for React, Svelte, and Vue.</p>
			<FrameworkSwitch class="chips" />
			<div class="ctas">
				<span class="cta-rim">
					<Button
						href="/inspiration"
						size="lg"
						class="bg-[var(--fx-ink)] text-[var(--fx-canvas)] hover:bg-white"
					>
						Explore inspiration <span aria-hidden="true">→</span>
					</Button>
					<RimLight tier="cta" seed={3} {paused} />
				</span>
				<Button href="/docs/components" variant="outline" size="lg">Browse components</Button>
			</div>
		</div>

		<GlassPanel class="panel" seed={1} {paused}>
			<div class="panel-body">
				<SearchGlow seed={2} />
				<ul class="suggestions">
					{#each NEEDS as phrase (phrase)}
						<li>
							<a href="/inspiration?q={encodeURIComponent(phrase)}">
								<span class="fx-mono glyph" aria-hidden="true">↳</span>
								{phrase}
							</a>
						</li>
					{/each}
				</ul>
				<p class="caption fx-mono">
					<kbd>⌘K</kbd> · {components} components · React · Svelte · Vue
				</p>
			</div>
		</GlassPanel>
	</section>
</div>

<style>
	/* Full-bleed band that clips the glow field: the lens and ring may not reach
	   the header or the cards. */
	.hero-band {
		overflow: clip;
		margin-inline: calc(50% - 50vw);
		padding-inline: calc(50vw - 50%);
	}

	.hero {
		display: grid;
		grid-template-columns: 620px 560px;
		justify-content: space-between;
		align-items: center;
		min-height: 440px;
		padding: 20px 0 22px;
	}

	.eyebrow {
		font-size: 11.5px;
		letter-spacing: 0.18em;
		color: var(--fx-ink-2);
	}

	.eyebrow-mark {
		padding-bottom: 7px;
		border-bottom: 2px solid var(--fx-ink);
	}

	h1 {
		margin-top: 20px;
		font-size: 76px;
		line-height: 0.94;
		font-weight: 750;
		letter-spacing: -0.035em;
	}

	.serif {
		font-family: var(--fx-font-serif);
		font-style: italic;
		font-weight: 400;
		font-size: 1.1em;
		letter-spacing: -0.01em;
	}

	.lede {
		margin-top: 18px;
		max-width: 400px;
		font-size: 16px;
		line-height: 1.5;
		color: var(--fx-ink-2);
	}

	.copy :global(.chips) {
		margin-top: 16px;
	}

	.ctas {
		display: flex;
		flex-wrap: wrap;
		gap: 14px;
		margin-top: 20px;
	}

	.cta-rim {
		position: relative;
		display: inline-flex;
		border-radius: 10px;
	}

	/* Bottom-aligned, a little into the padding: the glow field fades out
	   90 px above the panel, and the band clips it, so the panel's top sits
	   at least 114 px below the band's top (fade + 24) while the hero stays
	   short enough for the first row of titles to show at 1440×900. */
	.hero :global(.panel) {
		align-self: end;
		width: 560px;
		height: 352px;
		margin-bottom: -10px;
	}

	.panel-body {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: 24px 24px 18px;
	}

	.suggestions {
		margin-top: 16px;
	}

	.suggestions a {
		display: flex;
		align-items: center;
		gap: 12px;
		height: 36px;
		padding: 0 12px;
		border-radius: 8px;
		font-size: 14px;
		color: var(--fx-ink-2);
		transition:
			color 180ms var(--fx-ease),
			background-color 180ms var(--fx-ease);
	}

	.suggestions a:hover {
		color: var(--fx-ink);
		background: rgb(255 255 255 / 0.04);
	}

	.glyph {
		color: var(--fx-ink-3);
	}

	.caption {
		margin: auto 12px 0;
		padding-top: 16px;
		box-shadow: inset 0 1px 0 var(--fx-hairline);
		font-size: 10.5px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--fx-ink-3);
	}

	kbd {
		font: inherit;
		color: var(--fx-ink-2);
	}

	@media (max-width: 1239px) {
		.hero {
			grid-template-columns: minmax(0, 1fr);
			gap: 56px;
			justify-items: start;
		}
		/* Stacked: the panel spans the column, so the lens it carries sits at
		   the page edge instead of floating in an empty column. */
		.hero :global(.panel) {
			align-self: auto;
			width: 100%;
			margin-bottom: 0;
		}
	}

	@media (max-width: 700px) {
		.hero {
			gap: 28px;
			padding: 16px 0 20px;
			min-height: 0;
		}
		h1 {
			margin-top: 18px;
			font-size: 48px;
			line-height: 0.96;
		}
		.lede {
			margin-top: 14px;
			font-size: 15px;
		}
		.copy :global(.chips) {
			margin-top: 16px;
		}
		/* Both ways in on one row, as two equal halves. */
		.ctas {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			margin-top: 20px;
			gap: 12px;
		}
		.ctas :global(a) {
			width: 100%;
			padding-inline: 10px;
		}
		.hero :global(.panel) {
			width: 100%;
			height: auto;
			border-radius: 20px;
		}
		.panel-body {
			padding: 14px;
		}
		.suggestions li:nth-child(n + 3) {
			display: none;
		}
		.caption {
			margin-top: 10px;
			letter-spacing: 0.08em;
		}
	}
</style>
