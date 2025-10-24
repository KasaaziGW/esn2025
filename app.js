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
import publicChatRoutes from './src/routes/publicChatRoutes.js';
import dashboardRoutes from './src/routes/dashboardRoutes.js';
import pageRoutes from './src/routes/pageRoutes.js';
import notificationRoutes from './src/routes/notificationRoutes.js';
import communityAccessRoutes from './src/routes/communityAccessRoutes.js';
import communitiesRoutes from './src/routes/communitiesRoutes.js';
import coordinatorRequestRoutes from './src/routes/coordinatorRequestRoutes.js';
import adminCommunityRoutes from './src/routes/adminCommunityRoutes.js';
import alertsRoutes from './src/routes/alertsRoutes.js';
import socketService from './src/services/Socket.js';
import auth from './src/middleware/auth.js';
import session from 'express-session';
import sessionConfig from './src/config/session.js';
import upload from './src/middleware/upload.js';
import errorHandler from './src/middleware/errorHandler.js';
import security from './src/middleware/security.js';
import swagger from './src/config/swagger.js';
import initAdmin from './src/utils/initAdmin.js';

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
app.use(security.helmetConfig); // Security headers
app.use(security.securityHeaders); // Additional security headers
app.use(security.corsMiddleware); // CORS protection
app.use(security.securityLogger); // Security monitoring

// Rate limiting (temporarily disabled for development)

// Session middleware (must be before body parsing)
app.use(session(sessionConfig.getSessionConfig()));

// Body parsing and logging
app.use(express.json({ limit: '10mb' })); // parse JSON body with size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // parse URL-encoded bodies
app.use(morgan("dev")); // Log requests

// Note: Upload directories are created automatically by upload.js middleware

// Mount routes with standardized structure - all routes without /api/ prefix
// Page routes (render views)
app.use('/', pageRoutes);
app.use('/', communitiesRoutes);
app.use('/admin/communities', adminCommunityRoutes);

// API routes (return JSON) - uniform structure without /api/ prefix
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/regions', regionRoutes);
app.use('/districts', districtRoutes);
app.use('/communities', communityRoutes);
app.use('/notifications', notificationRoutes);
app.use('/community-access', communityAccessRoutes);
app.use('/community-members', communityMemberRoutes);
app.use('/coordinator-requests', coordinatorRequestRoutes);
app.use('/announcements', announcementRoutes);
app.use('/chats', chatRoutes);
app.use('/public-chat', publicChatRoutes);
app.use('/alerts', alertsRoutes);

// API Documentation with Swagger
app.use('/api-docs', swagger.swaggerUi.serve, swagger.swaggerUi.setup(swagger.specs, {
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
app.use('/uploads/chats', express.static(upload.UPLOAD_DIRS.chat));
app.use('/uploads/announcements', express.static(upload.UPLOAD_DIRS.announcement));
app.use('/uploads/profiles', express.static(upload.UPLOAD_DIRS.profile));
app.use('/uploads/system', express.static(upload.UPLOAD_DIRS.system));
app.use('/uploads/communities', express.static(upload.UPLOAD_DIRS.community));

// Serve template static files with centralized security configuration
app.use('/assets', express.static('./src/views/assets', {
  setHeaders: security.staticFileHeaders
}));
app.use('/lib', express.static('./src/views/assets/lib'));


// Catch-all for unknown routes
app.use(errorHandler.handleNotFound);

// Global error handler (must be last middleware)
app.use(errorHandler.globalErrorHandler);

// Create HTTP server and initialize Socket.io
const server = http.createServer(app);
socketService.initSocket(server, auth.verifyJWT);

// Set server port and start listening
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  
  // Initialize system with default administrator
  try {
    await initAdmin.initializeSystem();
  } catch (error) {
    console.error('Failed to initialize system:', error);
    process.exit(1);
  }
});
