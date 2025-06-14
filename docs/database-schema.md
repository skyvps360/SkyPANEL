# SkyPANEL Database Schema Documentation

This document provides a comprehensive overview of the SkyPANEL database schema, including tables, relationships, indexes, and constraints. It serves as a reference for developers working with the database structure.

## Table of Contents

1. [Database Overview](#database-overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Core Tables](#core-tables)
   - [Users](#users)
   - [Servers](#servers)
   - [Billing](#billing)
   - [DNS](#dns)
   - [Support](#support)
4. [Authentication Tables](#authentication-tables)
5. [Configuration Tables](#configuration-tables)
6. [Logging and Monitoring Tables](#logging-and-monitoring-tables)
7. [Relationship Details](#relationship-details)
8. [Indexes and Performance](#indexes-and-performance)
9. [Database Migrations](#database-migrations)
10. [Best Practices](#best-practices)

## Database Overview

SkyPANEL uses PostgreSQL as its primary database, with Drizzle ORM for database interactions. The schema is defined in TypeScript using Drizzle's schema definition syntax in the `/shared/schema.ts` file.

The database is organized into several logical groups of tables:

- **Core Tables**: Essential tables for the main functionality
- **Authentication Tables**: Tables related to user authentication and authorization
- **Configuration Tables**: System and user configuration settings
- **Logging and Monitoring Tables**: Audit logs and monitoring data

## Entity Relationship Diagram

The database schema can be visualized in the following entity relationship diagram:

```
[Note: This is a simplified representation. For the complete ERD, refer to the diagrams/SkyPANEL-Database-Schema.xml file]

+-------------+       +-------------+       +----------------+
|    users    |------>|   servers   |------>|  server_stats  |
+-------------+       +-------------+       +----------------+
      |                     |
      |                     |
      v                     v
+-------------+       +-------------+
| user_profile|       |server_backups|
+-------------+       +-------------+
      |
      |
      v
+-------------+       +-------------+       +----------------+
|  invoices   |------>| transactions|------>|  invoice_items |
+-------------+       +-------------+       +----------------+
      |
      |
      v
+-------------+       +-------------+
| dns_domains |------>| dns_records |
+-------------+       +-------------+
      |
      |
      v
+-------------+       +-------------+
|   tickets   |------>|ticket_replies|
+-------------+       +-------------+
```

## Core Tables

### Users

The users table is the central entity in the database, representing user accounts in the system.

#### users

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| username | varchar(255) | User's login name | UNIQUE, NOT NULL |
| email | varchar(255) | User's email address | UNIQUE, NOT NULL |
| password_hash | varchar(255) | Bcrypt hashed password | NOT NULL |
| role | enum | User role (user, admin, support) | NOT NULL, DEFAULT 'user' |
| status | enum | Account status (active, suspended, pending) | NOT NULL, DEFAULT 'pending' |
| email_verified | boolean | Whether email is verified | NOT NULL, DEFAULT false |
| created_at | timestamp | Account creation time | NOT NULL, DEFAULT now() |
| updated_at | timestamp | Last update time | NOT NULL, DEFAULT now() |
| last_login | timestamp | Last login time | NULL |

#### user_profile

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| user_id | integer | Reference to users table | FOREIGN KEY, NOT NULL |
| first_name | varchar(255) | User's first name | NULL |
| last_name | varchar(255) | User's last name | NULL |
| company | varchar(255) | User's company | NULL |
| address | text | User's address | NULL |
| city | varchar(255) | User's city | NULL |
| state | varchar(255) | User's state/province | NULL |
| country | varchar(255) | User's country | NULL |
| postal_code | varchar(20) | User's postal/zip code | NULL |
| phone | varchar(20) | User's phone number | NULL |
| avatar_url | varchar(255) | URL to user's avatar | NULL |
| created_at | timestamp | Record creation time | NOT NULL, DEFAULT now() |
| updated_at | timestamp | Last update time | NOT NULL, DEFAULT now() |

### Servers

Tables related to virtual server management.

#### servers

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| user_id | integer | Reference to users table | FOREIGN KEY, NOT NULL |
| name | varchar(255) | Server name | NOT NULL |
| virtfusion_id | varchar(255) | ID in VirtFusion system | UNIQUE, NULL |
| status | enum | Server status (running, stopped, suspended) | NOT NULL, DEFAULT 'provisioning' |
| package_id | integer | Reference to packages table | FOREIGN KEY, NOT NULL |
| location_id | integer | Reference to locations table | FOREIGN KEY, NOT NULL |
| ip_address | varchar(45) | Primary IP address | NULL |
| os_id | integer | Reference to operating_systems table | FOREIGN KEY, NOT NULL |
| cpu | integer | Number of CPU cores | NOT NULL |
| memory | integer | Memory in MB | NOT NULL |
| disk | integer | Disk space in GB | NOT NULL |
| bandwidth | integer | Bandwidth in GB | NOT NULL |
| created_at | timestamp | Server creation time | NOT NULL, DEFAULT now() |
| updated_at | timestamp | Last update time | NOT NULL, DEFAULT now() |
| next_due_date | timestamp | Next billing date | NULL |

#### server_stats

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| server_id | integer | Reference to servers table | FOREIGN KEY, NOT NULL |
| cpu_usage | float | CPU usage percentage | NOT NULL, DEFAULT 0 |
| memory_usage | float | Memory usage percentage | NOT NULL, DEFAULT 0 |
| disk_usage | float | Disk usage percentage | NOT NULL, DEFAULT 0 |
| bandwidth_usage | float | Bandwidth usage in GB | NOT NULL, DEFAULT 0 |
| uptime | integer | Uptime in seconds | NOT NULL, DEFAULT 0 |
| timestamp | timestamp | When stats were collected | NOT NULL, DEFAULT now() |

#### server_backups

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| server_id | integer | Reference to servers table | FOREIGN KEY, NOT NULL |
| name | varchar(255) | Backup name | NOT NULL |
| status | enum | Backup status (pending, completed, failed) | NOT NULL, DEFAULT 'pending' |
| size | bigint | Backup size in bytes | NULL |
| created_at | timestamp | Backup creation time | NOT NULL, DEFAULT now() |
| completed_at | timestamp | When backup completed | NULL |
| notes | text | Backup notes | NULL |

### Billing

Tables related to billing, invoices, and transactions.

#### invoices

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| user_id | integer | Reference to users table | FOREIGN KEY, NOT NULL |
| status | enum | Invoice status (pending, paid, overdue) | NOT NULL, DEFAULT 'pending' |
| amount | decimal(10,2) | Total invoice amount | NOT NULL |
| due_date | timestamp | Payment due date | NOT NULL |
| paid_date | timestamp | When invoice was paid | NULL |
| created_at | timestamp | Invoice creation time | NOT NULL, DEFAULT now() |
| updated_at | timestamp | Last update time | NOT NULL, DEFAULT now() |
| notes | text | Invoice notes | NULL |

#### invoice_items

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| invoice_id | integer | Reference to invoices table | FOREIGN KEY, NOT NULL |
| description | varchar(255) | Item description | NOT NULL |
| amount | decimal(10,2) | Item amount | NOT NULL |
| quantity | integer | Item quantity | NOT NULL, DEFAULT 1 |
| type | enum | Item type (server, dns, credit, other) | NOT NULL |
| server_id | integer | Reference to servers table | FOREIGN KEY, NULL |
| created_at | timestamp | Record creation time | NOT NULL, DEFAULT now() |

#### transactions

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| user_id | integer | Reference to users table | FOREIGN KEY, NOT NULL |
| invoice_id | integer | Reference to invoices table | FOREIGN KEY, NULL |
| amount | decimal(10,2) | Transaction amount | NOT NULL |
| type | enum | Transaction type (payment, refund, credit) | NOT NULL |
| status | enum | Transaction status (completed, pending, failed) | NOT NULL, DEFAULT 'completed' |
| gateway | varchar(255) | Payment gateway used | NOT NULL |
| gateway_transaction_id | varchar(255) | Transaction ID from gateway | NULL |
| created_at | timestamp | Transaction time | NOT NULL, DEFAULT now() |
| notes | text | Transaction notes | NULL |

#### user_credit

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| user_id | integer | Reference to users table | FOREIGN KEY, NOT NULL, UNIQUE |
| balance | decimal(10,2) | Current credit balance | NOT NULL, DEFAULT 0 |
| updated_at | timestamp | Last update time | NOT NULL, DEFAULT now() |

### DNS

Tables related to DNS management.

#### dns_domains

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| user_id | integer | Reference to users table | FOREIGN KEY, NOT NULL |
| name | varchar(255) | Domain name | NOT NULL, UNIQUE |
| status | enum | Domain status (active, pending, suspended) | NOT NULL, DEFAULT 'pending' |
| plan_id | integer | Reference to dns_plans table | FOREIGN KEY, NOT NULL |
| created_at | timestamp | Domain creation time | NOT NULL, DEFAULT now() |
| updated_at | timestamp | Last update time | NOT NULL, DEFAULT now() |
| expires_at | timestamp | Domain expiration time | NULL |

#### dns_records

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| domain_id | integer | Reference to dns_domains table | FOREIGN KEY, NOT NULL |
| type | enum | Record type (A, AAAA, CNAME, MX, TXT, etc.) | NOT NULL |
| name | varchar(255) | Record name | NOT NULL |
| content | text | Record content/value | NOT NULL |
| ttl | integer | Time to live in seconds | NOT NULL, DEFAULT 3600 |
| priority | integer | Priority (for MX, SRV records) | NULL |
| created_at | timestamp | Record creation time | NOT NULL, DEFAULT now() |
| updated_at | timestamp | Last update time | NOT NULL, DEFAULT now() |

#### dns_plans

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| name | varchar(255) | Plan name | NOT NULL |
| description | text | Plan description | NULL |
| max_domains | integer | Maximum number of domains | NOT NULL |
| max_records_per_domain | integer | Maximum records per domain | NOT NULL |
| price | decimal(10,2) | Plan price | NOT NULL |
| billing_cycle | enum | Billing cycle (monthly, yearly) | NOT NULL, DEFAULT 'monthly' |
| created_at | timestamp | Plan creation time | NOT NULL, DEFAULT now() |
| updated_at | timestamp | Last update time | NOT NULL, DEFAULT now() |

### Support

Tables related to support tickets and communication.

#### tickets

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| user_id | integer | Reference to users table | FOREIGN KEY, NOT NULL |
| subject | varchar(255) | Ticket subject | NOT NULL |
| status | enum | Ticket status (open, answered, closed) | NOT NULL, DEFAULT 'open' |
| priority | enum | Ticket priority (low, medium, high) | NOT NULL, DEFAULT 'medium' |
| department_id | integer | Reference to departments table | FOREIGN KEY, NOT NULL |
| created_at | timestamp | Ticket creation time | NOT NULL, DEFAULT now() |
| updated_at | timestamp | Last update time | NOT NULL, DEFAULT now() |
| closed_at | timestamp | When ticket was closed | NULL |

#### ticket_replies

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| ticket_id | integer | Reference to tickets table | FOREIGN KEY, NOT NULL |
| user_id | integer | Reference to users table | FOREIGN KEY, NOT NULL |
| message | text | Reply message | NOT NULL |
| is_staff | boolean | Whether reply is from staff | NOT NULL, DEFAULT false |
| created_at | timestamp | Reply time | NOT NULL, DEFAULT now() |
| attachment_url | varchar(255) | URL to attachment | NULL |

## Authentication Tables

Tables related to authentication and authorization.

#### sessions

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| sid | varchar(255) | Session ID | PRIMARY KEY |
| sess | json | Session data | NOT NULL |
| expire | timestamp | Session expiration time | NOT NULL |

#### password_reset_tokens

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| user_id | integer | Reference to users table | FOREIGN KEY, NOT NULL |
| token | varchar(255) | Reset token | NOT NULL, UNIQUE |
| expires_at | timestamp | Token expiration time | NOT NULL |
| created_at | timestamp | Token creation time | NOT NULL, DEFAULT now() |
| used | boolean | Whether token has been used | NOT NULL, DEFAULT false |

#### email_verification_tokens

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| user_id | integer | Reference to users table | FOREIGN KEY, NOT NULL |
| token | varchar(255) | Verification token | NOT NULL, UNIQUE |
| expires_at | timestamp | Token expiration time | NOT NULL |
| created_at | timestamp | Token creation time | NOT NULL, DEFAULT now() |
| used | boolean | Whether token has been used | NOT NULL, DEFAULT false |

#### api_keys

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| user_id | integer | Reference to users table | FOREIGN KEY, NOT NULL |
| name | varchar(255) | Key name/description | NOT NULL |
| key | varchar(255) | API key value (hashed) | NOT NULL, UNIQUE |
| permissions | json | Key permissions | NOT NULL, DEFAULT '{}' |
| created_at | timestamp | Key creation time | NOT NULL, DEFAULT now() |
| expires_at | timestamp | Key expiration time | NULL |
| last_used_at | timestamp | When key was last used | NULL |

## Configuration Tables

Tables for system and user configuration.

#### settings

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| key | varchar(255) | Setting key | NOT NULL, UNIQUE |
| value | text | Setting value | NULL |
| type | enum | Value type (string, number, boolean, json) | NOT NULL, DEFAULT 'string' |
| created_at | timestamp | Setting creation time | NOT NULL, DEFAULT now() |
| updated_at | timestamp | Last update time | NOT NULL, DEFAULT now() |

#### user_settings

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| user_id | integer | Reference to users table | FOREIGN KEY, NOT NULL |
| key | varchar(255) | Setting key | NOT NULL |
| value | text | Setting value | NULL |
| created_at | timestamp | Setting creation time | NOT NULL, DEFAULT now() |
| updated_at | timestamp | Last update time | NOT NULL, DEFAULT now() |

#### packages

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| name | varchar(255) | Package name | NOT NULL |
| description | text | Package description | NULL |
| cpu | integer | Number of CPU cores | NOT NULL |
| memory | integer | Memory in MB | NOT NULL |
| disk | integer | Disk space in GB | NOT NULL |
| bandwidth | integer | Bandwidth in GB | NOT NULL |
| price_monthly | decimal(10,2) | Monthly price | NOT NULL |
| price_quarterly | decimal(10,2) | Quarterly price | NULL |
| price_semiannually | decimal(10,2) | Semi-annual price | NULL |
| price_annually | decimal(10,2) | Annual price | NULL |
| created_at | timestamp | Package creation time | NOT NULL, DEFAULT now() |
| updated_at | timestamp | Last update time | NOT NULL, DEFAULT now() |

#### locations

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| name | varchar(255) | Location name | NOT NULL |
| country | varchar(255) | Country | NOT NULL |
| city | varchar(255) | City | NOT NULL |
| status | enum | Location status (active, maintenance, full) | NOT NULL, DEFAULT 'active' |
| created_at | timestamp | Location creation time | NOT NULL, DEFAULT now() |
| updated_at | timestamp | Last update time | NOT NULL, DEFAULT now() |

#### operating_systems

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| name | varchar(255) | OS name | NOT NULL |
| version | varchar(255) | OS version | NOT NULL |
| type | enum | OS type (linux, windows) | NOT NULL |
| virtfusion_id | varchar(255) | ID in VirtFusion system | NULL |
| created_at | timestamp | OS creation time | NOT NULL, DEFAULT now() |
| updated_at | timestamp | Last update time | NOT NULL, DEFAULT now() |

## Logging and Monitoring Tables

Tables for logging and monitoring.

#### activity_logs

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| user_id | integer | Reference to users table | FOREIGN KEY, NULL |
| action | varchar(255) | Action performed | NOT NULL |
| entity_type | varchar(255) | Entity type (user, server, etc.) | NULL |
| entity_id | integer | Entity ID | NULL |
| ip_address | varchar(45) | IP address | NULL |
| user_agent | text | User agent | NULL |
| details | json | Additional details | NULL |
| created_at | timestamp | Log time | NOT NULL, DEFAULT now() |

#### email_logs

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| user_id | integer | Reference to users table | FOREIGN KEY, NULL |
| to_email | varchar(255) | Recipient email | NOT NULL |
| subject | varchar(255) | Email subject | NOT NULL |
| body | text | Email body | NULL |
| status | enum | Email status (sent, failed, queued) | NOT NULL, DEFAULT 'queued' |
| error | text | Error message if failed | NULL |
| created_at | timestamp | Log time | NOT NULL, DEFAULT now() |
| sent_at | timestamp | When email was sent | NULL |

#### notifications

| Column | Type | Description | Constraints |
|--------|------|-------------|------------|
| id | serial | Primary key | PRIMARY KEY |
| user_id | integer | Reference to users table | FOREIGN KEY, NOT NULL |
| title | varchar(255) | Notification title | NOT NULL |
| message | text | Notification message | NOT NULL |
| type | enum | Notification type (info, warning, error) | NOT NULL, DEFAULT 'info' |
| read | boolean | Whether notification is read | NOT NULL, DEFAULT false |
| link | varchar(255) | Related link | NULL |
| created_at | timestamp | Notification time | NOT NULL, DEFAULT now() |
| read_at | timestamp | When notification was read | NULL |

## Relationship Details

This section describes the key relationships between tables in the database.

### One-to-One Relationships

- **users** ↔ **user_profile**: Each user has one profile
- **users** ↔ **user_credit**: Each user has one credit balance record

### One-to-Many Relationships

- **users** → **servers**: One user can have many servers
- **users** → **invoices**: One user can have many invoices
- **users** → **transactions**: One user can have many transactions
- **users** → **dns_domains**: One user can have many DNS domains
- **users** → **tickets**: One user can have many support tickets
- **servers** → **server_stats**: One server can have many stat records
- **servers** → **server_backups**: One server can have many backups
- **invoices** → **invoice_items**: One invoice can have many items
- **dns_domains** → **dns_records**: One domain can have many DNS records
- **tickets** → **ticket_replies**: One ticket can have many replies

### Many-to-One Relationships

- **servers** → **packages**: Many servers can use the same package
- **servers** → **locations**: Many servers can be in the same location
- **servers** → **operating_systems**: Many servers can use the same OS
- **dns_domains** → **dns_plans**: Many domains can use the same DNS plan
- **tickets** → **departments**: Many tickets can be assigned to the same department

## Indexes and Performance

The database uses several indexes to optimize query performance:

### Primary Key Indexes

All tables have primary key indexes on their `id` columns (or equivalent primary key).

### Foreign Key Indexes

Foreign key columns are indexed to improve join performance:

- `user_id` columns in all tables that reference users
- `server_id` columns in tables that reference servers
- `invoice_id` columns in tables that reference invoices
- `domain_id` columns in tables that reference dns_domains
- `ticket_id` columns in tables that reference tickets

### Additional Indexes

- **users**: Indexes on `username` and `email` for login and lookup operations
- **servers**: Index on `virtfusion_id` for integration lookups
- **invoices**: Indexes on `status` and `due_date` for filtering and sorting
- **dns_domains**: Index on `name` for domain lookups
- **dns_records**: Composite index on `domain_id` and `type` for filtered queries
- **activity_logs**: Indexes on `user_id`, `action`, and `created_at` for filtering and reporting
- **sessions**: Index on `expire` for session cleanup

## Database Migrations

SkyPANEL uses Drizzle Kit for database migrations. Migrations are stored in the `/migrations` directory and are applied automatically during deployment.

### Creating Migrations

To create a new migration:

```bash
npx drizzle-kit generate:pg
```

This will generate migration files based on the changes to the schema definition.

### Applying Migrations

To apply migrations:

```bash
node migrations/migrate.js
```

### Rolling Back Migrations

To roll back migrations:

```bash
node migrations/rollback.js
```

## Best Practices

When working with the SkyPANEL database:

1. **Use the ORM**: Always use Drizzle ORM for database operations to ensure type safety and consistent queries.

2. **Transactions**: Use transactions for operations that modify multiple tables to ensure data consistency.

3. **Schema Changes**: Always create migrations for schema changes rather than modifying the database directly.

4. **Query Optimization**: Use indexes appropriately and optimize queries for performance.

5. **Data Validation**: Validate data before inserting or updating records, even though the database has constraints.

6. **Sensitive Data**: Never store sensitive data (like passwords) in plain text. Use appropriate hashing and encryption.

7. **Backups**: Regularly backup the database, especially before major changes or migrations.

8. **Connection Pooling**: Use connection pooling in production to manage database connections efficiently.

---

This documentation provides a comprehensive overview of the SkyPANEL database schema. For more detailed information about specific tables or relationships, refer to the schema definition in `/shared/schema.ts`.