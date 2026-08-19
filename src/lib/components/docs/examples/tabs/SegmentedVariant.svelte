<script lang="ts">
	import { Tabs, TabsList, TabsTrigger, TabsContent } from "$lib/fancy-ui/tabs";

	let view = $state("preview");
</script>

<Tabs bind:value={view} variant="segmented">
	<TabsList>
		<TabsTrigger value="preview">Preview</TabsTrigger>
		<TabsTrigger value="code">Code</TabsTrigger>
	</TabsList>
	<TabsContent value="preview">The rendered component.</TabsContent>
	<TabsContent value="code">The component's source.</TabsContent>
</Tabs>
