#!/bin/bash

# eTownz Grants Documentation Cleanup Script
# This script removes the original documentation files after they've been moved to guides/

echo "🗂️  Cleaning up original documentation files..."

# List of files to remove (they're now in guides/)
FILES_TO_REMOVE=(
    "AI_IMPLEMENTATION_ANALYSIS.md"
    "AI_IMPLEMENTATION_ROADMAP.md"
    "API_DOCUMENTATION.md"
    "AUTOMATION_OPERATIONS_GUIDE.md"
    "CLAUDE_DESKTOP_INTEGRATION.md"
    "DEPLOYMENT.md"
    "DEPLOYMENT_GUIDE.md"
    "DEPLOYMENT_OPTIMIZATION.md"
    "FULL_AUTOMATION_SYSTEM.md"
    "IRELAND_FINANCIAL_INFRASTRUCTURE.md"
    "MANUAL_TESTING_ROLES_PERMISSIONS_GUIDE.md"
    "NEXT_STEPS.md"
    "OPERATIONS_QUICK_REFERENCE.md"
    "README-POSTMAN.md"
    "REPOSITORY_MAINTENANCE.md"
    "SIMPLE_STRIPE_SETUP.md"
)

# Change to root directory
cd "$(dirname "$0")/.."

# Remove each file if it exists
for file in "${FILES_TO_REMOVE[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ Removing $file"
        rm "$file"
    else
        echo "  ⚠️  File not found: $file"
    fi
done

echo ""
echo "📚 Documentation cleanup complete!"
echo "   All guides are now organized in the guides/ directory"
echo "   See guides/DOCUMENTATION_INDEX.md for the complete overview"
echo ""
echo "📂 New structure:"
echo "   guides/"
echo "   ├── DOCUMENTATION_INDEX.md"
echo "   ├── getting-started/"
echo "   ├── ai-architecture/"
echo "   ├── deployment/"
echo "   ├── operations/"
echo "   ├── development/"
echo "   ├── business/"
echo "   └── testing/"