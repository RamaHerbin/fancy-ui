<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/book/BasicUsage.svelte.
import { Book, BookHeader, BookTitle, BookDescription } from "fancy-ui-vue";
</script>

<template>
	<Book>
		<BookHeader>
			<span class="rounded bg-white/20 px-2 py-0.5 text-xs">Fiction</span>
		</BookHeader>
		<BookTitle>The Great Gatsby</BookTitle>
		<BookDescription>
			A story of the mysteriously wealthy Jay Gatsby and his love for Daisy Buchanan.
		</BookDescription>
	</Book>
</template>
