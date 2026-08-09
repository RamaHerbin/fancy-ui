<script lang="ts">
	import { FormField } from "$lib/fancy-ui/form-field";
</script>

<!--
  Setting `error` replaces the help text with the error message and marks
  the field invalid — the plain <input> below mirrors aria-invalid by hand
  the same way it mirrors the id; a context-aware control reads both off
  FormField's context automatically.
-->
<FormField id="signup-username" label="Username" required error="Minimum 3 characters.">
	{#snippet children()}
		<input
			id="signup-username"
			type="text"
			value="ab"
			aria-invalid="true"
			aria-describedby="signup-username-error"
			class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:border-ring aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/25 w-full rounded-lg border px-3 py-[9px] text-[13px] outline-none focus-visible:ring-2"
		/>
	{/snippet}
</FormField>
