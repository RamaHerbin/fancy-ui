import raw from "../../../../../CHANGELOG.md?raw";

export function load() {
	return { changelogRaw: raw };
}
