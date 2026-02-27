export type StorageErrorCode = "NOT_FOUND" | "CONFLICT" | "AUTH" | "UNKNOWN";

export class StorageError extends Error {
  readonly code: StorageErrorCode;
  readonly statusCode: number;

  constructor(code: StorageErrorCode, message: string) {
    super(message);
    this.name = "StorageError";
    this.code = code;
    this.statusCode = STATUS_MAP[code];
  }

  static notFound(slug: string): StorageError {
    return new StorageError("NOT_FOUND", `Page not found: ${slug}`);
  }

  static conflict(slug: string): StorageError {
    return new StorageError("CONFLICT", `Page already exists: ${slug}`);
  }

  static auth(message = "Authentication required"): StorageError {
    return new StorageError("AUTH", message);
  }
}

const STATUS_MAP: Record<StorageErrorCode, number> = {
  NOT_FOUND: 404,
  CONFLICT: 409,
  AUTH: 401,
  UNKNOWN: 500,
};
