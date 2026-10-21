<script setup lang="ts">
import { FormField, Input } from "fancy-ui-vue";
</script>

<template>
	<FormField label="Email" description="We'll only use this to send your receipt.">
		<Input type="email" placeholder="you@example.com" />
	</FormField>
</template>
