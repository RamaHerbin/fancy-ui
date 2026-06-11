<script lang="ts">
	import { Book, BookTitle, BookDescription, type BookSize } from "$lib/fancy-ui/book";

	const sizes: BookSize[] = ["sm", "md", "lg", "xl"];
</script>

<div class="flex flex-wrap items-end justify-center gap-8">
	{#each sizes as bookSize}
		<Book size={bookSize} color="indigo">
			<BookTitle>{bookSize}</BookTitle>
			<BookDescription>Size variant</BookDescription>
		</Book>
	{/each}
</div>
