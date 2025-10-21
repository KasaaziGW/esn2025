/**
 * Swagger API Paths Documentation
 * Centralized API documentation for all endpoints
 */

export const paths = {
  '/auth/register': {
    post: {
      summary: 'Register a new user',
      tags: ['Authentication'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['username', 'password', 'email'],
              properties: {
                username: {
                  type: 'string',
                  example: 'john_doe',
                  minLength: 3,
                  maxLength: 30
                },
                password: {
                  type: 'string',
                  example: 'Password123',
                  minLength: 6
                },
                email: {
                  type: 'string',
                  format: 'email',
                  example: 'john@example.com'
                },
                phone: {
                  type: 'string',
                  example: '+256701234567'
                },
                displayName: {
                  type: 'string',
                  example: 'John Doe'
                }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'User registered successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' },
              example: {
                status: 'success',
                message: 'Registration successful. Please update your profile with region and district to join a community.',
                data: {
                  user: {
                    id: '507f1f77bcf86cd799439011',
                    username: 'john_doe',
                    role: 'citizen',
                    email: 'john@example.com',
                    community: null
                  },
                  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                }
              }
            }
          }
        },
        400: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        409: {
          description: 'Username or email already exists',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },

  '/auth/login': {
    post: {
      summary: 'Login user',
      tags: ['Authentication'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['identifier', 'password'],
              properties: {
                identifier: {
                  type: 'string',
                  example: 'john_doe',
                  description: 'Username or email'
                },
                password: {
                  type: 'string',
                  example: 'Password123'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Login successful',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' },
              example: {
                status: 'success',
                message: 'Login successful',
                data: {
                  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                  user: {
                    id: '507f1f77bcf86cd799439011',
                    username: 'john_doe',
                    role: 'citizen',
                    isOnline: true,
                    email: 'john@example.com'
                  }
                }
              }
            }
          }
        },
        400: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        401: {
          description: 'Invalid credentials',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },

  '/auth/logout': {
    post: {
      summary: 'Logout user',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Logout successful',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' },
              example: {
                status: 'success',
                message: 'Logout successful'
              }
            }
          }
        },
        401: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },

  '/emergency/announcements': {
    post: {
      summary: 'Create emergency announcement/incident report',
      tags: ['Emergency'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['title', 'emergencyType'],
              properties: {
                title: {
                  type: 'string',
                  example: 'Medical Emergency at Central Park'
                },
                body: {
                  type: 'string',
                  example: 'Person collapsed near the fountain. Need immediate medical assistance.'
                },
                emergencyType: {
                  type: 'string',
                  enum: ['medical', 'fire', 'security', 'natural_disaster', 'infrastructure', 'other'],
                  example: 'medical'
                },
                severity: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'critical'],
                  example: 'high'
                },
                location: {
                  type: 'object',
                  properties: {
                    longitude: { type: 'number', example: 32.5825 },
                    latitude: { type: 'number', example: 0.3476 }
                  }
                },
                locationDescription: {
                  type: 'string',
                  example: 'Central Park, near the fountain'
                },
                requiresResponse: {
                  type: 'boolean',
                  example: true
                },
                responseDeadline: {
                  type: 'string',
                  format: 'date-time',
                  example: '2024-01-15T18:00:00Z'
                },
                affectedUsers: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['john_doe', 'jane_smith']
                },
                files: {
                  type: 'array',
                  items: { type: 'string', format: 'binary' },
                  description: 'Emergency-related files (images, documents)'
                }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Emergency announcement created successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        },
        400: {
          description: 'Validation error or missing required fields',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        401: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },

    get: {
      summary: 'Get emergency announcements with filters',
      tags: ['Emergency'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'query',
          name: 'emergencyType',
          schema: {
            type: 'string',
            enum: ['medical', 'fire', 'security', 'natural_disaster', 'infrastructure', 'other']
          },
          description: 'Filter by emergency type'
        },
        {
          in: 'query',
          name: 'severity',
          schema: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical']
          },
          description: 'Filter by severity level'
        },
        {
          in: 'query',
          name: 'status',
          schema: {
            type: 'string',
            enum: ['active', 'resolved', 'cancelled']
          },
          description: 'Filter by status'
        },
        {
          in: 'query',
          name: 'community',
          schema: { type: 'string' },
          description: 'Filter by community identifier (ID, slug, or publicId)'
        },
        {
          in: 'query',
          name: 'page',
          schema: { type: 'integer', default: 1 },
          description: 'Page number'
        },
        {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', default: 20 },
          description: 'Items per page'
        },
        {
          in: 'query',
          name: 'sort',
          schema: { type: 'string', default: '-createdAt' },
          description: 'Sort order'
        }
      ],
      responses: {
        200: {
          description: 'Emergency announcements retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Success' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        allOf: [
                          { $ref: '#/components/schemas/Pagination' },
                          {
                            type: 'object',
                            properties: {
                              announcements: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/Announcement' }
                              }
                            }
                          }
                        ]
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    }
  },

  '/emergency/announcements/{slug}/status': {
    patch: {
      summary: 'Update emergency status',
      tags: ['Emergency'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'slug',
          required: true,
          schema: { type: 'string' },
          description: 'Emergency announcement slug'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                status: {
                  type: 'string',
                  enum: ['active', 'resolved', 'cancelled'],
                  example: 'resolved'
                },
                resolutionNotes: {
                  type: 'string',
                  example: 'Emergency resolved by medical team'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Emergency status updated successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        },
        404: {
          description: 'Emergency announcement not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        },
        403: {
          description: 'Not authorized to update this emergency',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },

  '/emergency/contacts': {
    post: {
      summary: 'Add emergency contact',
      tags: ['Emergency Contacts'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'phone'],
              properties: {
                name: {
                  type: 'string',
                  example: 'John Doe'
                },
                phone: {
                  type: 'string',
                  example: '+256701234567'
                },
                email: {
                  type: 'string',
                  format: 'email',
                  example: 'john@example.com'
                },
                relationship: {
                  type: 'string',
                  enum: ['family', 'friend', 'neighbor', 'colleague', 'other'],
                  example: 'family'
                },
                priority: {
                  type: 'number',
                  example: 1,
                  description: '1 = highest priority'
                },
                isPrimary: {
                  type: 'boolean',
                  example: true
                },
                canReceiveAlerts: {
                  type: 'boolean',
                  example: true
                }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Emergency contact added successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        },
        400: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },

    get: {
      summary: 'Get user\'s emergency contacts',
      tags: ['Emergency Contacts'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Emergency contacts retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    }
  },

  '/emergency/settings': {
    get: {
      summary: 'Get emergency settings',
      tags: ['Emergency Contacts'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Emergency settings retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    },

    put: {
      summary: 'Update emergency settings',
      tags: ['Emergency Contacts'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                shareLocation: {
                  type: 'boolean',
                  example: true
                },
                autoShareLocationInEmergency: {
                  type: 'boolean',
                  example: true
                },
                alertPreferences: {
                  type: 'object',
                  properties: {
                    emergencyAlerts: { type: 'boolean', example: true },
                    weatherAlerts: { type: 'boolean', example: true },
                    securityAlerts: { type: 'boolean', example: false },
                    healthAlerts: { type: 'boolean', example: true }
                  }
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Emergency settings updated successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    }
  },

  '/emergency/status': {
    patch: {
      summary: 'Update user emergency status',
      tags: ['Emergency Contacts'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                currentStatus: {
                  type: 'string',
                  enum: ['safe', 'needs_help', 'injured', 'missing', 'lost', 'available_to_help', 'unknown'],
                  example: 'safe'
                },
                location: {
                  type: 'object',
                  properties: {
                    longitude: { type: 'number', example: 32.5825 },
                    latitude: { type: 'number', example: 0.3476 }
                  }
                },
                locationDescription: {
                  type: 'string',
                  example: 'Central Park, near the fountain'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Emergency status updated successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    }
  },

  // User Management Routes
  '/users/me': {
    get: {
      summary: 'Get current user profile',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'User profile retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Success' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/User' }
                    }
                  }
                ]
              }
            }
          }
        },
        401: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    patch: {
      summary: 'Update current user profile',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                displayName: { type: 'string', example: 'John Doe' },
                firstName: { type: 'string', example: 'John' },
                lastName: { type: 'string', example: 'Doe' },
                bio: { type: 'string', example: 'Community safety advocate' },
                region: { type: 'string', example: 'Central' },
                district: { type: 'string', example: 'Kampala' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Profile updated successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        },
        400: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },

  '/users': {
    get: {
      summary: 'Get all users (directory)',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Users retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Success' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/User' }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    }
  },

  '/users/{identifier}': {
    get: {
      summary: 'Get user by identifier',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'identifier',
          required: true,
          schema: { type: 'string' },
          description: 'User identifier (ID, username, or slug)'
        }
      ],
      responses: {
        200: {
          description: 'User retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Success' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/User' }
                    }
                  }
                ]
              }
            }
          }
        },
        404: {
          description: 'User not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    patch: {
      summary: 'Update user by admin',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'identifier',
          required: true,
          schema: { type: 'string' },
          description: 'User identifier (ID, username, or slug)'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                role: { type: 'string', enum: ['citizen', 'coordinator', 'admin'] },
                isActive: { type: 'boolean' },
                verified: { type: 'boolean' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'User updated successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        },
        403: {
          description: 'Admin access required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },

  // Region Management Routes
  '/regions': {
    get: {
      summary: 'Get all regions',
      tags: ['Regions'],
      responses: {
        200: {
          description: 'Regions retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Success' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          regions: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: { type: 'string' },
                                name: { type: 'string' },
                                slug: { type: 'string' },
                                publicId: { type: 'string' }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    },
    post: {
      summary: 'Create new region (Admin only)',
      tags: ['Regions'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string', example: 'Central Region' }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Region created successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        },
        403: {
          description: 'Admin access required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },

  '/regions/{key}': {
    get: {
      summary: 'Get region by key (ID, slug, or publicId)',
      tags: ['Regions'],
      parameters: [
        {
          in: 'path',
          name: 'key',
          required: true,
          schema: { type: 'string' },
          description: 'Region identifier (ID, slug, or publicId)'
        }
      ],
      responses: {
        200: {
          description: 'Region retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        },
        404: {
          description: 'Region not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    patch: {
      summary: 'Update region (Admin only)',
      tags: ['Regions'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'key',
          required: true,
          schema: { type: 'string' },
          description: 'Region identifier'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Updated Region Name' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Region updated successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        },
        403: {
          description: 'Admin access required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    delete: {
      summary: 'Delete region (Admin only)',
      tags: ['Regions'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'key',
          required: true,
          schema: { type: 'string' },
          description: 'Region identifier'
        }
      ],
      responses: {
        200: {
          description: 'Region deleted successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        },
        403: {
          description: 'Admin access required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },

  '/regions/{regionKey}/districts': {
    get: {
      summary: 'Get districts by region',
      tags: ['Regions'],
      parameters: [
        {
          in: 'path',
          name: 'regionKey',
          required: true,
          schema: { type: 'string' },
          description: 'Region identifier (ID, slug, or publicId)'
        }
      ],
      responses: {
        200: {
          description: 'Districts retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    }
  },

  // District Management Routes
  '/districts': {
    get: {
      summary: 'Get all districts',
      tags: ['Districts'],
      parameters: [
        {
          in: 'query',
          name: 'region',
          schema: { type: 'string' },
          description: 'Filter by region key'
        }
      ],
      responses: {
        200: {
          description: 'Districts retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Success' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          districts: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                id: { type: 'string' },
                                name: { type: 'string' },
                                region: { type: 'object' }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    },
    post: {
      summary: 'Create new district (Admin only)',
      tags: ['Districts'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'region'],
              properties: {
                name: { type: 'string', example: 'Kampala District' },
                region: { type: 'string', example: 'Central' }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'District created successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        },
        403: {
          description: 'Admin access required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },

  '/districts/{key}': {
    get: {
      summary: 'Get district by key',
      tags: ['Districts'],
      parameters: [
        {
          in: 'path',
          name: 'key',
          required: true,
          schema: { type: 'string' },
          description: 'District identifier'
        }
      ],
      responses: {
        200: {
          description: 'District retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        },
        404: {
          description: 'District not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    patch: {
      summary: 'Update district (Admin only)',
      tags: ['Districts'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'key',
          required: true,
          schema: { type: 'string' },
          description: 'District identifier'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Updated District Name' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'District updated successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        },
        403: {
          description: 'Admin access required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    delete: {
      summary: 'Delete district (Admin only)',
      tags: ['Districts'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'key',
          required: true,
          schema: { type: 'string' },
          description: 'District identifier'
        }
      ],
      responses: {
        200: {
          description: 'District deleted successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        },
        403: {
          description: 'Admin access required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },

  // Community Management Routes
  '/communities': {
    get: {
      summary: 'List communities with filters',
      tags: ['Community'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'query',
          name: 'q',
          schema: { type: 'string' },
          description: 'Search query'
        },
        {
          in: 'query',
          name: 'region',
          schema: { type: 'string' },
          description: 'Filter by region'
        },
        {
          in: 'query',
          name: 'district',
          schema: { type: 'string' },
          description: 'Filter by district'
        },
        {
          in: 'query',
          name: 'isPublic',
          schema: { type: 'boolean' },
          description: 'Filter by public status'
        },
        {
          in: 'query',
          name: 'page',
          schema: { type: 'integer', default: 1 },
          description: 'Page number'
        },
        {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', default: 20 },
          description: 'Items per page'
        },
        {
          in: 'query',
          name: 'sort',
          schema: { type: 'string', default: '-createdAt' },
          description: 'Sort order'
        }
      ],
      responses: {
        200: {
          description: 'Communities retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Success' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        allOf: [
                          { $ref: '#/components/schemas/Pagination' },
                          {
                            type: 'object',
                            properties: {
                              items: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/Community' }
                              }
                            }
                          }
                        ]
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    },
    post: {
      summary: 'Create new community',
      tags: ['Community'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['name', 'region', 'district'],
              properties: {
                name: { type: 'string', example: 'Central Park Community' },
                description: { type: 'string', example: 'A community focused on safety' },
                region: { type: 'string', example: '507f1f77bcf86cd799439013' },
                district: { type: 'string', example: '507f1f77bcf86cd799439014' },
                isPublic: { type: 'boolean', example: true }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Community created successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Success' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Community' }
                    }
                  }
                ]
              }
            }
          }
        },
        400: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },

  '/communities/{identifier}': {
    get: {
      summary: 'Get community by identifier',
      tags: ['Community'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'identifier',
          required: true,
          schema: { type: 'string' },
          description: 'Community identifier (ID, slug, or publicId)'
        }
      ],
      responses: {
        200: {
          description: 'Community retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Success' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Community' }
                    }
                  }
                ]
              }
            }
          }
        },
        404: {
          description: 'Community not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    put: {
      summary: 'Update community',
      tags: ['Community'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'identifier',
          required: true,
          schema: { type: 'string' },
          description: 'Community identifier'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string', example: 'Updated Community Name' },
                description: { type: 'string', example: 'Updated description' },
                isPublic: { type: 'boolean', example: true }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Community updated successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        },
        403: {
          description: 'Not authorized to update this community',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    delete: {
      summary: 'Delete community',
      tags: ['Community'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'identifier',
          required: true,
          schema: { type: 'string' },
          description: 'Community identifier'
        }
      ],
      responses: {
        200: {
          description: 'Community deleted successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        },
        403: {
          description: 'Not authorized to delete this community',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },

  // Community Member Routes
  '/community-members/{communitySlug}/join': {
    post: {
      summary: 'Join a community',
      tags: ['Community'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'communitySlug',
          required: true,
          schema: { type: 'string' },
          description: 'Community identifier (ID, slug, or publicId)'
        }
      ],
      responses: {
        200: {
          description: 'Joined community successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        },
        400: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },

  '/community-members/{communitySlug}/leave': {
    post: {
      summary: 'Leave a community',
      tags: ['Community'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'communitySlug',
          required: true,
          schema: { type: 'string' },
          description: 'Community identifier (ID, slug, or publicId)'
        }
      ],
      responses: {
        200: {
          description: 'Left community successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        },
        404: {
          description: 'Community not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },

  '/community-members/{communitySlug}': {
    get: {
      summary: 'List community members',
      tags: ['Community'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'communitySlug',
          required: true,
          schema: { type: 'string' },
          description: 'Community identifier (ID, slug, or publicId)'
        }
      ],
      responses: {
        200: {
          description: 'Members retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    }
  },

  '/community-members/{communitySlug}/{userSlug}/assign-coordinator': {
    patch: {
      summary: 'Assign coordinator role (Admin only)',
      tags: ['Community'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'communitySlug',
          required: true,
          schema: { type: 'string' },
          description: 'Community identifier (ID, slug, or publicId)'
        },
        {
          in: 'path',
          name: 'userSlug',
          required: true,
          schema: { type: 'string' },
          description: 'User identifier (ID, username, or slug)'
        }
      ],
      responses: {
        200: {
          description: 'Coordinator assigned successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        },
        403: {
          description: 'Admin access required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },

  // Announcement Routes
  '/announcements': {
    get: {
      summary: 'Get all announcements',
      tags: ['Announcements'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Announcements retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Success' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Announcement' }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    },
    post: {
      summary: 'Create announcement',
      tags: ['Announcements'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['title'],
              properties: {
                title: { type: 'string', example: 'Community Safety Meeting' },
                body: { type: 'string', example: 'Join us for our monthly safety meeting...' },
                community: { type: 'string', example: 'central-park-community' },
                files: {
                  type: 'array',
                  items: { type: 'string', format: 'binary' },
                  description: 'Attachments'
                }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Announcement created successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Success' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Announcement' }
                    }
                  }
                ]
              }
            }
          }
        },
        403: {
          description: 'Not authorized to post announcements',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },

  '/announcements/{slug}': {
    get: {
      summary: 'Get announcement by slug',
      tags: ['Announcements'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'slug',
          required: true,
          schema: { type: 'string' },
          description: 'Announcement slug'
        }
      ],
      responses: {
        200: {
          description: 'Announcement retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Success' },
                  {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Announcement' }
                    }
                  }
                ]
              }
            }
          }
        },
        404: {
          description: 'Announcement not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    put: {
      summary: 'Update announcement',
      tags: ['Announcements'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'slug',
          required: true,
          schema: { type: 'string' },
          description: 'Announcement slug'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                title: { type: 'string', example: 'Updated Title' },
                body: { type: 'string', example: 'Updated content...' },
                files: {
                  type: 'array',
                  items: { type: 'string', format: 'binary' },
                  description: 'Additional attachments'
                }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Announcement updated successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        },
        403: {
          description: 'Not authorized to update this announcement',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    delete: {
      summary: 'Delete announcement',
      tags: ['Announcements'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'slug',
          required: true,
          schema: { type: 'string' },
          description: 'Announcement slug'
        }
      ],
      responses: {
        200: {
          description: 'Announcement deleted successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        },
        403: {
          description: 'Not authorized to delete this announcement',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },

  '/announcements/{slug}/forward': {
    post: {
      summary: 'Forward announcement to chat',
      tags: ['Announcements'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'slug',
          required: true,
          schema: { type: 'string' },
          description: 'Announcement slug'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['chatId'],
              properties: {
                chatId: { type: 'string', example: 'emergency-chat-2024' }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Announcement forwarded successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        },
        403: {
          description: 'Not allowed to forward this announcement',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },

  // Chat Routes
  '/chats/{chatSlug}/messages': {
    get: {
      summary: 'Get chat messages',
      tags: ['Chat'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'chatSlug',
          required: true,
          schema: { type: 'string' },
          description: 'Chat identifier (ID, slug, or hash_id)'
        },
        {
          in: 'query',
          name: 'before',
          schema: { type: 'string', format: 'date-time' },
          description: 'Get messages before this timestamp'
        },
        {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', default: 20 },
          description: 'Number of messages to retrieve'
        }
      ],
      responses: {
        200: {
          description: 'Messages retrieved successfully',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/Success' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            content: { type: 'string' },
                            type: { type: 'string', enum: ['text', 'image', 'file'] },
                            sender: { type: 'object' },
                            createdAt: { type: 'string', format: 'date-time' }
                          }
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        403: {
          description: 'Access denied',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    },
    post: {
      summary: 'Send message to chat',
      tags: ['Chat'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'chatSlug',
          required: true,
          schema: { type: 'string' },
          description: 'Chat identifier (ID, slug, or hash_id)'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                content: { type: 'string', example: 'Hello everyone!' },
                type: { type: 'string', enum: ['text', 'image', 'file'], default: 'text' },
                replyTo: { type: 'string', example: 'msg_abc123' },
                forwardMessageId: { type: 'string', example: 'msg_def456' }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Message sent successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        },
        403: {
          description: 'Access denied',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  }
};

export const tags = [
  {
    name: 'Authentication',
    description: 'User authentication and authorization'
  },
  {
    name: 'Users',
    description: 'User management and profiles'
  },
  {
    name: 'Regions',
    description: 'Geographic region management'
  },
  {
    name: 'Districts',
    description: 'District management'
  },
  {
    name: 'Community',
    description: 'Community management and membership'
  },
  {
    name: 'Announcements',
    description: 'Community announcements'
  },
  {
    name: 'Chat',
    description: 'Real-time messaging system'
  },
  {
    name: 'Emergency',
    description: 'Emergency management and incident reporting'
  },
  {
    name: 'Emergency Alerts',
    description: 'System-wide emergency alerts'
  },
  {
    name: 'Emergency Contacts',
    description: 'Emergency contact management'
  }
];
