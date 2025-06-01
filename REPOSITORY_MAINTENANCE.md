# Repository Maintenance Guide

## Large File Management

### Problem
Large files (TAR archives, build artifacts, etc.) can cause git push timeouts and repository bloat, making collaboration difficult.

### Prevention

#### 1. Install Prevention Hooks
```bash
./scripts/prevent-large-files.sh
```

This sets up:
- Pre-commit hooks to block files >10MB
- Updated .gitignore for common large file patterns
- Warning system for potential secret files
- Automated maintenance reminders

#### 2. Cleanup Existing Large Files
If push timeouts occur due to existing large files:

```bash
./scripts/cleanup-large-files.sh
```

This script:
- Creates automatic backup of your repository
- Uses BFG Repo-Cleaner for safe history cleaning
- Removes TAR files, large binaries, and build artifacts
- Optimizes repository size
- Force-pushes cleaned history

### Manual BFG Cleanup (Alternative)

If you prefer manual control:

```bash
# First, make a backup of your repository
cp -r ~/Desktop/etownz-grants ~/Desktop/etownz-grants-backup

# Install BFG if you haven't already
brew install bfg

# Clone a fresh copy (required by BFG)
git clone --mirror https://github.com/moleary1107/etownz-grants.git etownz-grants-mirror
cd etownz-grants-mirror

# Remove all TAR files from history
bfg --delete-files '*.tar' --no-blob-protection

# Remove large files (>10MB)
bfg --strip-blobs-bigger-than 10M --no-blob-protection

# Clean up the repository
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Push the cleaned history
git push --force

# Return to original directory and update
cd ../etownz-grants
git pull --force
```

### Best Practices

#### 1. Use .gitignore
Always add large file patterns to `.gitignore`:
```
# Large deployment artifacts
*.tar
*.tar.gz
*.zip
deploy-tmp/
dist/
build/

# Environment files with secrets
.env.production
.env.local
.env.*.local

# Large dependencies
node_modules/
vendor/
```

#### 2. Use Git LFS for Necessary Large Files
For files that must be tracked but are large:
```bash
git lfs track "*.zip"
git add .gitattributes
git add large-file.zip
git commit -m "Add large file with LFS"
```

#### 3. External Storage for Build Artifacts
Store deployment artifacts externally:
- Use CI/CD artifact storage
- DigitalOcean Spaces
- AWS S3
- Docker registries for images

### Security Considerations

#### Environment Files
Never commit files with secrets:
- `.env.production`
- `.env.local`
- API key files
- Certificate files

#### Clean Exposed Secrets
If secrets are accidentally committed:
1. Immediately revoke/regenerate the exposed credentials
2. Use the cleanup script to remove from history
3. Update prevention hooks to catch similar files

### Repository Size Monitoring

#### Check Repository Size
```bash
# Check total repository size
du -sh .git

# Check object count and size
git count-objects -vH

# Find largest files in history
git rev-list --objects --all | \
  git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | \
  awk '/^blob/ {print substr($0,6)}' | \
  sort --numeric-sort --key=2 | \
  tail -10
```

#### Regular Maintenance
- Run cleanup script when repository exceeds 100MB
- Review and clean up build artifacts monthly
- Monitor for accidentally committed large files

### Troubleshooting

#### Push Timeouts
1. Check repository size: `du -sh .git`
2. If >500MB, run cleanup script
3. Check for large files: `git ls-files | xargs ls -lh | sort -k5 -hr | head -10`

#### History Rewrite Issues
After BFG cleanup, team members need to:
```bash
# Option 1: Re-clone (recommended)
git clone https://github.com/moleary1107/etownz-grants.git

# Option 2: Reset local repository
git fetch origin
git reset --hard origin/main
```

#### Recovery from Backup
If cleanup goes wrong:
```bash
# Restore from backup
rm -rf .git
cp -r ~/Desktop/etownz-grants-backup/.git .
git status  # Verify restoration
```

### Tools Reference

#### BFG Repo-Cleaner
- **Purpose**: Safe history cleaning without checking out files
- **Installation**: `brew install bfg`
- **Docs**: https://rtyley.github.io/bfg-repo-cleaner/

#### Git LFS
- **Purpose**: Track large files without repository bloat
- **Installation**: `brew install git-lfs`
- **Setup**: `git lfs install`

### Emergency Contacts

If you encounter issues with repository cleanup:
1. Stop all operations
2. Ensure backup exists
3. Contact team lead before force-pushing
4. Document the issue for future prevention

---

**Remember**: Prevention is better than cleanup. Use the hooks and best practices to avoid issues before they occur.