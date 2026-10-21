<!-- Test-only rig: composer parts carrying consumer attribute bags inside a real root. -->
<script lang="ts">
	import Composer from "./Composer.svelte";
	import ComposerInput from "./ComposerInput.svelte";
	import ComposerSubmit from "./ComposerSubmit.svelte";
	import ComposerModelPicker from "./ComposerModelPicker.svelte";

	interface Props {
		inputAttrs?: Record<string, unknown>;
		submitAttrs?: Record<string, unknown>;
		pickerAttrs?: Record<string, unknown>;
		initialValue?: string;
		streaming?: boolean;
		onStop?: () => void;
		onSubmit?: (payload: { text: string }) => void;
	}

	let {
		inputAttrs = {},
		submitAttrs = {},
		pickerAttrs = {},
		initialValue = "",
		streaming = false,
		onStop,
		onSubmit,
	}: Props = $props();

	const models = [
		{ id: "a", label: "Alpha" },
		{ id: "b", label: "Beta" },
	];
</script>

<Composer value={initialValue} {streaming} {onStop} {onSubmit}>
	<ComposerInput {...inputAttrs} />
	<ComposerModelPicker {models} {...pickerAttrs} />
	<ComposerSubmit {...submitAttrs} />
</Composer>
