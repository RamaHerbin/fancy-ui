import { nanoid } from "nanoid";

/** Generate a unique block ID (12 chars) */
export function createBlockId(): string {
	return nanoid(12);
}
