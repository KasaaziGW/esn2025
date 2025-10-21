import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { getStaticFileConfig, getSecurityConfig } from '../config/security.js';

/**
 * Security middleware configuration
 * Provides comprehensive security headers and CORS protection
 */

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow localhost and common development ports
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:5000', // Current server port
      'http://localhost:5173', // Vite default
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5000', // Current server port
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8080'
    ];
    
    // In production, add your actual domain here
    if (process.env.NODE_ENV === 'production') {
      allowedOrigins.push(
        process.env.FRONTEND_URL || 'https://yourdomain.com',
        process.env.ADMIN_URL || 'https://admin.yourdomain.com'
      );
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

// Rate limiting configuration
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      status: 'error',
      message: message || 'Too many requests, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      res.status(429).json({
        status: 'error',
        message: message || 'Too many requests, please try again later.',
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

// Different rate limits for different endpoints
export const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later.'
);

export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 auth requests per windowMs
  'Too many authentication attempts, please try again later.'
);

export const strictRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  20, // limit each IP to 20 requests per windowMs
  'Rate limit exceeded, please slow down your requests.'
);

// Helmet configuration for security headers
// Get helmet configuration from centralized security config
const securityConfig = getSecurityConfig();
export const helmetConfig = helmet({
  ...securityConfig.helmet,
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
});

// CORS middleware
export const corsMiddleware = cors(corsOptions);

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

// Request logging middleware for security monitoring
export const securityLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || 0
    };
    
    // Log security-relevant events
    if (res.statusCode >= 400) {
      console.warn('Security Event:', JSON.stringify(logData));
    } else {
      console.log('Request:', JSON.stringify(logData));
    }
  });
  
  next();
};

// Static file security middleware
export const staticFileSecurity = (req, res, next) => {
  try {
    const staticConfig = getStaticFileConfig();
    
    // Set CORS headers based on environment configuration
    if (Array.isArray(staticConfig.cors.origin)) {
      const origin = req.get('Origin');
      if (origin && staticConfig.cors.origin.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
    } else if (staticConfig.cors.origin === true) {
      res.setHeader('Access-Control-Allow-Origin', req.get('Origin') || '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', staticConfig.cors.methods.join(', '));
    res.setHeader('Access-Control-Allow-Credentials', staticConfig.cors.credentials.toString());
    
    next();
  } catch (error) {
    console.error('Static file security middleware error:', error);
    next(error);
  }
};

// Comprehensive static file headers middleware
export const staticFileHeaders = (res, path, stat) => {
  try {
    const staticConfig = getStaticFileConfig();
    
    // Set CORS headers based on environment configuration
    if (Array.isArray(staticConfig.cors.origin)) {
      const origin = res.req.get('Origin');
      if (origin && staticConfig.cors.origin.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
    } else if (staticConfig.cors.origin === true) {
      res.setHeader('Access-Control-Allow-Origin', res.req.get('Origin') || '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', staticConfig.cors.methods.join(', '));
    res.setHeader('Access-Control-Allow-Credentials', staticConfig.cors.credentials.toString());
    
    // Set content type based on file extension
    const ext = path.substring(path.lastIndexOf('.'));
    const contentType = staticConfig.contentTypes[ext];
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    
    // Set cache control based on file type
    if (ext.match(/\.(woff2?|ttf|eot)$/)) {
      res.setHeader('Cache-Control', staticConfig.cacheControl.fonts);
    } else if (ext.match(/\.(png|jpg|jpeg|gif|svg)$/)) {
      res.setHeader('Cache-Control', staticConfig.cacheControl.images);
    } else if (ext.match(/\.css$/)) {
      res.setHeader('Cache-Control', staticConfig.cacheControl.css);
    } else if (ext.match(/\.js$/)) {
      res.setHeader('Cache-Control', staticConfig.cacheControl.js);
    }
  } catch (error) {
    console.error('Static file headers error:', error);
    // Don't throw error here as it would break static file serving
  }
};

export default {
  corsMiddleware,
  helmetConfig,
  securityHeaders,
  securityLogger,
  generalRateLimit,
  authRateLimit,
  strictRateLimit,
  staticFileSecurity,
  staticFileHeaders
};
