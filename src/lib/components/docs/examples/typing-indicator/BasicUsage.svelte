<script lang="ts">
	import { TypingIndicator } from "$lib/fancy-ui/typing-indicator";
</script>

<div class="flex w-full flex-col items-start gap-8 p-6">
	<div class="flex w-full max-w-md flex-col gap-2">
		<div class="bg-primary text-primary-foreground ml-auto rounded-2xl rounded-br-sm px-4 py-2.5">
			<p class="text-sm">Can you summarize the release notes?</p>
		</div>
		<div class="bg-muted text-muted-foreground mr-auto rounded-2xl rounded-bl-sm px-4 py-3.5">
			<TypingIndicator label="Assistant is typing" />
		</div>
	</div>

	<div class="flex items-center gap-3">
		<TypingIndicator size={10} speed={1.6} class="text-muted-foreground" />
		<span class="text-muted-foreground text-sm">Larger and slower, on its own</span>
	</div>
</div>
