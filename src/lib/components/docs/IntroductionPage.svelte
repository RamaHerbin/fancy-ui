<script lang="ts">
	import { onMount } from "svelte";
	import { t, tn, tx, tCategory, createSkinState } from "$lib/stores";
	import RichText from "$lib/components/docs/RichText.svelte";
	import { createFrameworkState } from "$lib/stores/framework.svelte.js";
	import { INSTALL_SNIPPETS, INSTALL_VARIANTS } from "$lib/docs/install-snippets.js";
	import InstallBlock from "$lib/components/docs/InstallBlock.svelte";
	import CodeBlock from "$lib/components/docs/CodeBlock.svelte";
	import PrevNextNav from "$lib/components/docs/PrevNextNav.svelte";
	import { COMPONENT_COUNT, PACKAGE_VERSION } from "$lib/site.js";
	import { categories, getComponentsGroupedByCategory } from "$lib/fancy-ui/registry.js";

	const skinState = createSkinState();
	const isRetro = $derived(skinState.skin === "retro-os");

	// The framework store hydrates from localStorage; read it after mount so the
	// prerendered markup (Svelte) matches the first client render.
	const frameworkState = createFrameworkState();
	let mounted = $state(false);
	onMount(() => (mounted = true));
	const snippets = $derived(INSTALL_SNIPPETS[mounted ? frameworkState.framework : "svelte"]);

	/* Retro "What's included" stat cards — real counts from the registry.
	   $derived so the labels re-localize on locale switch. */
	const grouped = getComponentsGroupedByCategory();
	// Only the categories that currently hold a component.
	const usedCategories = categories.filter((category) => grouped[category]?.length);
	const stats = $derived([
		{
			label: t("intro.category.buttons"),
			count: grouped["buttons"]?.length ?? 0,
			desc: t("intro.stats.buttons"),
			accent: 1,
		},
		{
			label: t("intro.category.cards"),
			count: grouped["cards"]?.length ?? 0,
			desc: t("intro.stats.cards"),
			accent: 2,
		},
		{
			label: t("intro.category.effects"),
			count: grouped["effects"]?.length ?? 0,
			desc: t("intro.stats.effects"),
			accent: 3,
		},
	]);
</script>

<div class="intro">
	{#if isRetro}
		<div class="intro-badges">
			<span class="intro-badge intro-badge-a">{t("nav.gettingStarted")}</span>
			<span class="intro-badge intro-badge-b">v{PACKAGE_VERSION}</span>
		</div>
	{/if}

	<h1>{t("intro.title")}</h1>

	<p class="lead">
		<strong>FancyUI</strong>
		<RichText segments={tx("intro.lead", { count: COMPONENT_COUNT })} />
	</p>

	<div class="pills">
		<span class="pill" data-accent="1"
			><span class="ic" style="color:#ff5d3b">⚡</span>{t("intro.pill.frameworks")}</span
		>
		<span class="pill" data-accent="2"
			><span class="ic" style="color:#c084fc">✦</span>{t("intro.pill.animation")}</span
		>
		<span class="pill" data-accent="3"
			><span class="ic" style="color:#34d399">⧉</span>{t("intro.pill.copyPaste")}</span
		>
		<span class="pill" data-accent="4"
			><span class="ic" style="color:#38bdf8">〜</span>{t("intro.pill.tailwind")}</span
		>
		<span class="pill" data-accent="5"><span class="ts">TS</span>{t("intro.pill.typescript")}</span>
	</div>

	<h2 id="philosophy">{t("intro.philosophy.heading")}</h2>
	<div class="cards">
		<div class="card" data-accent="1" data-initial="S">
			<div class="card-head">
				<span class="ic" style="color:#ff5d3b">⚡</span>{t("intro.philosophy.card1.title")}
			</div>
			<p class="card-desc">{t("intro.philosophy.card1.desc")}</p>
		</div>
		<div class="card" data-accent="2" data-initial="A">
			<div class="card-head">
				<span class="ic" style="color:#c084fc">✦</span>{t("intro.philosophy.card2.title")}
			</div>
			<p class="card-desc">{t("intro.philosophy.card2.desc")}</p>
		</div>
		<div class="card" data-accent="3" data-initial="C">
			<div class="card-head">
				<span class="ic" style="color:#34d399">⧉</span>{t("intro.philosophy.card3.title")}
			</div>
			<p class="card-desc">{t("intro.philosophy.card3.desc")}</p>
		</div>
		<div class="card" data-accent="4" data-initial="T">
			<div class="card-head">
				<span class="ic" style="color:#38bdf8">〜</span>{t("intro.philosophy.card4.title")}
			</div>
			<p class="card-desc">{t("intro.philosophy.card4.desc")}</p>
		</div>
		<div class="card" data-accent="5" data-initial="TS">
			<div class="card-head">
				<span class="ts">TS</span>{t("intro.philosophy.card5.title")}
			</div>
			<p class="card-desc">{t("intro.philosophy.card5.desc")}</p>
		</div>
	</div>

	<h2 id="quick-start">{t("intro.quickStart.heading")}</h2>
	<div class="steps">
		<div class="step">
			<div class="num num-1">1</div>
			<div class="step-body">
				<div class="step-title">{t("intro.quickStart.step1.title")}</div>
				<p class="step-desc">{t("intro.quickStart.step1.desc")}</p>
				<InstallBlock variants={INSTALL_VARIANTS} />
			</div>
		</div>
		<div class="step">
			<div class="num num-2">2</div>
			<div class="step-body">
				<div class="step-title">{t("intro.quickStart.step2.title")}</div>
				<p class="step-desc">{t("intro.importHint")}</p>
				<CodeBlock lang="ts" code={snippets.imports} />
			</div>
		</div>
		<div class="step">
			<div class="num num-3">3</div>
			<div class="step-body">
				<div class="step-title">{t("intro.quickStart.step3.title")}</div>
				<p class="step-desc">{t("intro.quickStart.step3.desc")}</p>
				<CodeBlock lang={snippets.lang} code={snippets.usage} />
			</div>
		</div>
	</div>

	<h2 id="whats-included">{t("intro.whatsIncluded.heading")}</h2>
	{#if isRetro}
		<!-- Retro: three stat cards (label / count / description), counts from the registry. -->
		<div class="intro-stats">
			{#each stats as stat}
				<div class="intro-stat" data-accent={stat.accent}>
					<div class="stat-head">
						<span class="stat-square" aria-hidden="true"></span>
						<span class="stat-label">{stat.label}</span>
					</div>
					<div class="stat-count">{stat.count}</div>
					<div class="stat-desc">{stat.desc}</div>
				</div>
			{/each}
		</div>
	{:else}
		<p class="section-body">
			{tn("intro.whatsIncluded.body", COMPONENT_COUNT, { categories: usedCategories.length })}
		</p>
		<!-- Every category the registry uses, in registry order, labelled through the catalog. -->
		<div class="cats">
			{#each usedCategories as category (category)}
				<div class="cat">{tCategory(category)}</div>
			{/each}
		</div>
	{/if}

	<h2 id="next-steps">{t("intro.nextSteps.heading")}</h2>
	<div class="next">
		<a class="next-row" href="/docs/getting-started/installation">
			<span>{t("intro.nextSteps.installation")}</span>
			<span class="arrow" aria-hidden="true">→</span>
		</a>
		<a class="next-row" href="/docs/getting-started/theming">
			<span>{t("intro.nextSteps.theming")}</span>
			<span class="arrow" aria-hidden="true">→</span>
		</a>
		<a class="next-row" href="/docs/components">
			<span>{t("intro.nextSteps.components")}</span>
			<span class="arrow" aria-hidden="true">→</span>
		</a>
	</div>

	<div class="cta">
		<div class="cta-left">
			<div class="cta-ic">✦</div>
			<div class="cta-text">
				<div class="cta-title">{t("intro.cta.title")}</div>
				<div class="cta-body"><RichText segments={tx("intro.cta.body")} /></div>
			</div>
		</div>
		<a class="cta-btn" href="/docs/getting-started/theme-generator"
			>{t("intro.cta.button")}<span class="cta-arrow" aria-hidden="true">{" →"}</span></a
		>
	</div>

	{#if isRetro}
		<!-- Retro: the reference shows a prev/next pager on the Introduction page. -->
		<PrevNextNav
			next={{ name: t("page.installation"), href: "/docs/getting-started/installation" }}
		/>
	{/if}
</div>

<style>
	.intro {
		max-width: 840px;
	}

	/* Scoped element selectors beat the .doc-prose globals by scoping specificity. */
	.intro h1 {
		font-size: 44px;
		font-weight: 800;
		letter-spacing: -0.02em;
		line-height: 1.1;
		color: var(--foreground);
		margin: 0 0 1rem;
		scroll-margin-top: 5rem;
	}

	.intro h2 {
		font-size: 1.4rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		line-height: 1.25;
		color: var(--foreground);
		margin: 3rem 0 1.1rem;
		padding: 0;
		border: none;
		scroll-margin-top: 5rem;
	}

	.intro p {
		margin: 0;
	}

	/* Lead ------------------------------------------------------------------ */
	.intro .lead {
		font-size: 19px;
		line-height: 1.5;
		max-width: 640px;
		color: var(--muted-foreground);
		margin-bottom: 28px;
	}

	/* <RichText> renders .grad, hence :global. Brand blue→purple hue gradient (matches the design). The semantic
	   --gradient-primary is a lightness ramp between --primary/--accent, which
	   fades clipped text into the background instead of reading as a gradient. */
	.intro :global(.grad) {
		background: linear-gradient(90deg, #5b8cff, #a142ff);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		color: transparent;
		font-weight: 600;
	}

	/* Pills ----------------------------------------------------------------- */
	.pills {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-bottom: 40px;
	}

	.pill {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		border: 1px solid var(--border);
		background: var(--card);
		border-radius: 10px;
		padding: 10px 16px;
		font-size: 14px;
		font-weight: 500;
		color: var(--foreground);
	}

	.ic {
		display: inline-flex;
		align-items: center;
		line-height: 1;
	}

	.ts {
		display: inline-flex;
		align-items: center;
		background: #3178c6;
		color: #fff;
		border-radius: 3px;
		font-size: 9px;
		font-weight: 700;
		padding: 2px 3px;
		line-height: 1;
	}

	/* Philosophy cards ------------------------------------------------------ */
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 16px;
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: 10px;
		border: 1px solid var(--border);
		background: var(--card);
		border-radius: 14px;
		padding: 22px;
	}

	.card-head {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 16px;
		font-weight: 600;
		color: var(--foreground);
	}

	.card-head .ic {
		font-size: 18px;
	}

	.card-desc {
		font-size: 13.5px;
		line-height: 1.6;
		color: var(--muted-foreground);
	}

	/* Quick start ----------------------------------------------------------- */
	.steps {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.step {
		display: flex;
		gap: 16px;
	}

	.num {
		flex-shrink: 0;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 13px;
		font-weight: 600;
	}

	.num-1 {
		background: color-mix(in oklch, var(--primary) 15%, transparent);
		border: 1px solid color-mix(in oklch, var(--primary) 40%, transparent);
		color: var(--primary);
	}

	.num-2 {
		background: color-mix(in oklch, var(--accent) 15%, transparent);
		border: 1px solid color-mix(in oklch, var(--accent) 40%, transparent);
		color: var(--accent);
	}

	.num-3 {
		background: rgba(52, 211, 153, 0.12);
		border: 1px solid rgba(52, 211, 153, 0.4);
		color: #34d399;
	}

	.step-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.step-title {
		font-size: 15px;
		font-weight: 600;
		color: var(--foreground);
	}

	.step-desc {
		font-size: 13px;
		color: var(--muted-foreground);
	}

	/* What's included ------------------------------------------------------- */
	.section-body {
		font-size: 14.5px;
		line-height: 1.6;
		color: var(--muted-foreground);
		margin-bottom: 16px;
	}

	.cats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 10px;
	}

	.cat {
		border: 1px solid var(--border);
		background: var(--card);
		border-radius: 10px;
		padding: 10px 14px;
		font-size: 13px;
		color: var(--foreground);
	}

	/* Next steps ------------------------------------------------------------ */
	.next {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.intro .next-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 14px 16px;
		font-size: 14px;
		font-weight: 500;
		color: var(--foreground);
		text-decoration: none;
		transition: background 0.15s;
	}

	.intro .next-row:hover {
		background: var(--muted);
		opacity: 1;
	}

	.arrow {
		color: var(--muted-foreground);
	}

	/* CTA ------------------------------------------------------------------- */
	.cta {
		margin-top: 40px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		border: 1px solid color-mix(in oklch, var(--primary) 25%, transparent);
		background: linear-gradient(
			90deg,
			color-mix(in oklch, var(--primary) 8%, transparent),
			color-mix(in oklch, var(--accent) 5%, transparent)
		);
		border-radius: 14px;
		padding: 18px 22px;
	}

	.cta-left {
		display: flex;
		align-items: center;
		gap: 14px;
		min-width: 0;
	}

	.cta-ic {
		flex-shrink: 0;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: color-mix(in oklch, var(--primary) 15%, transparent);
		border: 1px solid color-mix(in oklch, var(--primary) 40%, transparent);
		color: var(--primary);
	}

	.cta-title {
		font-weight: 600;
		color: var(--foreground);
	}

	.cta-body {
		font-size: 13px;
		color: var(--muted-foreground);
	}

	.intro .cta-btn {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 10px 18px;
		font-size: 13px;
		font-weight: 600;
		color: var(--foreground);
		white-space: nowrap;
		text-decoration: none;
		transition: background 0.15s;
	}

	.intro .cta-btn:hover {
		background: var(--muted);
		opacity: 1;
	}

	/* The trailing glyph lives in its own span so a skin can swap it for its own
	   affordance; box-less by default, so the standard skin renders the label and
	   the arrow as one uninterrupted run of text exactly as before. */
	.cta-arrow {
		display: contents;
	}

	@media (max-width: 640px) {
		.intro h1 {
			font-size: 34px;
		}

		.cta {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
