module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'eTownz Grants Management API',
    version: '1.0.0',
    description: 'Backend API for eTownz Grants Management Platform',
    contact: {
      name: 'eTownz',
      email: 'support@etownz.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server'
    },
    {
      url: 'https://grants.etownz.com/api',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};