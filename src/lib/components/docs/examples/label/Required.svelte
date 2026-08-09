<script lang="ts">
	import { Label } from "$lib/fancy-ui/label";
</script>

<div class="flex flex-col gap-1.5">
	<Label for="required-username" required>Username</Label>
	<input
		id="required-username"
		type="text"
		required
		placeholder="Choose a username"
		class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:border-ring w-full rounded-lg border px-3 py-[9px] text-[13px] outline-none focus-visible:ring-2"
	/>
</div>
