/**
 * Middleware to prevent caching and back button access
 * This ensures that protected pages are not cached by the browser
 */
export const noCache = (req, res, next) => {
  // Set headers to prevent caching
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Last-Modified': new Date().toUTCString()
  });
  
  next();
};

/**
 * Middleware specifically for logout pages
 * Clears all browser data and prevents back button access
 */
export const clearBrowserData = (req, res, next) => {
  // Set headers to clear browser data
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Clear-Site-Data': '"cache", "cookies", "storage", "executionContexts"',
    'Last-Modified': new Date().toUTCString()
  });
  
  next();
};

export default {
  noCache,
  clearBrowserData
};
