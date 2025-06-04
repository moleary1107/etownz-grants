# Grant Processing MCP Server

A specialized Model Context Protocol (MCP) server that provides AI tools for grant processing, requirements analysis, eligibility checking, and compliance validation.

## Overview

The Grant Processing MCP Server exposes specialized tools that enable AI models (like Claude) to perform sophisticated grant-related analysis and assistance tasks. It's part of the eTownz grants management platform's AI architecture.

## Features

### 🔍 Grant Requirements Analysis
- Extracts requirements from grant documentation using NLP
- Categorizes requirements by type (mandatory, preferred, optional)
- Classifies by category (financial, technical, legal, organizational, project)
- Provides confidence scoring for analysis results

### ✅ Eligibility Checking
- Validates organization and project eligibility against grant criteria
- Supports strict and flexible validation modes
- Generates recommendations for improving eligibility
- Provides detailed reasoning for each eligibility check

### 📊 Success Pattern Recognition
- Analyzes successful grant applications to identify patterns
- Extracts content, structure, and timing patterns
- Provides implementation tips and applicability conditions
- Supports different analysis scopes (basic, detailed, comprehensive)

### 🛡️ Compliance Validation
- Validates applications against grant requirements
- Supports multiple regulatory frameworks (EU, US, etc.)
- Identifies critical compliance issues
- Generates fix recommendations

### 📝 Application Guidance Generation
- Provides personalized guidance for grant applications
- Stage-specific recommendations (preparation, drafting, review, submission)
- Strategic, tactical, and technical guidance types
- Customized for organization context

## Available Tools

### 1. analyze_grant_requirements

Analyzes grant documentation to extract requirements and criteria.

**Parameters:**
- `grantText` (required): The grant documentation text to analyze
- `grantId` (required): Unique identifier for the grant
- `analysisDepth` (optional): Level of analysis ('basic', 'detailed', 'comprehensive')

**Example Usage:**
```json
{
  "name": "analyze_grant_requirements",
  "arguments": {
    "grantText": "This grant requires organizations to be registered nonprofits...",
    "grantId": "eu-horizon-2024-001",
    "analysisDepth": "detailed"
  }
}
```

### 2. check_eligibility

Checks organization/project eligibility against grant criteria.

**Parameters:**
- `grantId` (required): Grant identifier
- `organizationProfile` (required): Organization details and characteristics
- `projectDetails` (required): Project information and specifications
- `strictMode` (optional): Whether to apply strict eligibility checking

### 3. extract_success_patterns

Analyzes successful grant applications to identify patterns and best practices.

**Parameters:**
- `successfulApplications` (required): Array of successful grant application data
- `grantType` (required): Type of grant to analyze patterns for
- `analysisScope` (optional): Scope of analysis ('content', 'structure', 'timing', 'comprehensive')

### 4. validate_compliance

Validates grant application compliance with requirements and regulations.

**Parameters:**
- `applicationData` (required): Grant application data to validate
- `grantRequirements` (required): List of grant requirements to check against
- `regulatoryFramework` (optional): Regulatory framework ('EU', 'US', etc.)
- `validationLevel` (optional): Level of validation ('basic', 'standard', 'comprehensive')

### 5. generate_application_guidance

Generates personalized guidance for grant application preparation.

**Parameters:**
- `grantId` (required): Grant identifier
- `organizationContext` (required): Organization context and capabilities
- `applicationStage` (required): Current stage ('preparation', 'drafting', 'review', 'submission')
- `guidanceType` (optional): Type of guidance ('strategic', 'tactical', 'technical', 'comprehensive')

## Installation & Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Build the Server:**
   ```bash
   npm run build
   ```

3. **Run the Server:**
   ```bash
   npm start
   ```

4. **Development Mode:**
   ```bash
   npm run dev
   ```

## Testing

Run the test script to verify the server is working correctly:

```bash
node test-server.js
```

This will test:
- Server initialization
- Tool listing
- Grant requirements analysis functionality

## Integration with Main Platform

The Grant Processing MCP Server integrates with the main eTownz grants platform through:

1. **Backend Services Integration:**
   - Connects to the grants database for historical data
   - Uses existing grant analysis services
   - Integrates with user preference and organization data

2. **AI Pipeline Integration:**
   - Works with the main AI pipeline for processing
   - Shares embeddings and vector database resources
   - Coordinates with other AI services

3. **Frontend Integration:**
   - Powers the AI writing assistant
   - Enables intelligent grant recommendations
   - Supports progressive form disclosure features

## Architecture

```
┌─────────────────────┐
│   Claude/AI Model   │
└──────────┬──────────┘
           │ MCP Protocol
┌──────────▼──────────┐
│ Grant Processing    │
│ MCP Server          │
├─────────────────────┤
│ • Requirements      │
│   Analysis          │
│ • Eligibility       │
│   Checking          │
│ • Success Patterns  │
│ • Compliance        │
│ • Guidance          │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Backend Services    │
│ & Database          │
└─────────────────────┘
```

## Configuration

The server can be configured through environment variables or configuration files:

- `OPENAI_API_KEY`: OpenAI API key for advanced NLP processing
- `DATABASE_URL`: Connection to the grants database
- `ENABLE_CACHING`: Enable result caching for performance
- `MAX_CONCURRENT_REQUESTS`: Limit concurrent processing

## Error Handling

The server includes comprehensive error handling:
- Graceful degradation when external services are unavailable
- Detailed error messages for debugging
- Automatic retries for transient failures
- Input validation and sanitization

## Performance Considerations

- **Caching**: Results are cached to improve response times
- **Batching**: Multiple requests can be processed in batches
- **Rate Limiting**: Built-in protection against overuse
- **Memory Management**: Efficient memory usage for large documents

## Security

- Input sanitization for all user-provided data
- No sensitive information logged or stored
- Secure communication protocols
- Rate limiting and abuse protection

## Future Enhancements

- Machine learning model integration for improved accuracy
- Real-time collaboration features
- Advanced analytics and reporting
- Multi-language support
- Integration with external grant databases

## Contributing

When contributing to the Grant Processing MCP Server:

1. Follow the existing code structure and patterns
2. Add tests for new functionality
3. Update documentation for new features
4. Ensure TypeScript types are properly defined
5. Test integration with the main platform

## License

Part of the eTownz grants management platform. See main project license.