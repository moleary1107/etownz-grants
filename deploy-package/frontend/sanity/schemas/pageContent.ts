import { defineType, defineField } from 'sanity'

export const pageContent = defineType({
  name: 'pageContent',
  title: 'Page Content',
  type: 'document',
  fields: [
    defineField({
      name: 'pageId',
      title: 'Page Identifier',
      type: 'string',
      options: {
        list: [
          { title: 'Landing Page', value: 'landing' },
          { title: 'Login Page', value: 'login' },
          { title: 'Register Page', value: 'register' },
        ],
      },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'hero',
      title: 'Hero Section',
      type: 'object',
      fields: [
        {
          name: 'title',
          title: 'Main Title',
          type: 'text',
          rows: 3,
        },
        {
          name: 'subtitle',
          title: 'Subtitle',
          type: 'text',
          rows: 4,
        },
        {
          name: 'ctaText',
          title: 'Primary CTA Text',
          type: 'string',
        },
        {
          name: 'secondaryCtaText',
          title: 'Secondary CTA Text',
          type: 'string',
        },
        {
          name: 'backgroundImage',
          title: 'Background Image',
          type: 'image',
          options: {
            hotspot: true,
          },
        },
        {
          name: 'stats',
          title: 'Stats Display',
          type: 'string',
          description: 'Small text under CTAs (e.g., "🚀 No credit card required • ✨ 14-day free trial")',
        },
      ],
    }),
    defineField({
      name: 'sections',
      title: 'Content Sections',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'textSection',
          title: 'Text Section',
          fields: [
            { name: 'title', title: 'Section Title', type: 'string' },
            { name: 'content', title: 'Content', type: 'text', rows: 6 },
            { name: 'layout', title: 'Layout', type: 'string', options: {
              list: [
                { title: 'Center Aligned', value: 'center' },
                { title: 'Left Aligned', value: 'left' },
                { title: 'Two Columns', value: 'two-column' },
              ]
            }},
          ],
        },
        {
          type: 'object',
          name: 'featureGrid',
          title: 'Feature Grid',
          fields: [
            { name: 'title', title: 'Grid Title', type: 'string' },
            { name: 'features', title: 'Features', type: 'array', of: [
              {
                type: 'object',
                fields: [
                  { name: 'title', title: 'Feature Title', type: 'string' },
                  { name: 'description', title: 'Description', type: 'text' },
                  { name: 'icon', title: 'Icon Name', type: 'string', description: 'Lucide icon name' },
                  { name: 'color', title: 'Icon Color', type: 'string', validation: Rule => Rule.regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).error('Must be a valid hex color'), description: 'Hex color code (e.g., #3b82f6)' },
                ],
              },
            ]},
          ],
        },
        {
          type: 'object',
          name: 'statsSection',
          title: 'Statistics Section',
          fields: [
            { name: 'stats', title: 'Statistics', type: 'array', of: [
              {
                type: 'object',
                fields: [
                  { name: 'value', title: 'Stat Value', type: 'string' },
                  { name: 'label', title: 'Stat Label', type: 'string' },
                ],
              },
            ]},
          ],
        },
      ],
    }),
    defineField({
      name: 'seo',
      title: 'SEO Settings',
      type: 'object',
      fields: [
        { name: 'title', title: 'Page Title', type: 'string' },
        { name: 'description', title: 'Meta Description', type: 'text', rows: 3 },
        { name: 'ogImage', title: 'Social Share Image', type: 'image' },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'pageId',
      heroTitle: 'hero.title',
    },
    prepare({ title, heroTitle }) {
      return {
        title: title ? title.charAt(0).toUpperCase() + title.slice(1) + ' Page' : 'Untitled Page',
        subtitle: heroTitle || 'No hero title set',
      }
    },
  },
})