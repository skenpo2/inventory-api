export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function parseId(raw: unknown) {
  const id = typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isInteger(id) || id < 1) {
    throw new HttpError(400, 'id must be a positive integer');
  }
  return id;
}

export function normalizeEmail(raw: unknown) {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}
