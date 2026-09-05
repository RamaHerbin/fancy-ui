<script lang="ts">
	// FormField ships from an earlier wave and supplies controlId,
	// aria-describedby and aria-invalid to PasswordInput through context —
	// PasswordInput itself needs no id or invalid prop here.
	import { FormField } from "$lib/fancy-ui/form-field";
	import { PasswordInput } from "$lib/fancy-ui/password-input";

	let password = $state("");
</script>

<FormField
	label="New password"
	description="At least 8 characters, mixing upper, lower and a number."
	class="w-full max-w-sm"
>
	<PasswordInput sound bind:value={password} autocomplete="new-password" showStrength />
</FormField>
