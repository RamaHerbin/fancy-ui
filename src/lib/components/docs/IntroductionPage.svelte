<script lang="ts">
	import { t } from "$lib/stores";
	import InstallBlock from "$lib/components/docs/InstallBlock.svelte";
	import CodeBlock from "$lib/components/docs/CodeBlock.svelte";

	const importSnippet = "import { BorderBeam, Sparkles } from 'fancy-ui-svelte';";
	const usageSnippet = `<div class="relative overflow-hidden rounded-xl border p-6">
	<p>Your content here</p>
	<BorderBeam />
</div>`;
</script>

<div class="intro">
	<h1>{t("intro.title")}</h1>

	<p class="lead">
		<strong>FancyUI</strong>
		{t("intro.leadPre")}
		<span class="grad">{t("intro.leadHighlight")}</span>,
		<span class="solid">{t("intro.leadHighlight2")}</span>
		{t("intro.leadPost")}
	</p>

	<div class="pills">
		<span class="pill"
			><span class="ic" style="color:#ff5d3b">⚡</span>{t("intro.pill.svelte")}</span
		>
		<span class="pill"
			><span class="ic" style="color:#c084fc">✦</span>{t("intro.pill.animation")}</span
		>
		<span class="pill"
			><span class="ic" style="color:#34d399">⧉</span>{t("intro.pill.copyPaste")}</span
		>
		<span class="pill"
			><span class="ic" style="color:#38bdf8">〜</span>{t("intro.pill.tailwind")}</span
		>
		<span class="pill"><span class="ts">TS</span>{t("intro.pill.typescript")}</span>
	</div>

	<h2 id="philosophy">{t("intro.philosophy.heading")}</h2>
	<div class="cards">
		<div class="card">
			<div class="card-head">
				<span class="ic" style="color:#ff5d3b">⚡</span>{t("intro.philosophy.card1.title")}
			</div>
			<p class="card-desc">
				Built with runes (<code class="chip">$state</code>, <code class="chip">$derived</code>,
				<code class="chip">$effect</code>). No legacy APIs.
			</p>
		</div>
		<div class="card">
			<div class="card-head">
				<span class="ic" style="color:#c084fc">✦</span>{t("intro.philosophy.card2.title")}
			</div>
			<p class="card-desc">{t("intro.philosophy.card2.desc")}</p>
		</div>
		<div class="card">
			<div class="card-head">
				<span class="ic" style="color:#34d399">⧉</span>{t("intro.philosophy.card3.title")}
			</div>
			<p class="card-desc">{t("intro.philosophy.card3.desc")}</p>
		</div>
		<div class="card">
			<div class="card-head">
				<span class="ic" style="color:#38bdf8">〜</span>{t("intro.philosophy.card4.title")}
			</div>
			<p class="card-desc">{t("intro.philosophy.card4.desc")}</p>
		</div>
		<div class="card">
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
				<InstallBlock />
			</div>
		</div>
		<div class="step">
			<div class="num num-2">2</div>
			<div class="step-body">
				<div class="step-title">{t("intro.quickStart.step2.title")}</div>
				<p class="step-desc">{t("intro.quickStart.step2.desc")}</p>
				<CodeBlock lang="ts" code={importSnippet} />
			</div>
		</div>
		<div class="step">
			<div class="num num-3">3</div>
			<div class="step-body">
				<div class="step-title">{t("intro.quickStart.step3.title")}</div>
				<p class="step-desc">{t("intro.quickStart.step3.desc")}</p>
				<CodeBlock lang="svelte" code={usageSnippet} />
			</div>
		</div>
	</div>

	<h2 id="whats-included">{t("intro.whatsIncluded.heading")}</h2>
	<p class="section-body">{t("intro.whatsIncluded.body")}</p>
	<div class="cats">
		<div class="cat">{t("intro.category.buttons")}</div>
		<div class="cat">{t("intro.category.cards")}</div>
		<div class="cat">{t("intro.category.text")}</div>
		<div class="cat">{t("intro.category.backgrounds")}</div>
		<div class="cat">{t("intro.category.effects")}</div>
		<div class="cat">{t("intro.category.layout")}</div>
		<div class="cat">{t("intro.category.navigation")}</div>
		<div class="cat">{t("intro.category.dataDisplay")}</div>
		<div class="cat">{t("intro.category.feedback")}</div>
		<div class="cat">{t("intro.category.media")}</div>
	</div>

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
				<div class="cta-body">{@html t("intro.cta.body")}</div>
			</div>
		</div>
		<a class="cta-btn" href="/docs/getting-started/theme-generator">{t("intro.cta.button")}</a>
	</div>
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

	.intro .grad {
		background: var(--gradient-primary);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		color: transparent;
		font-weight: 600;
	}

	.intro .solid {
		color: var(--primary);
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

	.chip {
		background: var(--muted);
		border-radius: 4px;
		padding: 1px 6px;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 12px;
		color: var(--primary);
		direction: ltr;
		unicode-bidi: isolate;
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
