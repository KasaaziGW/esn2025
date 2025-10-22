import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import http from 'http';
import connectDB from './src/config/db.js';
import authRoutes from './src/routes/authRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import regionRoutes from './src/routes/regionRoutes.js';
import districtRoutes from './src/routes/districtRoutes.js';
import communityRoutes from './src/routes/communityRoutes.js';
import communityMemberRoutes from './src/routes/communityMemberRoutes.js';
import announcementRoutes from './src/routes/announcementRoutes.js';
import chatRoutes from './src/routes/chatRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';
import pageRoutes from './src/routes/pageRoutes.js';
import notificationRoutes from './src/routes/notificationRoutes.js';
import communityAccessRoutes from './src/routes/communityAccessRoutes.js';
import communitiesRoutes from './src/routes/communitiesRoutes.js';
import coordinatorRequestRoutes from './src/routes/coordinatorRequestRoutes.js';
import alertsRoutes from './src/routes/alertsRoutes.js';
import { initSocket } from './src/services/Socket.js';
import { verifyJWT } from './src/middleware/auth.js';
import { sessionAuth } from './src/middleware/sessionAuth.js';
import session from 'express-session';
import { getSessionConfig } from './src/config/session.js';
import { UPLOAD_DIRS } from './src/middleware/upload.js';
import { globalErrorHandler, handleNotFound } from './src/middleware/errorHandler.js';
import { 
  corsMiddleware, 
  helmetConfig, 
  securityHeaders, 
  securityLogger,
  generalRateLimit,
  authRateLimit,
  staticFileHeaders
} from './src/middleware/security.js';
import { specs, swaggerUi } from './src/config/swagger.js';
import { initializeSystem } from './src/utils/initAdmin.js';

// Load environment variables from .env file
dotenv.config();

// Database connection
connectDB();

// Initialize Express app
const app = express();

// Set EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', './src/views');

// Security middleware (must be first)
app.use(helmetConfig); // Security headers
app.use(securityHeaders); // Additional security headers
app.use(corsMiddleware); // CORS protection
app.use(securityLogger); // Security monitoring

// Rate limiting (temporarily disabled for development)

// Session middleware (must be before body parsing)
app.use(session(getSessionConfig()));

// Body parsing and logging
app.use(express.json({ limit: '10mb' })); // parse JSON body with size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // parse URL-encoded bodies
app.use(morgan("dev")); // Log requests

// Note: Upload directories are created automatically by upload.js middleware

// Mount routes with specific rate limiting
app.use('/', communitiesRoutes);
app.use('/', pageRoutes);
app.use('/chat', chatRoutes);
app.use('/public-chat', chatRoutes);
app.use('/announcements', announcementRoutes);
app.use('/alerts', alertsRoutes);
app.use('/users', userRoutes);
app.use('/api/users', userRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes); // authRateLimit temporarily disabled 
app.use('/api/regions', regionRoutes);
app.use('/api/districts', districtRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/community-access', communityAccessRoutes);
app.use('/api/community-members', communityMemberRoutes);
app.use('/api/coordinator-requests', coordinatorRequestRoutes);
app.use('/coordinator-requests', coordinatorRequestRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/chats', chatRoutes);

// API Documentation with Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Emergency Social Network API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true
  }
}));

// Serve uploaded chat files statically
app.use('/uploads/chats', express.static(UPLOAD_DIRS.chat));
app.use('/uploads/announcements', express.static(UPLOAD_DIRS.announcement));
app.use('/uploads/profiles', express.static(UPLOAD_DIRS.profile));
app.use('/uploads/system', express.static(UPLOAD_DIRS.system));
app.use('/uploads/communities', express.static(UPLOAD_DIRS.community));

// Serve template static files with centralized security configuration
app.use('/assets', express.static('./src/views/assets', {
  setHeaders: staticFileHeaders
}));
app.use('/lib', express.static('./src/views/assets/lib'));


// Catch-all for unknown routes
app.use(handleNotFound);

// Global error handler (must be last middleware)
app.use(globalErrorHandler);

// Create HTTP server and initialize Socket.io
const server = http.createServer(app);
initSocket(server, verifyJWT);

// Set server port and start listening
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  
  // Initialize system with default administrator
  try {
    await initializeSystem();
  } catch (error) {
    console.error('Failed to initialize system:', error);
    process.exit(1);
  }
});
