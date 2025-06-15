# Next.js Image Optimization Setup

This document outlines the image optimization implementation for the eTownz Grants platform frontend.

## Overview

All `<img>` tags have been replaced with Next.js `<Image>` components to leverage automatic image optimization, including:

- Automatic WebP/AVIF format conversion
- Responsive image sizing
- Lazy loading
- Cumulative Layout Shift (CLS) prevention

## Configuration

### Next.js Configuration (`next.config.ts`)

```typescript
images: {
  domains: ['images.unsplash.com', 'via.placeholder.com', 'cdn.sanity.io'],
  formats: ['image/webp', 'image/avif']
}
```

### Allowed Domains

- **cdn.sanity.io**: Sanity CMS image CDN
- **images.unsplash.com**: Stock photos (development/demo)
- **via.placeholder.com**: Placeholder images (development)

## Optimized Components

### 1. ImageGallery Component
- **File**: `src/components/cms/sections/ImageGallery.tsx`
- **Implementation**: Uses `fill` prop with responsive aspect ratio containers
- **Sizes**: `(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw`
- **Optimization**: Sanity URL optimization with 600px width, 85% quality, crop fit

### 2. FeatureGrid Component
- **File**: `src/components/cms/sections/FeatureGrid.tsx`
- **Implementation**: Fixed 64x64px images for feature icons
- **Sizes**: `64px`
- **Optimization**: Sanity URL optimization with exact dimensions

## Utility Functions

### Image Utils (`src/lib/imageUtils.ts`)

Provides helper functions for image optimization:

#### `buildSanityImageUrl(baseUrl, params)`
Builds optimized Sanity image URLs with parameters:
- `width/height`: Specific dimensions
- `quality`: Image quality (0-100)
- `format`: Output format (webp, jpg, png)
- `fit`: Resize behavior (crop, fill, max, min)
- `crop`: Crop position (center, top, bottom, left, right)

#### `imageSizes` Constants
Pre-defined sizes strings for common use cases:
- `gallery`: Gallery grid images
- `featureIcon`: Small feature icons (64px)
- `hero`: Full-width hero images
- `card`: Card images
- `avatar`: User avatars

#### `extractSanityImageDimensions(url)`
Extracts width/height from Sanity URLs when available.

#### `isOptimizedDomain(url)`
Checks if an image URL is from an allowed optimization domain.

## Best Practices

### 1. Always Use Next.js Image Component
```tsx
import Image from 'next/image'

// ✅ Good
<Image 
  src={imageUrl} 
  alt="Description" 
  width={400} 
  height={300}
  sizes="(max-width: 768px) 100vw, 50vw"
/>

// ❌ Avoid
<img src={imageUrl} alt="Description" />
```

### 2. Provide Proper Alt Text
Always include descriptive alt text for accessibility:
```tsx
<Image 
  alt={item.image.alt || item.title || 'Descriptive fallback'}
  // ... other props
/>
```

### 3. Use Appropriate Sizes Prop
The `sizes` prop tells the browser which image size to download:
```tsx
// For responsive galleries
sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"

// For fixed-size icons
sizes="64px"

// For full-width images
sizes="100vw"
```

### 4. Optimize Sanity Images
Use the utility function to optimize Sanity images:
```tsx
<Image 
  src={buildSanityImageUrl(imageUrl, { 
    width: 600, 
    quality: 85,
    fit: 'crop'
  })}
  // ... other props
/>
```

### 5. Handle External Images
For external images not in the allowed domains, either:
1. Add the domain to Next.js config
2. Use eslint-disable with explanation:
```tsx
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={externalUrl} alt="External image that cannot be optimized" />
```

## Performance Benefits

1. **Automatic Format Optimization**: WebP/AVIF when supported
2. **Responsive Images**: Different sizes for different screen sizes  
3. **Lazy Loading**: Images load as they enter the viewport
4. **CLS Prevention**: Proper width/height prevents layout shift
5. **CDN Optimization**: Leverages Sanity's image CDN capabilities

## Troubleshooting

### Domain Not Allowed Error
If you see "Error: Invalid src prop", add the domain to `next.config.ts`:
```typescript
images: {
  domains: ['your-new-domain.com', ...existing domains]
}
```

### Image Not Loading
1. Check if the URL is accessible
2. Verify domain is in allowed list
3. Ensure proper alt text is provided
4. Check network tab for specific error messages

### Layout Shift Issues
1. Always provide `width` and `height` or use `fill` with proper container
2. Use `sizes` prop for responsive images
3. Consider using `placeholder="blur"` with `blurDataURL`

## Future Enhancements

1. **Blur Placeholders**: Add low-quality image placeholders
2. **Art Direction**: Use `<picture>` element for different crops
3. **Priority Loading**: Add `priority` prop for above-fold images
4. **Advanced Lazy Loading**: Custom intersection observer for complex layouts