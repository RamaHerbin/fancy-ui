<script lang="ts">
	import { Button } from "$lib/fancy-ui/button";
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center gap-3">
		<Button disabled>Disabled</Button>
		<Button disabled variant="secondary">Disabled</Button>
		<Button disabled variant="outline">Disabled</Button>
		<Button disabled href="https://example.com">Disabled link</Button>
	</div>

	<p class="text-muted-foreground max-w-md text-sm leading-relaxed">
		The button and the link are inert for different reasons. The button gets the real
		<code class="text-xs">disabled</code> attribute; the link has no such state to lean on, so it
		drops <code class="text-xs">href</code> entirely rather than relying on a click handler alone to stop
		the navigation.
	</p>
</div>
