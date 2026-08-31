<script lang="ts">
	import { Checkbox } from "$lib/fancy-ui/checkbox";
</script>

<div class="flex flex-col gap-3">
	<Checkbox sound checked={false}>Unchecked</Checkbox>
	<Checkbox sound checked={true}>Checked</Checkbox>
	<Checkbox sound checked={false} indeterminate={true}>Indeterminate</Checkbox>
	<Checkbox checked={false} disabled>Disabled</Checkbox>
</div>
