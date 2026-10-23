import MagneticField, { type MagneticFieldProps } from "./MagneticField.svelte";
import MagneticItem, { type MagneticItemProps } from "./MagneticItem.svelte";
import MagnetPuck, { type MagnetPuckProps } from "./MagnetPuck.svelte";

export {
	MagneticField,
	type MagneticFieldProps,
	MagneticItem,
	type MagneticItemProps,
	MagnetPuck,
	type MagnetPuckProps,
};
export {
	MAGNETIC_FIELD_SPRINGS,
	type MagneticPoint,
	type MagneticSpring,
	type MagneticSpringPreset,
	type MagneticFieldSource,
} from "./magnetic-field-core.js";
export { MAGNETIC_FIELD_KEY, type MagneticFieldContext } from "./types.js";
