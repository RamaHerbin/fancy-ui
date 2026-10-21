<script setup lang="ts">
import { ref } from "vue";
import { Switch } from "fancy-ui-vue";

const notifications = ref(false);
</script>

<template>
	<Switch v-model:checked="notifications" sound label="Notifications" />
</template>
