<script setup lang="ts">
// Parity variant for scripts/parity/states.mjs; mirrors
// src/routes/_parity/[slug]/variants/select--long.svelte.
import { ref } from "vue";
import { Select } from "fancy-ui-vue";

const regions = [
	{ value: "eu-west", label: "Europe West (Paris), primary region with the lowest latency" },
	{ value: "eu-central", label: "Europe Central (Frankfurt), secondary region for failover" },
	{ value: "eu-north", label: "Europe North (Stockholm), renewable energy only" },
	{ value: "us-east", label: "US East (Virginia), largest region and first to get features" },
	{ value: "us-west", label: "US West (Oregon), close to most design partners" },
	{ value: "ca-central", label: "Canada Central (Montreal), data stays in the country" },
	{ value: "sa-east", label: "South America East (Sao Paulo), regional compliance" },
	{ value: "ap-south", label: "Asia Pacific South (Mumbai), new region in preview" },
	{ value: "ap-southeast", label: "Asia Pacific Southeast (Singapore), shared edge cache" },
	{ value: "ap-northeast", label: "Asia Pacific Northeast (Tokyo), dedicated hardware" },
	{ value: "au-east", label: "Australia East (Sydney), longest replication window" },
	{ value: "af-south", label: "Africa South (Cape Town), limited instance types" },
];

const region = ref("eu-west");
</script>

<template>
	<Select :options="regions" v-model:value="region" label="Region" class="w-[220px]" />
</template>
