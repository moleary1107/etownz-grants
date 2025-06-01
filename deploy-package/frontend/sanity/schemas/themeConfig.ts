import { defineType, defineField } from 'sanity'

export const themeConfig = defineType({
  name: 'themeConfig',
  title: 'Theme Configuration',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Theme Name',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'isActive',
      title: 'Active Theme',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'colors',
      title: 'Color Palette',
      type: 'object',
      fields: [
        {
          name: 'primary',
          title: 'Primary Color',
          type: 'string',
          validation: Rule => Rule.regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).error('Must be a valid hex color'),
          description: 'Main brand color (HSL format: hue saturation lightness)',
        },
        {
          name: 'secondary',
          title: 'Secondary Color',
          type: 'string',
          validation: Rule => Rule.regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).error('Must be a valid hex color'),
          description: 'Secondary brand color',
        },
        {
          name: 'accent',
          title: 'Accent Color',
          type: 'string',
          validation: Rule => Rule.regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).error('Must be a valid hex color'),
          description: 'Accent/highlight color',
        },
        {
          name: 'background',
          title: 'Background Color',
          type: 'string',
          validation: Rule => Rule.regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).error('Must be a valid hex color'),
          description: 'Main background color',
        },
        {
          name: 'foreground',
          title: 'Text Color',
          type: 'string',
          validation: Rule => Rule.regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).error('Must be a valid hex color'),
          description: 'Primary text color',
        },
      ],
    }),
    defineField({
      name: 'typography',
      title: 'Typography Settings',
      type: 'object',
      fields: [
        {
          name: 'primaryFont',
          title: 'Primary Font Family',
          type: 'string',
          options: {
            list: [
              { title: 'Inter', value: 'Inter' },
              { title: 'Roboto', value: 'Roboto' },
              { title: 'Open Sans', value: 'Open Sans' },
              { title: 'Poppins', value: 'Poppins' },
              { title: 'Montserrat', value: 'Montserrat' },
              { title: 'Geist Sans', value: 'var(--font-geist-sans)' },
            ],
          },
          initialValue: 'var(--font-geist-sans)',
        },
        {
          name: 'headingFont',
          title: 'Heading Font Family',
          type: 'string',
          options: {
            list: [
              { title: 'Inter', value: 'Inter' },
              { title: 'Roboto', value: 'Roboto' },
              { title: 'Open Sans', value: 'Open Sans' },
              { title: 'Poppins', value: 'Poppins' },
              { title: 'Montserrat', value: 'Montserrat' },
              { title: 'Geist Sans', value: 'var(--font-geist-sans)' },
            ],
          },
          initialValue: 'var(--font-geist-sans)',
        },
        {
          name: 'fontSizes',
          title: 'Font Size Scale',
          type: 'object',
          fields: [
            { name: 'heroTitle', title: 'Hero Title (rem)', type: 'number', initialValue: 4.5 },
            { name: 'title', title: 'Title (rem)', type: 'number', initialValue: 3 },
            { name: 'subtitle', title: 'Subtitle (rem)', type: 'number', initialValue: 1.5 },
            { name: 'body', title: 'Body Text (rem)', type: 'number', initialValue: 1 },
            { name: 'small', title: 'Small Text (rem)', type: 'number', initialValue: 0.875 },
          ],
        },
      ],
    }),
    defineField({
      name: 'layout',
      title: 'Layout Settings',
      type: 'object',
      fields: [
        {
          name: 'containerMaxWidth',
          title: 'Container Max Width',
          type: 'string',
          options: {
            list: [
              { title: 'Small (1024px)', value: 'max-w-4xl' },
              { title: 'Medium (1280px)', value: 'max-w-6xl' },
              { title: 'Large (1536px)', value: 'max-w-7xl' },
              { title: 'Extra Large (1728px)', value: 'max-w-8xl' },
            ],
          },
          initialValue: 'max-w-6xl',
        },
        {
          name: 'sectionSpacing',
          title: 'Section Spacing',
          type: 'string',
          options: {
            list: [
              { title: 'Compact', value: 'py-12 sm:py-16' },
              { title: 'Normal', value: 'py-16 sm:py-24' },
              { title: 'Spacious', value: 'py-20 sm:py-32' },
              { title: 'Extra Spacious', value: 'py-24 sm:py-40' },
            ],
          },
          initialValue: 'py-20 sm:py-32',
        },
        {
          name: 'borderRadius',
          title: 'Border Radius Style',
          type: 'string',
          options: {
            list: [
              { title: 'Sharp', value: 'rounded-none' },
              { title: 'Subtle', value: 'rounded-md' },
              { title: 'Moderate', value: 'rounded-xl' },
              { title: 'Rounded', value: 'rounded-2xl' },
              { title: 'Very Rounded', value: 'rounded-3xl' },
            ],
          },
          initialValue: 'rounded-2xl',
        },
      ],
    }),
    defineField({
      name: 'animations',
      title: 'Animation Settings',
      type: 'object',
      fields: [
        {
          name: 'enableAnimations',
          title: 'Enable Animations',
          type: 'boolean',
          initialValue: true,
        },
        {
          name: 'animationSpeed',
          title: 'Animation Speed',
          type: 'string',
          options: {
            list: [
              { title: 'Fast (300ms)', value: 'duration-300' },
              { title: 'Normal (500ms)', value: 'duration-500' },
              { title: 'Slow (800ms)', value: 'duration-800' },
              { title: 'Very Slow (1000ms)', value: 'duration-1000' },
            ],
          },
          initialValue: 'duration-500',
        },
        {
          name: 'hoverEffects',
          title: 'Enable Hover Effects',
          type: 'boolean',
          initialValue: true,
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: 'name',
      active: 'isActive',
    },
    prepare({ title, active }) {
      return {
        title: title,
        subtitle: active ? 'Active Theme' : 'Inactive',
      }
    },
  },
})