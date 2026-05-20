<script lang="ts">
	import { Book, BookTitle, BookDescription, type BookColor } from "$lib/fancy-ui/book";

	const colors: BookColor[] = ["blue", "purple", "emerald", "rose", "amber"];
</script>

<div class="flex flex-wrap justify-center gap-8">
	{#each colors as bookColor}
		<Book color={bookColor}>
			<BookTitle>{bookColor}</BookTitle>
			<BookDescription>Color variant</BookDescription>
		</Book>
	{/each}
</div>
