<!--
	SiteHeader — the shell's top bar: brand, the three destinations, and the
	visitor's tools (Saved, docs search, GitHub, motion, Get started). Below
	lg the nav and tools move into a Sheet; the Sheet is portalled out of
	`.fx-root`, so it carries `dark` itself.

	Client-only values (the saved count, the ⌘/Ctrl hint) render after mount so
	the hydrated markup matches the server's.
-->
<script lang="ts">
	import { onMount } from "svelte";
	import { Button } from "$lib/fancy-ui/button/index.js";
	import { Sheet } from "$lib/fancy-ui/sheet/index.js";
	import Logo from "$lib/components/Logo.svelte";
	import GitHubStars from "$lib/components/docs/GitHubStars.svelte";
	import { createSavedState } from "$lib/stores/saved.svelte.js";
	import { KNOWN_IDS } from "$lib/inspiration/catalog.js";
	import { GITHUB_URL } from "$lib/site.js";
	import MotionToggle from "./MotionToggle.svelte";

	type Section = "inspiration" | "components" | "docs";

	interface Props {
		/** Opens the docs command palette. */
		onSearchClick?: () => void;
		/** The section the page belongs to, marked `aria-current="page"`. */
		current?: Section;
		class?: string;
	}

	let { onSearchClick, current, class: className = "" }: Props = $props();

	const NAV: { id: Section; label: string; href: string }[] = [
		{ id: "inspiration", label: "Inspiration", href: "/inspiration" },
		{ id: "components", label: "Components", href: "/docs/components" },
		{ id: "docs", label: "Docs", href: "/docs/getting-started/introduction" },
	];

	// Count only ids the catalog knows, so the badge agrees with /inspiration/saved.
	const saved = createSavedState(KNOWN_IDS);
	let mounted = $state(false);
	let modKey = $state("⌘");
	let menuOpen = $state(false);

	onMount(() => {
		mounted = true;
		if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) modKey = "Ctrl";
	});

	const savedCount = $derived(mounted ? saved.count : 0);

	function openSearch() {
		menuOpen = false;
		onSearchClick?.();
	}
</script>

<header class="sh {className}">
	<a href="/" class="brand">
		<Logo size={18} />
		FancyUI
	</a>

	<nav class="nav" aria-label="Main">
		{#each NAV as link (link.id)}
			<a href={link.href} aria-current={current === link.id ? "page" : undefined}>{link.label}</a>
		{/each}
	</nav>

	<span class="spacer"></span>

	<div class="tools">
		<a href="/inspiration/saved" class="saved">
			<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
				<path
					d="M4 2.5h8v11l-4-2.8-4 2.8z"
					fill="none"
					stroke="currentColor"
					stroke-width="1.4"
					stroke-linejoin="round"
				/>
			</svg>
			Saved
			{#if savedCount > 0}<span class="count fx-mono" aria-label="{savedCount} saved"
					>{savedCount}</span
				>{/if}
		</a>

		<button type="button" class="search" aria-label="Search the docs" onclick={onSearchClick}>
			<svg viewBox="0 0 20 20" width="13" height="13" aria-hidden="true">
				<circle cx="9" cy="9" r="5.75" fill="none" stroke="currentColor" stroke-width="1.6" />
				<path
					d="m13.5 13.5 3.5 3.5"
					stroke="currentColor"
					stroke-width="1.6"
					stroke-linecap="round"
				/>
			</svg>
			<span>Search</span>
			<kbd class="fx-mono" aria-hidden="true">{modKey}K</kbd>
		</button>

		<a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" class="github">
			GitHub
			<GitHubStars class="fx-mono" />
		</a>

		<MotionToggle compact />

		<Button href="/docs" size="sm">Get started</Button>
	</div>

	<button
		type="button"
		class="menu"
		aria-label="Open menu"
		aria-expanded={menuOpen}
		onclick={() => (menuOpen = true)}
	>
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"></path></svg
		>
	</button>
</header>

<Sheet bind:open={menuOpen} side="right" size="sm" title="FancyUI" class="dark">
	<nav class="flex flex-col gap-1 text-[15px]" aria-label="Main">
		{#each NAV as link (link.id)}
			<a
				href={link.href}
				aria-current={current === link.id ? "page" : undefined}
				class="rounded-[6px] px-2 py-2.5 hover:bg-white/5">{link.label}</a
			>
		{/each}
		<a href="/inspiration/saved" class="rounded-[6px] px-2 py-2.5 hover:bg-white/5"
			>Saved{savedCount > 0 ? ` (${savedCount})` : ""}</a
		>
		<button
			type="button"
			onclick={openSearch}
			class="rounded-[6px] px-2 py-2.5 text-left hover:bg-white/5">Search the docs</button
		>
		<a
			href={GITHUB_URL}
			target="_blank"
			rel="noopener noreferrer"
			class="rounded-[6px] px-2 py-2.5 hover:bg-white/5">GitHub ↗</a
		>
		<div class="px-2 py-2.5"><MotionToggle /></div>
	</nav>
	{#snippet footer()}
		<Button href="/docs" class="w-full">Get started</Button>
	{/snippet}
</Sheet>

<style>
	.sh {
		display: flex;
		align-items: center;
		gap: 36px;
		height: 64px;
		padding: 0 40px;
		box-shadow: inset 0 -1px 0 var(--fx-hairline, rgba(242, 241, 236, 0.1));
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		font-size: 15px;
		font-weight: 650;
		letter-spacing: -0.01em;
	}

	.nav {
		display: flex;
		gap: 28px;
		font-size: 14px;
	}

	.nav a,
	.saved,
	.github {
		color: var(--fx-ink-2, #a8a7a1);
		transition: color 180ms var(--fx-ease, ease);
	}

	.nav a:hover,
	.nav a[aria-current="page"],
	.saved:hover,
	.github:hover {
		color: var(--fx-ink, #f2f1ec);
	}

	.nav a[aria-current="page"] {
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 8px;
	}

	.spacer {
		flex: 1;
	}

	.tools {
		display: flex;
		align-items: center;
		gap: 18px;
		font-size: 13px;
	}

	.saved,
	.github {
		display: inline-flex;
		align-items: center;
		gap: 7px;
	}

	.count {
		display: inline-grid;
		place-items: center;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		border-radius: 999px;
		font-size: 10.5px;
		color: var(--fx-canvas, #09090b);
		background: var(--fx-ink, #f2f1ec);
	}

	.search {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		width: 196px;
		height: 32px;
		padding: 0 8px 0 12px;
		border-radius: 8px;
		font-size: 12.5px;
		color: var(--fx-ink-3, #8f8e89);
		background: rgb(255 255 255 / 0.03);
		box-shadow: inset 0 0 0 1px var(--fx-hairline-strong, rgba(242, 241, 236, 0.18));
		cursor: pointer;
	}

	.search:hover {
		color: var(--fx-ink-2, #a8a7a1);
	}

	.search kbd {
		margin-left: auto;
		padding: 1px 5px;
		border-radius: 4px;
		font-size: 10.5px;
		box-shadow: inset 0 0 0 1px var(--fx-hairline, rgba(242, 241, 236, 0.1));
	}

	.menu {
		position: relative;
		display: none;
		place-items: center;
		width: 36px;
		height: 36px;
		margin-right: -8px;
		color: var(--fx-ink-2, #a8a7a1);
		cursor: pointer;
	}

	/* Touch: a 44 px hit area around the 36 px button, same visual size. */
	@media (pointer: coarse) {
		.menu::before {
			content: "";
			position: absolute;
			inset: -4px;
		}
	}

	/* Below lg: nav and tools move into the Sheet; search stays inline to md. */
	@media (max-width: 1023px) {
		.nav,
		.saved,
		.github,
		.tools :global(.mt),
		.tools :global(.ft-btn) {
			display: none;
		}
		.menu {
			display: grid;
		}
	}

	@media (max-width: 767px) {
		.sh {
			height: 56px;
			padding: 0 16px;
		}
		.search {
			display: none;
		}
	}
</style>
