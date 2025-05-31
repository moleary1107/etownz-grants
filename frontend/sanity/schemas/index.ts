import { themeConfig } from './themeConfig'
import { pageContent } from './pageContent'
import { navigationConfig } from './navigationConfig'
import { siteSettings } from './siteSettings'
import { page } from './page'
import { redirect } from './redirect'

export const schemaTypes = [
  // Site Configuration
  siteSettings,
  themeConfig,
  navigationConfig,
  
  // Content Management
  page,
  pageContent, // Legacy - keep for backward compatibility
  
  // Utilities
  redirect,
]