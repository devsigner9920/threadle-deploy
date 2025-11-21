# npm Publishing Guide

This document outlines the steps to publish Threadle to the npm registry.

## Prerequisites

1. **npm Account**: Create an account at https://www.npmjs.com/signup if you don't have one
2. **npm CLI Authenticated**: Run `npm login` and enter your credentials
3. **2FA Configured**: Enable two-factor authentication for enhanced security
4. **Package Built**: Ensure all assets are built (`npm run build`)
5. **Tests Passing**: All tests must pass (`npm test`)

## Pre-Publishing Checklist

- [ ] Version number updated in `package.json`
- [ ] `CHANGELOG.md` updated with release notes (if exists)
- [ ] All tests passing (`npm test`)
- [ ] Build successful (`npm run build`)
- [ ] Package tarball created and verified (`npm pack`)
- [ ] README.md is comprehensive and up-to-date
- [ ] LICENSE file exists
- [ ] Repository URL is correct
- [ ] All dependencies are properly listed

## Publishing Steps

### Step 1: Verify Package Configuration

Check that `package.json` has all required fields:

```json
{
  "name": "threadle",
  "version": "1.0.0",
  "description": "Cross-discipline Slack translator bot powered by LLM",
  "main": "dist/server/index.js",
  "bin": {
    "threadle": "./bin/threadle.js",
    "threadle-init": "./bin/threadle-init.js",
    "threadle-start": "./bin/threadle-start.js",
    "threadle-stop": "./bin/threadle-stop.js"
  },
  "files": [
    "dist/",
    "bin/",
    "client/dist/",
    "prisma/",
    "prompts/",
    "README.md",
    "LICENSE"
  ],
  "keywords": [
    "slack",
    "bot",
    "translator",
    "llm"
  ],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/threadle/threadle.git"
  }
}
```

### Step 2: Test Package Locally

Create and test the package tarball:

```bash
# Create tarball
npm pack

# Extract to test directory
mkdir -p /tmp/threadle-test
tar -xzf threadle-1.0.0.tgz -C /tmp/threadle-test

# Install globally from tarball
npm install -g /tmp/threadle-test/package

# Test CLI commands
threadle init
threadle start
# ... wait for server to start ...
threadle stop

# Clean up
npm uninstall -g threadle
rm -rf /tmp/threadle-test
```

### Step 3: Authenticate with npm

If not already logged in:

```bash
npm login
```

Enter your credentials:
- Username
- Password
- Email
- One-time password (if 2FA is enabled)

Verify authentication:

```bash
npm whoami
```

### Step 4: Publish to npm Registry

For first publication:

```bash
npm publish
```

For scoped packages (if using organization):

```bash
npm publish --access public
```

For subsequent versions, update version first:

```bash
# Patch version (1.0.0 -> 1.0.1)
npm version patch

# Minor version (1.0.0 -> 1.1.0)
npm version minor

# Major version (1.0.0 -> 2.0.0)
npm version major

# Then publish
npm publish
```

### Step 5: Verify Publication

1. Check npm registry:
   ```bash
   npm info threadle
   ```

2. Visit package page:
   https://www.npmjs.com/package/threadle

3. Test installation from npm:
   ```bash
   npm install -g threadle
   threadle --help
   ```

### Step 6: Post-Publication

1. **Tag the release in Git:**
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

2. **Create GitHub Release:**
   - Go to https://github.com/threadle/threadle/releases
   - Click "Create a new release"
   - Select the tag you just pushed
   - Add release notes

3. **Announce the release:**
   - Update README with installation badge
   - Share on social media
   - Post in relevant communities

## Version Management

Follow Semantic Versioning (semver):

- **MAJOR** (1.0.0 -> 2.0.0): Breaking changes
- **MINOR** (1.0.0 -> 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 -> 1.0.1): Bug fixes, backward compatible

### Pre-release Versions

For beta/alpha releases:

```bash
npm version 1.0.0-beta.1
npm publish --tag beta
```

Install pre-release:

```bash
npm install -g threadle@beta
```

## Unpublishing

**Warning**: Unpublishing is permanent and should be avoided.

Only unpublish within 72 hours of publication:

```bash
npm unpublish threadle@1.0.0
```

For packages older than 72 hours, use deprecation instead:

```bash
npm deprecate threadle@1.0.0 "This version has critical bugs, please upgrade to 1.0.1"
```

## CI/CD Integration

Automate publishing with GitHub Actions:

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Troubleshooting

### "You do not have permission to publish"

**Solution**: Make sure you're logged in with correct account:
```bash
npm whoami
npm login
```

### "Package name already exists"

**Solution**: Choose a different package name or use scoped package:
```bash
# Update package.json
{
  "name": "@yourusername/threadle"
}

# Publish with public access
npm publish --access public
```

### "402 Payment Required"

**Solution**: Package name may be reserved or require payment. Choose different name.

### "Package version already exists"

**Solution**: Update version number:
```bash
npm version patch
npm publish
```

## Best Practices

1. **Test before publishing**: Always run `npm pack` and test locally
2. **Use .npmignore**: Exclude unnecessary files from package
3. **Keep package size small**: Only include essential files in `files` array
4. **Document breaking changes**: Update CHANGELOG.md
5. **Use semantic versioning**: Follow semver strictly
6. **Enable 2FA**: Protect your account with two-factor authentication
7. **Use npm automation tokens**: For CI/CD pipelines
8. **Monitor downloads**: Track package usage with npm stats

## Resources

- npm Documentation: https://docs.npmjs.com/
- Semantic Versioning: https://semver.org/
- npm Registry: https://www.npmjs.com/
- Package Search: https://www.npmjs.com/search?q=threadle

## Support

For issues with publishing:
- npm Support: https://www.npmjs.com/support
- GitHub Issues: https://github.com/threadle/threadle/issues
