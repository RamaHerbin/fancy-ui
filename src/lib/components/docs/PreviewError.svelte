<script lang="ts">
	interface Props {
		/**
		 * What failed: "render" when the demo threw while mounting, "import" when its
		 * module never loaded. Exposed as `data-preview-error` for the preview-health sweep.
		 */
		kind: "render" | "import";
	}

	let { kind }: Props = $props();

	const previewFailedText = "This preview failed to render."; // i18n: comp.previewFailed
</script>

<!-- The visible half of a preview failure; the real error goes to the console. -->
<div
	data-preview-error={kind}
	role="alert"
	class="border-border text-muted-foreground flex min-h-24 w-full items-center justify-center rounded-md border border-dashed p-6 text-center text-sm"
>
	{previewFailedText}
</div>
