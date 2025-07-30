# Bring Your Own Server (BYOS) System

## Overview

The BYOS feature allows users to connect and manage their own servers through SkyPANEL, similar to Ploi or Laravel Forge. It provides a unified interface for managing both VirtFusion and user-provided servers.

## Features

- **Server Registration**: Add custom servers via SSH
- **Dashboard Management**: User page at /byos
- **Admin Oversight**: Admin page at /admin/byos
- **SSH Integration**: Secure access and automation
- **Installation Scripts**: Automated software setup
- **Brand Theming**: Consistent UI integration
- **Monitoring**: Server status and metrics

## Architecture

### Database Schema
Dedicated tables for BYOS servers, separate from VirtFusion servers.

- byos_servers table
- ssh_keys table
- server_installations table

### Components

1. **Frontend**
   - /byos: User dashboard for managing servers
   - Server addition form with SSH verification
   - Status monitoring cards
   - Action buttons (install, monitor, etc.)

2. **Backend**
   - Routes for server management
   - SSH connection handling
   - Installation script execution
   - Status polling service

3. **Admin Interface**
   - /admin/byos: Overview of all user servers
   - Search and filtering
   - Detailed server views
   - Access controls

## Implementation

### Server Addition Flow
1. User provides server details (IP, SSH port, credentials)
2. System verifies SSH connection
3. Generates/stores SSH keys
4. Runs installation scripts
5. Adds server to database
6. Enables monitoring

### Installation Scripts
- Automated setup of required software
- Configuration for SkyPANEL integration
- Security hardening
- Monitoring agent installation

## Security

- SSH key-based authentication
- Encrypted credential storage
- Access logging
- Permission checks
- Rate limiting on actions

## Usage

### For Users
1. Navigate to /byos
2. Click 'Add Server'
3. Enter details and submit
4. Wait for verification/installation
5. Manage server from dashboard

### For Admins
1. Go to /admin/byos
2. View all user servers
3. Search by user/server
4. Access detailed logs

For related features, see monitoring-observability.md"