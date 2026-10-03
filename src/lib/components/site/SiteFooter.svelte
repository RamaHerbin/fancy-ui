<!--
	SiteFooter — a quiet hairline grid: three link columns and an install
	column whose lines follow the framework store. The only material touch is a
	card-tier rim around the install block, lit on hover or focus.
-->
<script lang="ts">
	import { onMount } from "svelte";
	import Logo from "$lib/components/Logo.svelte";
	import { createFrameworkState } from "$lib/stores/framework.svelte.js";
	import type { Framework } from "$lib/inspiration/types.js";
	import {
		GITHUB_URL,
		LICENSE_URL,
		PACKAGE_NAME,
		REACT_PACKAGE_NAME,
		REACT_PACKAGE_URL,
		VUE_PACKAGE_NAME,
		VUE_PACKAGE_PUBLISHED,
		VUE_PACKAGE_URL,
	} from "$lib/site.js";
	import FrameworkSwitch from "./FrameworkSwitch.svelte";
	import RimLight from "./materials/RimLight.svelte";

	interface Props {
		class?: string;
	}

	let { class: className = "" }: Props = $props();

	const year = new Date().getFullYear();

	type Link = { label: string; href: string; external?: boolean };
	const COLUMNS: { title: string; links: Link[] }[] = [
		{
			title: "Docs",
			links: [
				{ label: "Getting Started", href: "/docs/getting-started/introduction" },
				{ label: "Components", href: "/docs/components" },
				{ label: "Inspiration", href: "/inspiration" },
				{ label: "Theming", href: "/docs/getting-started/theming" },
				{ label: "Installation", href: "/docs/getting-started/installation" },
			],
		},
		{
			title: "Resources",
			links: [
				{ label: "Theme Generator", href: "/docs/getting-started/theme-generator" },
				{ label: "React package", href: REACT_PACKAGE_URL, external: true },
				{ label: "Vue package", href: VUE_PACKAGE_URL, external: true },
				{ label: "llms.txt", href: "/llms.txt" },
				{ label: "Changelog", href: "/docs/getting-started/changelog" },
			],
		},
		{
			title: "Community",
			links: [
				{ label: "Contribute", href: `${GITHUB_URL}/blob/main/CONTRIBUTING.md`, external: true },
				{ label: "Issues", href: `${GITHUB_URL}/issues`, external: true },
				{ label: "Discussions", href: `${GITHUB_URL}/discussions`, external: true },
				{ label: "Sponsors", href: "https://github.com/sponsors/RamaHerbin", external: true },
			],
		},
	];

	const INSTALL: { fw: Framework; line: string; note?: string }[] = [
		{ fw: "react", line: `pnpm add ${REACT_PACKAGE_NAME}` },
		{ fw: "svelte", line: `pnpm add ${PACKAGE_NAME}` },
		VUE_PACKAGE_PUBLISHED
			? { fw: "vue", line: `pnpm add ${VUE_PACKAGE_NAME}` }
			: { fw: "vue", line: VUE_PACKAGE_NAME, note: "coming to npm" },
	];

	const store = createFrameworkState();
	let mounted = $state(false);
	onMount(() => (mounted = true));
	const current = $derived<Framework>(mounted ? store.framework : "svelte");

	let lit = $state(false);
</script>

<footer class="sf {className}">
	<div class="grid">
		<div class="brand-cell">
			<a href="/" class="brand"><Logo size={18} /> FancyUI</a>
			<p>UI inspiration and expressive components for React, Svelte, and Vue.</p>
		</div>

		{#each COLUMNS as column (column.title)}
			<nav class="col" aria-label={column.title}>
				<h2 class="fx-mono">{column.title}</h2>
				<ul>
					{#each column.links as link (link.label)}
						<li>
							<a
								href={link.href}
								target={link.external ? "_blank" : undefined}
								rel={link.external ? "noopener noreferrer" : undefined}
								>{link.label}{#if link.external}<span aria-hidden="true"> ↗</span>{/if}</a
							>
						</li>
					{/each}
				</ul>
			</nav>
		{/each}

		<section class="col" aria-labelledby="sf-install">
			<h2 id="sf-install" class="fx-mono">Install</h2>
			<div
				class="install"
				role="group"
				aria-label="Install commands"
				onpointerenter={() => (lit = true)}
				onpointerleave={() => (lit = false)}
				onfocusin={() => (lit = true)}
				onfocusout={() => (lit = false)}
			>
				<FrameworkSwitch size="sm" label="Install for" />
				<ul class="lines fx-mono">
					{#each INSTALL as item (item.fw)}
						<li data-current={current === item.fw || undefined}>
							<span class="prompt" aria-hidden="true">$</span>
							<code>{item.line}</code>
							{#if item.note}<span class="note">{item.note}</span>{/if}
						</li>
					{/each}
				</ul>
				<RimLight tier="card" seed={4} active={lit} />
			</div>
		</section>
	</div>

	<div class="legal fx-mono">
		<span>© {year} FancyUI</span>
		<span class="legal-links">
			<a href={LICENSE_URL} target="_blank" rel="noopener noreferrer">MIT License</a>
			<a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
		</span>
	</div>
</footer>

<style>
	.sf {
		margin-top: 96px;
		box-shadow: inset 0 1px 0 var(--fx-hairline, rgba(242, 241, 236, 0.1));
	}

	.grid {
		display: grid;
		grid-template-columns: 1.2fr 1fr 1fr 1fr 1.6fr;
		max-width: 1440px;
		margin: 0 auto;
	}

	.grid > * {
		padding: 32px 24px 40px;
		box-shadow: inset -1px 0 0 var(--fx-hairline, rgba(242, 241, 236, 0.1));
	}

	.grid > :first-child {
		padding-left: 40px;
	}

	.grid > :last-child {
		padding-right: 40px;
		box-shadow: none;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		font-size: 15px;
		font-weight: 650;
	}

	.brand-cell p {
		margin-top: 12px;
		max-width: 220px;
		font-size: 13px;
		line-height: 1.5;
		color: var(--fx-ink-3, #8f8e89);
	}

	h2 {
		font-size: 10.5px;
		font-weight: 500;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--fx-ink-3, #8f8e89);
	}

	ul {
		margin-top: 14px;
	}

	.col li + li {
		margin-top: 9px;
	}

	.col a {
		font-size: 13.5px;
		color: var(--fx-ink-2, #a8a7a1);
		transition: color 180ms var(--fx-ease, ease);
	}

	.col a:hover {
		color: var(--fx-ink, #f2f1ec);
	}

	.install {
		position: relative;
		margin-top: 14px;
		padding: 14px;
		border-radius: 14px;
		background: var(--fx-card, #0f0f12);
		box-shadow: inset 0 0 0 1px var(--fx-hairline, rgba(242, 241, 236, 0.1));
	}

	.lines {
		margin-top: 12px;
		font-size: 12px;
	}

	.lines li {
		display: flex;
		align-items: baseline;
		gap: 8px;
		color: var(--fx-ink-3, #8f8e89);
		white-space: nowrap;
	}

	.lines li + li {
		margin-top: 6px;
	}

	.lines li[data-current] {
		color: var(--fx-ink, #f2f1ec);
	}

	.prompt {
		color: var(--fx-ink-4, #7d7c77);
	}

	.note {
		font-size: 10.5px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--fx-ink-3, #8f8e89);
	}

	.legal {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		max-width: 1440px;
		margin: 0 auto;
		padding: 16px 40px 24px;
		font-size: 10.5px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--fx-ink-3, #8f8e89);
		box-shadow: inset 0 1px 0 var(--fx-hairline, rgba(242, 241, 236, 0.1));
	}

	.legal-links {
		display: flex;
		gap: 20px;
	}

	.legal a:hover {
		color: var(--fx-ink, #f2f1ec);
	}

	@media (max-width: 1100px) {
		.grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
		.grid > * {
			box-shadow: inset 0 -1px 0 var(--fx-hairline, rgba(242, 241, 236, 0.1));
		}
		.grid > :first-child,
		.grid > :last-child {
			grid-column: 1 / -1;
			padding-inline: 40px;
		}
		.grid > :nth-child(2) {
			padding-left: 40px;
		}
	}

	@media (max-width: 700px) {
		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.grid > * {
			padding: 24px 16px 28px;
		}
		.grid > :first-child,
		.grid > :last-child,
		.grid > :nth-child(2) {
			padding-inline: 16px;
		}
		.grid > :nth-child(4) {
			grid-column: 1 / -1;
		}
		.legal {
			flex-direction: column;
			padding: 16px;
		}
	}
</style>
