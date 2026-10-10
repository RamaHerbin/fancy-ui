/**
 * Resolution shim — NOT a second controller.
 *
 * `sound-feedback.ts` in this folder is a byte-identical shared core: the repo
 * gate hashes it against the reference tree and fails on a one-byte drift, so
 * its `import { sound } from "./sound.svelte.js"` line cannot be rewritten
 * here. The controller itself lives in `sound.ts`, which is the name this
 * package's layout requires. This file is the one-line bridge between the two,
 * and the only module in the package that may import it is the shared core.
 *
 * Remove it the moment the shared core's import specifier becomes tree-neutral
 * (for example by moving the controller import behind a sibling both trees
 * name identically), which is the real fix and belongs on the reference side.
 */

export { sound } from "./sound.js";
