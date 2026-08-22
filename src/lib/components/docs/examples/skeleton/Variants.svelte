<script lang="ts">
	import { Skeleton } from "$lib/fancy-ui/skeleton";
</script>

<div class="flex w-full flex-col gap-8 p-6">
	<div class="flex flex-wrap items-end gap-6">
		<div class="flex flex-col items-center gap-2">
			<Skeleton variant="circle" class="size-12" />
			<span class="text-muted-foreground text-xs">circle</span>
		</div>
		<div class="flex min-w-32 flex-1 flex-col items-center gap-2">
			<Skeleton variant="rect" label="" class="h-12 w-full" />
			<span class="text-muted-foreground text-xs">rect</span>
		</div>
		<div class="flex min-w-40 flex-1 flex-col items-center gap-2">
			<!-- Every bone below already sits under one "Loading" announcement (the
			     circle above); the rest stay silent with label="" rather than each
			     opening a second, third… live region for the same demo card. -->
			<Skeleton variant="text" lines={3} label="" class="w-full" />
			<span class="text-muted-foreground text-xs">text (lines=3)</span>
		</div>
	</div>

	<div class="flex flex-wrap items-end gap-6">
		<div class="flex min-w-32 flex-1 flex-col gap-2">
			<Skeleton variant="text" lines={2} animation="shimmer" label="" class="w-full" />
			<span class="text-muted-foreground text-xs">animation="shimmer"</span>
		</div>
		<div class="flex min-w-32 flex-1 flex-col gap-2">
			<Skeleton variant="text" lines={2} animation="pulse" label="" class="w-full" />
			<span class="text-muted-foreground text-xs">animation="pulse"</span>
		</div>
		<div class="flex min-w-32 flex-1 flex-col gap-2">
			<Skeleton variant="text" lines={2} animation="none" label="" class="w-full" />
			<span class="text-muted-foreground text-xs">animation="none"</span>
		</div>
	</div>
</div>
