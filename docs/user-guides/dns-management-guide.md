# SkyPANEL DNS Management Guide

This guide provides detailed instructions for managing your DNS domains and records in SkyPANEL, including domain setup, record configuration, templates, and propagation monitoring.

## Table of Contents

1. [DNS Management Overview](#dns-management-overview)
2. [DNS Plans and Features](#dns-plans-and-features)
3. [Managing DNS Domains](#managing-dns-domains)
4. [Working with DNS Records](#working-with-dns-records)
5. [DNS Record Types](#dns-record-types)
6. [Using DNS Templates](#using-dns-templates)
7. [Checking DNS Propagation](#checking-dns-propagation)
8. [Domain Nameservers](#domain-nameservers)
9. [DNS Security](#dns-security)
10. [Troubleshooting DNS Issues](#troubleshooting-dns-issues)

## DNS Management Overview

The SkyPANEL DNS Management system allows you to create and manage DNS domains and records through an intuitive interface.

### Accessing DNS Management

1. Log in to your SkyPANEL account
2. Navigate to "DNS" in the main menu
3. The DNS dashboard displays:
   - Your DNS domains
   - Domain status indicators
   - Quick action buttons
   - DNS plan information

### DNS Dashboard Elements

- **Domain List**: Shows all your DNS domains with status indicators
- **Search and Filter**: Tools to find specific domains
- **Action Buttons**: Quick access to common operations
- **Plan Usage**: Shows your current DNS plan usage and limits
- **Recent Changes**: Displays recent modifications to your DNS configuration

## DNS Plans and Features

SkyPANEL offers different DNS plans to meet various needs and budgets.

### Available DNS Plans

1. **Free Plan**:
   - Up to 3 domains
   - Up to 25 records per domain
   - Basic record types (A, AAAA, CNAME, MX, TXT)
   - Standard propagation time
   - No DNSSEC support

2. **Standard Plan**:
   - Up to 20 domains
   - Unlimited records per domain
   - All record types
   - Faster propagation time
   - DNS templates
   - Basic DNSSEC support

3. **Professional Plan**:
   - Unlimited domains
   - Unlimited records
   - Priority propagation
   - Advanced features (DNSSEC, zone file import/export)
   - Custom TTL settings
   - API access

### Upgrading Your DNS Plan

1. Navigate to "DNS" > "Plans"
2. View available plans and their features
3. Select the plan that meets your requirements
4. Click "Upgrade"
5. Review the price and billing details
6. Confirm the upgrade
7. Your new plan will be activated immediately

## Managing DNS Domains

### Adding a New Domain

1. Navigate to "DNS" in the main menu
2. Click "Add Domain" button
3. Enter your domain name (e.g., example.com)
4. Select a DNS plan if prompted
5. Click "Add Domain" to confirm
6. The system will create the domain and default records

### Domain Settings

1. From the DNS domains list, click on the domain name
2. Click the "Settings" tab
3. Configure domain settings:
   - Default TTL (Time To Live)
   - DNSSEC settings (if available on your plan)
   - Email notifications for changes
   - Auto-renewal options
4. Click "Save Changes" to apply

### Deleting a Domain

1. Navigate to "DNS" > Domains list
2. Find the domain you want to delete
3. Click the "Actions" button and select "Delete"
4. Confirm the deletion
5. Note: This will remove all DNS records for this domain

## Working with DNS Records

### Viewing Domain Records

1. Navigate to "DNS" in the main menu
2. Click on the domain name in your domains list
3. The records page displays all DNS records for the domain
4. Records are grouped by type for easier management

### Adding a New Record

1. From the domain records page, click "Add Record"
2. Select the record type (A, AAAA, CNAME, MX, TXT, etc.)
3. Enter the required information:
   - Name (subdomain or @ for root)
   - Value (IP address, hostname, or text)
   - TTL (Time To Live)
   - Priority (for MX and SRV records)
4. Click "Save" to create the record
5. The new record will be added to your domain

### Editing an Existing Record

1. From the domain records page, find the record you want to edit
2. Click the "Edit" button next to the record
3. Modify the record details as needed
4. Click "Save" to update the record
5. The changes will be applied to your domain

### Deleting a Record

1. From the domain records page, find the record you want to delete
2. Click the "Delete" button next to the record
3. Confirm the deletion
4. The record will be removed from your domain

## DNS Record Types

SkyPANEL supports various DNS record types for different purposes.

### Common Record Types

1. **A Record**:
   - Maps a domain name to an IPv4 address
   - Example: `www.example.com` → `192.0.2.1`
   - Use for: Websites, servers, and other IPv4 services

2. **AAAA Record**:
   - Maps a domain name to an IPv6 address
   - Example: `www.example.com` → `2001:0db8:85a3:0000:0000:8a2e:0370:7334`
   - Use for: IPv6-enabled services

3. **CNAME Record**:
   - Creates an alias from one domain to another
   - Example: `blog.example.com` → `example.com`
   - Use for: Subdomains pointing to the same IP as the main domain

4. **MX Record**:
   - Specifies mail servers for the domain
   - Example: `example.com` → `mail.example.com` (priority 10)
   - Use for: Email delivery configuration

5. **TXT Record**:
   - Stores text information
   - Example: `example.com` → `v=spf1 include:_spf.example.com ~all`
   - Use for: SPF, DKIM, domain verification

### Advanced Record Types

1. **NS Record**:
   - Delegates a subdomain to a set of nameservers
   - Example: `subdomain.example.com` → `ns1.provider.com`
   - Use for: Subdomain delegation

2. **SOA Record**:
   - Specifies authoritative information about the domain
   - Contains serial number, refresh interval, retry interval, etc.
   - Automatically managed by the system

3. **SRV Record**:
   - Specifies location of services
   - Example: `_sip._tcp.example.com` → `sip.example.com:5060`
   - Use for: SIP, XMPP, and other service discovery

4. **CAA Record**:
   - Specifies which certificate authorities can issue certificates
   - Example: `example.com` → `0 issue "letsencrypt.org"`
   - Use for: SSL/TLS certificate issuance control

5. **PTR Record**:
   - Maps an IP address to a domain name (reverse DNS)
   - Example: `1.2.0.192.in-addr.arpa` → `www.example.com`
   - Use for: Reverse DNS lookups

## Using DNS Templates

DNS templates help you quickly set up common configurations for your domains.

### Available Templates

1. **Basic Website**:
   - A record for root domain
   - A record for www subdomain
   - MX records for basic email
   - TXT record for SPF

2. **Email Configuration**:
   - MX records for email delivery
   - SPF record for email authentication
   - DKIM record for email signing
   - DMARC record for email policy

3. **Google Workspace**:
   - MX records for Google email
   - TXT records for verification
   - CNAME records for services
   - SPF record for email authentication

4. **Microsoft 365**:
   - MX records for Microsoft email
   - TXT records for verification
   - CNAME records for services
   - SPF record for email authentication

### Applying a Template

1. From your domain records page, click "Apply Template"
2. Browse available templates
3. Select the template you want to use
4. Review the records that will be created
5. Click "Apply Template" to add the records to your domain
6. Note: You can modify the generated records after applying the template

### Creating Custom Templates

1. Configure a domain with the desired records
2. Click "Save as Template"
3. Enter a name and description for your template
4. Select which records to include
5. Click "Save Template"
6. Your custom template will now be available for all your domains

## Checking DNS Propagation

DNS changes take time to propagate across the internet. SkyPANEL provides tools to monitor this process.

### Using the Propagation Checker

1. From your domain records page, click "Check Propagation"
2. Select the record you want to check
3. Click "Start Check"
4. The system will query multiple DNS servers worldwide
5. Results will show:
   - Servers that have updated (showing new value)
   - Servers still showing old value
   - Estimated time for full propagation

### Understanding Propagation Times

- **TTL Impact**: Lower TTL values result in faster propagation
- **Record Type**: Some record types propagate faster than others
- **DNS Provider**: Premium DNS plans may offer faster propagation
- **Geographic Location**: Changes may propagate at different rates in different regions

### Monitoring Propagation Status

1. Navigate to "DNS" > "Propagation Status"
2. View the status of recent DNS changes
3. Filter by domain or record type
4. Refresh to see updated propagation status
5. Receive notifications when propagation is complete (if enabled)

## Domain Nameservers

To use SkyPANEL's DNS management, you need to configure your domain to use our nameservers.

### SkyPANEL Nameservers

Our standard nameservers are:
- ns1.skyvps360.xyz
- ns2.skyvps360.xyz
- ns3.skyvps360.xyz

### Updating Nameservers at Your Registrar

1. Log in to your domain registrar's website
2. Navigate to the domain management section
3. Look for "Nameservers" or "DNS Settings"
4. Replace the current nameservers with SkyPANEL's nameservers
5. Save the changes
6. Allow 24-48 hours for the nameserver change to propagate

### Verifying Nameserver Configuration

1. In SkyPANEL, navigate to "DNS" > Domains list
2. Check the "Nameserver Status" column
3. If properly configured, it will show "Active"
4. If not properly configured, it will show "Pending" or "Error"
5. Click on any error messages for detailed information

## DNS Security

SkyPANEL offers several security features to protect your DNS configuration.

### DNSSEC (Domain Name System Security Extensions)

1. Navigate to your domain settings
2. Click on the "DNSSEC" tab
3. Click "Enable DNSSEC"
4. The system will generate the necessary keys and records
5. Follow the instructions to add DS records at your registrar
6. Verify DNSSEC activation

### Access Controls

1. Navigate to "DNS" > "Access Controls"
2. Configure who can manage your DNS settings:
   - Specific user accounts
   - IP address restrictions
   - Two-factor authentication requirements
3. Set notification preferences for DNS changes
4. Save your settings

### Audit Logging

1. Navigate to "DNS" > "Audit Log"
2. View a complete history of all DNS changes:
   - Who made the change
   - What was changed
   - When the change was made
   - IP address used
3. Filter logs by domain, user, or date range
4. Export logs for compliance or security analysis

## Troubleshooting DNS Issues

### Common DNS Problems

1. **Domain Not Resolving**:
   - Verify nameservers are correctly set at your registrar
   - Check that required A or CNAME records exist
   - Ensure records have the correct values
   - Allow sufficient time for propagation

2. **Email Delivery Issues**:
   - Verify MX records are correctly configured
   - Check SPF, DKIM, and DMARC records
   - Ensure proper priority values for MX records
   - Test email configuration with mail-tester.com

3. **SSL Certificate Validation Failures**:
   - Ensure CAA records (if any) allow your certificate provider
   - Verify domain ownership records are correct
   - Check that A/CNAME records point to the correct server

### Using DNS Diagnostic Tools

1. Navigate to "DNS" > "Tools"
2. Select the diagnostic tool:
   - DNS Lookup: Check how a domain resolves
   - Reverse DNS: Look up domain from IP
   - WHOIS: View domain registration information
   - Trace Route: Check network path to server
3. Enter the domain or IP to check
4. Review the results

### Getting DNS Support

If you encounter DNS issues that you can't resolve:

1. Navigate to "Support" > "Tickets"
2. Create a new ticket with category "DNS"
3. Provide detailed information:
   - Domain name
   - Specific records having issues
   - Error messages you're seeing
   - Steps you've already taken
4. Our DNS specialists will assist you

---

For additional assistance with DNS management, please consult our knowledge base or contact our support team through the SkyPANEL support portal.