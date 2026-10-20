<script setup lang="ts">
// Mirrors the password-input entry of defaultProps in src/lib/components/docs/DemoRenderer.svelte.
import { PasswordInput } from "fancy-ui-vue";
</script>

<template>
	<PasswordInput label="Password" show-strength />
</template>
