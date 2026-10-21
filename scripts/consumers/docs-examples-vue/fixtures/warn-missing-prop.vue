<!--
Negative control for the mount path: this snippet type-checks but makes Vue warn
("Missing required prop"). `docs-examples-vue.mjs --source <this folder>` must go
red on it, proving the warnHandler catches real warnings.
-->
<script setup lang="ts">
import { defineComponent, h, type Component } from "vue";

const Child = defineComponent({
	props: { label: { type: String, required: true } },
	setup: (props) => () => h("span", props.label),
});
const Host = defineComponent(() => () => h(Child as Component));
</script>

<template>
	<Host />
</template>
