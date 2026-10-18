<script lang="ts">
	import type { PlaygroundValues } from "$lib/inspiration/types.js";
	import { Tabs, TabsList, TabsTrigger, TabsContent } from "$lib/fancy-ui/tabs";

	let { values }: { values: PlaygroundValues } = $props();

	let value = $state("design");
</script>

<div class="flex h-full w-full items-center justify-center p-6">
	<Tabs
		bind:value
		variant={values.variant as "underline" | "segmented"}
		activation={values.activation as "automatic" | "manual"}
	>
		<!-- Clicking the middle of the list lands on the middle tab. -->
		<div data-capture="click" data-capture-wait="90">
			<TabsList>
				<TabsTrigger value="design">Design</TabsTrigger>
				<TabsTrigger value="motion">Motion</TabsTrigger>
				<TabsTrigger value="sound">Sound</TabsTrigger>
			</TabsList>
		</div>
		<TabsContent value="design">Layout, colour, type.</TabsContent>
		<TabsContent value="motion">Timing, easing, spring.</TabsContent>
		<TabsContent value="sound">Cues on press and select.</TabsContent>
	</Tabs>
</div>
