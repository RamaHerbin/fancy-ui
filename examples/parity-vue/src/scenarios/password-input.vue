<script setup lang="ts">
// Mirrors the password-input entry of defaultProps in src/lib/components/docs/DemoRenderer.svelte.
import { PasswordInput } from "fancy-ui-vue";
</script>

<template>
	<div class="w-full max-w-sm px-6">
		<PasswordInput label="Password" show-strength />
	</div>
</template>
