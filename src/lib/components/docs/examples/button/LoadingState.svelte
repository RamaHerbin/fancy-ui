<script lang="ts">
	import { Button } from "$lib/fancy-ui/button";

	let saving = $state(false);

	async function save() {
		saving = true;
		await new Promise((resolve) => setTimeout(resolve, 1200));
		saving = false;
	}
</script>

<Button loading={saving} onclick={save}>
	{saving ? "Saving..." : "Save changes"}
</Button>
