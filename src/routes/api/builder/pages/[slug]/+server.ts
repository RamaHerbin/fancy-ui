import { json, error } from "@sveltejs/kit";
import {
  getBuilderStorage,
  isValidSlug,
  isValidPageDocument,
  StorageError,
} from "$lib/builder/storage/index.js";
import type { RequestHandler } from "./$types.js";

function validateSlug(slug: string) {
  if (!isValidSlug(slug)) {
    error(400, "Invalid page slug");
  }
}

export const GET: RequestHandler = async ({ params, locals }) => {
  validateSlug(params.slug);
  const storage = getBuilderStorage(locals.githubToken);

  try {
    const page = await storage.get(params.slug);
    return json(page);
  } catch (err: unknown) {
    if (err instanceof StorageError) {
      error(err.statusCode, err.message);
    }
    throw err;
  }
};

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  validateSlug(params.slug);
  const storage = getBuilderStorage(locals.githubToken);

  let page: unknown;
  try {
    page = await request.json();
  } catch {
    error(400, "Invalid JSON body");
  }

  if (!isValidPageDocument(page)) {
    error(
      400,
      "Invalid page document: must include version, meta (title, slug), and body array",
    );
  }

  // Ensure slug in URL matches slug in body
  if (page.meta.slug !== params.slug) {
    error(400, "Slug in URL does not match slug in body");
  }

  try {
    await storage.save(page);
    return json({ ok: true, updatedAt: page.meta.updatedAt });
  } catch (err: unknown) {
    if (err instanceof StorageError) {
      error(err.statusCode, err.message);
    }
    if (err instanceof Error) {
      error(400, err.message);
    }
    throw err;
  }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  validateSlug(params.slug);
  const storage = getBuilderStorage(locals.githubToken);

  try {
    await storage.delete(params.slug);
    return json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof StorageError) {
      error(err.statusCode, err.message);
    }
    throw err;
  }
};
