<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/file-upload/BasicUsage.svelte.
import { ref } from "vue";
import { FileUpload, type UploadFile } from "fancy-ui-vue";

const files = ref<UploadFile[]>([]);
</script>

<template>
	<div class="w-full max-w-sm">
		<FileUpload sound v-model:files="files" hint="PNG, SVG — 4 MB max" />
	</div>
</template>
