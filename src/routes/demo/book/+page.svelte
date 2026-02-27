<script lang="ts">
	import {
		Book,
		BookHeader,
		BookTitle,
		BookDescription,
		type BookColor,
		type BookSize,
	} from "$lib/fancy-ui/book";

	const colors: BookColor[] = ["blue", "purple", "emerald", "rose", "amber"];
	const sizes: BookSize[] = ["sm", "md", "lg", "xl"];
</script>

<svelte:head>
	<title>Book - FancyUI</title>
</svelte:head>

<div class="container mx-auto px-4 py-12">
	<h1 class="mb-2 text-3xl font-bold">Book</h1>
	<p class="text-muted-foreground mb-8">
		A 3D book component with cover, spine, and back face that opens on hover.
	</p>

	<!-- Basic Example -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Basic Usage</h2>
		<div class="bg-card flex justify-center rounded-lg border p-10">
			<Book>
				<BookHeader>
					<span class="rounded bg-white/20 px-2 py-0.5 text-xs">Fiction</span>
				</BookHeader>
				<BookTitle>The Great Gatsby</BookTitle>
				<BookDescription>
					A story of the mysteriously wealthy Jay Gatsby and his love for Daisy Buchanan.
				</BookDescription>
			</Book>
		</div>
	</section>

	<!-- Colors -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Color Variants</h2>
		<div class="bg-card flex flex-wrap justify-center gap-8 rounded-lg border p-10">
			{#each colors as bookColor}
				<Book color={bookColor}>
					<BookTitle>{bookColor}</BookTitle>
					<BookDescription>Color variant</BookDescription>
				</Book>
			{/each}
		</div>
	</section>

	<!-- Sizes -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Sizes</h2>
		<div class="bg-card flex flex-wrap items-end justify-center gap-8 rounded-lg border p-10">
			{#each sizes as bookSize}
				<Book size={bookSize} color="indigo">
					<BookTitle>{bookSize}</BookTitle>
					<BookDescription>Size variant</BookDescription>
				</Book>
			{/each}
		</div>
	</section>

	<!-- Static -->
	<section class="mb-12">
		<h2 class="mb-4 text-xl font-semibold">Static (always open)</h2>
		<div class="bg-card flex justify-center rounded-lg border p-10">
			<Book isStatic color="teal">
				<BookHeader>
					<span class="rounded bg-white/20 px-2 py-0.5 text-xs">Static</span>
				</BookHeader>
				<BookTitle>Always Open</BookTitle>
				<BookDescription>This book is always in the opened state.</BookDescription>
			</Book>
		</div>
	</section>
</div>
