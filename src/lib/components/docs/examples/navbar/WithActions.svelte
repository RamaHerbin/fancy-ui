<script lang="ts">
	import { Navbar, NavbarLink } from "$lib/fancy-ui/navbar";
	import { Button } from "$lib/fancy-ui/button";
</script>

<Navbar>
	{#snippet brand()}
		<span
			class="h-2 w-2 rounded-sm bg-gradient-to-br from-purple-500 to-cyan-400"
			aria-hidden="true"
		></span>
		FancyUI
	{/snippet}

	<NavbarLink sound href="#docs" current>Docs</NavbarLink>
	<NavbarLink sound href="#components">Components</NavbarLink>
	<NavbarLink sound href="#showcase">Showcase</NavbarLink>

	{#snippet actions()}
		<button
			type="button"
			aria-label="Search"
			class="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-[4px] p-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
		>
			<svg
				class="size-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<circle cx="11" cy="11" r="7" />
				<line x1="21" y1="21" x2="16.65" y2="16.65" />
			</svg>
		</button>
		<Button size="sm">Sign in</Button>
	{/snippet}
</Navbar>
