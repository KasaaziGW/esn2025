import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { paths, tags } from '../docs/swagger-paths.js';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Emergency Social Network API',
      version: '1.0.0',
      description: 'A comprehensive API for emergency social networking, community management, and real-time communication',
      contact: {
        name: 'Emergency Social Network Team',
        email: 'support@emergencysocialnetwork.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.emergencysocialnetwork.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            username: { type: 'string', example: 'john_doe' },
            slug: { type: 'string', example: 'john-doe' },
            publicId: { type: 'string', example: 'usr_abc123' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            phone: { type: 'string', example: '+256701234567' },
            displayName: { type: 'string', example: 'John Doe' },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            role: { type: 'string', enum: ['citizen', 'coordinator', 'admin'], example: 'citizen' },
            community: { type: 'string', example: 'central-park-community' },
            currentStatus: { 
              type: 'string', 
              enum: ['safe', 'needs_help', 'injured', 'missing', 'lost', 'available_to_help', 'unknown'],
              example: 'safe'
            },
            location: {
              type: 'object',
              properties: {
                type: { type: 'string', example: 'Point' },
                coordinates: { type: 'array', items: { type: 'number' }, example: [32.5825, 0.3476] }
              }
            },
            isOnline: { type: 'boolean', example: true },
            lastSeenAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
            createdAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' }
          }
        },
        Community: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439012' },
            name: { type: 'string', example: 'Central Park Community' },
            description: { type: 'string', example: 'A community focused on safety and emergency preparedness' },
            slug: { type: 'string', example: 'central-park-community' },
            publicId: { type: 'string', example: 'abc12345' },
            membersCount: { type: 'number', example: 150 },
            isPublic: { type: 'boolean', example: true },
            region: { type: 'string', example: 'central-region' },
            district: { type: 'string', example: 'kampala-district' },
            createdBy: { type: 'string', example: 'john_doe' },
            createdAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' }
          }
        },
        Announcement: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439015' },
            title: { type: 'string', example: 'Community Safety Meeting' },
            body: { type: 'string', example: 'Join us for our monthly safety meeting...' },
            slug: { type: 'string', example: 'community-safety-meeting' },
            community: { type: 'string', example: 'central-park-community' },
            createdBy: { type: 'string', example: 'john_doe' },
            pinned: { type: 'boolean', example: false },
            attachments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  url: { type: 'string', example: '/uploads/announcements/file.pdf' },
                  filename: { type: 'string', example: 'safety-guidelines.pdf' },
                  mimetype: { type: 'string', example: 'application/pdf' },
                  size: { type: 'number', example: 1024000 }
                }
              }
            },
            isEmergency: { type: 'boolean', example: false },
            emergencyType: { 
              type: 'string', 
              enum: ['medical', 'fire', 'security', 'natural_disaster', 'infrastructure', 'other'],
              example: 'medical'
            },
            severity: { 
              type: 'string', 
              enum: ['low', 'medium', 'high', 'critical'],
              example: 'medium'
            },
            location: {
              type: 'object',
              properties: {
                type: { type: 'string', example: 'Point' },
                coordinates: { type: 'array', items: { type: 'number' }, example: [32.5825, 0.3476] }
              }
            },
            status: { 
              type: 'string', 
              enum: ['active', 'resolved', 'cancelled'],
              example: 'active'
            },
            createdAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' }
          }
        },
        EmergencyAlert: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439016' },
            alertId: { type: 'string', example: 'alert_abc123' },
            slug: { type: 'string', example: 'severe-weather-warning' },
            title: { type: 'string', example: 'Severe Weather Warning' },
            message: { type: 'string', example: 'Heavy rainfall expected. Stay indoors.' },
            alertType: { 
              type: 'string', 
              enum: ['system', 'weather', 'security', 'infrastructure', 'health', 'other'],
              example: 'weather'
            },
            severity: { 
              type: 'string', 
              enum: ['info', 'warning', 'critical'],
              example: 'warning'
            },
            priority: { 
              type: 'string', 
              enum: ['low', 'medium', 'high', 'urgent'],
              example: 'high'
            },
            scope: { 
              type: 'string', 
              enum: ['global', 'regional', 'district', 'community'],
              example: 'regional'
            },
            status: { 
              type: 'string', 
              enum: ['active', 'expired', 'cancelled'],
              example: 'active'
            },
            effectiveFrom: { type: 'string', format: 'date-time', example: '2024-01-15T12:00:00Z' },
            effectiveUntil: { type: 'string', format: 'date-time', example: '2024-01-16T12:00:00Z' },
            createdBy: { type: 'string', example: 'john_doe' },
            createdAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' }
          }
        },
        Region: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439013' },
            name: { type: 'string', example: 'Central Region' },
            slug: { type: 'string', example: 'central-region' },
            publicId: { type: 'string', example: 'reg_abc123' },
            createdAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' }
          }
        },
        District: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439014' },
            name: { type: 'string', example: 'Kampala District' },
            slug: { type: 'string', example: 'kampala-district' },
            publicId: { type: 'string', example: 'dist_abc123' },
            region: { type: 'string', example: 'central-region' },
            createdAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' }
          }
        },
        Chat: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439016' },
            name: { type: 'string', example: 'Emergency Chat' },
            slug: { type: 'string', example: 'emergency-chat-2024' },
            hashId: { type: 'string', example: 'chat_abc123' },
            community: { type: 'string', example: 'central-park-community' },
            createdBy: { type: 'string', example: 'john_doe' },
            memberCount: { type: 'number', example: 25 },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' }
          }
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439017' },
            content: { type: 'string', example: 'Hello everyone!' },
            type: { type: 'string', enum: ['text', 'image', 'file'], example: 'text' },
            slug: { type: 'string', example: 'msg_abc123' },
            chat: { type: 'string', example: 'emergency-chat-2024' },
            sender: { type: 'string', example: 'john_doe' },
            replyTo: { type: 'string', example: 'msg_def456' },
            isEdited: { type: 'boolean', example: false },
            isDeleted: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'fail' },
            message: { type: 'string', example: 'Error message' },
            error: {
              type: 'object',
              properties: {
                statusCode: { type: 'number', example: 400 },
                status: { type: 'string', example: 'fail' },
                isOperational: { type: 'boolean', example: true }
              }
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            message: { type: 'string', example: 'Operation successful' },
            data: { type: 'object' }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 100 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
            items: { type: 'array', items: { type: 'object' } }
          }
        },
        CoordinatorRequest: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439018' },
            user: { type: 'string', example: 'john_doe' },
            reason: { type: 'string', example: 'I want to help coordinate emergency responses' },
            experience: { type: 'string', example: '5 years in emergency services' },
            status: { 
              type: 'string', 
              enum: ['pending', 'approved', 'rejected'],
              example: 'pending'
            },
            reviewedBy: { type: 'string', example: 'admin_user' },
            reviewNotes: { type: 'string', example: 'Approved based on experience' },
            attachment: {
              type: 'object',
              properties: {
                url: { type: 'string', example: '/uploads/coordinator-requests/document.pdf' },
                filename: { type: 'string', example: 'experience-certificate.pdf' },
                mimetype: { type: 'string', example: 'application/pdf' },
                size: { type: 'number', example: 2048000 }
              }
            },
            createdAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' }
          }
        },
        CommunityMember: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439019' },
            user: { type: 'string', example: 'john_doe' },
            community: { type: 'string', example: 'central-park-community' },
            role: { 
              type: 'string', 
              enum: ['member', 'coordinator', 'admin'],
              example: 'member'
            },
            joinedAt: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00Z' },
            isActive: { type: 'boolean', example: true }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    paths: paths,
    tags: tags
  },
  apis: []
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };
