<script lang="ts">
	import { t } from "$lib/stores";
	import CodeBlock from "$lib/components/docs/CodeBlock.svelte";

	const cssSetupSnippet = `@import "tailwindcss";
@import "fancy-ui-svelte/tailwind.css";`;

	const colorsSnippet = `:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.129 0.042 264.695);
  --primary: oklch(0.208 0.042 265.755);
  --primary-foreground: oklch(0.984 0.003 247.858);
  --muted: oklch(0.968 0.007 247.896);
  --muted-foreground: oklch(0.554 0.046 257.417);
  --accent: oklch(0.968 0.007 247.896);
  --border: oklch(0.929 0.013 255.508);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.129 0.042 264.695);
}`;

	const darkSnippet = `.dark {
  --background: oklch(0.05 0 0);
  --foreground: oklch(0.984 0.003 247.858);
  --primary: oklch(0.929 0.013 255.508);
  --card: oklch(0.1 0.005 265);
  --border: oklch(1 0 0 / 8%);
}`;

	const motionSnippet = `:root {
  --animation-fast: 150ms;
  --animation-normal: 300ms;
  --animation-slow: 500ms;
  --animation-slower: 1000ms;
}`;

	const easingSnippet = `:root {
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
}`;

	const rainbowSnippet = `:root {
  --rainbow-1: hsl(0 100% 63%);
  --rainbow-2: hsl(270 100% 63%);
  --rainbow-3: hsl(210 100% 63%);
  --rainbow-4: hsl(195 100% 63%);
  --rainbow-5: hsl(90 100% 63%);
}`;

	const customizingSnippet = `:root {
  /* Make primary purple */
  --primary: oklch(0.5 0.25 280);
  --primary-foreground: oklch(0.98 0.01 280);

  /* Slower animations */
  --animation-normal: 500ms;
}`;
</script>

<div class="theming">
	<h1>{t("theming.title")}</h1>
	<p class="lead">{t("theming.lead")}</p>

	<div class="pills">
		<span class="pill"
			><span class="dot d1" aria-hidden="true"></span>{t("theming.pill.oklch")}</span
		>
		<span class="pill"
			><span class="dot d2" aria-hidden="true"></span>{t("theming.pill.shadcn")}</span
		>
		<span class="pill"><span class="dot d3" aria-hidden="true"></span>{t("theming.pill.dark")}</span
		>
		<span class="pill"
			><span class="dot d4" aria-hidden="true"></span>{t("theming.pill.tokens")}</span
		>
	</div>

	<div class="note">
		<span class="note-ic" aria-hidden="true">✦</span>
		<div class="note-stack">
			<p class="note-body">{t("theming.generator.body")}</p>
			<a class="note-cta" href="/docs/getting-started/theme-generator"
				>{t("theming.generator.cta")} <span class="arrow" aria-hidden="true">→</span></a
			>
		</div>
	</div>

	<section class="sec">
		<h2 id="css-setup">{t("theming.cssSetup.heading")}</h2>
		<p class="sec-body">{t("theming.cssSetup.body")}</p>
		<CodeBlock lang="css" code={cssSetupSnippet} />
	</section>

	<section class="sec">
		<h2 id="color-system">{t("theming.colors.heading")}</h2>
		<p class="sec-body">{t("theming.colors.body")}</p>
		<CodeBlock lang="css" code={colorsSnippet} />
		<p class="caption">{t("theming.colors.note")}</p>
	</section>

	<section class="sec">
		<h2 id="dark-mode">{t("theming.dark.heading")}</h2>
		<p class="sec-body">{t("theming.dark.body")}</p>
		<CodeBlock lang="css" code={darkSnippet} />
	</section>

	<section class="sec">
		<h2 id="animation-tokens">{t("theming.motion.heading")}</h2>
		<p class="sec-body">{t("theming.motion.body")}</p>
		<CodeBlock lang="css" code={motionSnippet} />
	</section>

	<section class="sec">
		<h2 id="easing">{t("theming.easing.heading")}</h2>
		<p class="sec-body">{t("theming.easing.body")}</p>
		<CodeBlock lang="css" code={easingSnippet} />
	</section>

	<section class="sec">
		<h2 id="rainbow-gradients">{t("theming.rainbow.heading")}</h2>
		<p class="sec-body">{t("theming.rainbow.body")}</p>
		<CodeBlock lang="css" code={rainbowSnippet} />
	</section>

	<section class="sec">
		<h2 id="customizing">{t("theming.customizing.heading")}</h2>
		<p class="sec-body">{t("theming.customizing.body")}</p>
		<CodeBlock lang="css" code={customizingSnippet} />
		<p class="caption">{t("theming.customizing.note")}</p>
	</section>

	<section class="sec">
		<h2 id="next-steps">{t("theming.nextSteps.heading")}</h2>
		<div class="next">
			<a class="next-card" href="/docs/getting-started/theme-generator">
				<span class="next-head">
					<span class="next-title">{t("theming.nextSteps.generator.title")}</span>
					<span class="arrow" aria-hidden="true">→</span>
				</span>
				<span class="next-desc">{t("theming.nextSteps.generator.desc")}</span>
			</a>
			<a class="next-card" href="/docs/components">
				<span class="next-head">
					<span class="next-title">{t("theming.nextSteps.components.title")}</span>
					<span class="arrow" aria-hidden="true">→</span>
				</span>
				<span class="next-desc">{t("theming.nextSteps.components.desc")}</span>
			</a>
		</div>
	</section>
</div>

<style>
	.theming {
		max-width: 840px;
	}

	.theming h1 {
		font-size: 44px;
		font-weight: 800;
		letter-spacing: -0.02em;
		line-height: 1.1;
		color: var(--foreground);
		margin: 0 0 1rem;
		scroll-margin-top: 5rem;
	}

	/* doc-prose globals compile to (0,2,1); every colliding override here is two
	   levels deep so it wins on specificity, not on bundle order. */
	.theming .sec h2 {
		font-size: 1.4rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		line-height: 1.25;
		color: var(--foreground);
		margin: 0 0 1.1rem;
		padding: 0;
		border: none;
		scroll-margin-top: 5rem;
	}

	.theming .sec + .sec {
		margin-top: 3rem;
	}

	.theming p {
		margin: 0;
	}

	/* Lead ------------------------------------------------------------------ */
	.theming p.lead {
		font-size: 19px;
		line-height: 1.5;
		max-width: 640px;
		color: var(--muted-foreground);
		margin: 0 0 28px;
	}

	/* Pills ----------------------------------------------------------------- */
	.pills {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-bottom: 28px;
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

	.dot {
		flex-shrink: 0;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--step);
	}

	.d1 {
		--step: var(--chart-1);
	}

	.d2 {
		--step: var(--chart-2);
	}

	.d3 {
		--step: var(--chart-3);
	}

	.d4 {
		--step: var(--chart-4);
	}

	/* Sections -------------------------------------------------------------- */
	.theming p.sec-body {
		font-size: 14.5px;
		line-height: 1.6;
		color: var(--muted-foreground);
		margin: 0 0 16px;
	}

	.theming p.caption {
		font-size: 12.5px;
		color: var(--muted-foreground);
		margin: 8px 0 0;
	}

	/* Note callout ---------------------------------------------------------- */
	.note {
		display: flex;
		gap: 12px;
		border: 1px solid color-mix(in oklch, var(--primary) 25%, transparent);
		border-radius: 14px;
		padding: 16px 18px;
		margin-bottom: 40px;
		background: linear-gradient(
			90deg,
			color-mix(in oklch, var(--primary) 8%, transparent),
			color-mix(in oklch, var(--accent) 5%, transparent)
		);
	}

	.note-ic {
		flex-shrink: 0;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: color-mix(in oklch, var(--primary) 15%, transparent);
		border: 1px solid color-mix(in oklch, var(--primary) 40%, transparent);
		color: var(--primary);
	}

	.note-stack {
		display: flex;
		flex-direction: column;
		gap: 6px;
		align-self: center;
	}

	.theming p.note-body {
		font-size: 13.5px;
		line-height: 1.6;
		color: var(--muted-foreground);
		margin: 0;
	}

	.theming a.note-cta {
		font-size: 13.5px;
		font-weight: 600;
		color: var(--primary);
		text-decoration: none;
		width: fit-content;
	}

	.theming a.note-cta:hover {
		text-decoration: underline;
	}

	/* Next steps ------------------------------------------------------------ */
	.next {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 12px;
	}

	.theming .next-card {
		display: flex;
		flex-direction: column;
		gap: 6px;
		border: 1px solid var(--border);
		background: var(--card);
		border-radius: 12px;
		padding: 16px 18px;
		text-decoration: none;
		transition: background var(--animation-fast) var(--ease-out);
	}

	.theming .next-card:hover {
		background: var(--muted);
		opacity: 1;
	}

	.next-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.next-title {
		font-size: 14px;
		font-weight: 600;
		color: var(--foreground);
	}

	.next-desc {
		font-size: 13px;
		line-height: 1.55;
		color: var(--muted-foreground);
	}

	.arrow {
		color: var(--muted-foreground);
	}

	:global(html[dir="rtl"]) .theming .arrow {
		transform: scaleX(-1);
	}

	@media (prefers-reduced-motion: reduce) {
		.theming .next-card {
			transition: none;
		}
	}

	@media (max-width: 640px) {
		.theming h1 {
			font-size: 34px;
		}
	}
</style>
