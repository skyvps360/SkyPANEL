# Database Schema

## Overview
This document describes the database schema used by SkyPANEL, including tables, relationships, and important fields. The database uses PostgreSQL with Drizzle ORM for type-safe database access.

## Table of Contents
- [Core Tables](#core-tables)
- [Authentication](#authentication-tables)
- [Server Management](#server-management-tables)
- [Billing](#billing-tables)
- [Support](#support-tables)
- [Relationships](#relationships)
- [Indexes](#indexes)
- [Migrations](#migrations)
- [Backup Strategy](#backup-strategy)

## Core Tables

### Users
Stores user account information.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | string | Unique email address |
| username | string | Unique username |
| password_hash | string | Hashed password |
| first_name | string | User's first name |
| last_name | string | User's last name |
| email_verified | boolean | Email verification status |
| created_at | timestamp | Account creation time |
| updated_at | timestamp | Last update time |
| last_login | timestamp | Last login time |
| status | enum | Account status (active, suspended, etc.) |
| virtfusion_id | string | Reference to VirtFusion user ID |

### Roles
Defines user roles and permissions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | string | Role name (admin, user, etc.) |
| description | string | Role description |
| is_default | boolean | Whether this is the default role |
| permissions | jsonb | JSON array of permissions |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

### UserRoles
Junction table for user-role many-to-many relationship.

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | Foreign key to users.id |
| role_id | UUID | Foreign key to roles.id |
| created_at | timestamp | Assignment time |

## Authentication Tables

### Sessions
Tracks user sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users.id |
| token | string | Session token |
| ip_address | string | Client IP address |
| user_agent | string | Client user agent |
| expires_at | timestamp | Session expiration time |
| created_at | timestamp | Session creation time |
| last_activity | timestamp | Last activity timestamp |

### PasswordResetTokens
Manages password reset requests.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users.id |
| token | string | Unique reset token |
| expires_at | timestamp | Token expiration time |
| used | boolean | Whether token has been used |
| created_at | timestamp | Creation time |

## Server Management Tables

### Servers
Stores information about VPS instances.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | string | Server name |
| hostname | string | Server hostname |
| ip_address | string | Primary IP address |
| status | enum | Server status |
| node_id | string | ID of the node hosting the server |
| user_id | UUID | Owner's user ID |
| package_id | UUID | Reference to package |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |
| deleted_at | timestamp | Soft delete timestamp |

### ServerPackages
Defines available server packages.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | string | Package name |
| cpu_cores | integer | Number of vCPUs |
| memory_mb | integer | Memory in MB |
| disk_gb | integer | Disk space in GB |
| bandwidth_gb | integer | Monthly bandwidth in GB |
| price_monthly | decimal | Monthly price |
| price_hourly | decimal | Hourly price |
| is_active | boolean | Whether package is available |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

## Billing Tables

### Invoices
Stores billing invoices.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users.id |
| amount | decimal | Invoice amount |
| currency | string | Currency code |
| status | enum | Invoice status |
| due_date | date | Payment due date |
| paid_at | timestamp | When payment was received |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

### Transactions
Records financial transactions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| invoice_id | UUID | Optional foreign key to invoices.id |
| user_id | UUID | Foreign key to users.id |
| amount | decimal | Transaction amount |
| currency | string | Currency code |
| gateway | string | Payment gateway used |
| status | enum | Transaction status |
| reference | string | Gateway reference ID |
| metadata | jsonb | Additional transaction data |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

## Support Tables

### Tickets
Manages support tickets.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Ticket creator |
| assigned_to | UUID | Assigned staff member |
| subject | string | Ticket subject |
| status | enum | Ticket status |
| priority | enum | Priority level |
| department | string | Department/category |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |
| closed_at | timestamp | When ticket was closed |

### TicketMessages
Stores messages within tickets.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| ticket_id | UUID | Foreign key to tickets.id |
| user_id | UUID | Message author |
| content | text | Message content |
| is_internal | boolean | Internal note flag |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

## Relationships

### User Relationships
- One-to-Many: User → Servers
- One-to-Many: User → Invoices
- One-to-Many: User → Transactions
- One-to-Many: User → Tickets (as creator)
- One-to-Many: User → TicketMessages
- Many-to-Many: User ↔ Roles (through UserRoles)

### Server Relationships
- Many-to-One: Server → User (owner)
- Many-to-One: Server → ServerPackage

### Billing Relationships
- One-to-Many: Invoice → Transactions
- Many-to-One: Invoice → User
- Many-to-One: Transaction → User
- Many-to-One: Transaction → Invoice (optional)

### Support Relationships
- One-to-Many: Ticket → TicketMessages
- Many-to-One: Ticket → User (creator)
- Many-to-One: Ticket → User (assigned_to)

## Indexes

### Users Table
- Primary Key: id
- Unique: email
- Unique: username
- Index: status
- Index: created_at

### Sessions Table
- Primary Key: id
- Index: user_id
- Index: token (unique)
- Index: expires_at

### Servers Table
- Primary Key: id
- Index: user_id
- Index: status
- Index: node_id
- Index: package_id

### Invoices Table
- Primary Key: id
- Index: user_id
- Index: status
- Index: due_date

### Tickets Table
- Primary Key: id
- Index: user_id
- Index: assigned_to
- Index: status
- Index: priority
- Index: created_at

## Migrations

### Creating Migrations
```bash
# Create new migration
npm run db:migration:create --name=add_feature

# Run migrations
npm run db:migrate

# Rollback last migration
npm run db:rollback
```

### Migration Best Practices
1. Always write idempotent migrations
2. Include up and down methods
3. Add appropriate indexes
4. Include comments for complex operations
5. Test migrations in development first

## Backup Strategy

### Automated Backups
- Nightly full database dumps
- Transaction log shipping
- Offsite backups

### Retention Policy
- 7 daily backups
- 4 weekly backups
- 12 monthly backups

### Recovery Process
1. Identify required recovery point
2. Restore most recent full backup
3. Apply transaction logs
4. Verify data integrity
5. Update application configuration if needed

## Performance Considerations

### Query Optimization
- Use EXPLAIN ANALYZE for slow queries
- Add appropriate indexes
- Avoid N+1 query problems
- Use pagination for large result sets

### Connection Pooling
- Configure appropriate pool size
- Monitor connection usage
- Handle connection timeouts

## Security

### Data Protection
- Encrypt sensitive data at rest
- Use parameterized queries
- Implement row-level security
- Regular security audits

### Access Control
- Principle of least privilege
- Regular permission reviews
- Audit database access
- Monitor for suspicious activity

## Monitoring

### Key Metrics
- Query performance
- Connection pool usage
- Replication lag
- Disk space usage

### Alerting
- Slow query thresholds
- Connection pool exhaustion
- Replication issues
- Backup failures
