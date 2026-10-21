<!--
Negative control for the mount path: injecting a key nobody provides, which is
what a library part used outside its parent does. Vue warns
("injection ... not found"); the harness must go red.
-->
<script setup lang="ts">
import { inject } from "vue";

const ctx = inject<{ open: boolean }>("fancy-ui-fixture-context");
</script>

<template>
	<p>{{ ctx?.open }}</p>
</template>
