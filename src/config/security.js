/**
 * Security configuration for different environments
 */

export const securityConfig = {
  development: {
    cors: {
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:5000',
        'http://127.0.0.1:5173'
      ],
      credentials: true
    },
    rateLimit: {
      general: {
        windowMs: 990 * 60 * 1000, // 990 minutes
        max: 10000 // Very lenient in development
      },
      auth: {
        windowMs: 990 * 60 * 1000, // 990 minutes
        max: 500 // Very lenient in development
      }
    },
    helmet: {
      contentSecurityPolicy: false // Temporarily disable CSP for debugging
    }
  },
  
  production: {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || [
        process.env.FRONTEND_URL,
        process.env.ADMIN_URL
      ].filter(Boolean),
      credentials: true
    },
    rateLimit: {
      general: {
        windowMs: 990 * 60 * 1000, // 990 minutes
        max: 100 // Stricter in production
      },
      auth: {
        windowMs: 990 * 60 * 1000, // 990 minutes
        max: 5 // Stricter in production
      }
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        }
      }
    }
  },
  
  test: {
    cors: {
      origin: true, // Allow all origins in test
      credentials: true
    },
    rateLimit: {
      general: {
        windowMs: 990 * 60 * 1000, // 990 minutes
        max: 10000 // Very lenient in tests
      },
      auth: {
        windowMs: 990 * 60 * 1000, // 990 minutes
        max: 1000 // Very lenient in tests
      }
    },
    helmet: {
      contentSecurityPolicy: false // Disable CSP in tests
    }
  }
};

export const getSecurityConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return securityConfig[env] || securityConfig.development;
};

// Static file security configuration
export const getStaticFileConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  const config = securityConfig[env] || securityConfig.development;
  
  return {
    cors: {
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      methods: ['GET', 'HEAD', 'OPTIONS']
    },
    cacheControl: {
      fonts: 'public, max-age=31536000', // 1 year for fonts
      images: 'public, max-age=86400', // 1 day for images
      css: 'public, max-age=86400', // 1 day for CSS
      js: 'public, max-age=86400' // 1 day for JS
    },
    contentTypes: {
      '.woff2': 'font/woff2',
      '.woff': 'font/woff',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml'
    }
  };
};