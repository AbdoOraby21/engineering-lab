const adminSecurity = [{ bearerAuth: [] }] as const;
const adminAuthErrors = {
  '401': { description: 'Authentication required' },
  '403': { description: 'ADMIN role required' },
} as const;

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Engineering Lab API',
    version: '1.0.0',
    description:
      'Bilingual e-commerce API for Engineering Lab. Prices are integers in piasters. All success responses are wrapped in `{ data }` and errors in `{ error: { code, message, details? } }`.',
  },
  servers: [{ url: '/api/v1', description: 'API v1' }],
  tags: [
    { name: 'Health', description: 'Service health checks' },
    { name: 'Auth', description: 'Registration, login and account recovery' },
    { name: 'Users', description: 'Profile and address management' },
    { name: 'Catalog', description: 'Public products, categories, brands, search and reviews' },
    { name: 'Wishlist', description: 'Authenticated wishlist management' },
    { name: 'Support', description: 'Customer support tickets' },
    { name: 'Content', description: 'Public storefront content such as banners' },
    {
      name: 'Admin',
      description:
        'Administrator-only catalog, inventory, review, banner and upload management. Every operation requires a bearer token for a user with role ADMIN.',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Validation failed' },
              details: { nullable: true },
            },
            required: ['code', 'message'],
          },
        },
        required: ['error'],
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['CUSTOMER', 'ADMIN'] },
          emailVerified: { type: 'boolean' },
          isActive: { type: 'boolean' },
          locale: { type: 'string', enum: ['ar', 'en'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthSession: {
        type: 'object',
        properties: {
          user: { $ref: '#/components/schemas/User' },
          accessToken: { type: 'string' },
          accessTokenExpiresAt: { type: 'string', format: 'date-time' },
        },
      },
      Address: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          label: { type: 'string', nullable: true },
          governorate: { type: 'string' },
          city: { type: 'string' },
          street: { type: 'string' },
          building: { type: 'string' },
          notes: { type: 'string', nullable: true },
          isDefault: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      RegisterInput: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 80 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', example: '+201234567890' },
          password: { type: 'string', minLength: 8, maxLength: 72 },
          locale: { type: 'string', enum: ['ar', 'en'], default: 'ar' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      AddressInput: {
        type: 'object',
        required: ['governorate', 'city', 'street', 'building'],
        properties: {
          label: { type: 'string', maxLength: 40 },
          governorate: { type: 'string' },
          city: { type: 'string' },
          street: { type: 'string' },
          building: { type: 'string' },
          notes: { type: 'string', maxLength: 500 },
          isDefault: { type: 'boolean', default: false },
        },
      },
      CategorySummary: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          nameAr: { type: 'string' },
          nameEn: { type: 'string' },
          slug: { type: 'string' },
        },
        required: ['id', 'nameAr', 'nameEn', 'slug'],
      },
      Category: {
        allOf: [
          { $ref: '#/components/schemas/CategorySummary' },
          {
            type: 'object',
            properties: {
              descriptionAr: { type: 'string', nullable: true },
              descriptionEn: { type: 'string', nullable: true },
              imageUrl: { type: 'string', nullable: true },
              parentId: { type: 'string', nullable: true },
              sortOrder: { type: 'integer' },
              isActive: { type: 'boolean' },
              productCount: { type: 'integer' },
              children: { type: 'array', items: { $ref: '#/components/schemas/Category' } },
            },
          },
        ],
      },
      CategoryDetail: {
        allOf: [
          { $ref: '#/components/schemas/Category' },
          {
            type: 'object',
            properties: {
              breadcrumb: { type: 'array', items: { $ref: '#/components/schemas/CategorySummary' } },
            },
          },
        ],
      },
      Brand: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          nameAr: { type: 'string' },
          nameEn: { type: 'string' },
          slug: { type: 'string' },
          logoUrl: { type: 'string', nullable: true },
          descriptionAr: { type: 'string', nullable: true },
          descriptionEn: { type: 'string', nullable: true },
          websiteUrl: { type: 'string', nullable: true },
          sortOrder: { type: 'integer' },
          isActive: { type: 'boolean' },
          productCount: { type: 'integer' },
        },
      },
      ProductImage: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          url: { type: 'string', format: 'uri' },
          altAr: { type: 'string', nullable: true },
          altEn: { type: 'string', nullable: true },
          sortOrder: { type: 'integer' },
        },
      },
      ProductVariant: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          nameAr: { type: 'string' },
          nameEn: { type: 'string' },
          sku: { type: 'string' },
          priceDelta: { type: 'integer', description: 'Piasters added to the base price' },
          stock: { type: 'integer' },
          isActive: { type: 'boolean' },
          sortOrder: { type: 'integer' },
        },
      },
      ProductSpec: {
        type: 'object',
        properties: {
          keyAr: { type: 'string' },
          keyEn: { type: 'string' },
          valueAr: { type: 'string' },
          valueEn: { type: 'string' },
        },
        required: ['keyAr', 'keyEn', 'valueAr', 'valueEn'],
      },
      ProductCard: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          nameAr: { type: 'string' },
          nameEn: { type: 'string' },
          slug: { type: 'string' },
          sku: { type: 'string' },
          price: { type: 'integer', description: 'Price in piasters (100 piasters = 1 EGP)' },
          compareAtPrice: { type: 'integer', nullable: true },
          stock: { type: 'integer' },
          isFeatured: { type: 'boolean' },
          isBundle: { type: 'boolean' },
          ratingAverage: { type: 'number' },
          ratingCount: { type: 'integer' },
          soldCount: { type: 'integer' },
          tags: { type: 'array', items: { type: 'string' } },
          primaryImage: {
            oneOf: [{ $ref: '#/components/schemas/ProductImage' }, { type: 'null' }],
          },
          brand: { oneOf: [{ $ref: '#/components/schemas/Brand' }, { type: 'null' }] },
          category: { $ref: '#/components/schemas/CategorySummary' },
        },
      },
      BundleItem: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          quantity: { type: 'integer' },
          component: { $ref: '#/components/schemas/ProductCard' },
        },
      },
      ProductDetail: {
        allOf: [
          { $ref: '#/components/schemas/ProductCard' },
          {
            type: 'object',
            properties: {
              descriptionAr: { type: 'string' },
              descriptionEn: { type: 'string' },
              weightGrams: { type: 'integer', nullable: true },
              lowStockThreshold: { type: 'integer' },
              datasheetUrl: { type: 'string', nullable: true },
              specs: { type: 'array', items: { $ref: '#/components/schemas/ProductSpec' } },
              images: { type: 'array', items: { $ref: '#/components/schemas/ProductImage' } },
              variants: { type: 'array', items: { $ref: '#/components/schemas/ProductVariant' } },
              bundleItems: { type: 'array', items: { $ref: '#/components/schemas/BundleItem' } },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        ],
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
          hasNextPage: { type: 'boolean' },
          hasPreviousPage: { type: 'boolean' },
        },
      },
      ProductListResult: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { $ref: '#/components/schemas/ProductCard' } },
          pagination: { $ref: '#/components/schemas/PaginationMeta' },
        },
      },
      AutocompleteSuggestion: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          nameAr: { type: 'string' },
          nameEn: { type: 'string' },
          slug: { type: 'string' },
          price: { type: 'integer' },
          imageUrl: { type: 'string', nullable: true },
        },
      },
      Review: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          comment: { type: 'string', nullable: true },
          isVerifiedPurchase: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
            },
          },
        },
      },
      ReviewSummary: {
        type: 'object',
        properties: {
          average: { type: 'number' },
          count: { type: 'integer' },
          distribution: {
            type: 'object',
            properties: {
              '1': { type: 'integer' },
              '2': { type: 'integer' },
              '3': { type: 'integer' },
              '4': { type: 'integer' },
              '5': { type: 'integer' },
            },
          },
        },
      },
      ReviewListResult: {
        type: 'object',
        properties: {
          reviews: { type: 'array', items: { $ref: '#/components/schemas/Review' } },
          pagination: { $ref: '#/components/schemas/PaginationMeta' },
          summary: { $ref: '#/components/schemas/ReviewSummary' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: { '200': { description: 'Service is healthy' } },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create an account and start a session',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RegisterInput' } },
          },
        },
        responses: {
          '201': {
            description: 'Account created. Sets httpOnly refresh cookie.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { data: { $ref: '#/components/schemas/AuthSession' } },
                },
              },
            },
          },
          '409': { description: 'Email already registered' },
          '422': { description: 'Validation error' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LoginInput' } },
          },
        },
        responses: {
          '200': {
            description: 'Session created. Sets httpOnly refresh cookie.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { data: { $ref: '#/components/schemas/AuthSession' } },
                },
              },
            },
          },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate refresh token and issue a new access token',
        responses: {
          '200': { description: 'New session, rotated refresh cookie' },
          '401': { description: 'Invalid or expired refresh token' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke the current refresh token',
        responses: { '200': { description: 'Logged out' } },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the current authenticated user',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Current user' },
          '401': { description: 'Authentication required' },
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Send a password reset link (never reveals whether the email exists)',
        responses: { '200': { description: 'Request accepted' } },
      },
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password with a valid token',
        responses: { '200': { description: 'Password updated' }, '400': { description: 'Invalid token' } },
      },
    },
    '/auth/verify-email': {
      post: {
        tags: ['Auth'],
        summary: 'Verify an email address with a token',
        responses: { '200': { description: 'Email verified' }, '400': { description: 'Invalid token' } },
      },
    },
    '/auth/resend-verification': {
      post: {
        tags: ['Auth'],
        summary: 'Resend the verification email',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Verification email sent' } },
      },
    },
    '/auth/providers': {
      get: {
        tags: ['Auth'],
        summary: 'List enabled external login providers',
        responses: {
          '200': {
            description: 'Provider availability',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { data: { type: 'object', properties: { google: { type: 'boolean' } } } },
                },
              },
            },
          },
        },
      },
    },
    '/auth/google': {
      get: {
        tags: ['Auth'],
        summary: 'Start the Google OAuth login flow (redirects to Google)',
        parameters: [
          { name: 'locale', in: 'query', schema: { type: 'string', enum: ['ar', 'en'] } },
          {
            name: 'redirect',
            in: 'query',
            description: 'Relative in-app path to return to after login',
            schema: { type: 'string' },
          },
        ],
        responses: {
          '302': { description: 'Redirect to Google consent screen' },
          '404': { description: 'Google login is not enabled' },
        },
      },
    },
    '/auth/google/callback': {
      get: {
        tags: ['Auth'],
        summary: 'Google OAuth callback. Validates state, sets refresh cookie, redirects to the web app with the access token in the URL fragment',
        parameters: [
          { name: 'code', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'state', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '302': { description: 'Redirect to /:locale/auth/callback#access_token=... (or /:locale/login?error=... on failure)' },
        },
      },
    },
    '/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Get the current user',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Current user' } },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update profile fields',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Updated user' } },
      },
    },
    '/users/me/change-password': {
      post: {
        tags: ['Users'],
        summary: 'Change password and rotate the session',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Password changed' }, '400': { description: 'Current password incorrect' } },
      },
    },
    '/users/me/addresses': {
      get: {
        tags: ['Users'],
        summary: 'List addresses',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Address list' } },
      },
      post: {
        tags: ['Users'],
        summary: 'Create an address',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Address created' } },
      },
    },
    '/users/me/addresses/{id}': {
      patch: {
        tags: ['Users'],
        summary: 'Update an address',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Address updated' }, '404': { description: 'Address not found' } },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete an address',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Address deleted' }, '404': { description: 'Address not found' } },
      },
    },
    '/users/me/addresses/{id}/default': {
      post: {
        tags: ['Users'],
        summary: 'Set an address as default',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Default address updated' }, '404': { description: 'Address not found' } },
      },
    },
    '/catalog/categories': {
      get: {
        tags: ['Catalog'],
        summary: 'Get the full category tree (active only, with product counts)',
        responses: {
          '200': {
            description: 'Category tree',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        categories: { type: 'array', items: { $ref: '#/components/schemas/Category' } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/catalog/categories/{slug}': {
      get: {
        tags: ['Catalog'],
        summary: 'Get one category with breadcrumb and children',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Category detail' },
          '404': { description: 'CATEGORY_NOT_FOUND' },
        },
      },
    },
    '/catalog/brands': {
      get: {
        tags: ['Catalog'],
        summary: 'List active brands with product counts',
        responses: {
          '200': {
            description: 'Brand list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        brands: { type: 'array', items: { $ref: '#/components/schemas/Brand' } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/catalog/products': {
      get: {
        tags: ['Catalog'],
        summary: 'List products with server-side search, filters, sorting and pagination',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string', maxLength: 120 }, description: 'Arabic/English/SKU search with typo tolerance' },
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Category slug, includes descendants' },
          { name: 'brand', in: 'query', schema: { type: 'string' }, description: 'Brand slug' },
          { name: 'minPrice', in: 'query', schema: { type: 'integer', minimum: 0 }, description: 'Piasters' },
          { name: 'maxPrice', in: 'query', schema: { type: 'integer', minimum: 0 }, description: 'Piasters' },
          { name: 'inStock', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
          { name: 'minRating', in: 'query', schema: { type: 'number', minimum: 0, maximum: 5 } },
          { name: 'featured', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
          { name: 'onSale', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
          {
            name: 'sort',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['relevance', 'newest', 'oldest', 'price_asc', 'price_desc', 'name_asc', 'name_desc', 'popular', 'rating'],
              default: 'newest',
            },
          },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 60, default: 12 } },
          { name: 'locale', in: 'query', schema: { type: 'string', enum: ['ar', 'en'], default: 'ar' } },
        ],
        responses: {
          '200': {
            description: 'Paginated product list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { data: { $ref: '#/components/schemas/ProductListResult' } },
                },
              },
            },
          },
          '422': { description: 'Validation error' },
        },
      },
    },
    '/catalog/products/autocomplete': {
      get: {
        tags: ['Catalog'],
        summary: 'Search suggestions for the header search bar',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string', minLength: 2, maxLength: 80 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 12, default: 8 } },
          { name: 'locale', in: 'query', schema: { type: 'string', enum: ['ar', 'en'], default: 'ar' } },
        ],
        responses: {
          '200': {
            description: 'Suggestions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        suggestions: { type: 'array', items: { $ref: '#/components/schemas/AutocompleteSuggestion' } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/catalog/products/featured': {
      get: {
        tags: ['Catalog'],
        summary: 'Featured products',
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 24, default: 8 } }],
        responses: {
          '200': {
            description: 'Featured products',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: { products: { type: 'array', items: { $ref: '#/components/schemas/ProductCard' } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/catalog/products/new-arrivals': {
      get: {
        tags: ['Catalog'],
        summary: 'Newest products',
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 24, default: 8 } }],
        responses: { '200': { description: 'New arrivals' } },
      },
    },
    '/catalog/products/best-sellers': {
      get: {
        tags: ['Catalog'],
        summary: 'Best-selling products',
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 24, default: 8 } }],
        responses: { '200': { description: 'Best sellers' } },
      },
    },
    '/catalog/products/{slug}': {
      get: {
        tags: ['Catalog'],
        summary: 'Get a product by slug with images, specs, variants and bundle contents',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Product detail',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { data: { type: 'object', properties: { product: { $ref: '#/components/schemas/ProductDetail' } } } },
                },
              },
            },
          },
          '404': { description: 'PRODUCT_NOT_FOUND' },
        },
      },
    },
    '/catalog/products/{slug}/related': {
      get: {
        tags: ['Catalog'],
        summary: 'Related products from the same category',
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 24, default: 8 } },
        ],
        responses: { '200': { description: 'Related products' }, '404': { description: 'PRODUCT_NOT_FOUND' } },
      },
    },
    '/catalog/products/{slug}/reviews': {
      get: {
        tags: ['Catalog'],
        summary: 'Approved reviews for a product with rating summary',
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 5 } },
        ],
        responses: {
          '200': {
            description: 'Review list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { data: { $ref: '#/components/schemas/ReviewListResult' } },
                },
              },
            },
          },
          '404': { description: 'PRODUCT_NOT_FOUND' },
        },
      },
    },
    '/wishlist': {
      get: {
        tags: ['Wishlist'],
        summary: 'List wishlist items with full product cards',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Wishlist items' }, '401': { description: 'Authentication required' } },
      },
      post: {
        tags: ['Wishlist'],
        summary: 'Add a product to the wishlist (idempotent)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['productId'], properties: { productId: { type: 'string' } } },
            },
          },
        },
        responses: {
          '201': { description: 'Wishlist item' },
          '401': { description: 'Authentication required' },
          '404': { description: 'PRODUCT_NOT_FOUND' },
        },
      },
    },
    '/wishlist/{productId}': {
      post: {
        tags: ['Wishlist'],
        summary: 'Add a product to the wishlist by id (idempotent)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '201': { description: 'Wishlist item' },
          '401': { description: 'Authentication required' },
          '404': { description: 'PRODUCT_NOT_FOUND' },
        },
      },
      delete: {
        tags: ['Wishlist'],
        summary: 'Remove a product from the wishlist (idempotent)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Removed' }, '401': { description: 'Authentication required' } },
      },
    },
    '/support/tickets': {
      get: {
        tags: ['Support'],
        summary: 'List the current user support tickets',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['OPEN', 'PENDING_CUSTOMER', 'RESOLVED', 'CLOSED'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 } },
        ],
        responses: { '200': { description: 'Ticket list' }, '401': { description: 'Authentication required' } },
      },
      post: {
        tags: ['Support'],
        summary: 'Open a support ticket with its first message',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['subject', 'message'],
                properties: {
                  subject: { type: 'string', minLength: 3, maxLength: 160 },
                  category: { type: 'string', enum: ['ORDER', 'PAYMENT', 'PRODUCT', 'SHIPPING', 'OTHER'], default: 'OTHER' },
                  orderReference: { type: 'string', maxLength: 40 },
                  message: { type: 'string', minLength: 2, maxLength: 4000 },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Created ticket' }, '401': { description: 'Authentication required' } },
      },
    },
    '/support/tickets/{id}': {
      get: {
        tags: ['Support'],
        summary: 'Get a ticket with its full message thread',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Ticket detail' },
          '401': { description: 'Authentication required' },
          '404': { description: 'TICKET_NOT_FOUND' },
        },
      },
    },
    '/support/tickets/{id}/messages': {
      post: {
        tags: ['Support'],
        summary: 'Reply to a ticket (reopens resolved/closed tickets)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['body'], properties: { body: { type: 'string', minLength: 1, maxLength: 4000 } } },
            },
          },
        },
        responses: {
          '200': { description: 'Updated ticket' },
          '401': { description: 'Authentication required' },
          '404': { description: 'TICKET_NOT_FOUND' },
        },
      },
    },
    '/support/tickets/{id}/close': {
      post: {
        tags: ['Support'],
        summary: 'Close a ticket (idempotent)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Closed ticket' },
          '401': { description: 'Authentication required' },
          '404': { description: 'TICKET_NOT_FOUND' },
        },
      },
    },
    '/content/banners': {
      get: {
        tags: ['Content'],
        summary: 'Active banners within their schedule window',
        parameters: [
          { name: 'location', in: 'query', schema: { type: 'string', enum: ['HOME_HERO', 'HOME_STRIP'] } },
        ],
        responses: { '200': { description: 'Banner list' } },
      },
    },
    '/contact': {
      post: {
        tags: ['Content'],
        summary: 'Send a contact message (honeypot field: website)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'subject', 'message'],
                properties: {
                  name: { type: 'string', minLength: 2, maxLength: 120 },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string', maxLength: 30, nullable: true },
                  subject: { type: 'string', minLength: 3, maxLength: 160 },
                  message: { type: 'string', minLength: 10, maxLength: 4000 },
                  website: { type: 'string', description: 'Honeypot; must stay empty' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Message received' },
          '422': { description: 'VALIDATION_ERROR' },
          '429': { description: 'RATE_LIMITED' },
        },
      },
    },
    '/faq': {
      get: {
        tags: ['Content'],
        summary: 'Active FAQs ordered by category and sort order',
        parameters: [{ name: 'category', in: 'query', schema: { type: 'string' } }],
        responses: { '200': { description: 'FAQ items and categories' } },
      },
    },
    '/pages/{slug}': {
      get: {
        tags: ['Content'],
        summary: 'Published static page by slug',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Page content' },
          '404': { description: 'PAGE_NOT_FOUND' },
        },
      },
    },
    '/settings/public': {
      get: {
        tags: ['Content'],
        summary: 'Public store settings merged with safe defaults',
        responses: { '200': { description: 'Store settings' } },
      },
    },

    // -----------------------------------------------------------------------
    // Spec aliases: the public catalog is also exposed at the API root.
    // -----------------------------------------------------------------------
    '/categories/tree': {
      get: {
        tags: ['Catalog'],
        summary: 'Alias of /catalog/categories: full active category tree with product counts',
        responses: { '200': { description: 'Category tree' } },
      },
    },
    '/brands': {
      get: {
        tags: ['Catalog'],
        summary: 'Alias of /catalog/brands: active brands with product counts',
        responses: { '200': { description: 'Brand list' } },
      },
    },
    '/products': {
      get: {
        tags: ['Catalog'],
        summary: 'Alias of /catalog/products: search, filter, sort and paginate products',
        responses: { '200': { description: 'Paginated product list' }, '422': { description: 'Validation error' } },
      },
    },
    '/products/by-ids': {
      get: {
        tags: ['Catalog'],
        summary: 'Alias of /catalog/products/by-ids: fetch several products by id',
        parameters: [
          { name: 'ids', in: 'query', required: true, schema: { type: 'string' }, description: 'Comma-separated product ids' },
          { name: 'locale', in: 'query', schema: { type: 'string', enum: ['ar', 'en'], default: 'ar' } },
        ],
        responses: { '200': { description: 'Products' } },
      },
    },
    '/products/lists/featured': {
      get: {
        tags: ['Catalog'],
        summary: 'Featured products (max 12)',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 12, default: 8 } },
          { name: 'locale', in: 'query', schema: { type: 'string', enum: ['ar', 'en'], default: 'ar' } },
        ],
        responses: { '200': { description: 'Featured products' } },
      },
    },
    '/products/lists/new-arrivals': {
      get: {
        tags: ['Catalog'],
        summary: 'New arrivals (max 12)',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 12, default: 8 } },
          { name: 'locale', in: 'query', schema: { type: 'string', enum: ['ar', 'en'], default: 'ar' } },
        ],
        responses: { '200': { description: 'New arrivals' } },
      },
    },
    '/products/lists/best-sellers': {
      get: {
        tags: ['Catalog'],
        summary: 'Best sellers (max 12)',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 12, default: 8 } },
          { name: 'locale', in: 'query', schema: { type: 'string', enum: ['ar', 'en'], default: 'ar' } },
        ],
        responses: { '200': { description: 'Best sellers' } },
      },
    },
    '/products/{slug}': {
      get: {
        tags: ['Catalog'],
        summary: 'Alias of /catalog/products/{slug}: product detail',
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Product detail' }, '404': { description: 'PRODUCT_NOT_FOUND' } },
      },
    },
    '/products/{slug}/related': {
      get: {
        tags: ['Catalog'],
        summary: 'Alias of /catalog/products/{slug}/related',
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 24, default: 8 } },
        ],
        responses: { '200': { description: 'Related products' }, '404': { description: 'PRODUCT_NOT_FOUND' } },
      },
    },
    '/products/{slug}/reviews': {
      get: {
        tags: ['Catalog'],
        summary: 'Alias of /catalog/products/{slug}/reviews: approved reviews + summary',
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 50, default: 5 } },
        ],
        responses: { '200': { description: 'Review list' }, '404': { description: 'PRODUCT_NOT_FOUND' } },
      },
      post: {
        tags: ['Catalog'],
        summary: 'Create a review (verified purchase required; starts PENDING)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['rating'],
                properties: {
                  rating: { type: 'integer', minimum: 1, maximum: 5 },
                  title: { type: 'string', maxLength: 160 },
                  comment: { type: 'string', maxLength: 4000 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Review created (PENDING)' },
          '401': { description: 'Authentication required' },
          '403': { description: 'PURCHASE_REQUIRED' },
          '404': { description: 'PRODUCT_NOT_FOUND' },
          '409': { description: 'REVIEW_ALREADY_EXISTS' },
        },
      },
    },
    '/banners': {
      get: {
        tags: ['Content'],
        summary: 'Alias of /content/banners: active banners within their schedule window',
        parameters: [
          { name: 'location', in: 'query', schema: { type: 'string', enum: ['HOME_HERO', 'HOME_STRIP'] } },
        ],
        responses: { '200': { description: 'Banner list' } },
      },
    },

    // -----------------------------------------------------------------------
    // Admin: categories
    // -----------------------------------------------------------------------
    '/admin/categories': {
      get: {
        tags: ['Admin'],
        summary: 'List all categories (including inactive)',
        security: adminSecurity,
        responses: { '200': { description: 'Category list' }, ...adminAuthErrors },
      },
      post: {
        tags: ['Admin'],
        summary: 'Create a category',
        security: adminSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nameAr', 'nameEn'],
                properties: {
                  nameAr: { type: 'string', minLength: 2, maxLength: 160 },
                  nameEn: { type: 'string', minLength: 2, maxLength: 160 },
                  slug: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
                  descriptionAr: { type: 'string', nullable: true },
                  descriptionEn: { type: 'string', nullable: true },
                  imageUrl: { type: 'string', nullable: true },
                  icon: { type: 'string', nullable: true },
                  parentId: { type: 'string', nullable: true },
                  sortOrder: { type: 'integer', minimum: 0, default: 0 },
                  isActive: { type: 'boolean', default: true },
                  seoTitleAr: { type: 'string', nullable: true },
                  seoTitleEn: { type: 'string', nullable: true },
                  seoDescriptionAr: { type: 'string', nullable: true },
                  seoDescriptionEn: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Category created' }, '422': { description: 'Validation error' }, ...adminAuthErrors },
      },
    },
    '/admin/categories/reorder': {
      patch: {
        tags: ['Admin'],
        summary: 'Reorder categories under a parent',
        security: adminSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['orderedIds'],
                properties: {
                  parentId: { type: 'string', nullable: true },
                  orderedIds: { type: 'array', minItems: 1, items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Reordered categories' }, '422': { description: 'Validation error' }, ...adminAuthErrors },
      },
    },
    '/admin/categories/{id}': {
      patch: {
        tags: ['Admin'],
        summary: 'Update a category (any field)',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
        },
        responses: { '200': { description: 'Category updated' }, '404': { description: 'CATEGORY_NOT_FOUND' }, '422': { description: 'Validation error' }, ...adminAuthErrors },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Delete an empty category',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deleted' }, '404': { description: 'CATEGORY_NOT_FOUND' }, '409': { description: 'Category has children or products' }, ...adminAuthErrors },
      },
    },
    '/admin/categories/{id}/toggle-active': {
      patch: {
        tags: ['Admin'],
        summary: 'Toggle or set category active flag',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { value: { type: 'boolean' } } },
            },
          },
        },
        responses: { '200': { description: 'Category updated' }, '404': { description: 'CATEGORY_NOT_FOUND' }, ...adminAuthErrors },
      },
    },

    // -----------------------------------------------------------------------
    // Admin: brands
    // -----------------------------------------------------------------------
    '/admin/brands': {
      get: {
        tags: ['Admin'],
        summary: 'List all brands (including inactive)',
        security: adminSecurity,
        responses: { '200': { description: 'Brand list' }, ...adminAuthErrors },
      },
      post: {
        tags: ['Admin'],
        summary: 'Create a brand',
        security: adminSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nameAr', 'nameEn'],
                properties: {
                  nameAr: { type: 'string', minLength: 1, maxLength: 160 },
                  nameEn: { type: 'string', minLength: 1, maxLength: 160 },
                  slug: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
                  logoUrl: { type: 'string', nullable: true },
                  descriptionAr: { type: 'string', nullable: true },
                  descriptionEn: { type: 'string', nullable: true },
                  websiteUrl: { type: 'string', format: 'uri', nullable: true },
                  sortOrder: { type: 'integer', minimum: 0, default: 0 },
                  isActive: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Brand created' }, '422': { description: 'Validation error' }, ...adminAuthErrors },
      },
    },
    '/admin/brands/{id}': {
      patch: {
        tags: ['Admin'],
        summary: 'Update a brand',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
        },
        responses: { '200': { description: 'Brand updated' }, '404': { description: 'BRAND_NOT_FOUND' }, '422': { description: 'Validation error' }, ...adminAuthErrors },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Delete a brand',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deleted' }, '404': { description: 'BRAND_NOT_FOUND' }, '409': { description: 'Brand still used by products' }, ...adminAuthErrors },
      },
    },
    '/admin/brands/{id}/toggle-active': {
      patch: {
        tags: ['Admin'],
        summary: 'Toggle or set brand active flag',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { value: { type: 'boolean' } } },
            },
          },
        },
        responses: { '200': { description: 'Brand updated' }, '404': { description: 'BRAND_NOT_FOUND' }, ...adminAuthErrors },
      },
    },

    // -----------------------------------------------------------------------
    // Admin: products, images, variants, bundles and stock
    // -----------------------------------------------------------------------
    '/admin/products': {
      get: {
        tags: ['Admin'],
        summary: 'List products with admin fields (includes inactive)',
        security: adminSecurity,
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'categoryId', in: 'query', schema: { type: 'string' } },
          { name: 'brandId', in: 'query', schema: { type: 'string' } },
          { name: 'isActive', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: { '200': { description: 'Paginated admin product list' }, ...adminAuthErrors },
      },
      post: {
        tags: ['Admin'],
        summary: 'Create a product (category must be a leaf)',
        security: adminSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nameAr', 'nameEn', 'sku', 'descriptionAr', 'descriptionEn', 'price', 'categoryId'],
                properties: {
                  nameAr: { type: 'string', minLength: 2, maxLength: 200 },
                  nameEn: { type: 'string', minLength: 2, maxLength: 200 },
                  slug: { type: 'string' },
                  sku: { type: 'string', pattern: '^[A-Za-z0-9/_-]+$' },
                  descriptionAr: { type: 'string' },
                  descriptionEn: { type: 'string' },
                  shortDescriptionAr: { type: 'string', nullable: true },
                  shortDescriptionEn: { type: 'string', nullable: true },
                  price: { type: 'integer', minimum: 0, description: 'Piasters' },
                  compareAtPrice: { type: 'integer', minimum: 0, nullable: true, description: 'Must be greater than price' },
                  stock: { type: 'integer', minimum: 0, default: 0 },
                  lowStockThreshold: { type: 'integer', minimum: 0, default: 5 },
                  weightGrams: { type: 'integer', minimum: 0, nullable: true },
                  brandId: { type: 'string', nullable: true },
                  categoryId: { type: 'string' },
                  isFeatured: { type: 'boolean', default: false },
                  isNew: { type: 'boolean', default: false },
                  isActive: { type: 'boolean', default: true },
                  type: { type: 'string', enum: ['SIMPLE', 'BUNDLE'], default: 'SIMPLE' },
                  datasheetUrl: { type: 'string', nullable: true },
                  tags: { type: 'array', items: { type: 'string' }, maxItems: 20 },
                  specs: { type: 'array', items: { type: 'object' }, maxItems: 50 },
                  seoTitleAr: { type: 'string', nullable: true },
                  seoTitleEn: { type: 'string', nullable: true },
                  seoDescriptionAr: { type: 'string', nullable: true },
                  seoDescriptionEn: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Product created' }, '409': { description: 'SKU or slug already exists' }, '422': { description: 'Validation error' }, ...adminAuthErrors },
      },
    },
    '/admin/products/import/template': {
      get: {
        tags: ['Admin'],
        summary: 'Download the CSV import template',
        security: adminSecurity,
        responses: { '200': { description: 'CSV template', content: { 'text/csv': { schema: { type: 'string' } } } }, ...adminAuthErrors },
      },
    },
    '/admin/products/import': {
      post: {
        tags: ['Admin'],
        summary: 'Import products from CSV/Excel (dry-run by default)',
        security: adminSecurity,
        parameters: [
          { name: 'dryRun', in: 'query', schema: { type: 'string', enum: ['true', 'false'], default: 'true' } },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: { file: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: { '200': { description: 'Import report with per-row errors and created/updated counts' }, '422': { description: 'Validation error' }, ...adminAuthErrors },
      },
    },
    '/admin/products/export': {
      get: {
        tags: ['Admin'],
        summary: 'Export the catalog',
        security: adminSecurity,
        parameters: [
          { name: 'format', in: 'query', schema: { type: 'string', enum: ['csv', 'xlsx'], default: 'csv' } },
        ],
        responses: { '200': { description: 'Exported file' }, ...adminAuthErrors },
      },
    },
    '/admin/products/{id}': {
      get: {
        tags: ['Admin'],
        summary: 'Get one product with admin fields',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Product detail' }, '404': { description: 'PRODUCT_NOT_FOUND' }, ...adminAuthErrors },
      },
      patch: {
        tags: ['Admin'],
        summary: 'Update a product',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
        },
        responses: { '200': { description: 'Product updated' }, '404': { description: 'PRODUCT_NOT_FOUND' }, '409': { description: 'SKU or slug already exists' }, '422': { description: 'Validation error (leaf category, compareAtPrice, variant/bundle exclusivity)' }, ...adminAuthErrors },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Delete a product',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deleted' }, '404': { description: 'PRODUCT_NOT_FOUND' }, '409': { description: 'Product is referenced by a bundle' }, ...adminAuthErrors },
      },
    },
    '/admin/products/{id}/duplicate': {
      post: {
        tags: ['Admin'],
        summary: 'Duplicate a product as an inactive draft',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '201': { description: 'Duplicated product' }, '404': { description: 'PRODUCT_NOT_FOUND' }, ...adminAuthErrors },
      },
    },
    '/admin/products/{id}/toggle-featured': {
      post: {
        tags: ['Admin'],
        summary: 'Toggle or set the featured flag',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { value: { type: 'boolean' } } } } } },
        responses: { '200': { description: 'Updated' }, '404': { description: 'PRODUCT_NOT_FOUND' }, ...adminAuthErrors },
      },
    },
    '/admin/products/{id}/toggle-new': {
      post: {
        tags: ['Admin'],
        summary: 'Toggle or set the new flag',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { value: { type: 'boolean' } } } } } },
        responses: { '200': { description: 'Updated' }, '404': { description: 'PRODUCT_NOT_FOUND' }, ...adminAuthErrors },
      },
    },
    '/admin/products/{id}/toggle-active': {
      post: {
        tags: ['Admin'],
        summary: 'Toggle or set the active flag',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { value: { type: 'boolean' } } } } } },
        responses: { '200': { description: 'Updated' }, '404': { description: 'PRODUCT_NOT_FOUND' }, ...adminAuthErrors },
      },
    },
    '/admin/products/{id}/images': {
      post: {
        tags: ['Admin'],
        summary: 'Upload and attach a product image',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['image'],
                properties: {
                  image: { type: 'string', format: 'binary' },
                  altAr: { type: 'string', nullable: true },
                  altEn: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Image attached' }, '404': { description: 'PRODUCT_NOT_FOUND' }, '422': { description: 'Unsupported image type' }, ...adminAuthErrors },
      },
    },
    '/admin/products/{id}/images/reorder': {
      patch: {
        tags: ['Admin'],
        summary: 'Reorder product images',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['imageIds'], properties: { imageIds: { type: 'array', items: { type: 'string' } } } },
            },
          },
        },
        responses: { '200': { description: 'Reordered images' }, '404': { description: 'PRODUCT_NOT_FOUND' }, ...adminAuthErrors },
      },
    },
    '/admin/products/{id}/images/{imageId}/primary': {
      post: {
        tags: ['Admin'],
        summary: 'Set the primary product image',
        security: adminSecurity,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'imageId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Primary image updated' }, '404': { description: 'Product or image not found' }, ...adminAuthErrors },
      },
    },
    '/admin/products/{id}/images/{imageId}': {
      delete: {
        tags: ['Admin'],
        summary: 'Delete a product image',
        security: adminSecurity,
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'imageId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Image deleted' }, '404': { description: 'Product or image not found' }, ...adminAuthErrors },
      },
    },
    '/admin/products/{id}/variants': {
      post: {
        tags: ['Admin'],
        summary: 'Add a variant (SIMPLE products only)',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nameAr', 'nameEn', 'sku'],
                properties: {
                  nameAr: { type: 'string' },
                  nameEn: { type: 'string' },
                  sku: { type: 'string' },
                  priceDelta: { type: 'integer', default: 0 },
                  stock: { type: 'integer', minimum: 0, default: 0 },
                  isActive: { type: 'boolean', default: true },
                  sortOrder: { type: 'integer', minimum: 0, default: 0 },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Variant created' }, '404': { description: 'PRODUCT_NOT_FOUND' }, '409': { description: 'SKU already exists' }, '422': { description: 'BUNDLE products cannot have variants' }, ...adminAuthErrors },
      },
    },
    '/admin/products/variants/{variantId}': {
      patch: {
        tags: ['Admin'],
        summary: 'Update a variant',
        security: adminSecurity,
        parameters: [{ name: 'variantId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } } },
        responses: { '200': { description: 'Variant updated' }, '404': { description: 'VARIANT_NOT_FOUND' }, '422': { description: 'Validation error' }, ...adminAuthErrors },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Delete a variant',
        security: adminSecurity,
        parameters: [{ name: 'variantId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Variant deleted' }, '404': { description: 'VARIANT_NOT_FOUND' }, ...adminAuthErrors },
      },
    },
    '/admin/products/{id}/bundle-items': {
      put: {
        tags: ['Admin'],
        summary: 'Replace bundle contents (BUNDLE products only)',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['items'],
                properties: {
                  items: {
                    type: 'array',
                    maxItems: 50,
                    items: {
                      type: 'object',
                      required: ['componentId', 'quantity'],
                      properties: {
                        componentId: { type: 'string' },
                        quantity: { type: 'integer', minimum: 1, maximum: 1000 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Bundle contents replaced' }, '404': { description: 'PRODUCT_NOT_FOUND' }, '409': { description: 'Bundle cycle detected' }, '422': { description: 'SIMPLE products cannot have bundle items' }, ...adminAuthErrors },
      },
    },
    '/admin/products/{id}/specs': {
      put: {
        tags: ['Admin'],
        summary: 'Replace product specifications',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['specs'], properties: { specs: { type: 'array', items: { type: 'object' }, maxItems: 50 } } },
            },
          },
        },
        responses: { '200': { description: 'Specs replaced' }, '404': { description: 'PRODUCT_NOT_FOUND' }, ...adminAuthErrors },
      },
    },
    '/admin/products/{id}/stock-adjustments': {
      post: {
        tags: ['Admin'],
        summary: 'Atomically adjust stock and record a stock movement',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['delta'],
                properties: {
                  delta: { type: 'integer', description: 'Non-zero; may be negative' },
                  reason: {
                    type: 'string',
                    enum: ['INITIAL', 'MANUAL_ADJUSTMENT', 'ORDER_PLACED', 'ORDER_CANCELLED', 'RETURN', 'IMPORT'],
                    default: 'MANUAL_ADJUSTMENT',
                  },
                  note: { type: 'string', maxLength: 500, nullable: true },
                  variantId: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Stock updated' }, '404': { description: 'Product or variant not found' }, '409': { description: 'INSUFFICIENT_STOCK' }, '422': { description: 'Validation error' }, ...adminAuthErrors },
      },
    },

    // -----------------------------------------------------------------------
    // Admin: inventory
    // -----------------------------------------------------------------------
    '/admin/inventory/movements': {
      get: {
        tags: ['Admin'],
        summary: 'List stock movements',
        security: adminSecurity,
        parameters: [
          { name: 'productId', in: 'query', schema: { type: 'string' } },
          { name: 'variantId', in: 'query', schema: { type: 'string' } },
          { name: 'reason', in: 'query', schema: { type: 'string', enum: ['INITIAL', 'MANUAL_ADJUSTMENT', 'ORDER_PLACED', 'ORDER_CANCELLED', 'RETURN', 'IMPORT'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: { '200': { description: 'Paginated movements' }, ...adminAuthErrors },
      },
    },
    '/admin/inventory/low-stock': {
      get: {
        tags: ['Admin'],
        summary: 'Products at or below their low-stock threshold',
        security: adminSecurity,
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: { '200': { description: 'Low-stock products' }, ...adminAuthErrors },
      },
    },

    // -----------------------------------------------------------------------
    // Admin: review moderation
    // -----------------------------------------------------------------------
    '/admin/reviews': {
      get: {
        tags: ['Admin'],
        summary: 'List reviews for moderation',
        security: adminSecurity,
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: { '200': { description: 'Paginated reviews' }, ...adminAuthErrors },
      },
    },
    '/admin/reviews/{id}/approve': {
      post: {
        tags: ['Admin'],
        summary: 'Approve a review and recompute product rating',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Review approved' }, '404': { description: 'REVIEW_NOT_FOUND' }, ...adminAuthErrors },
      },
    },
    '/admin/reviews/{id}/reject': {
      post: {
        tags: ['Admin'],
        summary: 'Reject a review and recompute product rating',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Review rejected' }, '404': { description: 'REVIEW_NOT_FOUND' }, ...adminAuthErrors },
      },
    },
    '/admin/reviews/{id}': {
      delete: {
        tags: ['Admin'],
        summary: 'Delete a review and recompute product rating',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Review deleted' }, '404': { description: 'REVIEW_NOT_FOUND' }, ...adminAuthErrors },
      },
    },

    // -----------------------------------------------------------------------
    // Admin: banners
    // -----------------------------------------------------------------------
    '/admin/banners': {
      get: {
        tags: ['Admin'],
        summary: 'List all banners (including inactive/out of schedule)',
        security: adminSecurity,
        responses: { '200': { description: 'Banner list' }, ...adminAuthErrors },
      },
      post: {
        tags: ['Admin'],
        summary: 'Create a banner',
        security: adminSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['titleAr', 'titleEn'],
                properties: {
                  titleAr: { type: 'string' },
                  titleEn: { type: 'string' },
                  subtitleAr: { type: 'string', nullable: true },
                  subtitleEn: { type: 'string', nullable: true },
                  highlightAr: { type: 'string', nullable: true },
                  highlightEn: { type: 'string', nullable: true },
                  bulletsAr: { type: 'array', items: { type: 'string' }, maxItems: 5 },
                  bulletsEn: { type: 'array', items: { type: 'string' }, maxItems: 5 },
                  ctaLabelAr: { type: 'string', nullable: true },
                  ctaLabelEn: { type: 'string', nullable: true },
                  ctaUrl: { type: 'string', nullable: true },
                  imageUrl: { type: 'string', nullable: true },
                  location: { type: 'string', enum: ['HOME_HERO', 'HOME_STRIP'], default: 'HOME_HERO' },
                  sortOrder: { type: 'integer', minimum: 0, default: 0 },
                  isActive: { type: 'boolean', default: true },
                  startsAt: { type: 'string', format: 'date-time', nullable: true },
                  endsAt: { type: 'string', format: 'date-time', nullable: true },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Banner created' }, '422': { description: 'Validation error' }, ...adminAuthErrors },
      },
    },
    '/admin/banners/reorder': {
      patch: {
        tags: ['Admin'],
        summary: 'Reorder banners',
        security: adminSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['orderedIds'], properties: { orderedIds: { type: 'array', minItems: 1, items: { type: 'string' } } } },
            },
          },
        },
        responses: { '200': { description: 'Reordered banners' }, '422': { description: 'Validation error' }, ...adminAuthErrors },
      },
    },
    '/admin/banners/{id}': {
      patch: {
        tags: ['Admin'],
        summary: 'Update a banner',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } } },
        responses: { '200': { description: 'Banner updated' }, '404': { description: 'BANNER_NOT_FOUND' }, '422': { description: 'Validation error' }, ...adminAuthErrors },
      },
      delete: {
        tags: ['Admin'],
        summary: 'Delete a banner',
        security: adminSecurity,
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deleted' }, '404': { description: 'BANNER_NOT_FOUND' }, ...adminAuthErrors },
      },
    },

    // -----------------------------------------------------------------------
    // Admin: uploads
    // -----------------------------------------------------------------------
    '/admin/uploads/image': {
      post: {
        tags: ['Admin'],
        summary: 'Upload a product image (JPEG/PNG/WebP, magic-byte validated)',
        security: adminSecurity,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['image'],
                properties: {
                  image: { type: 'string', format: 'binary' },
                  folder: { type: 'string', pattern: '^[a-zA-Z0-9/_-]+$' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Stored image (url + thumbnail url)' }, '422': { description: 'UNSUPPORTED_FILE_TYPE' }, ...adminAuthErrors },
      },
    },
    '/admin/uploads/datasheet': {
      post: {
        tags: ['Admin'],
        summary: 'Upload a PDF datasheet',
        security: adminSecurity,
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['datasheet'],
                properties: { datasheet: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: { '201': { description: 'Stored datasheet' }, '422': { description: 'UNSUPPORTED_FILE_TYPE' }, ...adminAuthErrors },
      },
    },
    '/admin/uploads/{publicId}': {
      delete: {
        tags: ['Admin'],
        summary: 'Delete a stored file by public id',
        security: adminSecurity,
        parameters: [{ name: 'publicId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Deleted' }, '422': { description: 'Validation error' }, ...adminAuthErrors },
      },
    },
  },
} as const;
