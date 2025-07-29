# SkyPANEL WordPress Integration Plugin

This WordPress plugin enables seamless integration between your WordPress site and SkyPANEL, allowing you to manage WordPress content remotely from your SkyPANEL dashboard.

## Features

- **Remote Content Management**: Create, edit, and delete WordPress pages and posts from SkyPANEL
- **Content Synchronization**: Automatically sync content between WordPress and SkyPANEL
- **Secure API Communication**: Protected REST API endpoints with API key authentication
- **Category and Tag Management**: Manage WordPress categories and tags remotely
- **Content Backup**: Automatic content backup and restore capabilities

## Installation

### Method 1: Manual Installation

1. Download the plugin files
2. Upload the `skypanel-integration.php` file to your WordPress site's `/wp-content/plugins/skypanel-integration/` directory
3. Activate the plugin through the WordPress admin panel

### Method 2: WordPress Plugin Upload

1. Go to your WordPress admin panel
2. Navigate to Plugins → Add New → Upload Plugin
3. Choose the plugin zip file and click "Install Now"
4. Activate the plugin

## Configuration

### 1. Enable the Plugin

1. Go to Settings → SkyPANEL in your WordPress admin panel
2. Check "Enable SkyPANEL Integration"
3. Save the settings

### 2. Generate API Key

1. In the SkyPANEL settings page, enter a secure API key
2. This key will be used to authenticate requests from SkyPANEL
3. Keep this key secure and don't share it publicly

### 3. Configure SkyPANEL

1. In your SkyPANEL admin panel, go to Settings → WordPress
2. Enter your WordPress site URL (e.g., `https://yourdomain.com`)
3. Enter the API key you generated in step 2
4. Enter your WordPress username and password
5. Test the connection to ensure everything works

## API Endpoints

The plugin provides the following REST API endpoints:

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

## Usage Examples

### Creating a Page

```bash
curl -X POST https://yourdomain.com/wp-json/skypanel/v1/pages \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "title": "About Us",
    "content": "<p>This is the about us page content.</p>",
    "slug": "about-us",
    "status": "publish"
  }'
```

### Creating a Post

```bash
curl -X POST https://yourdomain.com/wp-json/skypanel/v1/posts \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
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

### Getting All Pages

```bash
curl -X GET https://yourdomain.com/wp-json/skypanel/v1/pages \
  -H "X-API-Key: your-api-key"
```

## Security Considerations

1. **API Key Security**: Keep your API key secure and don't share it publicly
2. **HTTPS**: Always use HTTPS for API communication
3. **Regular Updates**: Keep the plugin updated to the latest version
4. **Access Control**: Only grant access to trusted users

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Verify your WordPress site URL is correct
   - Ensure the plugin is activated
   - Check that the API key matches in both WordPress and SkyPANEL

2. **Permission Denied**
   - Verify the API key is correct
   - Ensure the plugin is enabled in WordPress settings

3. **Content Not Syncing**
   - Check that auto-sync is enabled in SkyPANEL settings
   - Verify the sync interval is set correctly
   - Check WordPress error logs for any issues

### Debug Mode

To enable debug mode, add this to your `wp-config.php`:

```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

This will log API requests and errors to `/wp-content/debug.log`.

## Support

For support and questions:

- **Documentation**: Check the SkyPANEL documentation
- **GitHub Issues**: Report bugs on the SkyPANEL GitHub repository
- **Community**: Join the SkyPANEL community forums

## Changelog

### Version 1.0.0
- Initial release
- Basic page and post management
- Category and tag support
- API key authentication
- Admin settings page

## License

This plugin is licensed under the GPL v2 or later.

## Credits

Developed by the SkyPANEL Team for seamless WordPress integration. 