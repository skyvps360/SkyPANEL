# WordPress Integration

SkyPANEL includes a comprehensive WordPress integration system that allows you to manage WordPress content remotely from your SkyPANEL dashboard. This integration enables you to use WordPress as your homepage while maintaining full SkyPANEL functionality.

## Overview

The WordPress integration provides:

- **Remote Content Management**: Create, edit, and delete WordPress pages and posts from SkyPANEL
- **Content Synchronization**: Automatically sync content between WordPress and SkyPANEL
- **Secure API Communication**: Protected REST API endpoints with API key authentication
- **Category and Tag Management**: Manage WordPress categories and tags remotely
- **Content Backup**: Automatic content backup and restore capabilities

## Setup Instructions

### 1. WordPress Plugin Installation

First, install the SkyPANEL WordPress plugin on your WordPress site:

1. Download the plugin file: `wordpress-plugin/skypanel-integration.php`
2. Upload it to your WordPress site's `/wp-content/plugins/skypanel-integration/` directory
3. Activate the plugin through the WordPress admin panel

### 2. WordPress Plugin Configuration

1. Go to Settings → SkyPANEL in your WordPress admin panel
2. Check "Enable SkyPANEL Integration"
3. Generate a secure API key and enter it in the settings
4. Save the settings

### 3. SkyPANEL Configuration

1. In your SkyPANEL admin panel, go to Settings → WordPress
2. Enter your WordPress site URL (e.g., `https://yourdomain.com`)
3. Enter the API key you generated in step 2
4. Enter your WordPress username and password
5. Test the connection to ensure everything works

## API Endpoints

The WordPress plugin provides the following REST API endpoints:

### Pages
- `GET /wp-json/skypanel/v1/pages` - Get all pages
- `POST /wp-json/skypanel/v1/pages` - Create a new page
- `PUT /wp-json/skypanel/v1/pages/{id}` - Update a page
- `DELETE /wp-json/skypanel/v1/pages/{id}` - Delete a page

### Posts
- `GET /wp-json/skypanel/v1/posts` - Get all posts
- `POST /wp-json/skypanel/v1/posts` - Create a new post
- `PUT /wp-json/skypanel/v1/posts/{id}` - Update a post
- `DELETE /wp-json/skypanel/v1/posts/{id}` - Delete a post

### Categories
- `GET /wp-json/skypanel/v1/categories` - Get all categories

### Tags
- `GET /wp-json/skypanel/v1/tags` - Get all tags

## Authentication

All API requests require authentication using the API key. Include the API key in the request headers:

```
X-API-Key: your-api-key-here
```

## SkyPANEL WordPress Service

The WordPress integration is handled by the `WordPressService` class in `server/services/wordpress-service.ts`. This service provides:

### Configuration Management
- Load and validate WordPress configuration
- Store settings securely
- Handle authentication headers

### Content Management
- Fetch pages and posts from WordPress
- Create, update, and delete content
- Manage categories and tags

### Synchronization
- Sync content between WordPress and SkyPANEL
- Cache content locally for faster access
- Handle automatic synchronization

## API Routes

The WordPress integration uses the following SkyPANEL API routes:

### Configuration
- `GET /api/admin/wordpress/config` - Get WordPress configuration
- `POST /api/admin/wordpress/config` - Update WordPress configuration

### Connection Testing
- `POST /api/admin/wordpress/test-connection` - Test WordPress connection

### Content Management
- `GET /api/admin/wordpress/pages` - Get WordPress pages
- `POST /api/admin/wordpress/pages` - Create WordPress page
- `PUT /api/admin/wordpress/pages/:id` - Update WordPress page
- `DELETE /api/admin/wordpress/pages/:id` - Delete WordPress page

- `GET /api/admin/wordpress/posts` - Get WordPress posts
- `POST /api/admin/wordpress/posts` - Create WordPress post
- `PUT /api/admin/wordpress/posts/:id` - Update WordPress post
- `DELETE /api/admin/wordpress/posts/:id` - Delete WordPress post

### Categories and Tags
- `GET /api/admin/wordpress/categories` - Get WordPress categories
- `GET /api/admin/wordpress/tags` - Get WordPress tags

### Synchronization
- `POST /api/admin/wordpress/sync` - Sync WordPress content
- `GET /api/admin/wordpress/sync-status` - Get sync status
- `GET /api/admin/wordpress/synced-content` - Get cached content

## Admin Settings

The WordPress integration settings are available in the SkyPANEL admin panel under Settings → WordPress. The settings include:

### Basic Configuration
- **Enable WordPress Integration**: Toggle the integration on/off
- **WordPress Site URL**: Your WordPress site URL
- **API Key**: Authentication key for WordPress API
- **Username**: WordPress username for authentication
- **Password**: WordPress password for authentication

### Synchronization Settings
- **Enable Auto Sync**: Automatically sync content from WordPress
- **Sync Interval**: How often to sync content (in minutes)

### Connection Testing
- **Test Connection**: Verify the connection to WordPress

## Usage Examples

### Creating a Page via SkyPANEL API

```bash
curl -X POST https://your-skypanel-domain.com/api/admin/wordpress/pages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-skypanel-token" \
  -d '{
    "title": "About Us",
    "content": "<p>This is the about us page content.</p>",
    "slug": "about-us",
    "status": "publish"
  }'
```

### Creating a Post via SkyPANEL API

```bash
curl -X POST https://your-skypanel-domain.com/api/admin/wordpress/posts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-skypanel-token" \
  -d '{
    "title": "Welcome to Our Blog",
    "content": "<p>This is our first blog post.</p>",
    "excerpt": "A brief introduction to our blog",
    "slug": "welcome-blog",
    "status": "publish",
    "categories": [1, 2],
    "tags": [1, 3, 5]
  }'
```

### Syncing Content

```bash
curl -X POST https://your-skypanel-domain.com/api/admin/wordpress/sync \
  -H "Authorization: Bearer your-skypanel-token"
```

## Security Considerations

1. **API Key Security**: Keep your API key secure and don't share it publicly
2. **HTTPS**: Always use HTTPS for API communication
3. **Regular Updates**: Keep both SkyPANEL and the WordPress plugin updated
4. **Access Control**: Only grant access to trusted users

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Verify your WordPress site URL is correct
   - Ensure the plugin is activated in WordPress
   - Check that the API key matches in both WordPress and SkyPANEL

2. **Permission Denied**
   - Verify the API key is correct
   - Ensure the plugin is enabled in WordPress settings
   - Check that your SkyPANEL user has admin permissions

3. **Content Not Syncing**
   - Check that auto-sync is enabled in SkyPANEL settings
   - Verify the sync interval is set correctly
   - Check WordPress error logs for any issues

### Debug Mode

To enable debug mode in WordPress, add this to your `wp-config.php`:

```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

This will log API requests and errors to `/wp-content/debug.log`.

## Integration with SkyPANEL Features

The WordPress integration works seamlessly with other SkyPANEL features:

### Content Management
- Create and manage WordPress content from the SkyPANEL admin panel
- Use WordPress as your homepage while keeping SkyPANEL functionality
- Automatic content synchronization

### User Management
- WordPress content can be managed by SkyPANEL admin users
- Secure authentication and authorization

### Backup and Restore
- Automatic content backup
- Content restore capabilities

## Future Enhancements

Planned features for future releases:

1. **Media Management**: Upload and manage WordPress media files
2. **Comments Management**: Moderate and manage WordPress comments
3. **User Synchronization**: Sync users between SkyPANEL and WordPress
4. **Advanced Analytics**: Content performance analytics
5. **Multi-site Support**: Support for WordPress multisite installations

## Support

For support and questions:

- **Documentation**: Check this documentation
- **GitHub Issues**: Report bugs on the SkyPANEL GitHub repository
- **Community**: Join the SkyPANEL community forums

## Changelog

### Version 1.0.0
- Initial release
- Basic page and post management
- Category and tag support
- API key authentication
- Admin settings page
- Content synchronization
- Connection testing 