<!--
	Top strip of the 13a frame: every element sits in its own bordered cell so
	the nav reads as the first row of the page's grid rather than floating
	chrome. The search field is a link to the docs (there is no site-wide
	search), and the star count is the live GitHub number.
-->
<script lang="ts">
	import Logo from "$lib/components/Logo.svelte";
	import GitHubStars from "$lib/components/docs/GitHubStars.svelte";
	import { GITHUB_URL } from "$lib/site.js";

	const navLinks: { label: string; href: string }[] = [
		{ label: "Docs", href: "/docs/getting-started/introduction" },
		{ label: "Components", href: "/docs/components" },
		{ label: "Themes", href: "/docs/getting-started/theming" },
		{ label: "Blog", href: "/docs/getting-started/changelog" },
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

	<a
		href="/docs/components"
		class="lp-line hidden items-center border-l px-4 md:flex"
		aria-label="Browse components"
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
	</a>

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
		<a href="/docs" class="lp-btn-accent rounded-[2px] px-[18px] py-[9px] text-[13px] font-medium">
			Get Started
		</a>
	</span>
</header>
