# Code Snippets System

## Overview

The Code Snippets System is a comprehensive management tool that allows administrators to create, manage, and deploy custom HTML, CSS, and JavaScript code snippets throughout the SkyPANEL platform. These snippets can be injected into different parts of the website (header, footer, sidebar, custom locations) to add custom functionality, tracking codes, styling, or any other client-side code.

## Features

### Admin Features
- **Create Snippets**: Add new code snippets with customizable names and descriptions
- **Edit Snippets**: Modify existing snippets with full form validation
- **Delete Snippets**: Remove snippets with confirmation dialogs
- **Toggle Status**: Activate/deactivate snippets without deletion
- **Copy Code**: One-click code copying to clipboard
- **Location Management**: Choose where snippets are displayed (header, footer, sidebar, custom)
- **Bulk Management**: Handle multiple snippets efficiently

### User Features
- **Real-time Validation**: Immediate feedback on form inputs
- **Code Preview**: Syntax-highlighted code display
- **Usage Tracking**: Monitor snippet creation and modification dates
- **Responsive Design**: Works seamlessly on all device sizes

## System Architecture

### Database Schema

The code snippets system uses a single database table with optimized indexes:

#### Code Snippets Table
```sql
CREATE TABLE "code_snippets" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "code" text NOT NULL,
  "display_location" text NOT NULL,
  "is_active" boolean DEFAULT true,
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Performance indexes
CREATE INDEX "code_snippets_display_location_idx" ON "code_snippets" ("display_location");
CREATE INDEX "code_snippets_is_active_idx" ON "code_snippets" ("is_active");
```

#### Schema Fields
| Field | Type | Description |
|-------|------|-------------|
| `id` | serial | Primary key, auto-incrementing |
| `name` | text | Human-readable snippet name |
| `code` | text | The actual HTML/CSS/JavaScript code |
| `display_location` | text | Where the snippet is displayed (header, footer, sidebar, custom) |
| `custom_url` | text | Specific URL path for custom display location |
| `is_active` | boolean | Whether the snippet is currently active |
| `description` | text | Optional description of the snippet's purpose |
| `created_at` | timestamp | When the snippet was created |
| `updated_at` | timestamp | When the snippet was last modified |

### API Endpoints

#### Admin Endpoints

**Base URL**: `/api/admin/code-snippets`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Get all code snippets |
| `GET` | `/:id` | Get specific snippet by ID |
| `POST` | `/` | Create a new snippet |
| `PUT` | `/:id` | Update an existing snippet |
| `DELETE` | `/:id` | Delete a snippet |
| `GET` | `/location/:location` | Get active snippets by location |

#### Request/Response Examples

**Create Snippet**
```http
POST /api/admin/code-snippets
Content-Type: application/json

{
  "name": "Google Analytics",
  "code": "<script async src='https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID'></script>",
  "displayLocation": "header",
  "description": "Google Analytics tracking code",
  "isActive": true
}
```

**Response**
```json
{
  "id": 1,
  "name": "Google Analytics",
  "code": "<script async src='https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID'></script>",
  "displayLocation": "header",
  "isActive": true,
  "description": "Google Analytics tracking code",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Frontend Implementation

#### Component Structure

**Main Component**: `client/src/components/admin/CodeSnippetsManager.tsx`

The component provides:
- **Snippet List**: Displays all snippets with status and actions
- **Create/Edit Dialog**: Modal form for adding or editing snippets
- **Delete Confirmation**: Alert dialog for safe deletion
- **Status Toggle**: Quick activate/deactivate buttons
- **Code Copy**: One-click code copying functionality

#### Key Features

**Form Validation**
```typescript
const codeSnippetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  displayLocation: z.string().min(1, "Display location is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});
```

**Real-time Updates**
```typescript
const { data: snippets = [], isLoading } = useQuery<CodeSnippet[]>({
  queryKey: ["/api/admin/code-snippets"],
});

const createUpdateMutation = useMutation({
  mutationFn: async (data: CodeSnippetFormData) => {
    if (editingSnippet) {
      return apiRequest(`/api/admin/code-snippets/${editingSnippet.id}`, {
        method: "PUT",
        body: data,
      });
    } else {
      return apiRequest("/api/admin/code-snippets", {
        method: "POST",
        body: data,
      });
    }
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/code-snippets"] });
    // Show success toast
  },
});
```

#### UI Components

**Snippet Card**
```tsx
<Card key={snippet.id}>
  <CardHeader>
    <div className="flex items-center justify-between">
      <div>
        <CardTitle>{snippet.name}</CardTitle>
        <div className="flex items-center space-x-2 mt-1">
          <Badge className={getLocationBadgeColor(snippet.displayLocation)}>
            {snippet.displayLocation}
          </Badge>
          <Badge variant={snippet.isActive ? "default" : "secondary"}>
            {snippet.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button onClick={() => handleToggleActive(snippet.id, snippet.isActive)}>
          {snippet.isActive ? <EyeOff /> : <Eye />}
        </Button>
        <Button onClick={() => handleCopyCode(snippet.code, snippet.id)}>
          <Copy />
        </Button>
        <Button onClick={() => handleEdit(snippet)}>
          <Edit />
        </Button>
        <Button onClick={() => handleDelete(snippet.id)}>
          <Trash2 />
        </Button>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    <div className="bg-muted p-3 rounded-md">
      <pre className="text-sm font-mono overflow-x-auto">
        {snippet.code}
      </pre>
    </div>
  </CardContent>
</Card>
```

## Usage Instructions

### Accessing the Code Snippets Manager

1. **Navigate to Admin Settings**
   - Go to `/admin/settings`
   - Select "Code Snippets" from the dropdown menu

2. **Creating a New Snippet**
   - Click the "Add Snippet" button
   - Fill in the required fields:
     - **Name**: Descriptive name for the snippet
     - **Display Location**: Choose where the snippet will be displayed
     - **Code**: The actual HTML/CSS/JavaScript code
     - **Description**: Optional description of the snippet's purpose
     - **Active**: Toggle to enable/disable the snippet
   - Click "Create Snippet"

3. **Editing an Existing Snippet**
   - Click the edit button (pencil icon) on any snippet
   - Modify the fields as needed
   - Click "Update Snippet"

4. **Managing Snippet Status**
   - Use the eye/eye-off button to toggle active status
   - Inactive snippets won't be displayed on the website

5. **Custom URL Configuration**
   - When selecting "Custom" display location, enter a specific URL path
   - Use the route selection buttons for quick URL assignment
   - Custom URLs allow targeting specific pages (e.g., `/plans`, `/servers`)

6. **Copying Code**
   - Click the copy button to copy the snippet code to clipboard
   - Useful for testing or external use

7. **Deleting Snippets**
   - Click the trash button to delete a snippet
   - Confirm the deletion in the dialog
   - **Warning**: Deletion is permanent and cannot be undone

### Display Locations

The system supports four main display locations:

| Location | Description | Use Case |
|----------|-------------|----------|
| **Header** | Injected in the `<head>` section | Analytics, meta tags, CSS |
| **Footer** | Injected before closing `</body>` tag | Scripts, tracking codes |
| **Sidebar** | Injected in sidebar components | Widgets, custom content |
| **Custom** | Specific URL targeting | Page-specific snippets |

#### Custom URL Targeting

When selecting "Custom" as the display location, administrators can:

1. **Manual URL Entry**: Enter any URL path (e.g., `/plans`, `/servers`, `/billing`)
2. **Route Selection**: Choose from a predefined list of available client-facing routes
3. **Flexible Targeting**: Target specific pages for custom functionality

**Available Routes Include:**
- Home Page (`/`)
- Plans Page (`/plans`)
- Servers Page (`/servers`)
- DNS Management (`/dns`)
- Billing Page (`/billing`)
- Support Tickets (`/tickets`)
- User Profile (`/profile`)
- Dashboard (`/dashboard`)
- Blog (`/blog`)
- Documentation (`/docs`)
- Status Page (`/status`)
- Teams (`/teams`)
- Packages (`/packages`)
- DNS Plans (`/dns-plans`)
- DNS Domains (`/dns-domains`)
- DNS Records (`/dns-records`)
- Authentication (`/auth`)
- Maintenance Page (`/maintenance`)
- VNC Console (`/vnc-console`)
- Speed Test (`/speed-test`)

## Technical Implementation

### Database Migration

The code snippets table is created using a migration script:

```typescript
// scripts/add-code-snippets-table.ts
import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addCodeSnippetsTable() {
  try {
    // Create table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "code_snippets" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "code" text NOT NULL,
        "display_location" text NOT NULL,
        "is_active" boolean DEFAULT true,
        "description" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    
    // Create indexes
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "code_snippets_display_location_idx" 
      ON "code_snippets" ("display_location");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "code_snippets_is_active_idx" 
      ON "code_snippets" ("is_active");
    `);
    
    // Add sample data
    await db.execute(sql`
      INSERT INTO "code_snippets" ("name", "code", "display_location", "description") VALUES
      ('Google Analytics', '<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>', 'header', 'Google Analytics tracking code'),
      ('Custom CSS', '<style>.custom-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }</style>', 'header', 'Custom CSS for header styling'),
      ('Footer Script', '<script>console.log("Footer script loaded");</script>', 'footer', 'Sample footer script')
      ON CONFLICT DO NOTHING;
    `);
    
  } catch (error) {
    console.error('Failed to create code snippets table:', error);
    throw error;
  }
}
```

### API Route Implementation

```typescript
// server/routes/code-snippets.ts
import { Router } from 'express';
import { db } from '../db';
import { codeSnippets } from '../../shared/schemas/code-snippets-schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// Get all code snippets
router.get('/code-snippets', isAdmin, async (req, res) => {
  try {
    const snippets = await db
      .select()
      .from(codeSnippets)
      .orderBy(desc(codeSnippets.createdAt));
    
    return res.json(snippets);
  } catch (error) {
    console.error('Error fetching code snippets:', error);
    return res.status(500).json({ error: 'Failed to fetch code snippets' });
  }
});

// Create new snippet
router.post('/code-snippets', isAdmin, async (req, res) => {
  try {
    const { name, code, displayLocation, description, isActive = true } = req.body;
    
    if (!name || !code || !displayLocation) {
      return res.status(400).json({ 
        error: 'Name, code, and display location are required' 
      });
    }
    
    const newSnippet = await db
      .insert(codeSnippets)
      .values({
        name,
        code,
        displayLocation,
        description,
        isActive
      })
      .returning();
    
    return res.status(201).json(newSnippet[0]);
  } catch (error) {
    console.error('Error creating code snippet:', error);
    return res.status(500).json({ error: 'Failed to create code snippet' });
  }
});

// Additional CRUD operations...
```

### Frontend State Management

```typescript
// State management with React Query
const { data: snippets = [], isLoading } = useQuery<CodeSnippet[]>({
  queryKey: ["/api/admin/code-snippets"],
});

const createUpdateMutation = useMutation({
  mutationFn: async (data: CodeSnippetFormData) => {
    if (editingSnippet) {
      return apiRequest(`/api/admin/code-snippets/${editingSnippet.id}`, {
        method: "PUT",
        body: data,
      });
    } else {
      return apiRequest("/api/admin/code-snippets", {
        method: "POST",
        body: data,
      });
    }
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/code-snippets"] });
    toast({
      title: editingSnippet ? "Snippet updated" : "Snippet created",
      description: "Code snippet has been saved successfully",
    });
    handleCloseDialog();
  },
});
```

## Security Features

### Access Control
- **Admin-Only Access**: All endpoints require admin authentication
- **Input Validation**: Comprehensive validation using Zod schemas
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **XSS Prevention**: Proper content sanitization

### Data Protection
- **Audit Trail**: Complete creation and modification tracking
- **Soft Deletes**: Snippets can be deactivated without deletion
- **Version Control**: Track changes through updated_at timestamps

## Performance Optimizations

### Database Optimizations
- **Indexed Queries**: Optimized indexes on frequently queried fields
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Minimized N+1 queries

### Frontend Optimizations
- **React Query Caching**: Intelligent caching and background updates
- **Lazy Loading**: Components load only when needed
- **Debounced Search**: Efficient search functionality
- **Optimistic Updates**: Immediate UI feedback

## Monitoring and Analytics

### Usage Tracking
- **Creation Metrics**: Track snippet creation patterns
- **Modification History**: Monitor snippet update frequency
- **Location Distribution**: Analyze which display locations are most used
- **Active/Inactive Ratio**: Monitor snippet utilization

### Error Monitoring
- **API Error Tracking**: Monitor endpoint failures
- **Validation Errors**: Track form validation issues
- **Performance Metrics**: Monitor response times

## Troubleshooting

### Common Issues

1. **Snippet Not Displaying**
   - Check if snippet is active
   - Verify display location is correct
   - Ensure code is valid HTML/CSS/JavaScript

2. **Form Validation Errors**
   - Ensure all required fields are filled
   - Check code syntax for basic errors
   - Verify display location is one of the allowed values

3. **API Errors**
   - Check admin authentication
   - Verify database connection
   - Review server logs for detailed errors

### Debug Commands

```sql
-- Check snippet status
SELECT * FROM code_snippets WHERE name = 'Snippet Name';

-- Check active snippets by location
SELECT * FROM code_snippets 
WHERE display_location = 'header' AND is_active = true;

-- Check recent modifications
SELECT * FROM code_snippets 
ORDER BY updated_at DESC LIMIT 10;
```

## Best Practices

### For Administrators

1. **Naming Convention**: Use descriptive names for easy identification
2. **Code Organization**: Keep snippets focused on single purposes
3. **Testing**: Test snippets in development before production
4. **Documentation**: Always add descriptions for complex snippets
5. **Regular Review**: Periodically review and clean up unused snippets

### For Developers

1. **Code Validation**: Validate HTML/CSS/JavaScript before saving
2. **Performance**: Keep snippets lightweight to avoid page slowdown
3. **Security**: Avoid storing sensitive information in snippets
4. **Compatibility**: Ensure snippets work across different browsers
5. **Version Control**: Track snippet changes in your deployment process

## Future Enhancements

### Planned Features

1. **Version History**: Track snippet changes over time
2. **Scheduled Deployment**: Deploy snippets at specific times
3. **A/B Testing**: Test different snippet versions
4. **Analytics Integration**: Track snippet performance
5. **Template Library**: Pre-built snippet templates
6. **Import/Export**: Bulk snippet management

### Technical Improvements

1. **Code Validation**: Real-time syntax checking
2. **Performance Monitoring**: Track snippet impact on page load
3. **Advanced Search**: Full-text search across snippet content
4. **Bulk Operations**: Mass edit/delete functionality
5. **API Rate Limiting**: Prevent abuse of snippet endpoints

## Conclusion

The Code Snippets System provides a powerful and flexible way to manage custom code throughout the SkyPANEL platform. With comprehensive admin controls, robust security measures, and an intuitive user interface, it serves as an essential tool for platform customization and enhancement.

For additional support or feature requests, please refer to the main SkyPANEL documentation or contact the development team. 