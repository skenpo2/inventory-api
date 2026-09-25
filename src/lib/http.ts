import type { Request, Response, NextFunction } from 'express'

// Throw this from a controller to send a specific status + message.
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

// Wraps an async controller so thrown errors reach the error middleware
// instead of crashing the request.
type Handler = (req: Request, res: Response) => Promise<unknown>

export function handle(fn: Handler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next)
  }
}

// Route params arrive as strings, so ids get checked before hitting Prisma.
export function parseId(raw: string | string[] | undefined) {
  const id = typeof raw === 'string' ? Number(raw) : NaN
  if (!Number.isInteger(id) || id < 1) {
    throw new HttpError(400, 'id must be a positive integer')
  }
  return id
}
