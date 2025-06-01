import { defineType, defineField } from 'sanity'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'siteName',
      title: 'Site Name',
      type: 'string',
      validation: Rule => Rule.required(),
      initialValue: 'eTownz Grants',
    }),
    defineField({
      name: 'siteDescription',
      title: 'Site Description',
      type: 'text',
      rows: 3,
      description: 'Default meta description for the site',
      initialValue: 'AI-powered grant discovery and application platform for Irish organizations.',
    }),
    defineField({
      name: 'siteUrl',
      title: 'Site URL',
      type: 'url',
      description: 'The main URL of your website (used for SEO and social sharing)',
    }),
    defineField({
      name: 'favicon',
      title: 'Favicon',
      type: 'image',
      description: 'Upload your site favicon (32x32 pixels recommended)',
    }),
    defineField({
      name: 'ogImage',
      title: 'Default Social Share Image',
      type: 'image',
      description: 'Default image for social media sharing (1200x630 pixels recommended)',
    }),
    defineField({
      name: 'googleAnalytics',
      title: 'Google Analytics',
      type: 'object',
      fields: [
        {
          name: 'trackingId',
          title: 'Tracking ID',
          type: 'string',
          description: 'Google Analytics tracking ID (e.g., G-XXXXXXXXXX)',
        },
        {
          name: 'enabled',
          title: 'Enable Analytics',
          type: 'boolean',
          initialValue: false,
        },
      ],
    }),
    defineField({
      name: 'socialMedia',
      title: 'Social Media',
      type: 'object',
      fields: [
        { name: 'twitter', title: 'Twitter URL', type: 'url' },
        { name: 'facebook', title: 'Facebook URL', type: 'url' },
        { name: 'linkedin', title: 'LinkedIn URL', type: 'url' },
        { name: 'instagram', title: 'Instagram URL', type: 'url' },
        { name: 'youtube', title: 'YouTube URL', type: 'url' },
      ],
    }),
    defineField({
      name: 'contact',
      title: 'Contact Information',
      type: 'object',
      fields: [
        { name: 'email', title: 'Contact Email', type: 'email' },
        { name: 'phone', title: 'Phone Number', type: 'string' },
        { name: 'address', title: 'Address', type: 'text', rows: 3 },
      ],
    }),
    defineField({
      name: 'maintenance',
      title: 'Maintenance Mode',
      type: 'object',
      fields: [
        {
          name: 'enabled',
          title: 'Enable Maintenance Mode',
          type: 'boolean',
          initialValue: false,
        },
        {
          name: 'message',
          title: 'Maintenance Message',
          type: 'text',
          rows: 3,
          initialValue: 'We are currently performing maintenance. Please check back soon.',
        },
      ],
    }),
    defineField({
      name: 'redirects',
      title: 'URL Redirects',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'from', title: 'From Path', type: 'string', description: 'e.g., /old-page' },
            { name: 'to', title: 'To Path', type: 'string', description: 'e.g., /new-page' },
            { name: 'permanent', title: 'Permanent Redirect (301)', type: 'boolean', initialValue: true },
          ],
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'siteName',
      subtitle: 'siteDescription',
    },
  },
})