<script lang="ts">
	import { FormField } from "$lib/fancy-ui/form-field";
</script>

<FormField
	id="plan-slug"
	label="Workspace slug"
	description="Set once, at workspace creation."
	disabled
>
	{#snippet children()}
		<input
			id="plan-slug"
			type="text"
			value="acme-inc"
			disabled
			aria-describedby="plan-slug-description"
			class="border-input bg-background w-full rounded-lg border px-3 py-[9px] text-[13px] outline-none disabled:cursor-not-allowed disabled:opacity-50"
		/>
	{/snippet}
</FormField>
