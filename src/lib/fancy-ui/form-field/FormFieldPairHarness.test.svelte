<!--
  Test-only rig: two independent FormFields, neither given an explicit `id`,
  mounted together in the same render — the only way to prove their
  generated controlIds don't collide, since $props.id()'s per-instance
  guarantee is only meaningful across instances that actually coexist. Not
  exported from index.ts, and not collected by Vitest (the run includes
  `*.test.ts` only).
-->
<script lang="ts">
	import FormField from "./FormField.svelte";
	import FormFieldControl from "./FormFieldControl.test.svelte";
</script>

<FormField label="First">
	<FormFieldControl />
</FormField>

<FormField label="Second">
	<FormFieldControl />
</FormField>
