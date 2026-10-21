<!--
Negative control for the "rendered something" check: no warning, but the only
node is the empty v-if placeholder comment, so nothing is visible. The harness must go
red on the element count.
-->
<script setup lang="ts">
const visible = false;
</script>

<template>
	<div v-if="visible">never rendered</div>
</template>
