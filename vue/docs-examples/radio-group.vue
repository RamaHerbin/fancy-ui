<script setup lang="ts">
import { ref } from "vue";
import { RadioGroup, RadioGroupItem } from "fancy-ui-vue";

const plan = ref("starter");
</script>

<template>
	<RadioGroup v-model:value="plan" sound label="Plan">
		<RadioGroupItem value="starter" label="Starter" />
		<RadioGroupItem value="team" label="Team" />
		<RadioGroupItem value="enterprise" label="Enterprise" />
	</RadioGroup>
</template>
