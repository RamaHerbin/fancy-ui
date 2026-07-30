# Layer contract

A layer component fills one wrapper of `SynthwaveScene`. The wrapper is
`absolute inset-0` and is the node the scene parallaxes, so:

- Position everything **absolutely inside the wrapper**. Never set a z-index:
  stacking is `SCENE_LAYERS` order in `../scene-config.ts` alone.
- Decoration only — no text, no links, no focusable nodes, no `id`s. The whole
  scene is `aria-hidden`, and images are `alt=""`.
- Animate **only `transform` and `opacity`**. No layout, filter, or paint
  properties, no canvas.
- Take no props, own no public API. Read shared values (timings, asset helpers)
  from `../scene-config.ts`.
- Attach GSAP tweens to the scene's master timeline, never to an orphan one.
  Build each tween standalone with `gsap.to` / `gsap.fromTo`, then `tl.add` it:

  ```svelte
  const scene = getSceneContext();
  $effect(() => {
  	const tl = scene.timeline();
  	if (!tl) return; // reduced motion: render the static pose
  	const tween = gsap.to(el, { yPercent: -100, duration: GRID_SCROLL_SECONDS, repeat: -1, ease: "none" });
  	tl.add(tween, 0);
  	return () => {
  		tween.kill();
  		gsap.set(el, { clearProps: "transform" }); // back to the CSS rest pose
  	};
  });
  ```

  **Never write `const tween = tl.to(...)`.** A timeline's `.to()` returns the
  _timeline_, not the tween, so that `tween.kill()` kills the master and every
  other layer's tweens with it. Same trap with `tl.set()`: it leaves a
  zero-duration child on the master that your cleanup cannot reach — seed the
  start state with `gsap.fromTo` instead.

  Add tweens at position `0` and treat the master's duration/progress as
  meaningless — it only exists so the scene can pause and kill everything at once.

- A layer element with a **hard edge at the frame border** must spread into the
  parallax bleed, or pointer parallax will drag that edge into view and show
  whatever sits behind it. The scene root publishes the overscan and clips the
  spill:

  ```css
  left: calc(-1 * var(--parallax-bleed-x, 0px));
  right: calc(-1 * var(--parallax-bleed-x, 0px));
  ```

  Only opaque or full-bleed boxes need it (a floor, a vignette, an edge-to-edge
  silhouette). Something that already fades to transparent before the edge, or
  that sits well inside the frame, does not.

- CSS-only motion (keyframes) is fine, but it must be disabled under
  `@media (prefers-reduced-motion: reduce)`; GSAP-driven motion is already
  covered by the `timeline()` returning `null`.
- `will-change` belongs only on a node whose transform or opacity actually
  animates — above all on a node carrying a `filter: blur()`, where it is the
  difference between rasterising the blur once and re-blurring it every frame.
  Release it under `prefers-reduced-motion: reduce`, where nothing attaches.
- Do all DOM work in `onMount` (or an `$effect`), never at module scope.
