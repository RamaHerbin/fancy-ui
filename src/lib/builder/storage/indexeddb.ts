import type { PageDocument } from "../types/page.js";

const DB_NAME = "builder-drafts";
const STORE_NAME = "drafts";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: "slug" });
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

export interface DraftEntry {
	slug: string;
	page: PageDocument;
	savedAt: string;
}

export async function saveDraft(slug: string, page: PageDocument): Promise<void> {
	const db = await openDB();
	const entry: DraftEntry = {
		slug,
		page: structuredClone(page),
		savedAt: new Date().toISOString(),
	};

	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		tx.objectStore(STORE_NAME).put(entry);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}

export async function getDraft(slug: string): Promise<DraftEntry | null> {
	const db = await openDB();

	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readonly");
		const request = tx.objectStore(STORE_NAME).get(slug);
		request.onsuccess = () => resolve(request.result ?? null);
		request.onerror = () => reject(request.error);
	});
}

export async function deleteDraft(slug: string): Promise<void> {
	const db = await openDB();

	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite");
		tx.objectStore(STORE_NAME).delete(slug);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
}
