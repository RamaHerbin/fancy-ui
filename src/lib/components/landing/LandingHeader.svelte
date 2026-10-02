<!--
	Top strip of the 13a frame: every element sits in its own bordered cell so
	the nav reads as the first row of the page's grid rather than floating
	chrome. The search cell opens the docs command palette (⌘K works here too,
	the palette owns the shortcut), and the star count is the live GitHub number.
-->
<script lang="ts">
	import { Button, Sheet } from "$lib/fancy-ui";
	import Logo from "$lib/components/Logo.svelte";
	import GitHubStars from "$lib/components/docs/GitHubStars.svelte";
	import { GITHUB_URL } from "$lib/site.js";

	interface Props {
		onSearchClick?: () => void;
	}

	let { onSearchClick }: Props = $props();

	let menuOpen = $state(false);

	/** Mac shows ⌘, everyone else Ctrl — resolved after hydration, ⌘ on the server. */
	let modKey = $state("⌘");
	$effect(() => {
		if (!/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) modKey = "Ctrl";
	});

	function openSearch() {
		menuOpen = false;
		onSearchClick?.();
	}

	const navLinks: { label: string; href: string }[] = [
		{ label: "Docs", href: "/docs/getting-started/introduction" },
		{ label: "Components", href: "/docs/components" },
		{ label: "Finds", href: "/finds" },
		{ label: "Themes", href: "/docs/getting-started/theming" },
		{ label: "Changelog", href: "/docs/getting-started/changelog" },
	];
</script>

<header class="lp-line flex h-[54px] items-stretch border-b">
	<a
		href="/"
		class="lp-line flex items-center gap-2.5 border-r px-5 text-[15px] font-semibold tracking-[-0.01em] sm:px-6"
	>
		<Logo size={18} animated />
		Fancy UI
	</a>

	<nav class="hidden items-center gap-0.5 px-2.5 text-[13.5px] lg:flex">
		{#each navLinks as link (link.href)}
			<a href={link.href} class="lp-link px-3.5 py-2">{link.label}</a>
		{/each}
	</nav>

	<span class="flex-1"></span>

	<button
		type="button"
		onclick={onSearchClick}
		class="lp-line hidden cursor-pointer items-center border-l px-4 md:flex"
		aria-label="Search the docs"
	>
		<span
			class="lp-line-strong flex w-[214px] items-center gap-2 rounded-[2px] border px-3 py-2 text-[12.5px]"
			style="color:var(--lp-grey-3);border-color:rgba(242,241,236,.16)"
		>
			⌕ Search
			<span
				class="lp-mono ml-auto rounded-[2px] border px-[5px] text-[10.5px]"
				style="border-color:rgba(242,241,236,.14)">{modKey} K</span
			>
		</span>
	</button>

	<a
		href={GITHUB_URL}
		target="_blank"
		rel="noopener noreferrer"
		class="lp-link lp-line hidden items-center gap-2.5 border-l px-5 text-[13px] sm:flex"
		style="color:var(--lp-grey-1)"
	>
		<!-- The label is always there: the star count is a live fetch that can
		     be slow, rate-limited or offline, and an empty cell is a link with no name. -->
		GitHub
		<GitHubStars class="lp-mono" />
	</a>

	<span class="lp-line hidden items-center border-l px-3.5 sm:flex">
		<Button href="/docs">Get Started</Button>
	</span>

	<!-- Below lg the inline nav is gone; the menu carries it, plus search. -->
	<button
		type="button"
		onclick={() => (menuOpen = true)}
		class="lp-link lp-line flex cursor-pointer items-center gap-2 border-l px-5 text-[13px] lg:hidden"
		aria-label="Open menu"
		aria-expanded={menuOpen}
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

<!-- Portalled out of .lp-root, so it carries `dark` itself. -->
<Sheet bind:open={menuOpen} side="right" size="sm" title="Fancy UI" class="dark">
	<nav class="flex flex-col gap-1 text-[15px]">
		{#each navLinks as link (link.href)}
			<a href={link.href} class="rounded-[2px] px-2 py-2.5 hover:bg-white/5">{link.label}</a>
		{/each}
		<a
			href={GITHUB_URL}
			target="_blank"
			rel="noopener noreferrer"
			class="rounded-[2px] px-2 py-2.5 hover:bg-white/5">GitHub ↗</a
		>
		<button
			type="button"
			onclick={openSearch}
			class="rounded-[2px] px-2 py-2.5 text-left hover:bg-white/5">Search the docs</button
		>
	</nav>
	{#snippet footer()}
		<Button href="/docs" class="w-full">Get Started</Button>
	{/snippet}
</Sheet>
