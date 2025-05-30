# eTownz Grants Management Frontend Documentation

## Table of Contents
1. [System Architecture & Overview](#system-architecture--overview)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Component Documentation](#component-documentation)
4. [User Experience & Features](#user-experience--features)
5. [Technical Implementation](#technical-implementation)
6. [Development Guide](#development-guide)

## System Architecture & Overview

### Technology Stack

The eTownz Grants frontend is a modern, production-ready web application built with:

- **Next.js 15.3.3** - React framework with App Router for server-side rendering and optimal performance
- **TypeScript** - For type safety and better developer experience
- **Tailwind CSS v4** - Utility-first CSS framework for rapid UI development
- **Radix UI** - Accessible, unstyled component primitives
- **Lucide React** - Beautiful, consistent icon library
- **React Hook Form** - Performant forms with validation
- **Zod** - TypeScript-first schema validation
- **TanStack Query** - Powerful data synchronization for React
- **Axios** - HTTP client for API communication

### Frontend Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Landing page
│   │   ├── layout.tsx         # Root layout
│   │   ├── globals.css        # Global styles
│   │   ├── auth/              # Authentication pages
│   │   │   ├── login/
│   │   │   └── register/
│   │   └── dashboard/         # Protected dashboard pages
│   │       └── page.tsx
│   ├── components/            # Reusable components
│   │   ├── ui/               # Base UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── input.tsx
│   │   └── layout/           # Layout components
│   │       └── Sidebar.tsx
│   └── lib/                  # Utility functions and types
│       ├── auth.ts          # Authentication & permissions
│       └── utils.ts         # Helper utilities
```

### Authentication Flow

1. **Registration**: New users create accounts with organization details
2. **Login**: Email/password authentication with token storage
3. **Protected Routes**: Dashboard routes require valid authentication
4. **Token Management**: JWT tokens stored in localStorage
5. **Auto-redirect**: Unauthenticated users redirected to login

## User Roles & Permissions

### Role Hierarchy

The system implements four distinct user roles with hierarchical permissions:

#### 1. Super Admin (`super_admin`)
- **Full system access**: Complete control over all system features
- **User management**: Create, edit, delete any user across all organizations
- **Organization oversight**: View and manage all organizations
- **Grant management**: Create, edit, delete grant opportunities
- **Analytics access**: View system-wide analytics and reports
- **System configuration**: Manage system settings and configurations

#### 2. Organization Admin (`organization_admin`)
- **Organization management**: Full control within their organization
- **User management**: Add/remove users within their organization
- **Grant applications**: Submit and manage all organization applications
- **Analytics access**: View organization-specific analytics
- **Team coordination**: Oversee all grant writers and viewers

#### 3. Grant Writer (`grant_writer`)
- **Application creation**: Draft and edit grant applications
- **Grant discovery**: Search and view all available grants
- **Limited management**: Can only manage their own draft applications
- **Collaboration**: Work with team members on applications
- **No analytics**: Cannot access analytical reports

#### 4. Viewer (`viewer`)
- **Read-only access**: Can view grants and applications
- **No editing**: Cannot create or modify any content
- **Discovery**: Can search and browse grant opportunities
- **Monitoring**: Track application status and deadlines

### Permission Matrix

```typescript
ROLE_PERMISSIONS = {
  super_admin: {
    canViewAllOrganizations: true,
    canManageAllUsers: true,
    canAccessAnalytics: true,
    canManageSystem: true,
    canViewAllGrants: true,
    canCreateGrants: true,
    canEditGrants: true,
    canDeleteGrants: true,
    canSubmitApplications: true,
    canViewApplications: true,
    canManageApplications: true,
  },
  organization_admin: {
    canViewAllOrganizations: false,
    canManageAllUsers: false,
    canAccessAnalytics: true,
    canManageSystem: false,
    canViewAllGrants: true,
    canCreateGrants: false,
    canEditGrants: false,
    canDeleteGrants: false,
    canSubmitApplications: true,
    canViewApplications: true,
    canManageApplications: true,
    canManageOrganizationUsers: true,
    canEditOrganization: true,
  },
  grant_writer: {
    canViewAllOrganizations: false,
    canManageAllUsers: false,
    canAccessAnalytics: false,
    canManageSystem: false,
    canViewAllGrants: true,
    canCreateGrants: false,
    canEditGrants: false,
    canDeleteGrants: false,
    canSubmitApplications: true,
    canViewApplications: true,
    canManageApplications: false,
    canDraftApplications: true,
    canEditDraftApplications: true,
  },
  viewer: {
    canViewAllOrganizations: false,
    canManageAllUsers: false,
    canAccessAnalytics: false,
    canManageSystem: false,
    canViewAllGrants: true,
    canCreateGrants: false,
    canEditGrants: false,
    canDeleteGrants: false,
    canSubmitApplications: false,
    canViewApplications: true,
    canManageApplications: false,
  }
}
```

### Permission Enforcement

Permissions are enforced at multiple levels:

1. **UI Level**: Components conditionally render based on user permissions
2. **Route Level**: Protected routes check permissions before rendering
3. **API Level**: Backend validates permissions for all requests
4. **Navigation**: Sidebar dynamically shows/hides items based on role

Example usage:
```typescript
import { hasPermission } from '@/lib/auth'

// Check single permission
if (hasPermission(user, 'canSubmitApplications')) {
  // Show submit button
}

// Navigation filtering
const navigationItems = items.filter(item => 
  !item.permission || hasPermission(user, item.permission)
)
```

## Component Documentation

### Landing Page (`/src/app/page.tsx`)

The landing page serves as the public-facing entry point with a compelling value proposition.

**Key Features:**
- Hero section with clear call-to-action
- Statistics showcase (500+ grants, €50M+ secured)
- Three-step process explanation
- Benefits grid highlighting key features
- Footer with company information

**Component Structure:**
```tsx
<LandingPage>
  <Header>
    <Logo />
    <Navigation>
      <SignInButton />
      <GetStartedButton />
    </Navigation>
  </Header>
  
  <HeroSection>
    <Headline />
    <Subheadline />
    <CTAButtons />
  </HeroSection>
  
  <StatsSection>
    <StatCard /> // Multiple stats
  </StatsSection>
  
  <HowItWorksSection>
    <ProcessStep /> // 3 steps
  </HowItWorksSection>
  
  <BenefitsSection>
    <BenefitCard /> // 6 benefits
  </BenefitsSection>
  
  <CTASection />
  
  <Footer>
    <CompanyInfo />
    <QuickLinks />
  </Footer>
</LandingPage>
```

### Authentication Components

#### Login Page (`/src/app/auth/login/page.tsx`)

**Features:**
- Email/password authentication
- Password visibility toggle
- Remember me checkbox
- Social login options (Google, Microsoft)
- Error handling with user feedback
- Forgot password link

**State Management:**
```typescript
const [email, setEmail] = useState("")
const [password, setPassword] = useState("")
const [showPassword, setShowPassword] = useState(false)
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState("")
```

#### Register Page (`/src/app/auth/register/page.tsx`)

**Features:**
- Comprehensive registration form
- Organization details collection
- Password strength requirements
- Terms acceptance
- Organization type selection
- Form validation

**Organization Types:**
- Non-Profit Organization
- Startup/SME
- Research Institution
- Educational Institution
- Social Enterprise
- Community Group
- Other

### Dashboard (`/src/app/dashboard/page.tsx`)

The dashboard provides role-specific views and functionality.

**Components:**
1. **Stats Cards**: Display key metrics
   - Total Grants Available
   - Active Applications
   - Upcoming Deadlines
   - Funding Secured

2. **Recent Activity Feed**: Shows latest updates
   - New grants available
   - Application status changes
   - Deadline reminders

3. **Quick Actions**: Role-based shortcuts
   - Discover New Grants
   - Start New Application
   - View Deadlines
   - Manage Team (Admin only)

### Layout Components

#### Sidebar (`/src/components/layout/Sidebar.tsx`)

Dynamic navigation component that adapts based on user role.

**Features:**
- User profile display
- Role-based navigation items
- Active state highlighting
- Logout functionality
- Responsive design

**Navigation Items:**
- Dashboard (all roles)
- Grants Discovery (all roles)
- Applications (permission-based)
- Organizations (super admin only)
- Users (admin roles)
- Analytics (admin roles)
- Deadlines (all roles)
- Settings (all roles)

### UI Components

#### Button Component (`/src/components/ui/button.tsx`)

Versatile button component with multiple variants:

**Variants:**
- `default`: Primary action button
- `destructive`: Dangerous actions
- `outline`: Secondary actions
- `secondary`: Alternative styling
- `ghost`: Minimal styling
- `link`: Text link appearance

**Sizes:**
- `default`: Standard size
- `sm`: Small buttons
- `lg`: Large buttons
- `icon`: Icon-only buttons

**Usage:**
```tsx
<Button variant="default" size="lg">
  Get Started
</Button>

<Button variant="outline" size="sm">
  <Search className="mr-2 h-4 w-4" />
  Search Grants
</Button>
```

#### Card Component (`/src/components/ui/card.tsx`)

Flexible container component for content grouping.

**Sub-components:**
- `Card`: Main container
- `CardHeader`: Header section
- `CardTitle`: Title text
- `CardDescription`: Subtitle/description
- `CardContent`: Main content area
- `CardFooter`: Footer section

**Usage:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Total Grants</CardTitle>
    <CardDescription>Available opportunities</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">127</div>
  </CardContent>
</Card>
```

#### Input Component (`/src/components/ui/input.tsx`)

Styled form input with consistent design.

**Features:**
- Full Tailwind styling
- Focus states
- Disabled states
- File input support
- Placeholder styling

**Usage:**
```tsx
<Input
  type="email"
  placeholder="Enter your email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  required
/>
```

## User Experience & Features

### Landing Page Experience

1. **First Impression**: Clean, professional design with Irish focus
2. **Value Proposition**: Clear messaging about time savings and AI assistance
3. **Social Proof**: Statistics showing platform success
4. **Call to Action**: Multiple CTAs for registration and learning more
5. **Trust Building**: Security mentions, GDPR compliance

### Authentication Experience

1. **Streamlined Registration**: Single-page form with organization details
2. **Password Security**: Visual feedback and strength requirements
3. **Social Login**: Quick authentication via Google/Microsoft
4. **Error Handling**: Clear, actionable error messages
5. **Seamless Transition**: Auto-redirect to dashboard after auth

### Dashboard Experience

1. **Personalized Welcome**: Role-specific greeting and content
2. **At-a-Glance Metrics**: Key statistics prominently displayed
3. **Activity Timeline**: Recent updates for quick awareness
4. **Quick Actions**: Common tasks easily accessible
5. **Responsive Design**: Works on all device sizes

### Navigation Experience

1. **Persistent Sidebar**: Always visible navigation
2. **Role-Based Menu**: Only see relevant options
3. **Visual Feedback**: Active states and hover effects
4. **User Context**: Profile and role always visible
5. **Quick Logout**: Easy access to sign out

## Technical Implementation

### State Management

The application uses React's built-in state management with hooks:

```typescript
// Authentication state
const [user, setUser] = useState<User | null>(null)

// Form state management
const [formData, setFormData] = useState({
  name: "",
  email: "",
  password: "",
  // ...
})

// Loading and error states
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState("")
```

### API Integration

Using async/await with proper error handling:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)
  setError("")

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (response.ok) {
      const data = await response.json()
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push('/dashboard')
    } else {
      const data = await response.json()
      setError(data.message || 'Login failed')
    }
  } catch (err) {
    setError('Network error. Please try again.')
  } finally {
    setIsLoading(false)
  }
}
```

### Styling Approach

Using Tailwind CSS with custom utility function:

```typescript
// Utility for merging classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usage in components
className={cn(
  "base-classes",
  isActive && "active-classes",
  className // Allow override
)}
```

### TypeScript Integration

Strong typing throughout the application:

```typescript
// User type definition
export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  organizationId?: string
  avatar?: string
  verified: boolean
  lastLogin?: Date
}

// Enum for roles
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ORGANIZATION_ADMIN = 'organization_admin',
  GRANT_WRITER = 'grant_writer',
  VIEWER = 'viewer'
}
```

### Component Patterns

Using React best practices:

1. **Forwarded Refs**: For DOM access
```typescript
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    // Component implementation
  }
)
```

2. **Composition**: Building complex components from primitives
```typescript
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>
```

3. **Conditional Rendering**: Based on state and permissions
```typescript
{user.role === UserRole.ORGANIZATION_ADMIN && (
  <Button onClick={() => router.push('/dashboard/users')}>
    <Users className="mr-2 h-4 w-4" />
    Manage Team
  </Button>
)}
```

## Development Guide

### Getting Started

1. **Install Dependencies**:
```bash
npm install
```

2. **Run Development Server**:
```bash
npm run dev
```

3. **Build for Production**:
```bash
npm run build
```

### Adding New Components

1. Create component file in appropriate directory
2. Use TypeScript for type safety
3. Follow existing patterns for consistency
4. Export from index file if creating component library

Example component structure:
```typescript
import * as React from "react"
import { cn } from "@/lib/utils"

export interface ComponentProps {
  // Define props
}

export const Component = React.forwardRef<
  HTMLDivElement,
  ComponentProps
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("base-styles", className)}
      {...props}
    />
  )
})

Component.displayName = "Component"
```

### Adding New Routes

1. Create new directory under `/app`
2. Add `page.tsx` for the route
3. Implement authentication check if protected
4. Update navigation in Sidebar if needed

### Extending Permissions

1. Add new permission to `ROLE_PERMISSIONS` in `/lib/auth.ts`
2. Update role definitions as needed
3. Use `hasPermission` helper to check
4. Update UI components to respect new permission

### Best Practices

1. **Type Safety**: Always use TypeScript types
2. **Error Handling**: Implement try-catch blocks
3. **Loading States**: Show feedback during async operations
4. **Accessibility**: Use semantic HTML and ARIA labels
5. **Performance**: Use React.memo and useMemo where appropriate
6. **Testing**: Write tests for critical functionality
7. **Code Organization**: Keep components focused and reusable

### Environment Variables

Configure in `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Deployment

The application is containerized and ready for deployment:

1. **Docker**: Use provided Dockerfile
2. **Environment**: Set production environment variables
3. **Build**: Run production build
4. **Deploy**: Use platform of choice (Vercel, AWS, etc.)

## Conclusion

The eTownz Grants frontend provides a comprehensive, role-based grants management system with modern UX and robust technical implementation. The modular architecture and clear separation of concerns make it easy to extend and maintain.

For questions or contributions, please refer to the project repository.