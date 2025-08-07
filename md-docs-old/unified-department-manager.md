# Unified Department Manager

## Overview

The Unified Department Manager is a comprehensive system that combines chat departments and support ticket departments into a single, unified management interface. This system provides administrators with a centralized way to manage all support-related departments, ensuring consistency across chat and ticket systems.

## Features

### Unified Interface
- **Single Management Console**: Manage both chat and support departments from one interface
- **Consistent Configuration**: Unified settings for department names, descriptions, and properties
- **Visual Department Cards**: Easy-to-use card-based interface for department management
- **Real-time Updates**: Changes reflect immediately across all systems

### Department Properties
- **Name & Description**: Human-readable department names and descriptions
- **Color Coding**: Brand colors for visual identification
- **Icon Selection**: Lucide icon library for department representation
- **Display Order**: Custom ordering for department lists
- **Active/Inactive Status**: Enable or disable departments as needed
- **Default Department**: Set primary department for new requests
- **VPS Requirements**: Specify if department requires VPS information

### Migration System
- **Legacy Support**: Backward compatibility with existing chat and ticket departments
- **Migration Status**: Real-time migration progress tracking
- **Data Preservation**: Maintain existing department data during migration
- **Rollback Capability**: Ability to revert changes if needed

## Technical Implementation

### Database Schema

The unified department system uses the `support_departments` table:

```sql
CREATE TABLE "support_departments" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL UNIQUE,
  "description" text,
  "is_default" boolean DEFAULT false,
  "requires_vps" boolean DEFAULT false,
  "is_active" boolean DEFAULT true,
  "display_order" integer DEFAULT 0,
  "color" text DEFAULT '#3b82f6',
  "icon" text DEFAULT 'MessageCircle',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
```

### API Endpoints

#### Admin Department Management
```bash
GET    /api/admin/unified-departments     # List all departments
POST   /api/admin/unified-departments     # Create new department
PUT    /api/admin/unified-departments/:id # Update department
DELETE /api/admin/unified-departments/:id # Delete department
```

#### Migration Management
```bash
GET    /api/admin/department-migration/status    # Get migration status
POST   /api/admin/department-migration/start     # Start migration
POST   /api/admin/department-migration/rollback  # Rollback migration
```

#### Public Department Access
```bash
GET    /api/departments                  # Get active departments for users
GET    /api/departments/:id              # Get specific department details
```

### Component Architecture

#### Frontend Components
- **UnifiedDepartmentManager**: Main management interface
- **DepartmentCard**: Individual department display
- **DepartmentForm**: Create/edit department form
- **MigrationStatus**: Migration progress indicator

#### Backend Services
- **DepartmentService**: Core department management logic
- **MigrationService**: Handles legacy department migration
- **ValidationService**: Ensures data integrity

## Usage Guide

### For Administrators

#### Creating a New Department
1. Navigate to **Admin → Settings → Department Management**
2. Click **"Create New Department"**
3. Fill in department details:
   - **Name**: Human-readable department name
   - **Description**: Detailed description of department purpose
   - **Color**: Brand color for visual identification
   - **Icon**: Lucide icon for department representation
   - **Display Order**: Position in department list
   - **Requires VPS**: Check if department needs VPS information
4. Click **"Create Department"**

#### Managing Existing Departments
1. View all departments in the unified interface
2. Click **"Edit"** on any department card
3. Modify department properties as needed
4. Click **"Save Changes"** to update

#### Migration Management
1. Check migration status in the management interface
2. Start migration to unify legacy departments
3. Monitor migration progress
4. Rollback if needed

### For Users

#### Selecting Departments
1. When creating a support ticket, select from available departments
2. When starting a chat, choose the appropriate department
3. Department selection affects routing and support staff assignment

#### Department Information
- Department names and descriptions are visible to users
- Color coding helps identify department types
- Icons provide visual context for department purpose

## Configuration Options

### Department Properties

#### Basic Settings
- **Name**: Required, unique department identifier
- **Description**: Optional, detailed department description
- **Active Status**: Enable/disable department availability
- **Default Department**: Set as primary for new requests

#### Visual Settings
- **Color**: Hex color code for department branding
- **Icon**: Lucide icon name for visual representation
- **Display Order**: Integer for sorting departments

#### Functional Settings
- **Requires VPS**: Boolean for VPS-related departments
- **Migration Status**: Track legacy department migration

### Migration Settings

#### Migration Options
- **Auto-migrate**: Automatically migrate legacy departments
- **Manual Migration**: Step-by-step migration process
- **Rollback Support**: Ability to revert migration changes

#### Data Preservation
- **Legacy Data**: Maintain existing department relationships
- **User Preferences**: Preserve user department selections
- **Historical Data**: Keep existing ticket and chat associations

## Integration Points

### Chat System Integration
- **Department Routing**: Route chat sessions to appropriate departments
- **Admin Assignment**: Assign admins based on department
- **Department Filtering**: Filter chats by department

### Support Ticket Integration
- **Ticket Creation**: Associate tickets with departments
- **Department Filtering**: Filter tickets by department
- **Admin Assignment**: Route tickets to department admins

### Discord Integration
- **Thread Creation**: Create Discord threads for department-specific discussions
- **Channel Mapping**: Map departments to Discord channels
- **Notification Routing**: Route notifications to appropriate channels

## Security Considerations

### Access Control
- **Admin Only**: Department management restricted to administrators
- **Role-based Access**: Different permission levels for department management
- **Audit Logging**: Track all department changes and modifications

### Data Validation
- **Input Validation**: Validate all department data inputs
- **Unique Constraints**: Ensure department names are unique
- **Referential Integrity**: Maintain data consistency across systems

### Migration Safety
- **Backup Procedures**: Backup existing data before migration
- **Rollback Capability**: Ability to revert migration changes
- **Testing Environment**: Test migrations in staging environment

## Troubleshooting

### Common Issues

#### Migration Problems
- **Legacy Data Conflicts**: Resolve conflicts between old and new department systems
- **Data Loss Prevention**: Ensure no data is lost during migration
- **Rollback Procedures**: Follow proper rollback procedures if needed

#### Department Management Issues
- **Duplicate Names**: Ensure department names are unique
- **Inactive Departments**: Check if departments are properly activated
- **Display Order**: Verify department ordering is correct

#### Integration Issues
- **Chat Routing**: Verify chat sessions are routed to correct departments
- **Ticket Assignment**: Ensure tickets are assigned to proper departments
- **Discord Sync**: Check Discord integration for department changes

### Debugging Tools

#### Migration Status
```bash
# Check migration status
GET /api/admin/department-migration/status

# View migration logs
GET /api/admin/department-migration/logs
```

#### Department Validation
```bash
# Validate department configuration
GET /api/admin/unified-departments/validate

# Check department relationships
GET /api/admin/unified-departments/relationships
```

## Best Practices

### Department Design
- **Clear Naming**: Use descriptive, user-friendly department names
- **Logical Grouping**: Group related support topics into departments
- **Consistent Branding**: Use consistent colors and icons for similar departments

### Migration Planning
- **Staged Migration**: Migrate departments in stages to minimize disruption
- **User Communication**: Inform users about department changes
- **Testing**: Test migration procedures in staging environment

### Maintenance
- **Regular Review**: Periodically review and update department configurations
- **Performance Monitoring**: Monitor department usage and performance
- **User Feedback**: Gather user feedback on department effectiveness

## Future Enhancements

### Planned Features
- **Department Analytics**: Usage statistics and performance metrics
- **Advanced Routing**: AI-powered department routing
- **Custom Workflows**: Department-specific workflow customization
- **Multi-language Support**: Internationalized department names and descriptions

### Integration Improvements
- **Enhanced Discord Integration**: More sophisticated Discord channel management
- **Mobile Optimization**: Improved mobile department selection
- **API Enhancements**: Additional API endpoints for third-party integration

---

This documentation provides a comprehensive overview of the Unified Department Manager system. For technical implementation details, refer to the source code and API documentation. 