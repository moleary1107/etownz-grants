#!/usr/bin/env node

import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'hpmuagfn',
  dataset: 'production',
  useCdn: false,
  token: 'skOD5qIfXSvIaqB5ZXOCUgfyMXdRHlxlkuMAsPyj2ftc5tsfzTQYlRySwL1bN5hORhR9fWK6Ai5r8hOXCvseUoSLpABZ6YMcgL4Slgpgc4wblrxn2U0vGEG2B0LrOqzaizt5ycsoSV8obK9Rcgwoz9uo3s0yqPIj8ErZ5GuMrjezUVL1iPQa',
  apiVersion: '2024-01-01'
})

const pages = [
  {
    _type: 'page',
    title: 'Frequently Asked Questions',
    slug: { _type: 'slug', current: 'faq' },
    status: 'published',
    pageType: 'standard',
    template: 'default',
    pageBuilder: [
      {
        _type: 'heroSection',
        _key: 'hero',
        title: 'Frequently Asked Questions',
        subtitle: 'Get answers to common questions about eTownz Grants and grant applications',
        alignment: 'center'
      },
      {
        _type: 'textSection',
        _key: 'faq-content',
        title: 'Grant Application Questions',
        content: [
          {
            _type: 'block',
            children: [
              {
                _type: 'span',
                text: 'Q: What types of grants are available on eTownz Grants?\nA: We feature grants for businesses, startups, non-profits, research institutions, and individuals. Our AI system discovers grants from EU programs, government agencies, foundations, and private organizations.\n\nQ: How does the AI application assistant work?\nA: Our AI analyzes your project details and automatically fills out grant applications, ensuring all requirements are met. It matches your project to the most suitable grants and optimizes your application for success.\n\nQ: Is eTownz Grants free to use?\nA: We offer a free tier with limited features. Premium plans provide unlimited applications, AI assistance, and priority support.\n\nQ: How long does it take to find suitable grants?\nA: Our AI can identify relevant grants in minutes, compared to weeks of manual research. Most users find 5-10 suitable grants within their first search.\n\nQ: What documents do I need to apply?\nA: Typically you\'ll need project descriptions, budgets, team information, and organizational details. Our document processor can extract information from existing documents to speed up applications.\n\nQ: Can I track my application status?\nA: Yes, our dashboard provides real-time tracking of all your applications, including submission status, review stages, and funding decisions.'
              }
            ]
          }
        ],
        layout: 'single'
      }
    ],
    seo: {
      title: 'FAQ - eTownz Grants',
      description: 'Frequently asked questions about grant applications, AI assistance, and the eTownz Grants platform.',
      keywords: ['faq', 'grants', 'questions', 'help', 'support']
    }
  },
  {
    _type: 'page',
    title: 'About eTownz Grants',
    slug: { _type: 'slug', current: 'about' },
    status: 'published',
    pageType: 'standard',
    template: 'default',
    pageBuilder: [
      {
        _type: 'heroSection',
        _key: 'hero',
        title: 'About eTownz Grants',
        subtitle: 'Revolutionizing grant applications with AI-powered automation and intelligent matching',
        alignment: 'center'
      },
      {
        _type: 'textSection',
        _key: 'mission',
        title: 'Our Mission',
        content: [
          {
            _type: 'block',
            children: [
              {
                _type: 'span',
                text: 'eTownz Grants is transforming how organizations and individuals access funding opportunities. We believe that great ideas shouldn\'t be held back by complex application processes or lack of awareness about available grants.\n\nOur AI-powered platform automatically discovers relevant grants, fills out applications, and manages the entire submission process - making grant funding accessible to everyone.'
              }
            ]
          }
        ],
        layout: 'single'
      },
      {
        _type: 'featureGrid',
        _key: 'features',
        title: 'What Makes Us Different',
        columns: 3,
        features: [
          {
            title: 'AI-Powered Discovery',
            description: 'Our intelligent system continuously scans thousands of funding sources to find grants that match your specific needs.',
            icon: 'Search'
          },
          {
            title: 'Automated Applications',
            description: 'AI fills out grant applications automatically, ensuring accuracy and completeness while saving you hours of work.',
            icon: 'Bot'
          },
          {
            title: 'Real-time Tracking',
            description: 'Monitor all your applications in one dashboard with status updates and deadline reminders.',
            icon: 'Activity'
          }
        ]
      },
      {
        _type: 'statsSection',
        _key: 'stats',
        title: 'Our Impact',
        layout: 'cards',
        stats: [
          { value: '€50M+', label: 'Funding Secured', icon: 'Euro' },
          { value: '10,000+', label: 'Grants Discovered', icon: 'FileText' },
          { value: '2,500+', label: 'Successful Applications', icon: 'CheckCircle' },
          { value: '95%', label: 'Time Saved', icon: 'Clock' }
        ]
      }
    ],
    seo: {
      title: 'About eTownz Grants - AI-Powered Grant Management',
      description: 'Learn about eTownz Grants, the AI-powered platform revolutionizing grant applications and funding discovery.',
      keywords: ['about', 'grants', 'AI', 'funding', 'automation']
    }
  },
  {
    _type: 'page',
    title: 'Privacy Policy',
    slug: { _type: 'slug', current: 'privacy' },
    status: 'published',
    pageType: 'legal',
    template: 'default',
    pageBuilder: [
      {
        _type: 'heroSection',
        _key: 'hero',
        title: 'Privacy Policy',
        subtitle: 'How we protect and handle your personal information',
        alignment: 'center'
      },
      {
        _type: 'textSection',
        _key: 'privacy-content',
        title: 'Data Protection & Privacy',
        content: [
          {
            _type: 'block',
            children: [
              {
                _type: 'span',
                text: 'Last updated: May 31, 2025\n\n1. INFORMATION WE COLLECT\nWe collect information you provide directly, such as account details, project information, and grant application data. We also collect usage data to improve our services.\n\n2. HOW WE USE YOUR INFORMATION\nYour data is used to provide grant matching services, process applications, and improve our AI algorithms. We never sell your personal information.\n\n3. DATA SECURITY\nWe implement industry-standard security measures including encryption, secure servers, and regular security audits to protect your information.\n\n4. SHARING OF INFORMATION\nWe only share your information with grant providers when you submit applications. We do not share data with third parties for marketing purposes.\n\n5. YOUR RIGHTS\nYou have the right to access, update, or delete your personal information. Contact us at privacy@etownz.com for data requests.\n\n6. COOKIES\nWe use essential cookies for functionality and analytics cookies to improve our service. You can manage cookie preferences in your browser.\n\n7. GDPR COMPLIANCE\nWe fully comply with GDPR regulations for EU users, including data portability and the right to be forgotten.\n\n8. CONTACT US\nFor privacy questions, contact us at privacy@etownz.com or write to eTownz Ltd, Dublin, Ireland.'
              }
            ]
          }
        ],
        layout: 'single'
      }
    ],
    seo: {
      title: 'Privacy Policy - eTownz Grants',
      description: 'Learn how eTownz Grants protects your privacy and handles personal data in compliance with GDPR.',
      keywords: ['privacy', 'policy', 'GDPR', 'data protection']
    }
  },
  {
    _type: 'page',
    title: 'Contact Us',
    slug: { _type: 'slug', current: 'contact' },
    status: 'published',
    pageType: 'contact',
    template: 'contact',
    pageBuilder: [
      {
        _type: 'heroSection',
        _key: 'hero',
        title: 'Get in Touch',
        subtitle: 'Need help with grant applications or have questions about our platform?',
        alignment: 'center'
      },
      {
        _type: 'contactForm',
        _key: 'contact-form',
        title: 'Send us a Message',
        subtitle: 'We\'ll get back to you within 24 hours',
        fields: [
          { name: 'name', label: 'Full Name', type: 'text', required: true, placeholder: 'Your full name' },
          { name: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'your@email.com' },
          { name: 'subject', label: 'Subject', type: 'select', required: true },
          { name: 'message', label: 'Message', type: 'textarea', required: true, placeholder: 'How can we help you?' }
        ],
        submitButtonText: 'Send Message',
        successMessage: 'Thank you! We\'ll get back to you soon.'
      },
      {
        _type: 'textSection',
        _key: 'contact-info',
        title: 'Other Ways to Reach Us',
        content: [
          {
            _type: 'block',
            children: [
              {
                _type: 'span',
                text: '📧 Email: support@etownz.com\n📞 Phone: +353 1 234 5678\n🏢 Address: eTownz Ltd, Dublin, Ireland\n⏰ Support Hours: Monday-Friday, 9 AM - 6 PM GMT\n\n💬 Live Chat: Available on our dashboard for premium users\n📚 Help Center: Check our knowledge base for instant answers'
              }
            ]
          }
        ],
        layout: 'single'
      }
    ],
    seo: {
      title: 'Contact eTownz Grants - Get Support & Help',
      description: 'Contact eTownz Grants for support with grant applications, platform questions, or technical assistance.',
      keywords: ['contact', 'support', 'help', 'grants', 'assistance']
    }
  },
  {
    _type: 'page',
    title: 'Pricing Plans',
    slug: { _type: 'slug', current: 'pricing' },
    status: 'published',
    pageType: 'standard',
    template: 'default',
    pageBuilder: [
      {
        _type: 'heroSection',
        _key: 'hero',
        title: 'Simple, Transparent Pricing',
        subtitle: 'Choose the plan that fits your grant funding needs',
        alignment: 'center'
      },
      {
        _type: 'featureGrid',
        _key: 'pricing-tiers',
        title: 'Pricing Plans',
        columns: 3,
        features: [
          {
            title: 'Free Starter',
            description: '€0/month\n\n• 3 grant searches per month\n• Basic AI matching\n• Email support\n• Access to grant database\n• Application templates',
            icon: 'Gift'
          },
          {
            title: 'Professional',
            description: '€49/month\n\n• Unlimited grant searches\n• AI application assistance\n• Priority support\n• Advanced matching algorithms\n• Document upload & processing\n• Application tracking dashboard',
            icon: 'Briefcase'
          },
          {
            title: 'Enterprise',
            description: '€199/month\n\n• Everything in Professional\n• Dedicated account manager\n• Custom integrations\n• Team collaboration features\n• Advanced analytics\n• SLA guarantee',
            icon: 'Building'
          }
        ]
      },
      {
        _type: 'textSection',
        _key: 'pricing-info',
        title: 'Frequently Asked Questions',
        content: [
          {
            _type: 'block',
            children: [
              {
                _type: 'span',
                text: 'Q: Can I upgrade or downgrade my plan?\nA: Yes, you can change your plan at any time. Changes take effect on your next billing cycle.\n\nQ: Is there a setup fee?\nA: No setup fees. Pay only for your subscription.\n\nQ: What payment methods do you accept?\nA: We accept all major credit cards and bank transfers for enterprise plans.\n\nQ: Do you offer discounts for non-profits?\nA: Yes, we offer 50% discount for registered non-profit organizations.\n\nQ: Can I cancel anytime?\nA: Yes, you can cancel your subscription at any time with no penalties.'
              }
            ]
          }
        ],
        layout: 'single'
      }
    ],
    seo: {
      title: 'Pricing - eTownz Grants Plans & Features',
      description: 'Choose from our flexible pricing plans for grant discovery and AI-powered applications. Free tier available.',
      keywords: ['pricing', 'plans', 'subscription', 'grants', 'cost']
    }
  },
  {
    _type: 'page',
    title: 'Platform Features',
    slug: { _type: 'slug', current: 'features' },
    status: 'published',
    pageType: 'standard',
    template: 'default',
    pageBuilder: [
      {
        _type: 'heroSection',
        _key: 'hero',
        title: 'Powerful Features for Grant Success',
        subtitle: 'Discover how our AI-powered platform transforms grant applications',
        alignment: 'center'
      },
      {
        _type: 'featureGrid',
        _key: 'core-features',
        title: 'Core Platform Features',
        columns: 2,
        features: [
          {
            title: 'AI Grant Discovery',
            description: 'Automatically finds relevant grants from thousands of sources including EU programs, government agencies, and private foundations.',
            icon: 'Search'
          },
          {
            title: 'Smart Application Assistant',
            description: 'AI fills out applications automatically using your project details, ensuring accuracy and completeness.',
            icon: 'Bot'
          },
          {
            title: 'Document Processing',
            description: 'Upload existing documents and our AI extracts relevant information for faster application completion.',
            icon: 'FileText'
          },
          {
            title: 'Real-time Tracking',
            description: 'Monitor all applications in one dashboard with status updates, deadlines, and progress tracking.',
            icon: 'Activity'
          },
          {
            title: 'Intelligent Matching',
            description: 'Advanced algorithms match your project with the most suitable grants based on criteria and success probability.',
            icon: 'Target'
          },
          {
            title: 'Collaboration Tools',
            description: 'Team features for multiple users to work together on applications with role-based access control.',
            icon: 'Users'
          }
        ]
      },
      {
        _type: 'textSection',
        _key: 'benefits',
        title: 'Why Choose eTownz Grants?',
        content: [
          {
            _type: 'block',
            children: [
              {
                _type: 'span',
                text: '🚀 Save 95% of Time: What used to take weeks now takes minutes\n💰 Increase Success Rate: AI optimization improves approval chances by 40%\n🔍 Never Miss Opportunities: Continuous monitoring finds new grants automatically\n📊 Data-Driven Insights: Analytics help refine your funding strategy\n🛡️ Secure & Compliant: GDPR compliant with enterprise-grade security'
              }
            ]
          }
        ],
        layout: 'single'
      }
    ],
    seo: {
      title: 'Features - eTownz Grants AI Platform Capabilities',
      description: 'Explore the powerful features of eTownz Grants including AI discovery, automated applications, and grant tracking.',
      keywords: ['features', 'AI', 'grants', 'automation', 'platform']
    }
  }
]

async function createPages() {
  console.log('Creating pages...')
  
  for (const page of pages) {
    try {
      const result = await client.create(page)
      console.log(`✅ Created page: ${page.title}`)
    } catch (error) {
      console.error(`❌ Failed to create ${page.title}:`, error.message)
    }
  }
  
  console.log('✨ Page creation complete!')
}

createPages().catch(console.error)