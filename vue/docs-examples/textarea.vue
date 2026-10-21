<script setup lang="ts">
import { ref } from "vue";
import { Textarea } from "fancy-ui-vue";

const message = ref("");
</script>

<template>
	<div class="w-full max-w-sm">
		<Textarea v-model:value="message" placeholder="A multi-line message…" label="Message" />
	</div>
</template>
