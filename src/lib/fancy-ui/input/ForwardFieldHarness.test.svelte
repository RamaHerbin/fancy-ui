<!--
  Test-only rig: a real FormField around each text field, with a consumer id and
  a consumer aria-describedby, to prove the FormField id drives the label's
  `for` and that descriptions merge. Not exported from index.ts, and not
  collected by Vitest (the run includes `*.test.ts` only).
-->
<script lang="ts">
	import FormField from "../form-field/FormField.svelte";
	import Input from "../input/Input.svelte";
	import Textarea from "../textarea/Textarea.svelte";
	import PasswordInput from "../password-input/PasswordInput.svelte";
	import SearchInput from "../search-input/SearchInput.svelte";
	import NumberInput from "../number-input/NumberInput.svelte";

	let { kind }: { kind: "Input" | "Textarea" | "PasswordInput" | "SearchInput" | "NumberInput" } =
		$props();
</script>

<FormField label="Field label" error="Something is wrong" id="custom-field">
	{#if kind === "Input"}
		<Input aria-describedby="ext-hint" data-testid="control" />
	{:else if kind === "Textarea"}
		<Textarea aria-describedby="ext-hint" data-testid="control" />
	{:else if kind === "PasswordInput"}
		<PasswordInput aria-describedby="ext-hint" data-testid="control" />
	{:else if kind === "SearchInput"}
		<SearchInput aria-describedby="ext-hint" data-testid="control" />
	{:else}
		<NumberInput aria-describedby="ext-hint" data-testid="control" />
	{/if}
</FormField>
