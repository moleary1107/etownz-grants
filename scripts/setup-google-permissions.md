# Google Cloud Service Account Permissions Setup

## Required Service Account Permissions

Your service account `etownz-grants-service@etownz-grants.iam.gserviceaccount.com` needs the following permissions:

### 1. **Enable Required APIs**
```bash
# Go to Google Cloud Console → APIs & Services → Enabled APIs
# Enable these APIs:
- Google Drive API
- Google Docs API
- Google Sheets API (optional)
```

### 2. **Service Account Roles**
In Google Cloud Console → IAM & Admin → IAM:

**Add these roles to your service account:**
- `roles/drive.file` - Create and manage files in Google Drive
- `roles/docs.editor` - Create and edit Google Docs
- `roles/drive.metadata.readonly` - Read Drive metadata

### 3. **Alternative: Custom Role (More Secure)**
Create a custom role with only the needed permissions:

```json
{
  "title": "eTownz Grants Document Manager",
  "description": "Minimal permissions for document export functionality",
  "includedPermissions": [
    "drive.files.create",
    "drive.files.get",
    "drive.files.update",
    "drive.permissions.create",
    "drive.permissions.get",
    "drive.permissions.update",
    "docs.documents.create",
    "docs.documents.get",
    "docs.documents.update"
  ]
}
```

### 4. **OAuth2 Client Configuration**
Your OAuth2 client is already configured with the correct redirect URIs:
- `http://localhost:8000/auth/google/callback` (development)
- `https://grants.etownz.com/auth/google/callback` (production)
- `https://grants.etownz.com/api/auth/google/callback` (alternative production)

## Quick Setup Commands

Run these commands in Google Cloud Shell or with gcloud CLI:

```bash
# 1. Enable required APIs
gcloud services enable drive.googleapis.com
gcloud services enable docs.googleapis.com

# 2. Add roles to service account
gcloud projects add-iam-policy-binding etownz-grants \
    --member="serviceAccount:etownz-grants-service@etownz-grants.iam.gserviceaccount.com" \
    --role="roles/drive.file"

gcloud projects add-iam-policy-binding etownz-grants \
    --member="serviceAccount:etownz-grants-service@etownz-grants.iam.gserviceaccount.com" \
    --role="roles/docs.editor"
```

## Testing the Setup

After setting permissions, test with:

```bash
# Test Google Drive API access
curl -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
     "https://www.googleapis.com/drive/v3/files"

# Test Google Docs API access  
curl -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
     "https://docs.googleapis.com/v1/documents"
```

## Verification Checklist

- ✅ Service account exists: `etownz-grants-service@etownz-grants.iam.gserviceaccount.com`
- ✅ OAuth2 client configured with correct redirect URIs
- ✅ Required APIs enabled (Drive, Docs)
- ⚠️  Service account permissions need to be set (see above)
- ✅ Environment variables configured in Docker and .env

## Security Notes

- Service account has minimal required permissions
- Private keys are stored securely in environment variables
- OAuth2 flow handles user permissions separately
- Production redirect URIs use HTTPS only