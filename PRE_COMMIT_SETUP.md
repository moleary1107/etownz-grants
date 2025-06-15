# Pre-commit Hooks Setup

## What's Configured

This project now has automated pre-commit hooks that will:

1. **Automatically run ESLint** on TypeScript/JavaScript files before commit
2. **Auto-fix** linting issues where possible  
3. **Prevent commits** if there are unfixable linting errors
4. **Stage the fixed files** automatically

## How It Works

### Files Affected
- `frontend/**/*.{ts,tsx}` - Frontend TypeScript/React files
- `backend/**/*.{ts,js}` - Backend TypeScript/JavaScript files

### What Happens on Commit
1. You run `git commit`
2. Husky intercepts the commit
3. lint-staged runs ESLint on changed files
4. ESLint attempts to auto-fix issues
5. Fixed files are automatically staged
6. If all issues are fixed → commit proceeds
7. If unfixable errors remain → commit is blocked

## Usage

### Normal Workflow
```bash
git add .
git commit -m "Your commit message"
# Pre-commit hooks run automatically
```

### If Commit is Blocked
```bash
# Fix remaining issues manually
npm run lint -- --fix

# Or check specific errors
cd frontend && npm run lint

# Then commit again
git add .
git commit -m "Your commit message"
```

### Skip Hooks (Emergency Only)
```bash
git commit -m "Emergency fix" --no-verify
```

## Benefits

✅ **Prevent bad code from entering the repo**  
✅ **Automatic code formatting and fixes**  
✅ **Consistent code quality across team**  
✅ **Catch issues early before CI/CD**  
✅ **Reduce code review time**

## Configuration Files

- `.husky/pre-commit` - Git hook script
- `package.json` - lint-staged configuration
- Each workspace has its own ESLint rules

## Troubleshooting

### Hook not running?
```bash
npx husky install
chmod +x .husky/pre-commit
```

### Want to update configuration?
Edit the `lint-staged` section in root `package.json`

### Performance issues?
Hooks only run on changed files, but you can adjust the scope in package.json