<script setup lang="ts">
import { ref } from "vue";
import { FollowButton, Switch } from "fancy-ui-vue";

const following = ref(false);
const failNext = ref(false);

// A fake server: every request takes 800 ms. With the switch on, the next one
// is refused, so the rollback and the retry can both be watched.
async function onToggle() {
	await new Promise((resolve) => setTimeout(resolve, 800));
	if (failNext.value) {
		failNext.value = false;
		throw new Error("The server said no");
	}
}
</script>

<template>
	<div class="flex flex-col items-center gap-4">
		<FollowButton sound v-model:following="following" :on-toggle="onToggle" label="Follow Rama" />
		<Switch v-model:checked="failNext">Fail next request</Switch>
	</div>
</template>
