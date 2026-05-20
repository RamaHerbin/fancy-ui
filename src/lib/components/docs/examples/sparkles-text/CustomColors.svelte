<script lang="ts">
	import { SparklesText } from "$lib/fancy-ui/sparkles-text";
</script>

<div class="space-y-8">
	<div class="flex items-center justify-center">
		<SparklesText text="Golden" colors={{ first: "#FFD700", second: "#FFA500" }} />
	</div>
	<div class="flex items-center justify-center">
		<SparklesText
			text="Neon"
			colors={{ first: "#00FF88", second: "#00BBFF" }}
			class="text-foreground"
		/>
	</div>
</div>
