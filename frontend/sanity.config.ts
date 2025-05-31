import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { colorInput } from '@sanity/color-input'
import { schemaTypes } from './sanity/schemas'

export default defineConfig({
  name: 'etownz-grants',
  title: 'eTownz Grants CMS',
  projectId: 'hpmuagfn',
  dataset: 'production',
  basePath: '/cms',
  plugins: [
    colorInput(),
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content Management')
          .items([
            // Site Configuration
            S.listItem()
              .title('🔧 Site Configuration')
              .child(
                S.list()
                  .title('Site Configuration')
                  .items([
                    S.listItem()
                      .title('⚙️ Site Settings')
                      .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
                    S.listItem()
                      .title('🎨 Theme Configuration')
                      .child(S.documentTypeList('themeConfig').title('Theme Configuration')),
                    S.listItem()
                      .title('🧭 Navigation')
                      .child(S.document().schemaType('navigationConfig').documentId('navigationConfig')),
                  ])
              ),
            
            // Content Management
            S.divider(),
            S.listItem()
              .title('📄 Pages')
              .child(S.documentTypeList('page').title('All Pages')),
            S.listItem()
              .title('📝 Legacy Page Content')
              .child(S.documentTypeList('pageContent').title('Legacy Page Content')),
              
            // Utilities
            S.divider(),
            S.listItem()
              .title('🔗 URL Redirects')
              .child(S.documentTypeList('redirect').title('URL Redirects')),
          ])
    }),
    visionTool(),
  ],
  schema: {
    types: schemaTypes,
  },
})