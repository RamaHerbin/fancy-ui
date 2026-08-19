<script lang="ts">
	import { Button } from "$lib/fancy-ui/button";
	import { ButtonGroup } from "$lib/fancy-ui/button-group";
</script>

<ButtonGroup label="Save document">
	<Button variant="secondary">Save</Button>
	<Button variant="secondary" class="px-[10px]" label="More save options">▼</Button>
</ButtonGroup>
