# NuaShare Backend

A secure file sharing backend API built with Node.js, Express, TypeScript, and MongoDB.

## Features

- 🔐 **JWT Authentication** - Secure user registration and login
- 📁 **File Upload** - Single and bulk file uploads with validation
- 🗜️ **Image Compression** - Automatic image compression to save storage
- 🔗 **File Sharing** - Share files with specific users or via shareable links
- ⏰ **Link Expiry** - Set expiration times for shared links
- 📊 **Audit Logging** - Track all file activities (uploads, downloads, shares)
- 🛡️ **Access Control** - Proper authorization for all file operations

## Tech Stack

- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- JWT for authentication
- Multer for file uploads
- Sharp for image compression

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Installation

1. Clone the repository
2. Navigate to the backend directory:
   ```bash
   cd nua-backend
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create `.env` file:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/nua-fileshare
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_EXPIRES_IN=7d
   MAX_FILE_SIZE=52428800
   UPLOAD_PATH=./uploads
   BASE_URL=http://localhost:5000
   FRONTEND_URL=http://localhost:5173
   ALLOWED_FILE_TYPES=.pdf,.png,.jpg,.jpeg,.gif,.csv,.xlsx,.xls,.doc,.docx,.txt,.zip,.mp4,.mp3
   ```

5. Run migrations:
   ```bash
   npm run migrate
   ```

6. Start development server:
   ```bash
   npm run dev
   ```

### Production Build

```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `GET /api/auth/users/search?q=query` - Search users

### Files
- `POST /api/files/upload` - Upload files (multipart/form-data)
- `GET /api/files` - Get user's files
- `GET /api/files/shared` - Get files shared with user
- `GET /api/files/stats` - Get file statistics
- `GET /api/files/:id` - Get file by ID
- `GET /api/files/:id/download` - Download file
- `DELETE /api/files/:id` - Delete file

### Shares
- `POST /api/shares/user` - Share file with specific user
- `POST /api/shares/link` - Create shareable link
- `GET /api/shares/link/:shareLink` - Access file via share link
- `GET /api/shares/link/:shareLink/download` - Download via share link
- `GET /api/shares/file/:fileId` - Get all shares for a file
- `DELETE /api/shares/:shareId` - Revoke share
- `PATCH /api/shares/:shareId/expiration` - Update share expiration

### Audit
- `GET /api/audit/me` - Get user's activity logs
- `GET /api/audit/file/:fileId` - Get file activity logs

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment | development |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/nua-fileshare |
| JWT_SECRET | JWT signing secret | - |
| JWT_EXPIRES_IN | JWT expiration | 7d |
| MAX_FILE_SIZE | Max file size in bytes | 52428800 (50MB) |
| UPLOAD_PATH | Upload directory | ./uploads |
| BASE_URL | Backend base URL | http://localhost:5000 |
| FRONTEND_URL | Frontend URL for CORS | http://localhost:5173 |

## License

MIT

