<script setup lang="ts">
import { ref } from "vue";
import { Button } from "fancy-ui-vue";

const count = ref(0);
</script>

<template>
	<Button sound :onclick="() => (count += 1)">
		Clicked {{ count }} {{ count === 1 ? "time" : "times" }}
	</Button>
</template>
