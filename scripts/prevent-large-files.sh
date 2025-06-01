#!/bin/bash
#
# Pre-commit Hook Setup - Prevent Large Files from Being Committed
#
# This script sets up git hooks to prevent accidentally committing large files
# that could cause push timeouts in the future
#

set -e

echo "🛡️  Setting up Large File Prevention"
echo "===================================="

# Create .gitignore entries for common large files
echo ""
echo "📝 Step 1: Updating .gitignore..."

GITIGNORE_ADDITIONS="
# Large files that cause git push timeouts
*.tar
*.tar.gz
*.tar.bz2
*.zip
*.7z
*.rar

# Deployment artifacts
deploy-tmp/
dist/
build/

# Environment files with secrets
.env.production
.env.local
.env.*.local

# Large logs
*.log
logs/

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo

# Large dependencies (should be in individual service .gitignore)
node_modules/
vendor/
"

if [ -f .gitignore ]; then
    echo "$GITIGNORE_ADDITIONS" >> .gitignore
    echo "✅ Updated existing .gitignore"
else
    echo "$GITIGNORE_ADDITIONS" > .gitignore
    echo "✅ Created new .gitignore"
fi

# Create pre-commit hook
echo ""
echo "🪝 Step 2: Setting up pre-commit hook..."

HOOK_DIR=".git/hooks"
HOOK_FILE="$HOOK_DIR/pre-commit"

mkdir -p "$HOOK_DIR"

cat > "$HOOK_FILE" << 'EOF'
#!/bin/bash
#
# Pre-commit hook to prevent large files from being committed
#

# Maximum file size in bytes (10MB)
MAX_SIZE=10485760

echo "🔍 Checking for large files..."

# Get list of files to be committed
files=$(git diff --cached --name-only --diff-filter=ACM)

large_files=()
for file in $files; do
    if [ -f "$file" ]; then
        size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file" 2>/dev/null || echo 0)
        if [ "$size" -gt "$MAX_SIZE" ]; then
            large_files+=("$file")
            size_mb=$((size / 1024 / 1024))
            echo "❌ Large file detected: $file (${size_mb}MB)"
        fi
    fi
done

if [ ${#large_files[@]} -gt 0 ]; then
    echo ""
    echo "🚫 COMMIT BLOCKED: Large files detected!"
    echo ""
    echo "The following files exceed the 10MB limit:"
    for file in "${large_files[@]}"; do
        echo "  - $file"
    done
    echo ""
    echo "🔧 To fix this issue:"
    echo "  1. Remove large files: git rm --cached <file>"
    echo "  2. Add to .gitignore if needed"
    echo "  3. Use Git LFS for necessary large files: git lfs track <file>"
    echo "  4. Or store large files outside the repository"
    echo ""
    exit 1
fi

# Check for potential secrets in environment files
secret_files=$(echo "$files" | grep -E '\.(env|key|pem|p12|pfx)$' || true)
if [ -n "$secret_files" ]; then
    echo ""
    echo "⚠️  WARNING: Potential secret files detected:"
    echo "$secret_files"
    echo ""
    echo "🔐 Make sure these files don't contain sensitive information!"
    echo "   Consider adding them to .gitignore if they contain secrets."
    echo ""
    read -p "Continue with commit? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Commit cancelled."
        exit 1
    fi
fi

echo "✅ Pre-commit checks passed!"
exit 0
EOF

chmod +x "$HOOK_FILE"
echo "✅ Pre-commit hook installed"

# Create post-commit hook to remind about large files
echo ""
echo "📝 Step 3: Setting up post-commit reminder..."

POST_HOOK_FILE="$HOOK_DIR/post-commit"

cat > "$POST_HOOK_FILE" << 'EOF'
#!/bin/bash
#
# Post-commit hook to remind about repository maintenance
#

# Count commits since last reminder (stored in .git/last-cleanup-reminder)
REMINDER_FILE=".git/last-cleanup-reminder"
COMMITS_THRESHOLD=50

if [ -f "$REMINDER_FILE" ]; then
    last_reminder=$(cat "$REMINDER_FILE")
else
    last_reminder=$(git rev-parse HEAD)
    echo "$last_reminder" > "$REMINDER_FILE"
fi

commit_count=$(git rev-list --count "$last_reminder"..HEAD 2>/dev/null || echo 0)

if [ "$commit_count" -ge "$COMMITS_THRESHOLD" ]; then
    echo ""
    echo "💡 Repository Maintenance Reminder:"
    echo "   You've made $commit_count commits since last cleanup reminder."
    echo "   Consider running: ./scripts/cleanup-large-files.sh"
    echo "   if you notice git push timeouts."
    echo ""
    
    # Update reminder file
    git rev-parse HEAD > "$REMINDER_FILE"
fi
EOF

chmod +x "$POST_HOOK_FILE"
echo "✅ Post-commit reminder installed"

# Test the setup
echo ""
echo "🧪 Step 4: Testing setup..."

# Test .gitignore
if grep -q "*.tar" .gitignore; then
    echo "✅ .gitignore properly configured"
else
    echo "❌ .gitignore test failed"
fi

# Test pre-commit hook
if [ -x "$HOOK_FILE" ]; then
    echo "✅ Pre-commit hook properly installed"
else
    echo "❌ Pre-commit hook test failed"
fi

echo ""
echo "🎉 Large file prevention setup complete!"
echo ""
echo "📋 What was configured:"
echo "  ✅ .gitignore updated with large file patterns"
echo "  ✅ Pre-commit hook to block files >10MB"
echo "  ✅ Warning system for potential secret files"
echo "  ✅ Post-commit reminders for maintenance"
echo ""
echo "🔧 Usage:"
echo "  - Large files will be automatically blocked during commit"
echo "  - Run ./scripts/cleanup-large-files.sh if push timeouts occur"
echo "  - Use 'git lfs' for necessary large files"
echo ""
echo "⚠️  Note: Existing large files in history are not affected."
echo "    Use cleanup-large-files.sh to clean existing history."
EOF