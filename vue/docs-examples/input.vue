<script setup lang="ts">
import { ref } from "vue";
import { Input } from "fancy-ui-vue";

const email = ref("");
</script>

<template>
	<Input v-model:value="email" type="email" placeholder="name@example.com" label="Email" />
</template>
