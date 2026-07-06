<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Book, BookHeader, BookTitle, BookDescription } from "$lib/fancy-ui/book";

	const { Story } = defineMeta({
		title: "Cards/Book",
		component: Book,
		tags: ["autodocs"],
		args: {
			duration: 1000,
			color: "zinc",
			isStatic: false,
			size: "md",
			radius: "md",
			shadowSize: "lg",
		},
		argTypes: {
			duration: { control: { type: "number" }, description: "Hover animation duration in ms" },
			color: {
				control: "select",
				options: ["zinc", "slate", "red", "orange", "amber", "emerald", "blue", "violet", "rose"],
				description: "Color theme for the book cover gradient",
			},
			isStatic: {
				control: "boolean",
				description: "Show book in open position without hover animation",
			},
			size: {
				control: "inline-radio",
				options: ["sm", "md", "lg", "xl"],
				description: "Size variant of the book",
			},
			radius: {
				control: "inline-radio",
				options: ["sm", "md", "lg", "xl"],
				description: "Border radius variant",
			},
			shadowSize: {
				control: "inline-radio",
				options: ["sm", "md", "lg", "xl"],
				description: "Drop shadow size variant",
			},
		},
	});
</script>

{#snippet template(args: any)}
	<Book {...args}>
		<BookHeader>
			<span class="rounded bg-white/20 px-2 py-0.5 text-xs">Fiction</span>
		</BookHeader>
		<BookTitle>The Great Gatsby</BookTitle>
		<BookDescription>
			A story of the mysteriously wealthy Jay Gatsby and his love for Daisy Buchanan.
		</BookDescription>
	</Book>
{/snippet}

<Story name="Default" {template} />

<Story name="Emerald Large" {template} args={{ color: "emerald", size: "lg" }} />

<Story name="Static Open" {template} args={{ isStatic: true, color: "rose" }} />
