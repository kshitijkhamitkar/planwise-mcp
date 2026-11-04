export type ErrorCode = "INVALID_INPUT" | "NOT_FOUND" | "INTERNAL";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function ok<T>(data: T) {
  return { ok: true as const, data };
}

export function fail(code: ErrorCode, message: string) {
  return { ok: false as const, error: { code, message } };
}
