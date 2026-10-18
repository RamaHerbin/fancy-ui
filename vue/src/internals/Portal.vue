<script lang="ts">
import { computed, getCurrentInstance, inject, onMounted, ref, ssrContextKey } from "vue";
import { resolvePortalTarget } from "./portal.js";

export interface PortalProps {
	/**
	 * Element, CSS selector, or undefined for `document.body`. A selector
	 * matching nothing falls back to `document.body`.
	 */
	target?: HTMLElement | string;
	/** Render children in place instead of portalling. */
	disabled?: boolean;
}

// Re-exported so a consumer of this component never needs a second import
// from "./portal.js" for the helper it already has to name.
export { resolvePortalTarget };
</script>

<script setup lang="ts">
defineOptions({ name: "Portal", inheritAttrs: false });
const props = defineProps<PortalProps>();
defineSlots<{ default?: () => unknown }>();

// The React package's portal contract: the server emits nothing, the
// hydration render emits nothing, and the target is resolved once after
// mount. A `<Teleport>` has no server output of its own that the app subtree
// can hydrate — the renderer writes anchors into the stream and files the
// children in a separate buffer — so a surface left OPEN across a server
// render would otherwise hand the hydration pass a subtree it cannot match.
// With the gate, every portalled surface behaves the same whether it starts
// closed or open: nothing server-side, and the content arrives on the first
// post-hydration patch.
//
// Why not simply `ref(false)` everywhere: a FRESH client mount (the path every
// surface takes when `open` flips true long after hydration) must portal on
// the very patch that creates it. The presence clock starts its entrance legs
// from a post-flush watcher in that same flush; a portal that waited for its
// own `onMounted` would attach the nodes one pass later, after the legs had
// already found nothing to animate and settled — every entrance would be
// silently skipped. So only the two passes that have to agree are gated:
//
// - the server, recognised by the SSR context the server renderer provides
//   (no `document` read in setup, convention C-7);
// - the hydration pass, recognised by the vnode already carrying the
//   server-rendered node it is being matched against: Vue's hydration walk
//   assigns `vnode.el` before it creates the component, a fresh mount never
//   does. This is the Vue equivalent of React's `useIsHydrated`, which is
//   `false` only on the server and during the hydration render.
const onServer = inject(ssrContextKey, null) != null;
const hydrating = getCurrentInstance()?.vnode.el != null;
const portalReady = ref(!onServer && !hydrating);
onMounted(() => {
	portalReady.value = true;
});

// Only ever evaluated once `portalReady` is true, i.e. in the browser after
// the gate above: never on the server, never in a lazy initializer (C-7).
const to = computed<HTMLElement>(() => resolvePortalTarget(props.target));
</script>

<template>
	<slot v-if="disabled" />
	<Teleport v-else-if="portalReady" :to="to"><slot /></Teleport>
</template>
