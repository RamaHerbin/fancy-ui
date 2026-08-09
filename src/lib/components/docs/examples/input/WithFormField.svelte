<script lang="ts">
	// FormField ships from this same wave, built by a different component.
	// It supplies controlId, aria-describedby and aria-invalid to Input
	// through context — Input itself needs no id or invalid prop here.
	// FormField takes `error` text, not a boolean: the presence of error
	// text is what marks the field invalid, and it replaces the help text
	// rather than stacking under it.
	import { FormField } from "$lib/fancy-ui/form-field";
	import { Input } from "$lib/fancy-ui/input";

	let username = $state("ab");
	const error = $derived(username.length < 3 ? "Minimum 3 characters." : undefined);
</script>

<FormField label="Username" required {error} class="w-full max-w-sm">
	<Input bind:value={username} />
</FormField>
