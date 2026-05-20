<script lang="ts">
	import { LineShadowText } from "$lib/fancy-ui/line-shadow-text";
</script>

<div class="flex flex-col items-center gap-6">
	<p class="text-5xl leading-none font-bold">
		Red <LineShadowText text="Shadow" shadowColor="red" />
	</p>
	<p class="text-5xl leading-none font-bold">
		Blue <LineShadowText text="Shadow" shadowColor="royalblue" />
	</p>
	<p class="text-5xl leading-none font-bold">
		Emerald <LineShadowText text="Shadow" shadowColor="oklch(0.765 0.177 163.22)" />
	</p>
</div>
