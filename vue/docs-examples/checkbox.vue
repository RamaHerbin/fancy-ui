<script setup lang="ts">
import { ref } from "vue";
import { Checkbox } from "fancy-ui-vue";

const agreed = ref(false);
</script>

<template>
	<Checkbox v-model:checked="agreed" sound>I agree to the terms and conditions</Checkbox>
</template>
