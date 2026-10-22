<script setup lang="ts">
import { Avatar } from "fancy-ui-vue";

// A self-contained image, so the example needs no network.
const portrait = `data:image/svg+xml,${encodeURIComponent(
	'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f59e0b"/><stop offset="1" stop-color="#db2777"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><circle cx="32" cy="26" r="11" fill="#fff" fill-opacity=".85"/><path d="M10 64c2-14 12-20 22-20s20 6 22 20z" fill="#fff" fill-opacity=".85"/></svg>'
)}`;
</script>

<template>
	<div class="flex flex-wrap items-center gap-4">
		<Avatar :src="portrait" alt="Maya Okafor" name="Maya Okafor" />
		<Avatar name="Lena Fischer" />
		<Avatar name="Tomás Rivera" shape="square" />
		<Avatar name="Aiko Tanaka" size="lg" />
	</div>
</template>
