<script lang="ts">
	import { Tabs, TabsList, TabsTrigger, TabsContent } from "$lib/fancy-ui/tabs";

	let section = $state("general");
</script>

<Tabs bind:value={section} orientation="vertical">
	<div class="flex gap-6">
		<TabsList>
			<TabsTrigger value="general">General</TabsTrigger>
			<TabsTrigger value="notifications">Notifications</TabsTrigger>
			<TabsTrigger value="advanced">Advanced</TabsTrigger>
		</TabsList>
		<div class="flex-1">
			<TabsContent value="general">General settings live here.</TabsContent>
			<TabsContent value="notifications">Choose what you get notified about.</TabsContent>
			<TabsContent value="advanced">Advanced, rarely-touched settings.</TabsContent>
		</div>
	</div>
</Tabs>
