<script setup lang="ts">
import { BorderBeam, type BorderBeamProps } from "fancy-ui-vue";

const beam: BorderBeamProps = { colorFrom: "#9E7AFF", colorTo: "#FE8BBB" };
</script>

<template>
	<BorderBeam v-bind="beam" />
</template>
