<script lang="ts">
	import { OpticalDisc } from "$lib/fancy-ui/optical-disc";
</script>

<div class="flex w-full items-center justify-center rounded-xl bg-neutral-950 p-8">
	<OpticalDisc
		label="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80"
		alt="A disc printed with a mountain photograph"
		spin={0}
		angle={0}
		tilt={8}
		tint="#d9a441"
		class="max-w-xs"
	/>
</div>
