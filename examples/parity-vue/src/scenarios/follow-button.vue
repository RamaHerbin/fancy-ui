<script setup lang="ts">
// Mirrors src/lib/components/docs/examples/follow-button/BasicUsage.svelte.
import { ref } from "vue";
import { FollowButton } from "fancy-ui-vue";

const following = ref(false);
</script>

<template>
	<FollowButton sound v-model:following="following" label="Follow Rama" />
</template>
