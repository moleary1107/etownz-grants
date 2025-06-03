# 🔐 Production Test Credentials

**Production URL:** https://grants.etownz.com

## 👥 **Demo User Accounts**

### 🔴 **Super Admin (Full System Access)**
```
Email: admin@etownz.com
Password: admin123
Name: Sarah Administrator
Role: super_admin
Access: Full system administration, user management, analytics
```

### 🟠 **Organization Admins**

#### **TechStart Ireland (Technology Startup)**
```
Email: john@techstart.ie
Password: techstart123
Name: John Smith
Role: organization_admin
Organization: TechStart Ireland (Technology, 11-50 employees, Dublin)
Features: AI healthcare solutions startup
```

#### **Dublin Community Center (Non-Profit)**
```
Email: mary@dublincc.ie
Password: community123
Name: Mary O'Connor
Role: organization_admin
Organization: Dublin Community Center (Non-Profit, 1-10 employees, Dublin)
Features: Community services and education programs
```

### 🟡 **Grant Writers**

#### **Cork Research Institute (Research)**
```
Email: david@corkresearch.ie
Password: research123
Name: David Walsh
Role: grant_writer
Organization: Cork Research Institute (Research, 51-200 employees, Cork)
Features: Renewable energy and sustainability research
```

#### **Green Earth Initiative (Environmental)**
```
Email: emma@greenearth.ie
Password: green123
Name: Emma Murphy
Role: grant_writer
Organization: Green Earth Initiative (Environment, 11-50 employees, Galway)
Features: Climate action and sustainable development
```

### 🟢 **Viewer (Read-Only)**
```
Email: viewer@example.com
Password: viewer123
Name: Tom Viewer
Role: viewer
Organization: TechStart Ireland
Access: Read-only access to system
```

## 🏢 **Demo Organizations Available**

| Organization | Sector | Size | Location | Status | Website |
|-------------|---------|------|----------|---------|---------|
| TechStart Ireland | Technology | 11-50 | Dublin | ✅ Verified | techstart.ie |
| Dublin Community Center | Non-Profit | 1-10 | Dublin | ✅ Verified | dublincc.ie |
| Cork Research Institute | Research | 51-200 | Cork | ✅ Verified | corkresearch.ie |
| Green Earth Initiative | Environment | 11-50 | Galway | ❌ Unverified | greenearth.ie |

## 💰 **Sample Grants to Test With**

### **Government Grants**
- **Enterprise Ireland R&D Fund**: €25k-€250k (SME, Startup, Research)
- **SFI Discover Programme**: €1k-€50k (Research, University, Non-Profit)
- **EPA Research Grant**: €30k-€150k (Environmental focus)

### **Council Grants**
- **Dublin City Council Community**: €500-€15k (Community groups)
- **Cork County Council Arts**: €1k-€10k (Artists, Cultural groups)

### **EU Grants**
- **Horizon Europe EIC Accelerator**: €500k-€2.5M (High-impact innovation)
- **INTERREG Atlantic Area**: €100k-€1M (Cross-border cooperation)

### **Foundation Grants**
- **Ireland Funds Young Entrepreneur**: €5k-€25k (Young entrepreneurs)

## 📋 **Existing Sample Applications**

| User | Grant | Status | Amount | Progress |
|------|-------|---------|--------|----------|
| john@techstart.ie | Enterprise Ireland R&D | ✅ Submitted | €75,000 | 100% |
| mary@dublincc.ie | Dublin Community Grant | ✅ Approved | €8,500 | 100% |
| david@corkresearch.ie | SFI Discover | 📝 Draft | €25,000 | 45% |
| john@techstart.ie | Horizon Europe EIC | 🔍 Under Review | €1,500,000 | 100% |
| emma@greenearth.ie | Ireland Funds | 📝 Draft | €12,000 | 20% |
| david@corkresearch.ie | EPA Research | ✅ Submitted | €80,000 | 100% |

## 🧪 **Features to Test**

### **✅ Core Functionality**
- User authentication and role-based access
- Grant discovery and search
- Application creation and management
- Document upload and management

### **🆕 New Enhanced Features**
- **Export System**: Test Google Docs, Word, and PDF export
- **Newsletter System**: Test subscription and email preferences
- **Enhanced Grant Filtering**: Test new coverage %, deadline, and location filters
- **Admin Pricing**: Test subscription management (admin@etownz.com)

### **🔐 Role-Based Testing**
- **Super Admin**: Test user management, analytics, system settings
- **Org Admin**: Test organization management, member management
- **Grant Writer**: Test application creation, editing, collaboration
- **Viewer**: Test read-only access restrictions

## 🎯 **Quick Test Scenarios**

### **Scenario 1: Grant Application Flow**
1. Login as `john@techstart.ie` (Org Admin)
2. Browse available grants
3. Create new application for Enterprise Ireland R&D
4. Test export functionality (Google Docs, Word, PDF)
5. Submit application

### **Scenario 2: Newsletter Testing**
1. Login as any user
2. Go to settings/preferences
3. Subscribe to newsletter
4. Test frequency and category preferences
5. Admin can test sending newsletters

### **Scenario 3: Admin Management**
1. Login as `admin@etownz.com` (Super Admin)
2. View user management
3. Test organization verification
4. View system analytics
5. Test pricing/subscription management

### **Scenario 4: Multi-Role Organization**
1. Login as `john@techstart.ie` (Org Admin)
2. Switch to `viewer@example.com` (same org, different role)
3. Compare access levels and permissions
4. Test collaboration features

## 🔍 **Testing URLs**

- **Main App**: https://grants.etownz.com
- **API Health**: https://grants.etownz.com/api/health
- **Export Formats**: https://grants.etownz.com/api/export/formats
- **Newsletter Stats**: https://grants.etownz.com/api/newsletter/stats (admin only)

## 📝 **Notes for Testing**

- All accounts are pre-verified and ready to use
- Organizations have realistic data for authentic testing
- Applications show different states (draft, submitted, approved, etc.)
- Test data includes various sectors and grant types
- New enhanced features are fully integrated and testable

**Remember:** These are demo accounts with sample data for testing the production deployment!