# Claude Desktop Integration with eTownz Grants

## 🎯 Overview

This guide explains how to connect Claude Desktop to your eTownz Grants MCP servers for AI-assisted grant writing and document processing.

## 🔧 Setting Up Claude Desktop MCP Integration

### Step 1: Install Claude Desktop App
1. Download Claude Desktop from: https://claude.ai/download
2. Install and launch the application
3. Sign in with your Anthropic account

### Step 2: Configure MCP Servers

Create or edit the Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "etownz-grants-documentation": {
      "command": "docker",
      "args": [
        "exec", "-i", "etownz_grants-mcp-docs-1", 
        "node", "dist/index.js"
      ],
      "env": {
        "PROJECT_ROOT": "/project"
      }
    },
    "etownz-grants-fetch": {
      "command": "docker",
      "args": [
        "exec", "-i", "etownz_grants-mcp-fetch-1",
        "node", "dist/index.js"
      ]
    },
    "etownz-grants-filesystem": {
      "command": "docker",
      "args": [
        "exec", "-i", "etownz_grants-mcp-filesystem-1",
        "node", "dist/index.js"
      ]
    },
    "etownz-grants-document-processor": {
      "command": "docker",
      "args": [
        "exec", "-i", "etownz_grants-mcp-document-processor-1",
        "node", "dist/index.js"
      ],
      "env": {
        "OPENAI_API_KEY": "your-openai-api-key-here"
      }
    }
  }
}
```

### Step 3: Start All MCP Servers

```bash
cd /Users/markoleary/Personal_Dev/etownz_grants
docker-compose up -d mcp-docs mcp-fetch mcp-filesystem mcp-document-processor
```

### Step 4: Restart Claude Desktop

After configuration changes, restart Claude Desktop to load the MCP servers.

## 🚀 AI-Assisted Grant Writing Workflows

### 1. Grant Discovery and Analysis

**Ask Claude:**
```
"Use the fetch server to scrape the latest grants from Enterprise Ireland's website and analyze them for my tech startup."
```

**Claude will:**
- Fetch grant opportunity pages
- Extract structured data
- Analyze eligibility and requirements  
- Provide recommendations based on your organization profile

### 2. Document Processing and Analysis

**Ask Claude:**
```
"Process this PDF grant document I uploaded and create an interactive HTML view with all requirements highlighted."
```

**Claude will:**
- Convert PDF to structured JSON
- Extract requirements, deadlines, and eligibility criteria
- Generate interactive HTML for easy review
- Provide AI analysis of difficulty and success factors

### 3. AI Voice Simulation for Applications

**Ask Claude:**
```
"Analyze my previous successful grant applications and help me write a new application in my organization's voice for the SFI Discover Programme."
```

**Claude will:**
- Analyze your writing style from previous documents
- Learn your organization's tone and approach
- Generate application content matching your voice
- Ensure alignment with grant requirements

### 4. Lessons Learned from Failed Applications

**Ask Claude:**
```
"Analyze our rejected application for the EPA Research Grant and extract lessons learned for future applications."
```

**Claude will:**
- Process the failed application document
- Identify weak sections and missing requirements
- Generate improvement recommendations
- Create prevention measures for future applications

## 🔄 Automated Workflows

### Daily Grant Discovery
Set up automated prompts:
```
"Check for new grants in our target categories (technology, research, innovation) and notify me of any high-match opportunities."
```

### Application Quality Checks
Before submission:
```
"Review this draft application against the grant requirements and our success patterns. Provide a quality score and improvement suggestions."
```

### Deadline Monitoring
Weekly reviews:
```
"Review all active grant deadlines and application statuses. Alert me to any upcoming deadlines or required actions."
```

## 🎛️ Advanced Features

### 1. Multi-Organization Support
```json
{
  "organization_profiles": {
    "tech_startup": {
      "sector": "technology",
      "size": "11-50",
      "focus_areas": ["AI", "healthcare", "sustainability"],
      "writing_style": "technical, innovative, data-driven"
    },
    "research_institute": {
      "sector": "research",
      "size": "51-200", 
      "focus_areas": ["renewable energy", "materials science"],
      "writing_style": "academic, detailed, evidence-based"
    }
  }
}
```

### 2. Success Pattern Learning
```
"Analyze all successful applications from Irish tech startups for R&D grants in the past 2 years and identify the top 5 success patterns."
```

### 3. Competitive Intelligence
```
"Compare our application approach with successful competitors and suggest improvements based on their winning strategies."
```

## 🔐 Security and Privacy

### Data Protection
- All document processing happens locally
- No sensitive data sent to external APIs without explicit consent
- User documents remain within your infrastructure
- AI analysis uses only metadata and anonymized content patterns

### API Key Management
- Store OpenAI keys securely in environment variables
- Use separate keys for different environments
- Rotate keys regularly for security

## 🛠️ Troubleshooting

### Common Issues

**MCP Server Not Found:**
```bash
# Check if servers are running
docker-compose ps

# Restart specific server
docker-compose restart mcp-document-processor
```

**Permission Errors:**
```bash
# Ensure proper file permissions
chmod +r /path/to/documents/*
```

**API Key Issues:**
```bash
# Verify OpenAI API key
export OPENAI_API_KEY="your-key-here"
docker-compose restart mcp-document-processor
```

### Debug Mode
Enable debug logging in Claude Desktop configuration:
```json
{
  "mcpServers": {
    "etownz-grants-document-processor": {
      "command": "docker",
      "args": [...],
      "env": {
        "DEBUG": "true",
        "LOG_LEVEL": "verbose"
      }
    }
  }
}
```

## 📊 Usage Analytics

Track your AI-assisted grant writing performance:

### Success Metrics
- **Speed Improvement**: Time to draft applications
- **Quality Score**: AI-assessed application quality
- **Success Rate**: Grant approval percentage
- **User Satisfaction**: Feedback on AI assistance

### Sample Prompts for Analytics
```
"Generate a report on our grant writing performance this quarter, including success rates, common failure patterns, and improvement recommendations."
```

## 🔄 Continuous Learning

The system learns from each interaction:

1. **User Feedback**: Rate AI suggestions to improve recommendations
2. **Success Tracking**: Monitor which strategies lead to successful grants
3. **Pattern Recognition**: Identify emerging trends in grant requirements
4. **Style Evolution**: Adapt to changes in your organization's communication style

## 🚀 Next Steps

1. **Start Simple**: Begin with basic grant discovery and document processing
2. **Build Profiles**: Let the system learn your writing style through document analysis  
3. **Expand Usage**: Gradually use more advanced features like voice simulation
4. **Customize Workflows**: Develop organization-specific prompt templates
5. **Share Success**: Document what works best for your team

---

**Need Help?**
- Check the MCP server logs: `docker-compose logs mcp-document-processor`
- Review the NEXT_STEPS.md for latest features
- Contact support with specific error messages and use cases