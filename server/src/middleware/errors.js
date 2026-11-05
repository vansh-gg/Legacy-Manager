import { ZodError } from 'zod';
import multer from 'multer';
import { HttpError } from '../lib/http.js';
import { config } from '../config.js';

export function notFoundApi(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return res.status(400).json({
      error: first?.message || 'Please check the details you entered.',
      field: first?.path?.join('.') || undefined,
    });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...err.extra });
  }
  if (err instanceof multer.MulterError) {
    const msg =
      err.code === 'LIMIT_FILE_SIZE'
        ? `That file is too large. The limit is ${config.maxUploadMb} MB.`
        : 'There was a problem with the uploaded file.';
    return res.status(400).json({ error: msg });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid request.' });
  }
  console.error('[error]', err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
}
