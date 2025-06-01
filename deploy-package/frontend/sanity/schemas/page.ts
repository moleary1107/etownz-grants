import { defineType, defineField } from 'sanity'

export const page = defineType({
  name: 'page',
  title: 'Pages',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Page Title',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'URL Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'status',
      title: 'Page Status',
      type: 'string',
      options: {
        list: [
          { title: 'Draft', value: 'draft' },
          { title: 'Published', value: 'published' },
          { title: 'Private', value: 'private' },
        ],
      },
      initialValue: 'draft',
    }),
    defineField({
      name: 'pageType',
      title: 'Page Type',
      type: 'string',
      options: {
        list: [
          { title: 'Landing Page', value: 'landing' },
          { title: 'Standard Page', value: 'standard' },
          { title: 'Blog Post', value: 'blog' },
          { title: 'Legal Page', value: 'legal' },
        ],
      },
      initialValue: 'standard',
    }),
    defineField({
      name: 'template',
      title: 'Page Template',
      type: 'string',
      options: {
        list: [
          { title: 'Default', value: 'default' },
          { title: 'Full Width', value: 'full-width' },
          { title: 'Landing Page', value: 'landing' },
          { title: 'Blog Post', value: 'blog' },
          { title: 'Contact', value: 'contact' },
        ],
      },
      initialValue: 'default',
    }),
    defineField({
      name: 'pageBuilder',
      title: 'Page Content',
      type: 'array',
      of: [
        // Hero Section
        {
          type: 'object',
          name: 'heroSection',
          title: 'Hero Section',
          fields: [
            { name: 'title', title: 'Hero Title', type: 'text', rows: 3 },
            { name: 'subtitle', title: 'Subtitle', type: 'text', rows: 4 },
            { name: 'backgroundImage', title: 'Background Image', type: 'image' },
            { name: 'backgroundVideo', title: 'Background Video URL', type: 'url' },
            { name: 'ctaButtons', title: 'CTA Buttons', type: 'array', of: [
              {
                type: 'object',
                fields: [
                  { name: 'text', title: 'Button Text', type: 'string' },
                  { name: 'url', title: 'Button URL', type: 'string' },
                  { name: 'style', title: 'Button Style', type: 'string', options: {
                    list: [
                      { title: 'Primary', value: 'primary' },
                      { title: 'Secondary', value: 'secondary' },
                      { title: 'Accent', value: 'accent' },
                      { title: 'Ghost', value: 'ghost' },
                    ]
                  }},
                ],
              },
            ]},
            { name: 'alignment', title: 'Text Alignment', type: 'string', options: {
              list: [
                { title: 'Left', value: 'left' },
                { title: 'Center', value: 'center' },
                { title: 'Right', value: 'right' },
              ]
            }, initialValue: 'center' },
          ],
          preview: {
            select: { title: 'title', subtitle: 'subtitle' },
            prepare({ title, subtitle }) {
              return {
                title: '🦸 Hero Section',
                subtitle: title || subtitle || 'No content',
              }
            },
          },
        },
        // Text Section
        {
          type: 'object',
          name: 'textSection',
          title: 'Text Section',
          fields: [
            { name: 'title', title: 'Section Title', type: 'string' },
            { name: 'content', title: 'Content', type: 'array', of: [{ type: 'block' }] },
            { name: 'layout', title: 'Layout', type: 'string', options: {
              list: [
                { title: 'Single Column', value: 'single' },
                { title: 'Two Columns', value: 'two-column' },
                { title: 'Three Columns', value: 'three-column' },
              ]
            }},
            { name: 'backgroundColor', title: 'Background Color', type: 'string', validation: Rule => Rule.regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).error('Must be a valid hex color'), description: 'Hex color code (e.g., #f0f0f0)' },
            { name: 'textColor', title: 'Text Color', type: 'string', validation: Rule => Rule.regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).error('Must be a valid hex color'), description: 'Hex color code (e.g., #000000)' },
          ],
          preview: {
            select: { title: 'title' },
            prepare({ title }) {
              return {
                title: '📝 Text Section',
                subtitle: title || 'No title',
              }
            },
          },
        },
        // Feature Grid
        {
          type: 'object',
          name: 'featureGrid',
          title: 'Feature Grid',
          fields: [
            { name: 'title', title: 'Grid Title', type: 'string' },
            { name: 'subtitle', title: 'Grid Subtitle', type: 'text', rows: 3 },
            { name: 'columns', title: 'Number of Columns', type: 'number', options: {
              list: [2, 3, 4, 6]
            }, initialValue: 3 },
            { name: 'features', title: 'Features', type: 'array', of: [
              {
                type: 'object',
                fields: [
                  { name: 'title', title: 'Feature Title', type: 'string' },
                  { name: 'description', title: 'Description', type: 'text', rows: 4 },
                  { name: 'icon', title: 'Icon Name', type: 'string', description: 'Lucide icon name' },
                  { name: 'image', title: 'Feature Image', type: 'image' },
                  { name: 'link', title: 'Link URL', type: 'string' },
                ],
              },
            ]},
          ],
          preview: {
            select: { title: 'title', features: 'features' },
            prepare({ title, features }) {
              return {
                title: '🎯 Feature Grid',
                subtitle: title ? `${title} (${features?.length || 0} features)` : `${features?.length || 0} features`,
              }
            },
          },
        },
        // Statistics Section
        {
          type: 'object',
          name: 'statsSection',
          title: 'Statistics Section',
          fields: [
            { name: 'title', title: 'Section Title', type: 'string' },
            { name: 'subtitle', title: 'Section Subtitle', type: 'text', rows: 3 },
            { name: 'layout', title: 'Layout Style', type: 'string', options: {
              list: [
                { title: 'Cards', value: 'cards' },
                { title: 'Inline', value: 'inline' },
                { title: 'Centered', value: 'centered' },
              ]
            }},
            { name: 'stats', title: 'Statistics', type: 'array', of: [
              {
                type: 'object',
                fields: [
                  { name: 'value', title: 'Stat Value', type: 'string' },
                  { name: 'label', title: 'Stat Label', type: 'string' },
                  { name: 'icon', title: 'Icon', type: 'string', description: 'Lucide icon name' },
                ],
              },
            ]},
          ],
          preview: {
            select: { title: 'title', stats: 'stats' },
            prepare({ title, stats }) {
              return {
                title: '📊 Statistics Section',
                subtitle: title ? `${title} (${stats?.length || 0} stats)` : `${stats?.length || 0} stats`,
              }
            },
          },
        },
        // Image Gallery
        {
          type: 'object',
          name: 'imageGallery',
          title: 'Image Gallery',
          fields: [
            { name: 'title', title: 'Gallery Title', type: 'string' },
            { name: 'layout', title: 'Gallery Layout', type: 'string', options: {
              list: [
                { title: 'Grid', value: 'grid' },
                { title: 'Masonry', value: 'masonry' },
                { title: 'Carousel', value: 'carousel' },
              ]
            }},
            { name: 'images', title: 'Images', type: 'array', of: [
              {
                type: 'object',
                fields: [
                  { name: 'image', title: 'Image', type: 'image', options: { hotspot: true } },
                  { name: 'alt', title: 'Alt Text', type: 'string' },
                  { name: 'caption', title: 'Caption', type: 'string' },
                ],
              },
            ]},
          ],
          preview: {
            select: { title: 'title', images: 'images' },
            prepare({ title, images }) {
              return {
                title: '🖼️ Image Gallery',
                subtitle: title ? `${title} (${images?.length || 0} images)` : `${images?.length || 0} images`,
              }
            },
          },
        },
        // Call-to-Action Section
        {
          type: 'object',
          name: 'ctaSection',
          title: 'Call-to-Action Section',
          fields: [
            { name: 'title', title: 'CTA Title', type: 'string' },
            { name: 'subtitle', title: 'CTA Subtitle', type: 'text', rows: 3 },
            { name: 'backgroundImage', title: 'Background Image', type: 'image' },
            { name: 'backgroundColor', title: 'Background Color', type: 'string', validation: Rule => Rule.regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).error('Must be a valid hex color'), description: 'Hex color code (e.g., #f0f0f0)' },
            { name: 'buttons', title: 'CTA Buttons', type: 'array', of: [
              {
                type: 'object',
                fields: [
                  { name: 'text', title: 'Button Text', type: 'string' },
                  { name: 'url', title: 'Button URL', type: 'string' },
                  { name: 'style', title: 'Button Style', type: 'string', options: {
                    list: [
                      { title: 'Primary', value: 'primary' },
                      { title: 'Secondary', value: 'secondary' },
                      { title: 'Accent', value: 'accent' },
                    ]
                  }},
                ],
              },
            ]},
          ],
          preview: {
            select: { title: 'title' },
            prepare({ title }) {
              return {
                title: '📢 CTA Section',
                subtitle: title || 'No title',
              }
            },
          },
        },
        // Contact Form
        {
          type: 'object',
          name: 'contactForm',
          title: 'Contact Form',
          fields: [
            { name: 'title', title: 'Form Title', type: 'string' },
            { name: 'subtitle', title: 'Form Subtitle', type: 'text', rows: 3 },
            { name: 'fields', title: 'Form Fields', type: 'array', of: [
              {
                type: 'object',
                fields: [
                  { name: 'name', title: 'Field Name', type: 'string' },
                  { name: 'label', title: 'Field Label', type: 'string' },
                  { name: 'type', title: 'Field Type', type: 'string', options: {
                    list: [
                      { title: 'Text', value: 'text' },
                      { title: 'Email', value: 'email' },
                      { title: 'Phone', value: 'tel' },
                      { title: 'Textarea', value: 'textarea' },
                      { title: 'Select', value: 'select' },
                    ]
                  }},
                  { name: 'required', title: 'Required Field', type: 'boolean' },
                  { name: 'placeholder', title: 'Placeholder Text', type: 'string' },
                ],
              },
            ]},
            { name: 'submitButtonText', title: 'Submit Button Text', type: 'string', initialValue: 'Send Message' },
            { name: 'successMessage', title: 'Success Message', type: 'string', initialValue: 'Thank you for your message!' },
          ],
          preview: {
            select: { title: 'title' },
            prepare({ title }) {
              return {
                title: '📋 Contact Form',
                subtitle: title || 'No title',
              }
            },
          },
        },
      ],
    }),
    defineField({
      name: 'seo',
      title: 'SEO Settings',
      type: 'object',
      fields: [
        { name: 'title', title: 'SEO Title', type: 'string', description: 'If empty, page title will be used' },
        { name: 'description', title: 'Meta Description', type: 'text', rows: 3 },
        { name: 'keywords', title: 'Keywords', type: 'array', of: [{ type: 'string' }] },
        { name: 'ogImage', title: 'Social Share Image', type: 'image' },
        { name: 'noIndex', title: 'No Index (Hide from search engines)', type: 'boolean', initialValue: false },
      ],
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published Date',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      slug: 'slug.current',
      status: 'status',
    },
    prepare({ title, slug, status }) {
      return {
        title: title,
        subtitle: `/${slug} • ${status}`,
      }
    },
  },
})