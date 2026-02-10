# CSIR Reference Management Portal - Backend

## Overview

Node.js/Express backend for the CSIR Reference Management Portal. Provides RESTful APIs for reference management, form workflows, user authentication, and administrative functions.

## Architecture

- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (Access + Refresh tokens)
- **OAuth**: Parichay SSO integration
- **File Storage**: Cloudinary
- **Email**: NodeMailer with MailerSend
- **Security**: Helmet, rate limiting, NoSQL injection protection

## Directory Structure

```
backend/
├── src/
│   ├── controllers/      # Request handlers and business logic
│   ├── models/           # Mongoose schemas and models
│   ├── routes/           # API route definitions
│   ├── middleware/       # Custom middleware (auth, validation, etc.)
│   ├── middlewares/      # Additional middleware
│   ├── services/         # External service integrations
│   ├── utils/            # Helper functions and utilities
│   ├── pipelines/        # MongoDB aggregation pipelines
│   ├── jobs/             # Background jobs (archiving, retention)
│   ├── db/               # Database connection
│   ├── app.js            # Express app configuration
│   └── index.js          # Server entry point
├── public/               # Static files and uploads
└── scripts/              # Utility scripts
```

## Key Features

### 1. Reference Management
- **Global References**: Institution-wide references
- **Local References**: Lab-specific references
- **VIP References**: Priority references
- Movement tracking and workflow
- Archive management

### 2. Form Workflows
- Dynamic form creation with AI
- Multi-level delegation chains
- Approval workflows
- File attachments
- Real-time status tracking

### 3. User Management
- Registration and activation
- JWT authentication
- Parichay OAuth integration
- Role-based permissions
- Password reset flow

### 4. System Administration
- System configuration management
- User permissions and roles
- Audit logging
- Notification system

## API Endpoints

### Authentication
- `POST /api/v1/users/register` - Register new user
- `POST /api/v1/users/login` - User login
- `POST /api/v1/users/logout` - User logout
- `POST /api/v1/users/refresh-token` - Refresh access token
- `POST /api/v1/users/forgot-password` - Request password reset
- `POST /api/v1/users/reset-password` - Reset password
- `POST /api/v1/users/activate` - Activate account

### References
- `GET /api/v1/references/global` - List global references
- `POST /api/v1/references/global` - Create global reference
- `PUT /api/v1/references/global/:id` - Update global reference
- `DELETE /api/v1/references/global/:id` - Delete global reference
- Similar endpoints for `/local` and `/vip`

### Forms
- `GET /api/v1/forms` - List forms
- `POST /api/v1/forms` - Create form
- `POST /api/v1/forms/workflow/delegate` - Delegate form
- `POST /api/v1/forms/workflow/approve` - Approve form
- `POST /api/v1/forms/workflow/submit-to-distributor` - Submit form

### AI
- `POST /api/v1/ai/generate-form` - Generate form schema with AI
- `GET /api/v1/ai/usage` - Get AI usage statistics

### System
- `GET /api/v1/system-config` - Get system configuration
- `PUT /api/v1/system-config` - Update system configuration
- `GET /api/v1/notifications` - Get user notifications
- `GET /api/v1/audit` - Get audit logs

## Environment Variables

Required environment variables (create `.env` file):

```env
# Server
PORT=8000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Database
MONGO_URI=mongodb://localhost:27017/csir-portal

# JWT
ACCESS_TOKEN_SECRET=your-access-token-secret
REFRESH_TOKEN_SECRET=your-refresh-token-secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d

# Email
MAIL_SERVICE=mailersend
MAILERSEND_API_KEY=your-mailersend-key
MAIL_FROM=noreply@csir.res.in

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# AI
GEMINI_API_KEYS=your-gemini-api-key-1,your-gemini-api-key-2

# Parichay OAuth (optional)
PARICHAY_CLIENT_ID=your-client-id
PARICHAY_CLIENT_SECRET=your-client-secret
PARICHAY_REDIRECT_URI=http://localhost:8000/api/v1/parichay/callback
PARICHAY_MOCK=false
```

## Database Models

### Core Models
- **User**: User accounts and profiles
- **GlobalReference**: Institution-wide references
- **LocalReference**: Lab-specific references
- **ActiveForm**: Form templates
- **FormAssignment**: Form delegation assignments
- **CollectedData**: Form submission data
- **SystemConfig**: System configuration
- **Notification**: User notifications
- **AuditLog**: Activity audit trail

## Authentication Flow

1. **Registration**: User registers → Account created (inactive) → Activation email sent
2. **Activation**: User clicks link → Account activated → Can login
3. **Login**: Credentials verified → Access token (15m) + Refresh token (7d) → Stored in httpOnly cookies
4. **Token Refresh**: Access token expires → Frontend calls `/refresh-token` → New tokens issued
5. **Logout**: Tokens cleared from cookies

## Permission System

Permissions are feature-based and stored in `SystemConfig`:
- `MANAGE_USERS`
- `MANAGE_GLOBAL_REFERENCES`
- `MANAGE_LOCAL_REFERENCES`
- `APPROVE_FORMS`
- `DISTRIBUTE_FORMS`
- `VIEW_AUDIT_LOGS`

Check permissions using `hasPermission()` utility.

## Development

### Setup
```bash
cd backend
npm install
```

### Run Development Server
```bash
npm run dev
```

### Run Production
```bash
npm start
```

### Database Seeding
```bash
node src/utils/seed.js
```

## Background Jobs

- **Archiving Job**: Automatically archives old references (runs daily)
- **Retention Job**: Cleans up old archived data (runs weekly)

## Security Features

- **Helmet**: Security headers
- **Rate Limiting**: Global (1000 req/15min) and auth-specific (20 req/15min)
- **NoSQL Injection Protection**: Input sanitization
- **CORS**: Configured for specific origins
- **JWT**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds

## Error Handling

Custom error class `ApiErrors` for consistent error responses:
```javascript
throw new ApiErrors("Error message", statusCode);
```

## Logging

- Audit logs stored in `AuditLog` collection
- Activity tracking via `logActivity()` utility
- Console logging for development

## Testing

```bash
npm test
```

## Deployment

1. Set `NODE_ENV=production`
2. Configure production environment variables
3. Build frontend and place in `backend/public`
4. Start server: `npm start`

## Contributing

1. Follow existing code structure
2. Add JSDoc comments for functions
3. Update this README for major changes
4. Test thoroughly before committing

## License

CSIR - Council of Scientific and Industrial Research, India

## Contact

For issues or questions, contact: abhishek.chandra@csir.res.in
