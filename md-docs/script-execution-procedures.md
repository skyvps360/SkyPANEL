# Script Execution Procedures

## Overview

This document outlines the procedures for executing various scripts in the SkyPANEL project, including database migrations, testing scripts, and utility tools.

## Prerequisites

All scripts require the following setup:
- Node.js and npm installed
- Environment variables configured (`.env` file)
- Database connection available (for database scripts)

## Script Categories

### Database Migration Scripts

Database scripts are located in the `scripts/` directory and typically follow this pattern:

```bash
npx tsx scripts/script-name.ts
```

**Common Database Scripts:**
- `scripts/add-todos-table.ts` - Adds todos table to database
- `scripts/add-dns-tables.ts` - Creates DNS management tables
- `scripts/fix-dual-billing-schema.ts` - Updates billing system schema

**Requirements:**
- Must import `dotenv/config` at the top
- Should include error handling and transaction management
- Must log success/failure status

### Testing Scripts

Testing scripts validate functionality and data integrity:

```bash
npx tsx scripts/test-dns-record-filtering.ts
```

**Available Test Scripts:**
- `scripts/test-dns-record-filtering.ts` - Validates DNS record filtering logic

### Utility Scripts

Utility scripts perform maintenance and administrative tasks.

## Execution Environment

### Development Environment
- Scripts run in the current workspace directory
- Full logging and debug output enabled
- Safe to run multiple times (idempotent operations)

### Production Environment
- Scripts should be tested in staging first
- Backup database before running migration scripts
- Monitor logs for any errors or warnings

## Common Issues and Solutions

### Issue: "Module not found" errors
**Solution:** Ensure all dependencies are installed:
```bash
npm install
```

### Issue: Database connection errors
**Solution:** Verify environment variables:
- Check `.env` file exists and contains correct database credentials
- Ensure database server is running and accessible

### Issue: Permission errors
**Solution:** Check file permissions and user access:
```bash
chmod +x scripts/script-name.ts
```

### Issue: TypeScript compilation errors
**Solution:** Use `tsx` instead of `ts-node`:
```bash
npx tsx scripts/script-name.ts
```

## Best Practices

### Before Running Scripts
1. **Backup Data**: Always backup important data before running migration scripts
2. **Test Environment**: Run scripts in development/staging first
3. **Review Code**: Review the script code to understand what it does
4. **Check Dependencies**: Ensure all required packages are installed

### During Execution
1. **Monitor Output**: Watch for error messages and warnings
2. **Check Logs**: Review application logs for any issues
3. **Verify Results**: Confirm the script achieved its intended purpose

### After Execution
1. **Validate Changes**: Test affected functionality
2. **Update Documentation**: Document any schema or configuration changes
3. **Commit Changes**: Commit any generated migration files or updates

## Script Documentation Template

When creating new scripts, include this header:

```typescript
/**
 * Script Name: [Brief description]
 * Purpose: [What this script does]
 * Requirements: [Any special requirements]
 * Usage: npx tsx scripts/script-name.ts
 * 
 * Author: [Your name]
 * Date: [Creation date]
 */

import 'dotenv/config';
// ... rest of script
```

## Troubleshooting

### Script Hangs or Freezes
- Check for infinite loops or blocking operations
- Verify database connections are properly closed
- Monitor system resources (CPU, memory)

### Unexpected Results
- Review script logic and data validation
- Check for race conditions in concurrent operations
- Verify input data format and constraints

### Performance Issues
- Monitor execution time for large datasets
- Consider batch processing for bulk operations
- Optimize database queries and indexes

## Support

For script execution issues:
1. Check this documentation first
2. Review script comments and documentation
3. Check application logs for detailed error messages
4. Contact the development team if issues persist

## Version History

- **v1.0** - Initial script execution procedures
- **v1.1** - Added DNS record filtering test script documentation
- **v1.2** - Enhanced troubleshooting section
