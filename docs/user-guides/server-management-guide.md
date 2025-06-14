# SkyPANEL Server Management Guide

This guide provides detailed instructions for managing your virtual servers in SkyPANEL, including day-to-day operations, monitoring, maintenance, and troubleshooting.

## Table of Contents

1. [Server Dashboard Overview](#server-dashboard-overview)
2. [Basic Server Operations](#basic-server-operations)
3. [Accessing Your Server](#accessing-your-server)
4. [Monitoring Server Performance](#monitoring-server-performance)
5. [Server Maintenance](#server-maintenance)
6. [Networking Configuration](#networking-configuration)
7. [Backups and Snapshots](#backups-and-snapshots)
8. [Operating System Management](#operating-system-management)
9. [Troubleshooting Common Issues](#troubleshooting-common-issues)
10. [Advanced Server Management](#advanced-server-management)

## Server Dashboard Overview

The server dashboard provides a comprehensive view of your server's status, performance, and configuration.

### Accessing the Server Dashboard

1. Log in to your SkyPANEL account
2. Navigate to "Servers" in the main menu
3. Click on the server name in your server list

### Dashboard Elements

- **Server Status Indicator**: Shows if your server is running, stopped, or in maintenance
- **Resource Usage Graphs**: Real-time and historical data for CPU, memory, disk, and network
- **Server Information Panel**: Displays server specifications, IP addresses, and operating system details
- **Action Buttons**: Quick access to common operations (start, stop, restart, etc.)
- **Console Access**: Button to launch the browser-based console
- **Alert Notifications**: Any warnings or alerts related to your server
- **Server Settings**: Configuration options for your server

## Basic Server Operations

### Starting a Server

1. Navigate to your server's dashboard
2. Click the "Start" button in the action panel
3. Confirm the action if prompted
4. The server status will change to "Starting" and then "Running"
5. This process typically takes 30-60 seconds

### Stopping a Server

1. Navigate to your server's dashboard
2. Click the "Stop" button in the action panel
3. Choose between:
   - **Soft Stop**: Sends a shutdown signal to the operating system (recommended)
   - **Hard Stop**: Forces an immediate shutdown (use only when necessary)
4. Confirm the action
5. The server status will change to "Stopping" and then "Stopped"

### Restarting a Server

1. Navigate to your server's dashboard
2. Click the "Restart" button in the action panel
3. Choose between:
   - **Soft Restart**: Graceful shutdown and restart (recommended)
   - **Hard Restart**: Forces an immediate restart (use only when necessary)
4. Confirm the action
5. The server status will change to "Restarting" and then "Running"

### Resizing a Server

1. Navigate to your server's dashboard
2. Click the "Resize" button in the action panel
3. Select a new server package with different resources
4. Review the price difference and confirmation details
5. Confirm the resize operation
6. Note: Resizing typically requires a server restart

## Accessing Your Server

### Using the Web Console

1. Navigate to your server's dashboard
2. Click the "Console" button
3. A new browser window or tab will open with the VNC console
4. Log in using your server credentials
5. The console provides full keyboard and mouse access to your server

### SSH Access (Linux Servers)

1. Obtain your server's IP address from the dashboard
2. Open your preferred SSH client (Terminal, PuTTY, etc.)
3. Connect using the command: `ssh username@your-server-ip`
4. Enter your password when prompted
5. For enhanced security, consider setting up SSH keys:
   - Generate SSH keys on your local machine
   - Add your public key to the server's `~/.ssh/authorized_keys` file
   - Connect without a password using your private key

### RDP Access (Windows Servers)

1. Obtain your server's IP address from the dashboard
2. Open Remote Desktop Connection (Windows) or Microsoft Remote Desktop (Mac)
3. Enter your server's IP address
4. Provide your Windows username and password
5. Connect to your server
6. Tip: Configure RDP settings for optimal performance based on your connection speed

## Monitoring Server Performance

### Resource Usage Monitoring

1. Navigate to your server's dashboard
2. View the real-time resource usage graphs:
   - **CPU Usage**: Percentage of CPU resources being utilized
   - **Memory Usage**: RAM consumption in GB and percentage
   - **Disk Usage**: Storage space used and available
   - **Network Traffic**: Inbound and outbound data transfer

### Setting Up Alerts

1. Navigate to your server's dashboard
2. Click on "Alerts" or "Monitoring" in the server settings
3. Configure threshold-based alerts for:
   - High CPU usage (e.g., above 90% for more than 5 minutes)
   - Memory constraints (e.g., above 85% usage)
   - Disk space warnings (e.g., less than 10% free space)
   - Network traffic spikes
4. Choose notification methods (email, SMS, in-app)
5. Set the alert frequency and conditions

### Viewing Historical Performance

1. Navigate to your server's dashboard
2. Click on the "Performance History" or "Metrics" tab
3. Select the time period you want to analyze:
   - Last 24 hours
   - Last 7 days
   - Last 30 days
   - Custom range
4. Review the graphs to identify patterns or issues
5. Export data as CSV if needed for further analysis

## Server Maintenance

### Updating Your Operating System

#### Linux Servers

1. Connect to your server via SSH or web console
2. For Ubuntu/Debian systems:
   ```bash
   sudo apt update
   sudo apt upgrade -y
   ```
3. For CentOS/RHEL systems:
   ```bash
   sudo yum update -y
   ```
4. Restart services or the server if required

#### Windows Servers

1. Connect to your server via RDP or web console
2. Open Windows Update from the Control Panel or Settings
3. Check for updates
4. Download and install available updates
5. Restart when prompted or schedule a restart for off-peak hours

### Scheduled Maintenance

1. Navigate to your server's dashboard
2. Click on "Maintenance" or "Scheduled Tasks"
3. Create a new maintenance window:
   - Select date and time
   - Specify expected duration
   - Choose maintenance type (updates, backup, etc.)
   - Set notification preferences
4. During the maintenance window, automated alerts may be suppressed
5. Receive a confirmation when maintenance is complete

## Networking Configuration

### Managing IP Addresses

1. Navigate to your server's dashboard
2. Click on the "Networking" or "IP Addresses" tab
3. View your current IP assignments:
   - Primary IPv4 address
   - Additional IPv4 addresses (if any)
   - IPv6 addresses (if enabled)
4. To request additional IPs:
   - Click "Request Additional IP"
   - Provide justification for the request
   - Submit for approval
   - Note: Additional IPs may incur extra charges

### Firewall Management

1. Navigate to your server's dashboard
2. Click on the "Firewall" tab
3. View current firewall rules
4. Add a new rule:
   - Select protocol (TCP, UDP, ICMP)
   - Specify port or port range
   - Set source IP restrictions (optional)
   - Add a description
   - Enable or disable the rule
5. Modify or delete existing rules as needed
6. Apply changes to activate the new configuration

### DNS Configuration

1. Navigate to your server's dashboard
2. Click on the "DNS" tab
3. View current DNS records associated with your server
4. Add new DNS records:
   - Select record type (A, AAAA, etc.)
   - Enter domain name
   - Point to your server's IP address
   - Set TTL value
5. Alternatively, navigate to the DNS Management section for more advanced options

## Backups and Snapshots

### Creating a Manual Snapshot

1. Navigate to your server's dashboard
2. Click on the "Snapshots" or "Backups" tab
3. Click "Create Snapshot"
4. Enter a description for the snapshot
5. Confirm the action
6. Wait for the snapshot process to complete
7. Note: Creating a snapshot may cause momentary performance impact

### Configuring Automated Backups

1. Navigate to your server's dashboard
2. Click on the "Backups" tab
3. Click "Configure Automated Backups"
4. Set your backup preferences:
   - Frequency (daily, weekly, monthly)
   - Retention period (how long to keep backups)
   - Time of day to perform backups
   - Notification preferences
5. Save your configuration
6. Automated backups will run according to your schedule

### Restoring from a Backup or Snapshot

1. Navigate to your server's dashboard
2. Click on the "Backups" or "Snapshots" tab
3. Locate the backup or snapshot you want to restore
4. Click "Restore" next to the selected item
5. Review the warning about overwriting current data
6. Confirm the restoration
7. Wait for the process to complete
8. Note: Restoration will replace all data on the server with the backup version

## Operating System Management

### Reinstalling the Operating System

1. Navigate to your server's dashboard
2. Click on "Reinstall OS" in the action panel
3. Select the operating system and version
4. Choose additional options if available:
   - Control panel software
   - Initial packages to install
   - SSH key deployment
5. Confirm that you understand all data will be erased
6. Start the reinstallation process
7. Wait for the process to complete (typically 15-30 minutes)
8. Access your server with the new credentials provided

### Changing Operating Systems

1. Navigate to your server's dashboard
2. Click on "Change OS" in the action panel
3. Browse available operating systems:
   - Linux distributions (Ubuntu, CentOS, Debian, etc.)
   - Windows Server versions
   - Application-specific images
4. Select your desired operating system
5. Configure any additional options
6. Confirm that you understand all data will be erased
7. Start the OS change process
8. Wait for the process to complete
9. Access your server with the new credentials provided

## Troubleshooting Common Issues

### Server Not Responding

1. Check the server status in your dashboard
2. If the status shows "Running" but you cannot access the server:
   - Try accessing via the web console
   - Check if there are any network issues
   - Verify firewall settings aren't blocking access
3. If the server is unresponsive in the web console:
   - Perform a hard restart from the dashboard
   - Monitor the startup process via console
   - Check system logs after restart

### High Resource Usage

1. Navigate to your server's dashboard
2. Review the resource usage graphs to identify the bottleneck:
   - CPU: Check for processes using excessive CPU
   - Memory: Look for memory leaks or insufficient RAM
   - Disk: Check for disk space issues or I/O bottlenecks
   - Network: Identify unusual traffic patterns
3. Connect to your server and investigate:
   - For Linux: Use `top`, `htop`, `iotop`, or `netstat`
   - For Windows: Use Task Manager, Resource Monitor, or Performance Monitor
4. Take appropriate action based on findings:
   - Terminate problematic processes
   - Optimize applications
   - Upgrade server resources if consistently at capacity

### Connectivity Issues

1. Verify your server is running
2. Check network status in the dashboard
3. Test basic connectivity:
   - Ping your server's IP address
   - Try connecting via different methods (SSH, RDP, web console)
   - Test from different networks if possible
4. Check firewall settings:
   - Verify required ports are open
   - Ensure IP restrictions aren't blocking your access
5. Review recent changes that might affect connectivity
6. If issues persist, create a support ticket with detailed information

## Advanced Server Management

### Server Automation with Scripts

1. Navigate to your server's dashboard
2. Click on the "Automation" or "Scripts" tab
3. Create a new script:
   - Select the script type (Bash, PowerShell, etc.)
   - Write or upload your script
   - Set execution parameters
4. Schedule script execution:
   - One-time run
   - Recurring schedule
   - Event-triggered execution
5. View execution history and logs

### API Integration

1. Navigate to your account settings
2. Click on "API Access" or "Integrations"
3. Generate an API key with appropriate permissions
4. Use the API documentation to integrate with your systems:
   - Server provisioning
   - Monitoring and alerts
   - Automated scaling
   - Custom dashboards
5. Implement webhooks for event-driven automation

### Load Balancing

1. Navigate to the "Load Balancing" section
2. Click "Create Load Balancer"
3. Configure your load balancer:
   - Select servers to include in the pool
   - Choose balancing algorithm
   - Configure health checks
   - Set up SSL if needed
4. Deploy the load balancer
5. Update your DNS to point to the load balancer IP
6. Monitor the balanced traffic and server health

---

For additional assistance with server management, please consult our knowledge base or contact our support team through the SkyPANEL support portal.