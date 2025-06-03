# 🧪 Manual Testing Guide - Roles & Permissions

## 📋 **Overview**

This comprehensive guide provides manual testing procedures to validate the user authentication system, role-based access control (RBAC), and permissions enforcement in the eTownz Grants application.

---

## 🎯 **Test Objectives**

1. **Authentication System Testing**
   - User registration and login
   - JWT token handling
   - Session management

2. **Authorization Testing**
   - Role-based access control
   - Permission enforcement
   - Route protection

3. **Security Testing**
   - Unauthorized access attempts
   - Token manipulation
   - Data isolation

---

## 👥 **User Roles & Expected Capabilities**

### **Role Hierarchy**
```
Super Admin > Organization Admin > Grant Writer > Viewer
```

### **Permission Matrix**

| Feature | Super Admin | Org Admin | Grant Writer | Viewer |
|---------|:-----------:|:---------:|:------------:|:------:|
| **System Management** |
| View all organizations | ✅ | ❌ | ❌ | ❌ |
| Manage all users | ✅ | ❌ | ❌ | ❌ |
| Access system analytics | ✅ | ✅ | ❌ | ❌ |
| Manage system settings | ✅ | ❌ | ❌ | ❌ |
| **Organization Management** |
| View organization | ✅ | ✅ | ✅ | ✅ |
| Edit organization | ✅ | ✅ | ❌ | ❌ |
| Manage organization users | ✅ | ✅ | ❌ | ❌ |
| **Grant Management** |
| View all grants | ✅ | ✅ | ✅ | ✅ |
| Create grants | ✅ | ❌ | ❌ | ❌ |
| Edit grants | ✅ | ❌ | ❌ | ❌ |
| Delete grants | ✅ | ❌ | ❌ | ❌ |
| **Application Management** |
| View applications | ✅ | ✅ | ✅ | ✅ |
| Create applications | ✅ | ✅ | ✅ | ❌ |
| Edit applications | ✅ | ✅ | ✅ | ❌ |
| Submit applications | ✅ | ✅ | ✅ | ❌ |
| Manage submissions | ✅ | ✅ | ❌ | ❌ |
| Delete applications | ✅ | ✅ | ❌ | ❌ |

---

## 🧪 **Test Environment Setup**

### **Prerequisites**
- Application running locally or on staging environment
- Access to both frontend and backend
- Browser developer tools
- Postman or similar API testing tool
- Test user accounts for each role

### **Demo Users Available**
Based on the codebase analysis, these demo users are available:

```javascript
// From backend/src/data/demoUsers.ts and frontend/src/data/demoUsers.ts
{
  id: 1,
  email: "admin@example.com",
  role: "organization_admin",
  firstName: "Admin",
  lastName: "User",
  organization: "Test Organization"
}
```

### **Test URLs**
- **Frontend**: http://localhost:3000 (local) or https://grants.etownz.com (production)
- **Backend API**: http://localhost:3001 (local) or https://grants.etownz.com/api (production)
- **Monitoring**: http://165.227.149.136:9090 (production only)

---

## 📝 **Test Scenarios**

## **1. Authentication System Tests**

### **Test 1.1: User Registration**

#### **Test Steps:**
1. Navigate to `/auth/register`
2. Fill in registration form:
   ```
   First Name: Test
   Last Name: User
   Email: testuser@example.com
   Password: SecurePassword123!
   Organization Name: Test Organization
   ```
3. Submit form

#### **Expected Results:**
- ✅ User account created successfully
- ✅ Organization created automatically
- ✅ User becomes organization admin (first user)
- ✅ JWT token generated and stored
- ✅ Redirected to dashboard
- ✅ User data persisted in database

#### **Validation Checks:**
```bash
# Check database (if accessible)
psql -d etownz_grants -c "SELECT email, role, org_id FROM users WHERE email='testuser@example.com';"

# Check localStorage in browser
localStorage.getItem('token')
localStorage.getItem('user')
```

#### **Test Result:** [ PASS / FAIL ] - Notes: ___________

---

### **Test 1.2: User Login**

#### **Test Steps:**
1. Navigate to `/auth/login`
2. Enter credentials:
   ```
   Email: admin@example.com
   Password: password123
   ```
3. Submit login form

#### **Expected Results:**
- ✅ Authentication successful
- ✅ JWT token generated with correct claims
- ✅ User data returned including role and organization
- ✅ Redirected to dashboard
- ✅ Session persisted in localStorage

#### **Token Validation:**
```javascript
// Check JWT token structure in browser console
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Token payload:', payload);

// Expected payload structure:
{
  userId: "uuid",
  email: "admin@example.com",
  role: "organization_admin",
  orgId: "uuid",
  exp: 1234567890
}
```

#### **Test Result:** [ PASS / FAIL ] - Notes: ___________

---

### **Test 1.3: Login with Invalid Credentials**

#### **Test Steps:**
1. Navigate to `/auth/login`
2. Enter invalid credentials:
   ```
   Email: invalid@example.com
   Password: wrongpassword
   ```
3. Submit form

#### **Expected Results:**
- ❌ Authentication fails
- ❌ Error message displayed
- ❌ No token generated
- ❌ User remains on login page
- ❌ No user data stored

#### **Test Result:** [ PASS / FAIL ] - Notes: ___________

---

### **Test 1.4: JWT Token Expiration**

#### **Test Steps:**
1. Login successfully
2. Wait for token expiration (24 hours) OR manually modify token
3. Attempt to access protected routes
4. Try to make API calls

#### **Expected Results:**
- ❌ Expired token rejected
- ❌ Redirected to login page
- ❌ API calls return 401 Unauthorized
- ❌ User session cleared

#### **Manual Token Expiration Test:**
```javascript
// Modify token expiration in browser console
const token = localStorage.getItem('token');
const parts = token.split('.');
const payload = JSON.parse(atob(parts[1]));
payload.exp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
const modifiedToken = parts[0] + '.' + btoa(JSON.stringify(payload)) + '.' + parts[2];
localStorage.setItem('token', modifiedToken);
```

#### **Test Result:** [ PASS / FAIL ] - Notes: ___________

---

## **2. Role-Based Access Control Tests**

### **Test 2.1: Super Admin Access**

#### **Prerequisites:**
- Create or login as Super Admin user
- Token contains `role: "super_admin"`

#### **Test Steps:**

**Dashboard Access:**
1. Navigate to `/dashboard`
2. Verify all navigation options visible

**System Management:**
3. Check for "System Analytics" section
4. Verify access to all organizations view
5. Test user management across organizations

**Grant Management:**
6. Navigate to `/dashboard/grants`
7. Test create new grant functionality
8. Test edit existing grants
9. Test delete grants

**Application Management:**
10. Navigate to `/dashboard/applications`
11. Test view all applications across organizations
12. Test application management features

#### **Expected Results:**
- ✅ Full dashboard access
- ✅ All navigation items visible
- ✅ System-wide analytics accessible
- ✅ Can view/manage all organizations
- ✅ Full grant CRUD operations
- ✅ Full application management
- ✅ All admin functions available

#### **Test Result:** [ PASS / FAIL ] - Notes: ___________

---

### **Test 2.2: Organization Admin Access**

#### **Prerequisites:**
- Login as Organization Admin
- Token contains `role: "organization_admin"`

#### **Test Steps:**

**Dashboard Access:**
1. Navigate to `/dashboard`
2. Check navigation menu items

**Organization Management:**
3. Navigate to `/dashboard/organizations`
4. Test edit organization details
5. Test manage organization users

**Grant Access:**
6. Navigate to `/dashboard/grants`
7. Verify can view grants
8. Test that create/edit/delete are disabled

**Application Management:**
9. Navigate to `/dashboard/applications`
10. Test create new application
11. Test edit applications
12. Test submit applications
13. Test manage application submissions

**Analytics Access:**
14. Check for organization-level analytics
15. Verify no system-wide analytics

#### **Expected Results:**
- ✅ Organization dashboard access
- ✅ Can edit organization details
- ✅ Can manage organization users
- ✅ Can view all grants (read-only)
- ❌ Cannot create/edit/delete grants
- ✅ Full application management within organization
- ✅ Organization analytics only
- ❌ No system-wide access

#### **Test Result:** [ PASS / FAIL ] - Notes: ___________

---

### **Test 2.3: Grant Writer Access**

#### **Prerequisites:**
- Login as Grant Writer
- Token contains `role: "grant_writer"`

#### **Test Steps:**

**Dashboard Access:**
1. Navigate to `/dashboard`
2. Check limited navigation options

**Grant Access:**
3. Navigate to `/dashboard/grants`
4. Verify read-only access to grants
5. Test that administrative functions are hidden

**Application Management:**
6. Navigate to `/dashboard/applications`
7. Test create new application
8. Test edit draft applications
9. Test submit applications
10. Verify cannot manage other users' applications

**Restricted Access:**
11. Try to access `/dashboard/organizations` (should be blocked)
12. Try to access system analytics (should be blocked)
13. Try to access user management (should be blocked)

#### **Expected Results:**
- ✅ Limited dashboard access
- ✅ Can view grants (read-only)
- ✅ Can create/edit own applications
- ✅ Can submit applications
- ❌ Cannot access organization management
- ❌ Cannot access system features
- ❌ Cannot manage other users' work

#### **Test Result:** [ PASS / FAIL ] - Notes: ___________

---

### **Test 2.4: Viewer Access**

#### **Prerequisites:**
- Login as Viewer
- Token contains `role: "viewer"`

#### **Test Steps:**

**Dashboard Access:**
1. Navigate to `/dashboard`
2. Check minimal navigation options

**Grant Access:**
3. Navigate to `/dashboard/grants`
4. Verify read-only access to grants
5. Test that all action buttons are hidden/disabled

**Application Access:**
6. Navigate to `/dashboard/applications`
7. Verify read-only access to applications
8. Test that create/edit buttons are hidden

**Comprehensive Restriction Test:**
9. Try to access any management features
10. Verify all forms are in read-only mode
11. Test that submission features are disabled

#### **Expected Results:**
- ✅ Minimal dashboard access
- ✅ Can view grants (read-only)
- ✅ Can view applications (read-only)
- ❌ Cannot create/edit anything
- ❌ Cannot submit applications
- ❌ Cannot access any management features
- ❌ All administrative functions hidden

#### **Test Result:** [ PASS / FAIL ] - Notes: ___________

---

## **3. Security & Authorization Tests**

### **Test 3.1: Unauthorized Access Attempts**

#### **Test Steps:**

**No Token Access:**
1. Clear localStorage (`localStorage.clear()`)
2. Try to access `/dashboard`
3. Try to access `/dashboard/applications`
4. Try to access `/dashboard/grants`

**API Endpoint Security:**
5. Make API calls without Authorization header:
   ```bash
   curl -X GET http://localhost:3001/api/applications
   curl -X GET http://localhost:3001/api/grants
   curl -X POST http://localhost:3001/api/applications
   ```

#### **Expected Results:**
- ❌ Redirected to login page for all protected routes
- ❌ API calls return 401 Unauthorized
- ❌ No sensitive data accessible

#### **Test Result:** [ PASS / FAIL ] - Notes: ___________

---

### **Test 3.2: Token Manipulation**

#### **Test Steps:**

**Invalid Token:**
1. Set invalid token in localStorage:
   ```javascript
   localStorage.setItem('token', 'invalid.token.here');
   ```
2. Try to access protected routes
3. Try to make API calls

**Modified Role:**
4. Login as grant_writer
5. Modify token payload to change role:
   ```javascript
   const token = localStorage.getItem('token');
   const parts = token.split('.');
   const payload = JSON.parse(atob(parts[1]));
   payload.role = 'super_admin';
   const modifiedToken = parts[0] + '.' + btoa(JSON.stringify(payload)) + '.' + parts[2];
   localStorage.setItem('token', modifiedToken);
   ```
6. Try to access admin features

#### **Expected Results:**
- ❌ Invalid tokens rejected
- ❌ Modified tokens fail validation
- ❌ No privilege escalation possible
- ❌ Backend validates token integrity

#### **Test Result:** [ PASS / FAIL ] - Notes: ___________

---

### **Test 3.3: Cross-Organization Data Access**

#### **Prerequisites:**
- Multiple organizations in system
- Users in different organizations

#### **Test Steps:**

**Data Isolation Test:**
1. Login as user from Organization A
2. Try to view applications from Organization B
3. Try to edit users from Organization B
4. Check API responses for data filtering

**Direct API Access:**
5. Make API calls with different orgId in token:
   ```bash
   # With valid token for Org A, try to access Org B data
   curl -H "Authorization: Bearer $TOKEN" \
        -X GET http://localhost:3001/api/applications?orgId=other-org-id
   ```

#### **Expected Results:**
- ❌ Cannot access other organizations' data
- ❌ API properly filters by organization
- ❌ No data leakage between organizations
- ✅ Only own organization data visible

#### **Test Result:** [ PASS / FAIL ] - Notes: ___________

---

### **Test 3.4: Privilege Escalation Attempts**

#### **Test Steps:**

**Frontend Bypass Attempts:**
1. Login as grant_writer
2. Manually navigate to admin URLs:
   - `/dashboard/organizations`
   - `/dashboard/users`
   - `/dashboard/system`
3. Use browser developer tools to unhide admin buttons
4. Try to submit admin-only forms

**API Direct Access:**
5. Try to call admin-only endpoints:
   ```bash
   curl -H "Authorization: Bearer $GRANT_WRITER_TOKEN" \
        -X POST http://localhost:3001/api/organizations \
        -d '{"name": "Unauthorized Org"}'
   
   curl -H "Authorization: Bearer $GRANT_WRITER_TOKEN" \
        -X DELETE http://localhost:3001/api/grants/123
   ```

#### **Expected Results:**
- ❌ Admin URLs redirect or show access denied
- ❌ Hidden UI elements remain non-functional
- ❌ API endpoints reject unauthorized requests
- ❌ No privilege escalation possible

#### **Test Result:** [ PASS / FAIL ] - Notes: ___________

---

## **4. Functional Permission Tests**

### **Test 4.1: Application Lifecycle by Role**

#### **Test Scenario:** Complete application workflow with different roles

**Setup:**
- Create application as Grant Writer
- Test management as Organization Admin
- Test viewing as Viewer

#### **Test Steps:**

**As Grant Writer:**
1. Login as grant_writer
2. Navigate to `/dashboard/applications/create`
3. Create new application with full details
4. Save as draft
5. Edit the draft application
6. Submit the application

**As Organization Admin:**
7. Login as organization_admin
8. View the submitted application
9. Edit application details
10. Manage application submissions
11. View application analytics

**As Viewer:**
12. Login as viewer
13. View the application (read-only)
14. Verify no edit capabilities
15. Verify no submission capabilities

#### **Expected Results:**
- ✅ Grant Writer can create/edit/submit
- ✅ Org Admin can manage all aspects
- ✅ Viewer has read-only access
- ✅ Proper workflow transitions
- ✅ Data consistency maintained

#### **Test Result:** [ PASS / FAIL ] - Notes: ___________

---

### **Test 4.2: User Management by Role**

#### **Test Steps:**

**As Super Admin:**
1. Navigate to user management
2. View users from all organizations
3. Create new user in any organization
4. Edit user roles across organizations
5. Delete users from any organization

**As Organization Admin:**
6. Navigate to organization user management
7. View only organization users
8. Create new user in organization
9. Edit organization user roles
10. Try to access users from other organizations

**As Grant Writer/Viewer:**
11. Try to access user management features
12. Verify all user management is blocked

#### **Expected Results:**
- ✅ Super Admin: Full user management
- ✅ Org Admin: Organization-scoped management
- ❌ Grant Writer/Viewer: No access

#### **Test Result:** [ PASS / FAIL ] - Notes: ___________

---

## **5. API Security Tests**

### **Test 5.1: Authentication Header Validation**

#### **Test Steps:**

**Missing Authorization Header:**
```bash
curl -X GET http://localhost:3001/api/applications
curl -X POST http://localhost:3001/api/applications \
     -H "Content-Type: application/json" \
     -d '{"title": "Test Application"}'
```

**Invalid Bearer Token:**
```bash
curl -H "Authorization: Bearer invalid_token" \
     -X GET http://localhost:3001/api/applications
```

**Malformed Authorization Header:**
```bash
curl -H "Authorization: invalid_format_token" \
     -X GET http://localhost:3001/api/applications
```

#### **Expected Results:**
- ❌ All requests return 401 Unauthorized
- ❌ No data returned without valid authentication
- ✅ Proper error messages returned

#### **Test Result:** [ PASS / FAIL ] - Notes: ___________

---

### **Test 5.2: Role-Based API Access**

#### **Test Steps:**

**Grant Writer Token:**
```bash
# Should succeed
curl -H "Authorization: Bearer $GRANT_WRITER_TOKEN" \
     -X GET http://localhost:3001/api/grants

# Should fail
curl -H "Authorization: Bearer $GRANT_WRITER_TOKEN" \
     -X POST http://localhost:3001/api/grants \
     -H "Content-Type: application/json" \
     -d '{"title": "Unauthorized Grant"}'

curl -H "Authorization: Bearer $GRANT_WRITER_TOKEN" \
     -X DELETE http://localhost:3001/api/grants/123
```

**Viewer Token:**
```bash
# Should succeed
curl -H "Authorization: Bearer $VIEWER_TOKEN" \
     -X GET http://localhost:3001/api/applications

# Should fail
curl -H "Authorization: Bearer $VIEWER_TOKEN" \
     -X POST http://localhost:3001/api/applications \
     -H "Content-Type: application/json" \
     -d '{"title": "Unauthorized Application"}'
```

#### **Expected Results:**
- ✅ Read operations succeed for appropriate roles
- ❌ Write operations fail for insufficient permissions
- ✅ Proper HTTP status codes returned

#### **Test Result:** [ PASS / FAIL ] - Notes: ___________

---

## **6. Edge Cases & Error Handling**

### **Test 6.1: Concurrent Session Management**

#### **Test Steps:**
1. Login on multiple browsers/tabs
2. Logout from one session
3. Continue using other sessions
4. Test token refresh behavior
5. Test session conflicts

#### **Expected Results:**
- ✅ Multiple sessions supported OR properly managed
- ✅ Logout affects only current session
- ✅ No session conflicts
- ✅ Consistent behavior across sessions

#### **Test Result:** [ PASS / FAIL ] - Notes: ___________

---

### **Test 6.2: Role Change During Session**

#### **Test Steps:**
1. Login as grant_writer
2. Admin changes user role to viewer (database update)
3. Continue using existing session
4. Try to perform grant_writer actions
5. Refresh page/re-authenticate

#### **Expected Results:**
- ✅ Session permissions updated on refresh
- ❌ Old permissions not honored after role change
- ✅ Graceful handling of permission changes

#### **Test Result:** [ PASS / FAIL ] - Notes: ___________

---

### **Test 6.3: Database Connection Loss**

#### **Test Steps:**
1. Login successfully
2. Simulate database connection loss
3. Try to access user data
4. Try to perform database operations
5. Restore database connection

#### **Expected Results:**
- ❌ Graceful error handling during connection loss
- ✅ System recovery after connection restored
- ✅ User session preserved if possible
- ✅ Appropriate error messages displayed

#### **Test Result:** [ PASS / FAIL ] - Notes: ___________

---

## **📊 Test Results Summary**

### **Test Execution Checklist**

#### **Authentication Tests**
- [ ] User Registration (Test 1.1)
- [ ] User Login (Test 1.2)
- [ ] Invalid Credentials (Test 1.3)
- [ ] Token Expiration (Test 1.4)

#### **Role-Based Access Tests**
- [ ] Super Admin Access (Test 2.1)
- [ ] Organization Admin Access (Test 2.2)
- [ ] Grant Writer Access (Test 2.3)
- [ ] Viewer Access (Test 2.4)

#### **Security Tests**
- [ ] Unauthorized Access (Test 3.1)
- [ ] Token Manipulation (Test 3.2)
- [ ] Cross-Organization Access (Test 3.3)
- [ ] Privilege Escalation (Test 3.4)

#### **Functional Tests**
- [ ] Application Lifecycle (Test 4.1)
- [ ] User Management (Test 4.2)

#### **API Security Tests**
- [ ] Authentication Headers (Test 5.1)
- [ ] Role-Based API Access (Test 5.2)

#### **Edge Cases**
- [ ] Concurrent Sessions (Test 6.1)
- [ ] Role Changes (Test 6.2)
- [ ] Database Issues (Test 6.3)

### **Critical Security Issues Found**

Based on the codebase analysis, these issues should be validated during testing:

1. **⚠️ Missing Backend Authentication**
   - API endpoints lack authentication middleware
   - JWT token validation not implemented on most routes

2. **⚠️ Frontend-Only Security**
   - Authorization checks only in UI components
   - No server-side permission enforcement

3. **⚠️ Inconsistent Role Definitions**
   - Different role names between frontend and backend
   - Database schema doesn't match application logic

4. **⚠️ Insecure Token Storage**
   - JWT tokens stored in localStorage (XSS vulnerable)
   - No secure session management

### **Recommended Actions**

#### **High Priority (Security Critical)**
1. **Implement backend authentication middleware**
2. **Add API route protection for all sensitive endpoints**
3. **Standardize role definitions across the application**
4. **Implement secure session management**

#### **Medium Priority (Functionality)**
1. **Add comprehensive error handling**
2. **Implement proper data isolation between organizations**
3. **Add audit logging for user actions**
4. **Improve token refresh mechanism**

#### **Low Priority (Enhancements)**
1. **Add multi-factor authentication**
2. **Implement session timeout warnings**
3. **Add role-based dashboard customization**
4. **Improve user experience for unauthorized access**

---

## **🔧 Testing Tools & Commands**

### **Browser Developer Tools**
```javascript
// Check current user token and data
console.log('Token:', localStorage.getItem('token'));
console.log('User:', JSON.parse(localStorage.getItem('user') || '{}'));

// Decode JWT token
const token = localStorage.getItem('token');
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token payload:', payload);
}

// Clear session
localStorage.clear();
```

### **API Testing with curl**
```bash
# Get JWT token from login
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}' \
  | jq -r '.token')

# Test protected endpoints
curl -H "Authorization: Bearer $TOKEN" \
     -X GET http://localhost:3001/api/applications

# Test role-specific access
curl -H "Authorization: Bearer $TOKEN" \
     -X POST http://localhost:3001/api/grants \
     -H "Content-Type: application/json" \
     -d '{"title": "Test Grant", "description": "Test"}'
```

### **Database Verification**
```sql
-- Check user roles and organizations
SELECT u.email, u.role, o.name as organization 
FROM users u 
JOIN organizations o ON u.org_id = o.id;

-- Check application ownership
SELECT a.title, u.email as owner, o.name as organization
FROM applications a
JOIN users u ON a.user_id = u.id
JOIN organizations o ON u.org_id = o.id;
```

---

## **📝 Test Report Template**

### **Test Session Information**
- **Date**: ___________
- **Tester**: ___________
- **Environment**: [ Local / Staging / Production ]
- **Application Version**: ___________
- **Browser**: ___________

### **Overall Test Results**
- **Tests Passed**: ___ / ___
- **Tests Failed**: ___ / ___
- **Critical Issues**: ___________
- **Security Concerns**: ___________

### **Recommendations**
1. ___________
2. ___________
3. ___________

### **Follow-up Actions Required**
- [ ] Fix critical security issues
- [ ] Implement backend authentication
- [ ] Update role definitions
- [ ] Add comprehensive error handling
- [ ] Re-test after fixes

---

*Last updated: $(date)*  
*Version: 1.0 - Complete Role & Permission Testing Guide*  
*Status: ✅ READY FOR TESTING*