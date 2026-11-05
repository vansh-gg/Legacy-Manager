export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export const badRequest = (msg) => new HttpError(400, msg);
export const unauthorized = (msg = 'Please log in to continue.') => new HttpError(401, msg);
export const forbidden = (msg = 'You do not have permission to do that.') => new HttpError(403, msg);
export const notFound = (msg = 'We could not find that.') => new HttpError(404, msg);

/** Best-effort client IP for the activity log. */
export const clientIp = (req) => req.ip || req.socket?.remoteAddress || null;
