<script lang="ts">
	import {
		Accordion,
		AccordionItem,
		AccordionTrigger,
		AccordionContent,
	} from "$lib/fancy-ui/accordion";
	import { Button } from "$lib/fancy-ui/button";

	let value = $state("");
</script>

<div class="flex w-full max-w-md flex-col gap-4">
	<div class="flex flex-wrap items-center gap-2">
		<Button size="sm" variant="outline" onclick={() => (value = "one")}>Open step one</Button>
		<Button size="sm" variant="outline" onclick={() => (value = "two")}>Open step two</Button>
		<Button size="sm" variant="ghost" onclick={() => (value = "")}>Close all</Button>
		<span class="text-muted-foreground text-sm">Open: {value || "none"}</span>
	</div>

	<Accordion type="single" collapsible bind:value>
		<AccordionItem value="one">
			<AccordionTrigger>Step one: install</AccordionTrigger>
			<AccordionContent>Add the package to your project with your package manager.</AccordionContent
			>
		</AccordionItem>
		<AccordionItem value="two">
			<AccordionTrigger>Step two: import</AccordionTrigger>
			<AccordionContent>Import the components you need and render them.</AccordionContent>
		</AccordionItem>
	</Accordion>
</div>
