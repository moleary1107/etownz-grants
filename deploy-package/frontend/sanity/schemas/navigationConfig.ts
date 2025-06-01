import { defineType, defineField } from 'sanity'

export const navigationConfig = defineType({
  name: 'navigationConfig',
  title: 'Navigation Configuration',
  type: 'document',
  fields: [
    defineField({
      name: 'logo',
      title: 'Logo Settings',
      type: 'object',
      fields: [
        {
          name: 'text',
          title: 'Logo Text',
          type: 'string',
          initialValue: 'eTownz Grants',
        },
        {
          name: 'image',
          title: 'Logo Image',
          type: 'image',
          description: 'Optional logo image (if provided, will override text)',
        },
        {
          name: 'iconName',
          title: 'Icon Name',
          type: 'string',
          description: 'Lucide icon name for logo icon',
          initialValue: 'Globe',
        },
      ],
    }),
    defineField({
      name: 'mainNavigation',
      title: 'Main Navigation',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'label', title: 'Link Label', type: 'string' },
            { name: 'href', title: 'URL/Path', type: 'string' },
            { name: 'isExternal', title: 'External Link', type: 'boolean', initialValue: false },
            { name: 'showOnMobile', title: 'Show on Mobile', type: 'boolean', initialValue: true },
          ],
        },
      ],
    }),
    defineField({
      name: 'ctaButtons',
      title: 'Call-to-Action Buttons',
      type: 'object',
      fields: [
        {
          name: 'primary',
          title: 'Primary CTA',
          type: 'object',
          fields: [
            { name: 'text', title: 'Button Text', type: 'string', initialValue: 'Get Started' },
            { name: 'href', title: 'Link URL', type: 'string', initialValue: '/auth/register' },
            { name: 'iconName', title: 'Icon Name', type: 'string', description: 'Lucide icon name' },
          ],
        },
        {
          name: 'secondary',
          title: 'Secondary CTA',
          type: 'object',
          fields: [
            { name: 'text', title: 'Button Text', type: 'string', initialValue: 'Sign In' },
            { name: 'href', title: 'Link URL', type: 'string', initialValue: '/auth/login' },
            { name: 'showOnMobile', title: 'Show on Mobile', type: 'boolean', initialValue: true },
          ],
        },
      ],
    }),
    defineField({
      name: 'footer',
      title: 'Footer Configuration',
      type: 'object',
      fields: [
        {
          name: 'description',
          title: 'Company Description',
          type: 'text',
          rows: 3,
        },
        {
          name: 'links',
          title: 'Footer Links',
          type: 'array',
          of: [
            {
              type: 'object',
              fields: [
                { name: 'category', title: 'Category', type: 'string' },
                { name: 'links', title: 'Links', type: 'array', of: [
                  {
                    type: 'object',
                    fields: [
                      { name: 'label', title: 'Link Label', type: 'string' },
                      { name: 'href', title: 'URL/Path', type: 'string' },
                    ],
                  },
                ]},
              ],
            },
          ],
        },
        {
          name: 'copyright',
          title: 'Copyright Text',
          type: 'string',
          initialValue: '© 2024 eTownz Grants. All rights reserved. Made with ❤️ in Ireland.',
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'logo.text',
    },
    prepare({ title }) {
      return {
        title: 'Navigation Config',
        subtitle: title || 'No logo text set',
      }
    },
  },
})