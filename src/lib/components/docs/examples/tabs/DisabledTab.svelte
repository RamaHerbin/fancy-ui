<script lang="ts">
	import { Tabs, TabsList, TabsTrigger, TabsContent } from "$lib/fancy-ui/tabs";

	let plan = $state("starter");
</script>

<Tabs bind:value={plan}>
	<TabsList>
		<TabsTrigger value="starter">Starter</TabsTrigger>
		<TabsTrigger value="team" disabled>Team</TabsTrigger>
		<TabsTrigger value="enterprise">Enterprise</TabsTrigger>
	</TabsList>
	<TabsContent value="starter">Starter plan details.</TabsContent>
	<TabsContent value="team">Team plan details — requires an upgrade.</TabsContent>
	<TabsContent value="enterprise">Enterprise plan details.</TabsContent>
</Tabs>
