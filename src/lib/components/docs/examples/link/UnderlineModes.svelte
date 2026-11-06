<script lang="ts">
	import { Link } from "$lib/fancy-ui/link";
</script>

<div class="flex flex-col gap-4 text-sm">
	<div class="flex flex-wrap items-center gap-6">
		<Link sound href="/docs/components/link" underline="hover">Thin at rest, full on hover</Link>
		<Link sound href="/docs/components/link" underline="always">Always underlined</Link>
		<Link sound href="/docs/components/link" underline="none">Never underlined</Link>
	</div>
	<div class="flex flex-wrap items-center gap-6">
		<Link sound href="/docs/components/link" variant="muted" underline="hover"
			>Muted, underline on hover</Link
		>
		<Link sound href="/docs/components/link" variant="muted" underline="always"
			>Muted, always underlined</Link
		>
	</div>
</div>
