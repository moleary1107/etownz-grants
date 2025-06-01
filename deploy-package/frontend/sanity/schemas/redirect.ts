import { defineType, defineField } from 'sanity'

export const redirect = defineType({
  name: 'redirect',
  title: 'URL Redirects',
  type: 'document',
  fields: [
    defineField({
      name: 'from',
      title: 'From Path',
      type: 'string',
      description: 'The old URL path (e.g., /old-page)',
      validation: Rule => Rule.required().custom((value) => {
        if (value && !value.startsWith('/')) {
          return 'Path must start with /'
        }
        return true
      }),
    }),
    defineField({
      name: 'to',
      title: 'To Path',
      type: 'string',
      description: 'The new URL path (e.g., /new-page) or full URL',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'type',
      title: 'Redirect Type',
      type: 'string',
      options: {
        list: [
          { title: 'Permanent (301)', value: '301' },
          { title: 'Temporary (302)', value: '302' },
        ],
      },
      initialValue: '301',
    }),
    defineField({
      name: 'enabled',
      title: 'Active',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      description: 'Optional note about this redirect',
    }),
  ],
  preview: {
    select: {
      from: 'from',
      to: 'to',
      type: 'type',
      enabled: 'enabled',
    },
    prepare({ from, to, type, enabled }) {
      return {
        title: `${from} → ${to}`,
        subtitle: `${type} ${enabled ? '✅' : '❌'}`,
      }
    },
  },
})