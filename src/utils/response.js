/**
 * Standardized response utility functions
 * These should be used instead of manually sending responses
 */

/**
 * Send success response
 */
export const sendSuccess = (res, statusCode, message, data = null) => {
  const response = {
    status: 'success',
    message
  };
  
  if (data) {
    response.data = data;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Send error response (for operational errors)
 */
export const sendError = (res, statusCode, message, data = null) => {
  const response = {
    status: statusCode >= 400 && statusCode < 500 ? 'fail' : 'error',
    message
  };
  
  if (data) {
    response.data = data;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Send created response (201)
 */
export const sendCreated = (res, message, data) => {
  return sendSuccess(res, 201, message, data);
};

/**
 * Send OK response (200)
 */
export const sendOK = (res, message, data) => {
  return sendSuccess(res, 200, message, data);
};

/**
 * Send no content response (204)
 */
export const sendNoContent = (res) => {
  return res.status(204).send();
};

/**
 * Send bad request response (400)
 */
export const sendBadRequest = (res, message) => {
  return sendError(res, 400, message);
};

/**
 * Send unauthorized response (401)
 */
export const sendUnauthorized = (res, message = 'Unauthorized') => {
  return sendError(res, 401, message);
};

/**
 * Send forbidden response (403)
 */
export const sendForbidden = (res, message = 'Forbidden') => {
  return sendError(res, 403, message);
};

/**
 * Send not found response (404)
 */
export const sendNotFound = (res, message = 'Not found') => {
  return sendError(res, 404, message);
};

/**
 * Send conflict response (409)
 */
export const sendConflict = (res, message = 'Conflict') => {
  return sendError(res, 409, message);
};

/**
 * Send internal server error response (500)
 */
export const sendInternalError = (res, message = 'Internal server error') => {
  return sendError(res, 500, message);
};

export default {
  sendSuccess,
  sendError,
  sendCreated,
  sendOK,
  sendNoContent,
  sendBadRequest,
  sendUnauthorized,
  sendForbidden,
  sendNotFound,
  sendConflict,
  sendInternalError
};
