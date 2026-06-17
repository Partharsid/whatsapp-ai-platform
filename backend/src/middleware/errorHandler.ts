import { Request, Response, NextFunction } from 'express'
import { logger } from '../config/logger'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }

  logger.error({ err }, 'Unhandled error')
  res.status(500).json({ error: 'Internal server error' })
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' })
}
