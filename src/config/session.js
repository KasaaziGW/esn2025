import session from 'express-session';
import MongoStore from 'connect-mongo';

/**
 * Session configuration for secure authentication
 */
export const getSessionConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'your-session-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: 'sessions',
      ttl: 24 * 60 * 60, // 24 hours
    }),
    cookie: {
      secure: isProduction, // Use secure cookies in production
      httpOnly: true, // Prevent XSS attacks
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict', // CSRF protection
    },
    name: 'esn.sid', // Custom session name for security
  };
};

export default getSessionConfig;
