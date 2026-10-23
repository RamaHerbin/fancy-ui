<script setup lang="ts">
// Explicit import keeps this fixture about CSS only, independent of the
// component auto-registration.
import { BorderBeam } from "fancy-ui-vue";
import { onMounted, ref } from "vue";

const hydrated = ref(false);
onMounted(() => {
	hydrated.value = true;
});
</script>

<template>
	<main :data-hydrated="hydrated ? 'true' : undefined">
		<div id="beam-host" style="position: relative; width: 320px; height: 180px">
			<BorderBeam />
		</div>
		<span id="tw-probe" class="bg-primary">probe</span>
	</main>
</template>
