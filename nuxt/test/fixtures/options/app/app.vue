<script setup lang="ts">
// No import on purpose: useSoundEnabled must arrive through the module's
// auto-imports. It reads `false` on the server (sound hydrates on mount).
const enabled = useSoundEnabled();
</script>

<template>
	<p id="sound-enabled">sound-enabled:{{ enabled }}</p>
</template>
