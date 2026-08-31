<script lang="ts">
	import { Tabs, TabsList, TabsTrigger, TabsContent } from "$lib/fancy-ui/tabs";

	let step = $state("one");
</script>

<Tabs sound bind:value={step} activation="manual">
	<TabsList>
		<TabsTrigger value="one">Step one</TabsTrigger>
		<TabsTrigger value="two">Step two</TabsTrigger>
		<TabsTrigger value="three">Step three</TabsTrigger>
	</TabsList>
	<TabsContent value="one">
		Arrow keys only move focus here — press Enter or Space to select.
	</TabsContent>
	<TabsContent value="two">Step two's content.</TabsContent>
	<TabsContent value="three">Step three's content.</TabsContent>
</Tabs>
