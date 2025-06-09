# eTownz Grants CMS Setup Guide

This project now includes a **Sanity headless CMS** for managing content on non-logged-in pages. You can control layouts, colors, fonts, and all content through the CMS interface.

## Features

✅ **Complete Site Control** - Full control over all website aspects
✅ **Advanced Page Builder** - Drag-and-drop page construction with multiple components
✅ **Dynamic Theme Control** - Change colors, fonts, spacing, and animations
✅ **Menu & Navigation** - Full header, footer, and navigation management
✅ **SEO Management** - Complete SEO control with meta tags, social sharing
✅ **URL & Permalinks** - Custom slugs and URL redirect management
✅ **Site Settings** - Global configurations, analytics, social media
✅ **Content Management** - Rich text editing, image galleries, forms
✅ **Real-time Updates** - Changes appear immediately on the website
✅ **Visual Editor** - User-friendly interface for non-technical users
✅ **Mobile Responsive** - All changes work across all device sizes

## Quick Setup

### 1. Create Sanity Account & Project

1. Go to [sanity.io](https://sanity.io) and create a free account
2. Create a new project called "eTownz Grants"
3. Choose "Blog" template (we'll customize it)
4. Copy your **Project ID** from the dashboard

### 2. Configure Environment Variables

Create `.env.local` file in the frontend directory:

```bash
# Copy from .env.local.example
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_SANITY_DATASET=production
```

### 3. Initialize CMS

```bash
# Navigate to frontend directory
cd frontend

# Start development server
npm run dev

# In another terminal, start CMS
npm run cms
```

### 4. Access CMS Interface

- **Website**: http://localhost:3001
- **CMS Admin**: http://localhost:3001/cms

## Content Management

### Theme Configuration

Control your website's appearance:

- **Colors**: Primary, secondary, accent, background, text colors
- **Typography**: Font families, sizes for headings and body text  
- **Layout**: Container width, spacing, border radius styles
- **Animations**: Enable/disable animations, speed, hover effects

### Page Content

Manage content for each page:

- **Hero Sections**: Main title, subtitle, call-to-action buttons
- **Content Sections**: Text, feature grids, statistics
- **SEO Settings**: Page titles, descriptions, social images

### Navigation

Configure site navigation:

- **Logo**: Text, images, icons
- **Menu Items**: Links, external URLs, mobile visibility
- **CTA Buttons**: Sign in, get started buttons
- **Footer**: Company description, link categories, copyright

## Usage Examples

### Changing Brand Colors

1. Go to CMS → Theme Configuration
2. Click "Create" to add new theme
3. Set colors using color picker:
   - Primary: #8B5CF6 (Purple)
   - Secondary: #06B6D4 (Cyan)  
   - Accent: #F59E0B (Yellow)
4. Toggle "Active Theme" to true
5. Publish changes
6. Refresh website to see new colors

### Updating Hero Text

1. Go to CMS → Page Content
2. Select "Landing Page"
3. Edit Hero Section:
   - Title: "Your New Headline"
   - Subtitle: "Updated description text"
   - CTA Text: "Start Now"
4. Publish changes

### Adding New Feature

1. Go to CMS → Page Content → Landing Page
2. Add new section → Feature Grid
3. Add features with:
   - Title, description, icon name
   - Choose from Lucide icons
4. Publish and view changes

## CMS Content Types

### ⚙️ Site Settings
- Site name, description, URL
- Favicon and social share images
- Google Analytics integration
- Social media links
- Contact information
- Maintenance mode
- Global SEO defaults

### 🎨 Theme Configuration
- Colors (HSL format with color picker)
- Typography settings (fonts, sizes)
- Layout preferences (spacing, containers)
- Animation controls (speed, effects)

### 🧭 Navigation Configuration  
- Logo and branding (text, image, icon)
- Main menu structure
- Call-to-action buttons
- Footer content and links
- Mobile navigation settings

### 📄 Advanced Page Builder
**Hero Sections:**
- Title, subtitle, background images/videos
- Multiple CTA buttons with styles
- Text alignment options

**Text Sections:**
- Rich text editing with formatting
- Multi-column layouts
- Custom background/text colors

**Feature Grids:**
- Customizable grid layouts (2-6 columns)
- Icons, images, titles, descriptions
- Linked features

**Statistics Sections:**
- Multiple display styles (cards, inline, centered)
- Icons and custom formatting
- Real-time editing

**Image Galleries:**
- Grid, masonry, and carousel layouts
- Image optimization and alt text
- Custom captions

**Call-to-Action Sections:**
- Background images and colors
- Multiple button styles
- Custom messaging

**Contact Forms:**
- Drag-and-drop form builder
- Multiple field types (text, email, select, textarea)
- Custom validation and success messages

### 🔗 URL Management
- Custom page slugs/permalinks
- URL redirects (301/302)
- SEO-friendly URLs
- Redirect management

### 📊 SEO Management
- Page-specific SEO titles and descriptions
- Meta keywords
- Social share images (Open Graph)
- Search engine visibility controls
- Schema markup support

## Development Notes

### File Structure

```
frontend/
├── sanity/
│   ├── lib/
│   │   ├── client.ts          # Sanity client config
│   │   └── queries.ts         # GROQ queries
│   └── schemas/
│       ├── themeConfig.ts     # Theme control schema
│       ├── pageContent.ts     # Page content schema
│       └── navigationConfig.ts # Navigation schema
├── src/
│   ├── components/cms/
│   │   └── CMSLandingPage.tsx # CMS-powered landing page
│   ├── hooks/
│   │   └── useTheme.ts        # Theme application hook
│   └── lib/
│       └── sanity.ts          # Helper functions
├── sanity.config.ts           # Main Sanity configuration
└── CMS_SETUP.md              # This file
```

### Technical Implementation

- **Real-time Updates**: Uses Sanity's real-time API
- **CSS Variables**: Theme colors applied to CSS custom properties
- **TypeScript**: Fully typed CMS data structures
- **Fallbacks**: Graceful degradation if CMS is unavailable
- **Performance**: Cached queries and optimized loading

## Deployment

### Deploy CMS Studio

```bash
npm run cms:deploy
```

### Production Environment Variables

Add to your hosting platform:

```
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
```

## Support

- **Sanity Docs**: https://www.sanity.io/docs
- **Next.js Integration**: https://www.sanity.io/plugins/next-sanity
- **Schema Reference**: https://www.sanity.io/docs/schema-types

The CMS is now ready to use! Start by creating your first theme configuration and page content.