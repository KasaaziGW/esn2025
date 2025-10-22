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

  '/auth/verify': {
    get: {
      summary: 'Verify user session',
      tags: ['Authentication'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Session verified successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' },
              example: {
                status: 'success',
                message: 'Session verified',
                data: {
                  user: {
                    id: '507f1f77bcf86cd799439011',
                    username: 'john_doe',
                    role: 'citizen',
                    email: 'john@example.com'
                  }
                }
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

  '/users/profile': {
    get: {
      summary: 'Get user profile page (session-based)',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Profile page rendered successfully',
          content: {
            'text/html': {
              schema: { type: 'string' }
            }
          }
        }
      }
    },
    put: {
      summary: 'Update user profile (session-based)',
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
        }
      }
    }
  },

  '/users/profile/avatar': {
    post: {
      summary: 'Upload user avatar',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                avatar: { type: 'string', format: 'binary', description: 'Avatar image file' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Avatar uploaded successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    },
    delete: {
      summary: 'Remove user avatar',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Avatar removed successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
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

  '/users/{id}': {
    get: {
      summary: 'Get user by ID (Admin only)',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'string' },
          description: 'User ID'
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
    put: {
      summary: 'Update user by admin',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'string' },
          description: 'User ID'
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
    },
    delete: {
      summary: 'Delete user (Admin only)',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'string' },
          description: 'User ID'
        }
      ],
      responses: {
        200: {
          description: 'User deleted successfully',
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

  '/users/{id}/status': {
    put: {
      summary: 'Update user status (Admin only)',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'string' },
          description: 'User ID'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                isActive: { type: 'boolean' },
                verified: { type: 'boolean' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'User status updated successfully',
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

  '/users/{id}/password': {
    put: {
      summary: 'Change user password (Admin only)',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'string' },
          description: 'User ID'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['password'],
              properties: {
                password: { type: 'string', example: 'NewPassword123' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Password changed successfully',
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

  '/users/stats': {
    get: {
      summary: 'Get user statistics (Admin only)',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'User statistics retrieved successfully',
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

  '/users/export': {
    get: {
      summary: 'Export users data (Admin only)',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Users data exported successfully',
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

  '/users/admin': {
    get: {
      summary: 'Get admin users page (Admin only)',
      tags: ['Users'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Admin users page rendered successfully',
          content: {
            'text/html': {
              schema: { type: 'string' }
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
  '/announcements/list': {
    get: {
      summary: 'Get all announcements',
      tags: ['Announcements'],
      security: [{ bearerAuth: [] }],
      parameters: [
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
          name: 'emergency',
          schema: { type: 'boolean' },
          description: 'Filter by emergency announcements'
        }
      ],
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
    }
  },

  '/announcements/emergency/today': {
    get: {
      summary: 'Get today\'s emergency alerts',
      tags: ['Announcements'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Emergency alerts retrieved successfully',
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
    }
  },

  '/announcements': {
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
                type: { type: 'string', enum: ['general', 'emergency'], example: 'general' },
                priority: { type: 'string', enum: ['low', 'medium', 'high'], example: 'medium' },
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

  '/announcements/id/{id}': {
    get: {
      summary: 'Get announcement by ID',
      tags: ['Announcements'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'string' },
          description: 'Announcement ID'
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
      summary: 'Update announcement by ID',
      tags: ['Announcements'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'string' },
          description: 'Announcement ID'
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
                type: { type: 'string', enum: ['general', 'emergency'] },
                priority: { type: 'string', enum: ['low', 'medium', 'high'] },
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
      summary: 'Delete announcement by ID',
      tags: ['Announcements'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'string' },
          description: 'Announcement ID'
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

  '/announcements/id/{id}/view': {
    post: {
      summary: 'Track announcement view',
      tags: ['Announcements'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'string' },
          description: 'Announcement ID'
        }
      ],
      responses: {
        200: {
          description: 'View tracked successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    }
  },

  '/announcements/id/{id}/forward': {
    post: {
      summary: 'Track announcement forward',
      tags: ['Announcements'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: { type: 'string' },
          description: 'Announcement ID'
        }
      ],
      responses: {
        200: {
          description: 'Forward tracked successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
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
  '/chats/{chatId}/messages': {
    get: {
      summary: 'Get chat messages',
      tags: ['Chat'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'chatId',
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
          name: 'chatId',
          required: true,
          schema: { type: 'string' },
          description: 'Chat identifier (ID, slug, or hash_id)'
        }
      ],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              properties: {
                content: { type: 'string', example: 'Hello everyone!' },
                type: { type: 'string', enum: ['text', 'image', 'file'], default: 'text' },
                replyTo: { type: 'string', example: 'msg_abc123' },
                forwardMessageId: { type: 'string', example: 'msg_def456' },
                file: { type: 'string', format: 'binary', description: 'File attachment' }
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
  },

  '/chats/private': {
    get: {
      summary: 'Get private chats for current user',
      tags: ['Chat'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Private chats retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    },
    post: {
      summary: 'Create new private chat',
      tags: ['Chat'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['participantId'],
              properties: {
                participantId: { type: 'string', example: '507f1f77bcf86cd799439011' }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Private chat created successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    }
  },

  '/chats/private/with/{userId}': {
    get: {
      summary: 'Get private chat with specific user',
      tags: ['Chat'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'userId',
          required: true,
          schema: { type: 'string' },
          description: 'User ID'
        }
      ],
      responses: {
        200: {
          description: 'Private chat retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    }
  },

  '/chats/community/{communityId}': {
    get: {
      summary: 'Get community chat',
      tags: ['Chat'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'communityId',
          required: true,
          schema: { type: 'string' },
          description: 'Community ID'
        }
      ],
      responses: {
        200: {
          description: 'Community chat retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    }
  },

  '/chats/community': {
    post: {
      summary: 'Create community chat',
      tags: ['Chat'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['communityId'],
              properties: {
                communityId: { type: 'string', example: '507f1f77bcf86cd799439011' }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Community chat created successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    }
  },

  // Community Access Routes
  '/community-access/available': {
    get: {
      summary: 'Get communities available to user',
      tags: ['Community Access'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Available communities retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    }
  },

  '/community-access/user-communities': {
    get: {
      summary: 'Get user communities',
      tags: ['Community Access'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'User communities retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    }
  },

  '/community-access/join/{communityId}': {
    post: {
      summary: 'Join a community',
      tags: ['Community Access'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'communityId',
          required: true,
          schema: { type: 'string' },
          description: 'Community ID'
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
        }
      }
    }
  },

  '/community-access/leave': {
    post: {
      summary: 'Leave current community',
      tags: ['Community Access'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Left community successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    }
  },

  '/community-access/my-community': {
    get: {
      summary: 'Get user\'s current community',
      tags: ['Community Access'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Current community retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    }
  },

  '/community-access/members': {
    get: {
      summary: 'Get community members',
      tags: ['Community Access'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Community members retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    }
  },

  '/community-access/online-members': {
    get: {
      summary: 'Get online members',
      tags: ['Community Access'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Online members retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    }
  },

  '/community-access/access-status': {
    get: {
      summary: 'Check community access status',
      tags: ['Community Access'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Access status retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    }
  },

  // Notification Routes
  '/notifications/check': {
    get: {
      summary: 'Check notifications',
      tags: ['Notifications'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Notifications checked successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    }
  },

  // Dashboard Routes
  '/dashboard/data': {
    get: {
      summary: 'Get dashboard data',
      tags: ['Dashboard'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Dashboard data retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    }
  },

  // Coordinator Request Routes
  '/coordinator-requests': {
    get: {
      summary: 'Get all coordinator requests (Admin only)',
      tags: ['Coordinator Requests'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Coordinator requests retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    },
    post: {
      summary: 'Submit coordinator request',
      tags: ['Coordinator Requests'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['reason'],
              properties: {
                reason: { type: 'string', example: 'I want to help coordinate emergency responses' },
                experience: { type: 'string', example: '5 years in emergency services' },
                attachment: { type: 'string', format: 'binary', description: 'Supporting documents' }
              }
            }
          }
        }
      },
      responses: {
        201: {
          description: 'Coordinator request submitted successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    }
  },

  '/coordinator-requests/my-request': {
    get: {
      summary: 'Get my coordinator request status',
      tags: ['Coordinator Requests'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'My coordinator request retrieved successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    }
  },

  '/coordinator-requests/{requestId}/review': {
    put: {
      summary: 'Review coordinator request (Admin only)',
      tags: ['Coordinator Requests'],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          in: 'path',
          name: 'requestId',
          required: true,
          schema: { type: 'string' },
          description: 'Request ID'
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
                status: { type: 'string', enum: ['approved', 'rejected'], example: 'approved' },
                notes: { type: 'string', example: 'Approved based on experience' }
              }
            }
          }
        }
      },
      responses: {
        200: {
          description: 'Coordinator request reviewed successfully',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Success' }
            }
          }
        }
      }
    }
  },

  // Page Routes (Web Interface)
  '/': {
    get: {
      summary: 'Get landing page',
      tags: ['Pages'],
      responses: {
        200: {
          description: 'Landing page rendered successfully',
          content: {
            'text/html': {
              schema: { type: 'string' }
            }
          }
        }
      }
    }
  },

  '/login': {
    get: {
      summary: 'Get login page',
      tags: ['Pages'],
      responses: {
        200: {
          description: 'Login page rendered successfully',
          content: {
            'text/html': {
              schema: { type: 'string' }
            }
          }
        }
      }
    }
  },

  '/register': {
    get: {
      summary: 'Get registration page',
      tags: ['Pages'],
      responses: {
        200: {
          description: 'Registration page rendered successfully',
          content: {
            'text/html': {
              schema: { type: 'string' }
            }
          }
        }
      }
    }
  },

  '/logout': {
    get: {
      summary: 'Logout user and redirect to login',
      tags: ['Pages'],
      responses: {
        302: {
          description: 'Redirect to login page',
          headers: {
            Location: {
              schema: { type: 'string' },
              description: 'Redirect URL'
            }
          }
        }
      }
    }
  },

  '/admin/coordinator-requests': {
    get: {
      summary: 'Get admin coordinator requests page (Admin only)',
      tags: ['Pages'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Coordinator requests page rendered successfully',
          content: {
            'text/html': {
              schema: { type: 'string' }
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

  '/coordinator/announcements': {
    get: {
      summary: 'Get coordinator announcements page (Coordinator only)',
      tags: ['Pages'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Coordinator announcements page rendered successfully',
          content: {
            'text/html': {
              schema: { type: 'string' }
            }
          }
        },
        403: {
          description: 'Coordinator access required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' }
            }
          }
        }
      }
    }
  },

  // Communities Page Routes
  '/communities': {
    get: {
      summary: 'Get communities page',
      tags: ['Pages'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Communities page rendered successfully',
          content: {
            'text/html': {
              schema: { type: 'string' }
            }
          }
        }
      }
    }
  },

  '/admin/communities': {
    get: {
      summary: 'Get admin communities page (Admin only)',
      tags: ['Pages'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Admin communities page rendered successfully',
          content: {
            'text/html': {
              schema: { type: 'string' }
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

  // Chat Page Routes
  '/chat': {
    get: {
      summary: 'Get private chat page',
      tags: ['Pages'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Private chat page rendered successfully',
          content: {
            'text/html': {
              schema: { type: 'string' }
            }
          }
        },
        302: {
          description: 'Redirect to communities page if not member',
          headers: {
            Location: {
              schema: { type: 'string' },
              description: 'Redirect URL'
            }
          }
        }
      }
    }
  },

  '/public-chat': {
    get: {
      summary: 'Get community chat page',
      tags: ['Pages'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Community chat page rendered successfully',
          content: {
            'text/html': {
              schema: { type: 'string' }
            }
          }
        },
        302: {
          description: 'Redirect to communities page if not member',
          headers: {
            Location: {
              schema: { type: 'string' },
              description: 'Redirect URL'
            }
          }
        }
      }
    }
  },

  // Alerts Page Route
  '/alerts': {
    get: {
      summary: 'Get alerts page',
      tags: ['Pages'],
      security: [{ bearerAuth: [] }],
      responses: {
        200: {
          description: 'Alerts page rendered successfully',
          content: {
            'text/html': {
              schema: { type: 'string' }
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
    name: 'Community Access',
    description: 'Community access and membership management'
  },
  {
    name: 'Announcements',
    description: 'Community announcements and emergency alerts'
  },
  {
    name: 'Chat',
    description: 'Real-time messaging system'
  },
  {
    name: 'Notifications',
    description: 'User notifications and alerts'
  },
  {
    name: 'Dashboard',
    description: 'Dashboard data and analytics'
  },
  {
    name: 'Coordinator Requests',
    description: 'Coordinator role request management'
  },
  {
    name: 'Pages',
    description: 'Web interface page routes'
  }
];
