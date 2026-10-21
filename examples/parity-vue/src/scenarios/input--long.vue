<script setup lang="ts">
// Parity variant for scripts/parity/states.mjs; mirrors
// src/routes/_parity/[slug]/variants/input--long.svelte.
import { Input } from "fancy-ui-vue";
</script>

<template>
	<div class="w-[260px]">
		<Input
			label="Email"
			placeholder="name@example.com"
			value="a.very.long.address.that.keeps.going.for.the.parity.bench@subdomain.example-company.com"
		/>
	</div>
</template>
