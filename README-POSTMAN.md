# eTownz Grants API - Postman Collection

This Postman collection provides comprehensive testing for the eTownz Grants API across both local development and production environments.

## 🚀 Quick Setup

### 1. Import Collection
1. Open Postman
2. Click "Import" 
3. Select `postman-collection.json` from the project root
4. The collection will be imported with both environments

### 2. Environment Setup
Two environments are included:

**Local Development**
- Base URL: `http://localhost:8000`
- For testing during development

**Production**
- Base URL: `https://grants.etownz.com/api`
- For testing the live API

### 3. Authentication Flow
1. Run **Register User** or **Login User** from the Authentication folder
2. The auth token will be automatically saved to environment variables
3. Subsequent requests will use this token automatically

## 📋 Collection Structure

### Health & System
- **Health Check** - Verify API status
- **API Documentation** - Access Swagger docs

### Authentication
- **Register User** - Create new account + organization
- **Login User** - Authenticate existing user
- **Get Current User** - Fetch user profile
- **Refresh Token** - Renew authentication

### Grants
- **Get All Grants** - Paginated grants list with filtering
- **Search Grants** - Advanced search with multiple filters
- **Get Grant Statistics** - Platform statistics
- **Get Discovered Grants** - Crawler-discovered grants
- **AI Grant Search** - AI-powered matching
- **Get Grant by ID** - Individual grant details
- **Check Grant Eligibility** - Organization eligibility check
- **Process Discovered Grant** - Convert discovered to active grant

### Organizations
- **Get Organizations** - List organizations
- **Get Organization by ID** - Individual organization details
- **Update Organization** - Modify organization profile

### Applications
- **Get Applications** - User's grant applications
- **Create Application** - Submit new grant application
- **Get Application by ID** - Individual application details
- **Update Application** - Modify draft application
- **Submit Application** - Submit for review

### Documents
- **Get Documents** - List user documents
- **Upload Document** - File upload for applications
- **Get Document by ID** - Document metadata
- **Download Document** - Retrieve document file
- **Delete Document** - Remove document

### Submissions
- **Get Submissions** - Submission history
- **Get Submission by ID** - Individual submission details
- **Update Submission Status** - Admin status updates

### Usage Analytics
- **Get Usage Statistics** - Platform analytics
- **Track User Action** - Log user interactions

## 🔧 Advanced Features

### Automatic Token Management
- Login/Register requests automatically save auth tokens
- All protected endpoints use saved tokens
- Token refresh functionality included

### Environment Variables
Variables are automatically managed:
- `authToken` - JWT authentication token
- `userId` - Current user ID
- `orgId` - User's organization ID
- `grantId` - Selected grant ID

### Pre-request Scripts
- Automatic environment detection
- Default to localhost if no environment set

### Test Scripts
- Auto-save important IDs from responses
- Token extraction and storage
- Response validation

## 🧪 Testing Scenarios

### Basic Flow
1. **Health Check** - Verify API is running
2. **Register User** - Create test account
3. **Get Grant Statistics** - Check data availability
4. **Get All Grants** - Browse available grants
5. **AI Grant Search** - Test matching algorithm

### Application Flow
1. **Login User** - Authenticate
2. **Get Organizations** - Verify org access
3. **Search Grants** - Find suitable grants
4. **Create Application** - Submit application
5. **Upload Document** - Add supporting files
6. **Get Applications** - Check submission status

### Admin Flow
1. **Get Discovered Grants** - Review crawler results
2. **Process Discovered Grant** - Convert to active grant
3. **Get Usage Statistics** - Monitor platform usage
4. **Update Submission Status** - Process applications

## 🌍 Environment Switching

To switch between environments:
1. Click the environment dropdown (top right)
2. Select "Local Development" or "Production"
3. All requests will automatically use the correct base URL

## 📝 Sample Data

The collection includes realistic sample data for:
- User registration with organization profiles
- Grant applications with detailed project information
- Document uploads with proper metadata
- Search queries with multiple filter combinations

## 🔍 Debugging

### Common Issues
1. **401 Unauthorized** - Run login request to refresh token
2. **404 Not Found** - Check environment selection
3. **500 Server Error** - Check server logs for details

### Response Validation
Each request includes:
- Expected status codes
- Response structure validation
- Error message checking

## 📊 Monitoring

Use the collection to:
- Monitor API performance across environments
- Validate new feature deployments
- Test database integration
- Verify authentication flows
- Check search and filtering functionality

## 🚀 CI/CD Integration

This collection can be used with Newman for automated testing:

```bash
# Install Newman
npm install -g newman

# Run collection against local environment
newman run postman-collection.json -e "Local Development"

# Run collection against production
newman run postman-collection.json -e "Production"
```