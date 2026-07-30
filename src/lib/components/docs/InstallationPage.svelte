<script lang="ts">
	import { t } from "$lib/stores";
	import InstallBlock from "$lib/components/docs/InstallBlock.svelte";
	import CodeBlock from "$lib/components/docs/CodeBlock.svelte";
	import { COMPONENT_COUNT } from "$lib/site.js";

	const stylesheetSnippet = `@import "tailwindcss";
@import "fancy-ui-svelte/tailwind.css";`;

	const firstComponentSnippet = `<script lang="ts">
	import { RainbowButton } from 'fancy-ui-svelte';
<\/script>

<RainbowButton>Click me</RainbowButton>`;

	const usageSnippet = `<script lang="ts">
	import { BorderBeam, RainbowButton } from 'fancy-ui-svelte';
<\/script>

<div class="relative overflow-hidden rounded-xl border p-8">
	<RainbowButton>Click me</RainbowButton>
	<BorderBeam colorFrom="#9E7AFF" colorTo="#FE8BBB" />
</div>`;

	const typesSnippet = `import { type BorderBeamProps } from 'fancy-ui-svelte';

const beam: BorderBeamProps = { colorFrom: "#9E7AFF", colorTo: "#FE8BBB" };`;
</script>

<div class="install">
	<h1>{t("install.title")}</h1>
	<p class="lead">{t("install.lead")}</p>

	<div class="pills">
		<span class="pill"
			><span class="dot d1" aria-hidden="true"></span>{t("install.pill.svelte")}</span
		>
		<span class="pill"
			><span class="dot d2" aria-hidden="true"></span>{t("install.pill.tailwind")}</span
		>
		<span class="pill"><span class="dot d3" aria-hidden="true"></span>{t("install.pill.node")}</span
		>
		<span class="pill"
			><span class="dot d4" aria-hidden="true"></span>{t("install.pill.typescript")}</span
		>
	</div>

	<section class="sec">
		<h2 id="prerequisites">{t("install.prerequisites.heading")}</h2>
		<p class="sec-body">{t("install.prerequisites.body")}</p>
		<div class="cards">
			<div class="card">
				<div class="card-head">
					<span class="card-title">{t("install.prerequisites.card1.title")}</span>
					<code class="chip">{t("install.prerequisites.card1.version")}</code>
				</div>
				<p class="card-desc">{t("install.prerequisites.card1.desc")}</p>
			</div>
			<div class="card">
				<div class="card-head">
					<span class="card-title">{t("install.prerequisites.card2.title")}</span>
					<code class="chip">{t("install.prerequisites.card2.version")}</code>
				</div>
				<p class="card-desc">{t("install.prerequisites.card2.desc")}</p>
			</div>
			<div class="card">
				<div class="card-head">
					<span class="card-title">{t("install.prerequisites.card3.title")}</span>
					<code class="chip">{t("install.prerequisites.card3.version")}</code>
				</div>
				<p class="card-desc">{t("install.prerequisites.card3.desc")}</p>
			</div>
		</div>
	</section>

	<section class="sec">
		<h2 id="install-steps">{t("install.steps.heading")}</h2>
		<p class="sec-body">{t("install.steps.body")}</p>
		<ol class="steps">
			<li class="step">
				<span class="num n1" aria-hidden="true">1</span>
				<div class="step-body">
					<span class="step-title">{t("install.step1.title")}</span>
					<p class="step-desc">{t("install.step1.desc")}</p>
					<InstallBlock />
				</div>
			</li>
			<li class="step">
				<span class="num n2" aria-hidden="true">2</span>
				<div class="step-body">
					<span class="step-title">{t("install.step2.title")}</span>
					<p class="step-desc">{t("install.step2.desc")}</p>
					<CodeBlock lang="css" code={stylesheetSnippet} />
					<p class="caption">{t("install.step2.caption")}</p>
				</div>
			</li>
			<li class="step">
				<span class="num n3" aria-hidden="true">3</span>
				<div class="step-body">
					<span class="step-title">{t("install.step3.title")}</span>
					<p class="step-desc">{t("install.step3.desc")}</p>
					<CodeBlock lang="svelte" code={firstComponentSnippet} />
				</div>
			</li>
		</ol>
	</section>

	<section class="sec">
		<h2 id="tailwind-setup">{t("install.tailwind.heading")}</h2>
		<p class="sec-body">{t("install.tailwind.body")}</p>
		<p class="sec-body">{t("install.tailwind.order")}</p>
		<div class="note">
			<span class="note-ic" aria-hidden="true">✦</span>
			<p class="note-body">{t("install.tailwind.note")}</p>
		</div>
	</section>

	<section class="sec">
		<h2 id="usage">{t("install.usage.heading")}</h2>
		<p class="sec-body">{t("install.usage.body")}</p>
		<CodeBlock lang="svelte" code={usageSnippet} />
		<p class="caption">{t("install.usage.note")}</p>
	</section>

	<section class="sec">
		<h2 id="typescript">{t("install.typescript.heading")}</h2>
		<p class="sec-body">{t("install.typescript.body")}</p>
		<CodeBlock lang="ts" code={typesSnippet} />
		<p class="caption">{t("install.typescript.note")}</p>
	</section>

	<section class="sec">
		<h2 id="peer-dependencies">{t("install.peerDeps.heading")}</h2>
		<p class="sec-body">{t("install.peerDeps.body")}</p>
		<div class="table-wrap">
			<table class="peer-table">
				<thead>
					<tr>
						<th>{t("install.peerDeps.colPackage")}</th>
						<th>{t("install.peerDeps.colVersion")}</th>
					</tr>
				</thead>
				<tbody>
					<tr><td><code class="chip">svelte</code></td><td><code class="chip">^5.0.0</code></td></tr
					>
					<tr
						><td><code class="chip">tailwindcss</code></td><td><code class="chip">^4.0.0</code></td
						></tr
					>
				</tbody>
			</table>
		</div>
		<p class="sec-body">{t("install.peerDeps.bundled")}</p>
		<div class="dep-chips">
			<code class="chip">@chenglou/pretext</code><code class="chip">canvas-confetti</code
			><code class="chip">clsx</code><code class="chip">gsap</code><code class="chip"
				>tailwind-merge</code
			><code class="chip">three</code>
		</div>
		<p class="caption">{t("install.peerDeps.bundledNote")}</p>
	</section>

	<section class="sec">
		<h2 id="next-steps">{t("install.nextSteps.heading")}</h2>
		<div class="next">
			<a class="next-card" href="/docs/components">
				<span class="next-head">
					<span class="next-title">{t("install.nextSteps.components.title")}</span>
					<span class="arrow" aria-hidden="true">→</span>
				</span>
				<span class="next-desc"
					>{t("install.nextSteps.components.desc").replace("{count}", String(COMPONENT_COUNT))}</span
				>
			</a>
			<a class="next-card" href="/docs/getting-started/theming">
				<span class="next-head">
					<span class="next-title">{t("install.nextSteps.theming.title")}</span>
					<span class="arrow" aria-hidden="true">→</span>
				</span>
				<span class="next-desc">{t("install.nextSteps.theming.desc")}</span>
			</a>
		</div>
	</section>
</div>

<style>
	.install {
		max-width: 840px;
	}

	.install h1 {
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
	.install .sec h2 {
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

	.install .sec + .sec {
		margin-top: 3rem;
	}

	.install p {
		margin: 0;
	}

	/* Lead ------------------------------------------------------------------ */
	.install p.lead {
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
	.install p.sec-body {
		font-size: 14.5px;
		line-height: 1.6;
		color: var(--muted-foreground);
		margin: 0 0 16px;
	}

	/* Prerequisite cards ---------------------------------------------------- */
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
	}

	.card-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--foreground);
	}

	.install p.card-desc {
		font-size: 13.5px;
		line-height: 1.6;
		color: var(--muted-foreground);
		margin: 0;
	}

	.install code.chip {
		background: var(--muted);
		border-radius: 4px;
		padding: 1px 6px;
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 12px;
		color: var(--primary);
		direction: ltr;
		unicode-bidi: isolate;
	}

	/* Install steps --------------------------------------------------------- */
	.install ol.steps {
		display: flex;
		flex-direction: column;
		gap: 24px;
		list-style: none;
		padding-inline-start: 0;
		margin: 0;
	}

	.install .steps li {
		display: flex;
		gap: 16px;
		margin: 0;
	}

	.install .steps .num {
		flex-shrink: 0;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 13px;
		font-weight: 600;
		color: var(--foreground);
		background: color-mix(in oklch, var(--step) 18%, transparent);
		border: 1px solid color-mix(in oklch, var(--step) 45%, transparent);
	}

	.install .steps .n1 {
		--step: var(--chart-1);
	}

	.install .steps .n2 {
		--step: var(--chart-4);
	}

	.install .steps .n3 {
		--step: var(--chart-2);
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

	.install p.step-desc {
		font-size: 13px;
		color: var(--muted-foreground);
		margin: 0;
	}

	.install p.caption {
		font-size: 12.5px;
		color: var(--muted-foreground);
		margin: 0;
	}

	/* Note callout ---------------------------------------------------------- */
	.note {
		display: flex;
		gap: 12px;
		border: 1px solid color-mix(in oklch, var(--primary) 25%, transparent);
		border-radius: 14px;
		padding: 16px 18px;
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

	.install p.note-body {
		font-size: 13.5px;
		line-height: 1.6;
		color: var(--muted-foreground);
		margin: 0;
		align-self: center;
	}

	/* Peer dependencies ----------------------------------------------------- */
	.table-wrap {
		overflow-x: auto;
	}

	.install .peer-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.dep-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 8px;
	}

	/* Next steps ------------------------------------------------------------ */
	.next {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 12px;
	}

	.install .next-card {
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

	.install .next-card:hover {
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

	:global(html[dir="rtl"]) .install .arrow {
		transform: scaleX(-1);
	}

	@media (prefers-reduced-motion: reduce) {
		.install .next-card {
			transition: none;
		}
	}

	@media (max-width: 640px) {
		.install h1 {
			font-size: 34px;
		}
	}
</style>
