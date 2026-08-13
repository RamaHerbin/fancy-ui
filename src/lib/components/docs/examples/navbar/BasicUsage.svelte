<script lang="ts">
	import { Navbar, NavbarLink } from "$lib/fancy-ui/navbar";

	let current = $state("docs");
</script>

<Navbar>
	{#snippet brand()}
		<span
			class="h-2 w-2 rounded-sm bg-gradient-to-br from-purple-500 to-cyan-400"
			aria-hidden="true"
		></span>
		FancyUI
	{/snippet}

	<NavbarLink href="#docs" current={current === "docs"} onclick={() => (current = "docs")}>
		Docs
	</NavbarLink>
	<NavbarLink
		href="#components"
		current={current === "components"}
		onclick={() => (current = "components")}
	>
		Components
	</NavbarLink>
	<NavbarLink
		href="#showcase"
		current={current === "showcase"}
		onclick={() => (current = "showcase")}
	>
		Showcase
	</NavbarLink>
</Navbar>
