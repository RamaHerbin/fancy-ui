<!--
  "HDR" pill for inspiration demos. Watches its parent's subtree and shows only
  while an element in it carries `data-hdr`, i.e. while a component's HDR light
  layer is actually running on this display.
-->
<script lang="ts">
	let badge: HTMLSpanElement | undefined = $state();
	let on = $state(false);

	$effect(() => {
		const scope = badge?.parentElement;
		if (!scope) return;
		const check = () => (on = scope.querySelector("[data-hdr]") !== null);
		check();
		const mo = new MutationObserver(check);
		mo.observe(scope, { subtree: true, childList: true, attributeFilter: ["data-hdr"] });
		return () => mo.disconnect();
	});
</script>

<span
	bind:this={badge}
	class="pointer-events-none absolute top-3 right-3 z-50 rounded-full border border-white/25 bg-black/30 px-2 py-0.5 font-mono text-[9.5px] tracking-[0.18em] text-white/75 transition-opacity duration-300"
	style:opacity={on ? 1 : 0}
	aria-hidden="true">HDR</span
>
