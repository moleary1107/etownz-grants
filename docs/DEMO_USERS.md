# Demo Users Guide

This document contains all the demo user accounts and test data available in the eTownz Grants system for testing and development purposes.

## 📋 Demo User Accounts

### Super Admin
- **Email:** `admin@etownz.com`
- **Password:** `admin123`
- **Name:** Sarah Administrator
- **Role:** `super_admin`
- **Access:** Full system administration capabilities

### Organization Admins

#### TechStart Ireland
- **Email:** `john@techstart.ie`
- **Password:** `techstart123`
- **Name:** John Smith
- **Role:** `organization_admin`
- **Organization:** TechStart Ireland (Technology sector, 11-50 employees)
- **Location:** Dublin
- **Website:** https://techstart.ie

#### Dublin Community Center
- **Email:** `mary@dublincc.ie`
- **Password:** `community123`
- **Name:** Mary O'Connor
- **Role:** `organization_admin`
- **Organization:** Dublin Community Center (Non-Profit sector, 1-10 employees)
- **Location:** Dublin
- **Website:** https://dublincc.ie

### Grant Writers

#### Cork Research Institute
- **Email:** `david@corkresearch.ie`
- **Password:** `research123`
- **Name:** David Walsh
- **Role:** `grant_writer`
- **Organization:** Cork Research Institute (Research sector, 51-200 employees)
- **Location:** Cork
- **Website:** https://corkresearch.ie

#### Green Earth Initiative
- **Email:** `emma@greenearth.ie`
- **Password:** `green123`
- **Name:** Emma Murphy
- **Role:** `grant_writer`
- **Organization:** Green Earth Initiative (Environment sector, 11-50 employees)
- **Location:** Galway
- **Website:** https://greenearth.ie

### Viewer Account
- **Email:** `viewer@example.com`
- **Password:** `viewer123`
- **Name:** Tom Viewer
- **Role:** `viewer`
- **Organization:** TechStart Ireland
- **Access:** Read-only access to system

## 🏢 Demo Organizations

| Organization | Sector | Size | Location | Status |
|-------------|---------|------|----------|---------|
| TechStart Ireland | Technology | 11-50 | Dublin | Verified |
| Dublin Community Center | Non-Profit | 1-10 | Dublin | Verified |
| Cork Research Institute | Research | 51-200 | Cork | Verified |
| Green Earth Initiative | Environment | 11-50 | Galway | Unverified |

## 💰 Sample Grants Available

### Government Grants
1. **Enterprise Ireland R&D Fund**
   - Amount: €25,000 - €250,000
   - Deadline: March 15, 2024
   - Eligibility: SME, Startup, Research Institution
   - Category: Research & Development

2. **SFI Discover Programme**
   - Amount: €1,000 - €50,000
   - Deadline: April 30, 2024
   - Eligibility: Research Institution, University, Non-Profit
   - Category: Education & STEM

3. **Environmental Protection Agency Research Grant**
   - Amount: €30,000 - €150,000
   - Deadline: August 15, 2024
   - Eligibility: Research Institution, University, Environmental Organization
   - Category: Environment

### Council Grants
1. **Dublin City Council Community Grant**
   - Amount: €500 - €15,000
   - Deadline: February 28, 2024
   - Eligibility: Community Group, Non-Profit, Social Enterprise
   - Category: Community Development

2. **Cork County Council Arts Grant**
   - Amount: €1,000 - €10,000
   - Deadline: March 31, 2024
   - Eligibility: Individual Artist, Arts Organization, Cultural Group
   - Category: Arts & Culture

### EU Grants
1. **Horizon Europe - EIC Accelerator**
   - Amount: €500,000 - €2,500,000
   - Deadline: June 5, 2024
   - Eligibility: SME, Startup
   - Category: Innovation

2. **INTERREG Atlantic Area Programme**
   - Amount: €100,000 - €1,000,000
   - Deadline: July 20, 2024
   - Eligibility: Public Organization, Research Institution, NGO
   - Category: Regional Development

### Foundation Grants
1. **Ireland Funds Young Entrepreneur Grant**
   - Amount: €5,000 - €25,000
   - Deadline: May 15, 2024
   - Eligibility: Entrepreneur, Startup, Young Professional
   - Category: Entrepreneurship

## 📄 Sample Applications

| Applicant | Grant | Organization | Status | Amount | Progress |
|-----------|-------|--------------|---------|--------|----------|
| John Smith | Enterprise Ireland R&D Fund | TechStart Ireland | Submitted | €75,000 | 100% |
| Mary O'Connor | Dublin City Council Community Grant | Dublin Community Center | Approved | €8,500 | 100% |
| David Walsh | SFI Discover Programme | Cork Research Institute | Draft | €25,000 | 45% |
| John Smith | Horizon Europe - EIC Accelerator | TechStart Ireland | Under Review | €1,500,000 | 100% |
| Emma Murphy | Ireland Funds Young Entrepreneur Grant | Green Earth Initiative | Draft | €12,000 | 20% |
| David Walsh | EPA Research Grant | Cork Research Institute | Submitted | €80,000 | 100% |

## 🔒 User Role Permissions

### Super Admin
- Full access to all system functions
- User management
- Organization management
- System configuration
- Analytics and reporting

### Organization Admin
- Manage organization profile and settings
- Manage organization members
- View all organization applications
- Create and manage grant applications
- Access organization analytics

### Grant Writer
- Create and edit grant applications
- View organization grants and applications
- Upload documents and supporting materials
- Track application progress
- Collaborate on applications

### Viewer
- Read-only access to organization data
- View grant opportunities
- View application status and progress
- Cannot create or edit applications

## 🚀 Getting Started

1. **Login:** Use any of the demo accounts above to access the system
2. **Explore:** Try different user roles to see varying permissions
3. **Test Applications:** Create, edit, and submit grant applications
4. **Organization Management:** Test organization admin features
5. **System Administration:** Use the super admin account for full system access

## 📁 File Location

The demo data is defined in: `/backend/src/data/demoUsers.ts`

This file contains:
- `DEMO_USERS[]` - Array of user accounts
- `DEMO_ORGANIZATIONS[]` - Array of organizations
- `DEMO_GRANTS[]` - Array of available grants
- `DEMO_APPLICATIONS[]` - Array of sample applications

## 🔄 Data Reset

To reset demo data or add new test accounts, modify the arrays in the `demoUsers.ts` file and restart the backend service.

---

**Note:** These are demo accounts for development and testing purposes only. Do not use these credentials in production environments.