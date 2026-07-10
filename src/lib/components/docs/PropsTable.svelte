<script lang="ts">
	import type { PropDef } from "$lib/types.js";
	import { t } from "$lib/stores";

	interface Props {
		props: PropDef[];
	}

	let { props }: Props = $props();
</script>

{#if props.length > 0}
	<div class="overflow-x-auto">
		<table class="w-full text-left text-sm">
			<thead>
				<tr class="border-border border-b">
					<th class="text-foreground px-4 py-3 font-semibold">{t("table.prop")}</th>
					<th class="text-foreground px-4 py-3 font-semibold">{t("table.type")}</th>
					<th class="text-foreground px-4 py-3 font-semibold">{t("table.default")}</th>
					<th class="text-foreground px-4 py-3 font-semibold">{t("table.description")}</th>
				</tr>
			</thead>
			<tbody>
				{#each props as prop}
					<tr class="border-border border-b last:border-0">
						<td class="px-4 py-3">
							<code
								class="bg-muted rounded px-1.5 py-0.5 font-mono text-xs font-medium text-purple-600 dark:text-purple-400"
							>
								{prop.name}
							</code>
							{#if prop.required}
								<span class="ml-1 text-xs text-red-500">*</span>
							{/if}
						</td>
						<td class="text-muted-foreground px-4 py-3 font-mono text-xs">
							{prop.type}
						</td>
						<td class="px-4 py-3 font-mono text-xs">
							{#if prop.default}
								<code class="text-muted-foreground">{prop.default}</code>
							{:else}
								<span class="text-muted-foreground/50">-</span>
							{/if}
						</td>
						<td class="text-muted-foreground px-4 py-3 text-xs">
							{prop.description}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
