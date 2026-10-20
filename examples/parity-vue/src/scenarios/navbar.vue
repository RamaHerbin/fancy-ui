<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/navbar/BasicUsage.svelte.
import { ref } from "vue";
import { Navbar, NavbarLink } from "fancy-ui-vue";

const current = ref("docs");
</script>

<template>
	<Navbar>
		<template #brand>
			<span
				class="h-2 w-2 rounded-sm bg-gradient-to-br from-purple-500 to-cyan-400"
				aria-hidden="true"
			></span>
			FancyUI
		</template>

		<NavbarLink
			sound
			href="#docs"
			:current="current === 'docs'"
			:onclick="() => (current = 'docs')"
		>
			Docs
		</NavbarLink>
		<NavbarLink
			sound
			href="#components"
			:current="current === 'components'"
			:onclick="() => (current = 'components')"
		>
			Components
		</NavbarLink>
		<NavbarLink
			sound
			href="#showcase"
			:current="current === 'showcase'"
			:onclick="() => (current = 'showcase')"
		>
			Showcase
		</NavbarLink>
	</Navbar>
</template>
