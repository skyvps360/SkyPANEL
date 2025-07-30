# Team Management System

## Overview

The Team Management system allows administrators to manage and display team members on the public teams page. It integrates with Discord for user data and provides admin controls for roles, descriptions, and visibility.

## Features

- **Discord Integration**: Pull team members from Discord
- **Custom Display**: Optional display names and avatars
- **Role Management**: Assign roles like CEO, Developer
- **About Sections**: Editable team member descriptions
- **Ordering**: Custom display order
- **Active Status**: Toggle visibility
- **Public Page**: Display team on /teams

## Database Schema

### Team Members Table
```sql
CREATE TABLE \"team_members\" (
  \"id\" serial PRIMARY KEY NOT NULL,
  \"discord_user_id\" text NOT NULL UNIQUE,
  \"discord_username\" text NOT NULL,
  \"display_name\" text,  // Optional custom name
  \"discord_avatar_url\" text,
  \"role\" text NOT NULL,
  \"about_me\" text,
  \"display_order\" integer DEFAULT 0,
  \"is_active\" boolean DEFAULT true NOT NULL,
  \"created_at\" timestamp DEFAULT now() NOT NULL,
  \"updated_at\" timestamp DEFAULT now() NOT NULL,
  \"created_by\" integer REFERENCES users(id),
  \"updated_by\" integer REFERENCES users(id)
);
```

## Implementation

### Backend
- Routes in server/routes_new.ts for CRUD
- API endpoints: /api/admin/team
- Discord user search integration
- Validation with Zod schemas

### Frontend (client/src/components/admin/TeamManagement.tsx)
- Team list with search
- Add/edit dialogs
- Discord user selector
- Role dropdown
- Active toggle
- Delete confirmation

### Public Display (client/src/pages/teams/index.tsx)
- TeamCards component
- Sorted by display order
- Shows name, role, about
- Discord avatar integration

## Usage

### Adding Team Member
1. Search Discord username
2. Select user
3. Set role and about
4. Adjust order
5. Save

### Editing
- Click edit icon
- Update fields
- Toggle active

### Public View
- Active members shown
- Ordered by display_order
- Responsive card layout

For Discord specifics, see discord-integration.md"