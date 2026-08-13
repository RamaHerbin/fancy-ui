<script module lang="ts">
	import { defineMeta } from "@storybook/addon-svelte-csf";
	import { Toaster, toast } from "$lib/fancy-ui/toast";
	import { Button } from "$lib/fancy-ui/button";

	const { Story } = defineMeta({
		title: "Overlays/Toast",
		component: Toaster,
		tags: ["autodocs"],
		args: {
			position: "bottom-right",
		},
		argTypes: {
			position: {
				control: "select",
				options: [
					"top-left",
					"top-center",
					"top-right",
					"bottom-left",
					"bottom-center",
					"bottom-right",
				],
			},
		},
	});

	function showSuccess() {
		toast({
			title: "Theme saved",
			description: "CSS copied to the clipboard.",
			variant: "success",
		});
	}

	function showError() {
		toast({
			title: "Failed to send",
			description: "Check your connection.",
			variant: "error",
			action: { label: "Retry", onClick: showError },
		});
	}

	function showLoading() {
		toast({ title: "Publishing…", variant: "loading" });
	}
</script>

{#snippet template(args: any)}
	<Toaster {...args} />
	<div class="flex flex-wrap gap-2">
		<Button variant="outline" onclick={showSuccess}>Success</Button>
		<Button variant="outline" onclick={showError}>Error with action</Button>
		<Button variant="outline" onclick={showLoading}>Loading (sticky)</Button>
	</div>
{/snippet}

<Story name="Default" {template} />

<Story name="Top center" {template} args={{ position: "top-center" }} />
