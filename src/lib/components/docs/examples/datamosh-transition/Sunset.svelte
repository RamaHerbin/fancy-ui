<script lang="ts">
	import { DatamoshTransition } from "$lib/fancy-ui/datamosh-transition";

	type Scene = "golden" | "dusk";

	/** A vector trace of a sunset photo; dusk is the same picture, filtered. */
	const PICTURE = "/examples/datamosh-sunset.svg";
	const DUSK_FILTER = "brightness(0.45) saturate(1.1) hue-rotate(-100deg)";

	let scene = $state<Scene>("golden");
	let picture = $state(true);
	let busy = $state(false);
	let source = $state<string | HTMLCanvasElement | undefined>();
	let transition: ReturnType<typeof DatamoshTransition>;
	let imgEl: HTMLImageElement;

	/** The scene being left, as something the transition can decode. */
	async function snapshot(): Promise<string | HTMLCanvasElement> {
		if (scene === "golden") return PICTURE;
		// Dusk only exists as a CSS filter: bake it into a small canvas.
		await imgEl.decode().catch(() => {});
		const canvas = document.createElement("canvas");
		canvas.width = 384;
		canvas.height = 512;
		const ctx = canvas.getContext("2d");
		if (!ctx) return PICTURE;
		ctx.filter = DUSK_FILTER;
		ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
		return canvas;
	}

	async function next() {
		if (busy) return;
		busy = true;
		source = picture ? await snapshot() : undefined;
		await transition.cover();
		scene = scene === "golden" ? "dusk" : "golden";
		await new Promise((r) => setTimeout(r, 300));
		await transition.reveal();
		busy = false;
	}
</script>

<div class="flex w-full flex-col items-center gap-3">
	<div class="flex flex-wrap items-center justify-center gap-3 text-sm">
		<button
			class="bg-foreground text-background rounded-full px-4 py-1.5 font-medium disabled:opacity-60"
			onclick={next}
			disabled={busy}
		>
			{scene === "golden" ? "Let the sun set" : "Back to golden hour"}
		</button>
		<label class="text-muted-foreground flex items-center gap-2">
			<input type="checkbox" bind:checked={picture} />
			Tiles decode the picture
		</label>
	</div>

	<div
		class="border-border relative aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl border bg-[#2d1c16]"
	>
		<img
			bind:this={imgEl}
			src={PICTURE}
			alt={scene === "golden"
				? "Vector sunset: an oval sun on the sea horizon behind a sailboat, under an orange sky streaked with clouds"
				: "The same seascape at dusk, in violet light"}
			class="block h-full w-full object-cover"
			style:filter={scene === "dusk" ? DUSK_FILTER : "none"}
			decoding="async"
		/>

		<DatamoshTransition
			bind:this={transition}
			variant="split"
			sweep="center"
			colors="sunset"
			{source}
			contained
		/>
	</div>
</div>
