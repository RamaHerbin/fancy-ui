<script lang="ts">
	import { Navbar, NavbarLink } from "$lib/fancy-ui/navbar";

	const paragraphs = Array.from({ length: 8 }, (_, i) => i);
</script>

<!--
	A fixed-height, scrollable wrapper so the sticky behaviour is visible
	inside the docs preview — in a real app `sticky` pins to the nearest
	scrolling ancestor, typically the page itself.
-->
<div class="border-border h-72 overflow-y-auto rounded-lg border">
	<Navbar sticky>
		{#snippet brand()}
			<span
				class="h-2 w-2 rounded-sm bg-gradient-to-br from-purple-500 to-cyan-400"
				aria-hidden="true"
			></span>
			FancyUI
		{/snippet}

		<NavbarLink href="#docs" current>Docs</NavbarLink>
		<NavbarLink href="#components">Components</NavbarLink>
		<NavbarLink href="#showcase">Showcase</NavbarLink>
	</Navbar>

	<div class="text-muted-foreground space-y-3 p-5 text-sm">
		{#each paragraphs as i (i)}
			<p>
				Scroll to see the bar stay pinned to the top of this container with a blurred, translucent
				background — paragraph {i + 1}.
			</p>
		{/each}
	</div>
</div>
