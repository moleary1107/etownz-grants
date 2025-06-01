#!/bin/bash
#
# Repository Cleanup Script - Remove Large Files from Git History
# 
# This script uses BFG Repo-Cleaner to safely remove large files from git history
# Use this when git push timeouts occur due to large files in repository history
#

set -e

echo "🧹 Repository Cleanup Script"
echo "=========================="
echo "This will remove large files from git history to prevent push timeouts"
echo ""

# Configuration
REPO_URL="https://github.com/moleary1107/etownz-grants.git"
BACKUP_DIR="$(dirname $(pwd))/etownz-grants-backup-$(date +%Y%m%d-%H%M%S)"
MIRROR_DIR="$(dirname $(pwd))/etownz-grants-mirror"

# Step 1: Create backup
echo "📦 Step 1: Creating backup..."
if [ -d "$BACKUP_DIR" ]; then
    echo "❌ Backup directory already exists: $BACKUP_DIR"
    exit 1
fi

cp -r "$(pwd)" "$BACKUP_DIR"
echo "✅ Backup created: $BACKUP_DIR"

# Step 2: Check if BFG is installed
echo ""
echo "🔧 Step 2: Checking BFG installation..."
if ! command -v bfg &> /dev/null; then
    echo "📥 Installing BFG Repo-Cleaner..."
    brew install bfg
else
    echo "✅ BFG already installed"
fi

# Step 3: Clone mirror repository
echo ""
echo "📥 Step 3: Creating mirror clone..."
if [ -d "$MIRROR_DIR" ]; then
    echo "🗑️  Removing existing mirror directory..."
    rm -rf "$MIRROR_DIR"
fi

git clone --mirror "$REPO_URL" "$MIRROR_DIR"
cd "$MIRROR_DIR"

# Step 4: Remove large files
echo ""
echo "🧹 Step 4: Removing large files from history..."
echo "Removing files matching patterns:"
echo "  - *.tar"
echo "  - *.tar.gz" 
echo "  - *.zip (larger than 10MB)"
echo "  - node_modules directories"
echo ""

# Remove various large file types
bfg --delete-files '*.tar' --no-blob-protection
bfg --delete-files '*.tar.gz' --no-blob-protection  
bfg --strip-blobs-bigger-than 10M --no-blob-protection
bfg --delete-folders 'node_modules' --no-blob-protection

echo "✅ Large files removed from history"

# Step 5: Clean up repository
echo ""
echo "🧼 Step 5: Cleaning up repository..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive
echo "✅ Repository cleaned and optimized"

# Step 6: Show size comparison
echo ""
echo "📊 Repository size comparison:"
echo "Before: $(du -sh "$BACKUP_DIR/.git" | cut -f1)"
echo "After:  $(du -sh .git | cut -f1)"

# Step 7: Push cleaned history
echo ""
echo "🚀 Step 7: Pushing cleaned history..."
echo "⚠️  This will force-push and rewrite git history!"
read -p "Continue? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push --force
    echo "✅ Cleaned repository pushed successfully!"
else
    echo "❌ Push cancelled. You can manually push later with:"
    echo "   cd $MIRROR_DIR"
    echo "   git push --force"
fi

# Step 8: Cleanup
echo ""
echo "🧹 Step 8: Cleanup temporary files..."
cd "$(dirname "$MIRROR_DIR")"
rm -rf "$MIRROR_DIR"
echo "✅ Temporary mirror directory removed"

echo ""
echo "🎉 Repository cleanup complete!"
echo ""
echo "📋 Summary:"
echo "  ✅ Backup created: $BACKUP_DIR"
echo "  ✅ Large files removed from git history"  
echo "  ✅ Repository size optimized"
echo "  ✅ Changes pushed to remote (if confirmed)"
echo ""
echo "🔧 Next steps:"
echo "  1. Update your local repository: git pull --force"
echo "  2. Verify everything works correctly"
echo "  3. Remove backup if no longer needed: rm -rf $BACKUP_DIR"
echo ""
echo "⚠️  Remember: Anyone who has cloned the repository will need to"
echo "    re-clone or reset their local copy due to history rewrite."