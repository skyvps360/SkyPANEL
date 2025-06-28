import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

// Handle all ZodError validations consistently
export function handleZodError(error: ZodError, res: Response) {
  const validationError = fromZodError(error);
  res.status(400).json({ error: validationError.message });
}

// Middleware to validate request body, query, or params against a Zod schema
export function validateRequest(schemas: {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        handleZodError(error, res);
      } else {
        res.status(500).json({ message: 'Internal Server Error' });
      }
    }
  };
}