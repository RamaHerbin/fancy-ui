<script lang="ts">
	import { Badge } from "$lib/fancy-ui/badge";
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center gap-2">
		<Badge size="sm" variant="secondary">Small</Badge>
		<Badge size="md" variant="secondary">Regular</Badge>
	</div>
	<ul class="flex flex-col gap-2 text-sm">
		<li class="flex items-center justify-between gap-6">
			<span>Inbox</span>
			<Badge size="sm">12</Badge>
		</li>
		<li class="flex items-center justify-between gap-6">
			<span>Deploys</span>
			<Badge size="sm" variant="destructive">2 failed</Badge>
		</li>
		<li class="flex items-center justify-between gap-6">
			<span>Billing</span>
			<Badge size="sm" variant="success">Paid</Badge>
		</li>
	</ul>
</div>
