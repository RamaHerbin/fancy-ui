<!--
	Top strip of the 13a frame: every element sits in its own bordered cell so
	the nav reads as the first row of the page's grid rather than floating
	chrome. The search cell opens the docs command palette (⌘K works here too,
	the palette owns the shortcut), and the star count is the live GitHub number.
-->
<script lang="ts">
	import { Button } from "$lib/fancy-ui";
	import Logo from "$lib/components/Logo.svelte";
	import GitHubStars from "$lib/components/docs/GitHubStars.svelte";
	import { GITHUB_URL } from "$lib/site.js";

	interface Props {
		onSearchClick?: () => void;
	}

	let { onSearchClick }: Props = $props();

	const navLinks: { label: string; href: string }[] = [
		{ label: "Docs", href: "/docs/getting-started/introduction" },
		{ label: "Components", href: "/docs/components" },
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
			style="color:var(--lp-grey-4);border-color:rgba(242,241,236,.16)"
		>
			⌕ Search
			<span
				class="lp-mono ml-auto rounded-[2px] border px-[5px] text-[10.5px]"
				style="border-color:rgba(242,241,236,.14)">⌘ K</span
			>
		</span>
	</button>

	<a
		href={GITHUB_URL}
		target="_blank"
		rel="noopener noreferrer"
		class="lp-link lp-line hidden items-center gap-2 border-l px-5 text-[13px] sm:flex"
		style="color:var(--lp-grey-1)"
	>
		<GitHubStars class="lp-mono" />
	</a>

	<span class="lp-line flex items-center border-l px-3.5">
		<Button href="/docs">Get Started</Button>
	</span>
</header>
