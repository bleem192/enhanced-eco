# Test Setup Instructions

## Step-by-Step Guide

### Step 1: Open PowerShell as Administrator

1. Press `Win + X` and select "Windows PowerShell (Admin)"
2. Or search for "PowerShell" in Start menu, right-click, select "Run as administrator"

### Step 2: Navigate to Backend Directory

```powershell
cd c:\Users\13621\Desktop\网络应用开发\ecommerce\backend
```

### Step 3: Install Dependencies

```powershell
npm install
```

This will install all dependencies including jest and supertest from package.json.

### Step 4: Run Tests

Choose one of the following methods:

#### Method A: Using PowerShell Script (Recommended)
```powershell
cd tests
.\run-tests.ps1
```

#### Method B: Using Batch File
```powershell
cd tests
.\quick-test.bat
```

#### Method C: Using NPM Directly
```powershell
npm test
```

### Step 5: View Results

Tests will run automatically and display results in the terminal.

## Expected Output

```
PASS  tests/auth.test.js
PASS  tests/products.test.js
PASS  tests/orders.test.js
PASS  tests/permissions.test.js

Test Suites: 4 passed, 4 total
Tests:       61 passed, 61 total
```

## Troubleshooting

### Issue: npm is not recognized

**Solution**: Install Node.js from https://nodejs.org/

### Issue: Dependencies fail to install

**Solution**: Try with administrator privileges or use a different npm registry:
```powershell
npm config set registry https://registry.npmmirror.com
npm install
```

### Issue: Tests hang or timeout

**Solution**: Increase timeout in jest.config.js:
```javascript
testTimeout: 30000
```

### Issue: Port already in use

**Solution**: Close other Node.js processes:
```powershell
Get-Process node* | Stop-Process -Force
```

## Quick Commands Reference

```powershell
# Install all dependencies
npm install

# Run all tests
npm test

# Run specific test file
npm test -- tests/auth.test.js

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Test Files Location

All test files are in: `backend/tests/`

- `auth.test.js` - Authentication tests
- `products.test.js` - Product management tests
- `orders.test.js` - Order processing tests
- `permissions.test.js` - Permission system tests
