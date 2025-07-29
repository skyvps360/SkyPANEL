<?php
/**
 * Plugin Name: SkyPANEL Integration
 * Plugin URI: https://github.com/skyvps360/SkyPANEL
 * Description: Integrate your WordPress site with SkyPANEL for content management and synchronization.
 * Version: 1.0.0
 * Author: SkyPANEL Team
 * Author URI: https://skyvps360.xyz
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: skypanel-integration
 * Domain Path: /languages
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('SKYPANEL_PLUGIN_VERSION', '1.0.0');
define('SKYPANEL_PLUGIN_URL', plugin_dir_url(__FILE__));
define('SKYPANEL_PLUGIN_PATH', plugin_dir_path(__FILE__));

/**
 * Main SkyPANEL Integration Plugin Class
 */
class SkyPANELIntegration {
    
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'admin_init'));
        add_action('rest_api_init', array($this, 'register_rest_routes'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'admin_enqueue_scripts'));
        
        // Add settings link to plugins page
        add_filter('plugin_action_links_' . plugin_basename(__FILE__), array($this, 'add_settings_link'));
        
        // Register activation and deactivation hooks
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    /**
     * Initialize the plugin
     */
    public function init() {
        // Load text domain for translations
        load_plugin_textdomain('skypanel-integration', false, dirname(plugin_basename(__FILE__)) . '/languages');
        
        // Add custom post types if needed
        $this->register_post_types();
    }
    
    /**
     * Register custom post types
     */
    public function register_post_types() {
        // Add any custom post types needed for SkyPANEL integration
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_options_page(
            __('SkyPANEL Integration', 'skypanel-integration'),
            __('SkyPANEL', 'skypanel-integration'),
            'manage_options',
            'skypanel-integration',
            array($this, 'admin_page')
        );
    }
    
    /**
     * Initialize admin settings
     */
    public function admin_init() {
        register_setting('skypanel_integration_options', 'skypanel_settings');
        
        add_settings_section(
            'skypanel_general_section',
            __('General Settings', 'skypanel-integration'),
            array($this, 'general_section_callback'),
            'skypanel-integration'
        );
        
        add_settings_field(
            'skypanel_enabled',
            __('Enable SkyPANEL Integration', 'skypanel-integration'),
            array($this, 'enabled_field_callback'),
            'skypanel-integration',
            'skypanel_general_section'
        );
        
        add_settings_field(
            'skypanel_api_key',
            __('API Key', 'skypanel-integration'),
            array($this, 'api_key_field_callback'),
            'skypanel-integration',
            'skypanel_general_section'
        );
        
        add_settings_field(
            'skypanel_sync_enabled',
            __('Enable Content Sync', 'skypanel-integration'),
            array($this, 'sync_enabled_field_callback'),
            'skypanel-integration',
            'skypanel_general_section'
        );
    }
    
    /**
     * Admin page callback
     */
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            <form method="post" action="options.php">
                <?php
                settings_fields('skypanel_integration_options');
                do_settings_sections('skypanel-integration');
                submit_button();
                ?>
            </form>
            
            <div class="card" style="max-width: 600px; margin-top: 20px;">
                <h2><?php _e('Integration Status', 'skypanel-integration'); ?></h2>
                <p><?php _e('This plugin enables SkyPANEL to manage your WordPress content remotely.', 'skypanel-integration'); ?></p>
                
                <h3><?php _e('Features:', 'skypanel-integration'); ?></h3>
                <ul>
                    <li><?php _e('Remote content management from SkyPANEL', 'skypanel-integration'); ?></li>
                    <li><?php _e('Automatic content synchronization', 'skypanel-integration'); ?></li>
                    <li><?php _e('Secure API communication', 'skypanel-integration'); ?></li>
                    <li><?php _e('Content backup and restore', 'skypanel-integration'); ?></li>
                </ul>
                
                <h3><?php _e('API Endpoints:', 'skypanel-integration'); ?></h3>
                <p><?php _e('The following REST API endpoints are available for SkyPANEL:', 'skypanel-integration'); ?></p>
                <ul>
                    <li><code>/wp-json/skypanel/v1/pages</code> - <?php _e('Manage pages', 'skypanel-integration'); ?></li>
                    <li><code>/wp-json/skypanel/v1/posts</code> - <?php _e('Manage posts', 'skypanel-integration'); ?></li>
                    <li><code>/wp-json/skypanel/v1/categories</code> - <?php _e('Manage categories', 'skypanel-integration'); ?></li>
                    <li><code>/wp-json/skypanel/v1/tags</code> - <?php _e('Manage tags', 'skypanel-integration'); ?></li>
                </ul>
            </div>
        </div>
        <?php
    }
    
    /**
     * Settings field callbacks
     */
    public function enabled_field_callback() {
        $options = get_option('skypanel_settings', array());
        $enabled = isset($options['enabled']) ? $options['enabled'] : false;
        ?>
        <input type="checkbox" name="skypanel_settings[enabled]" value="1" <?php checked(1, $enabled); ?> />
        <p class="description"><?php _e('Enable SkyPANEL integration', 'skypanel-integration'); ?></p>
        <?php
    }
    
    public function api_key_field_callback() {
        $options = get_option('skypanel_settings', array());
        $api_key = isset($options['api_key']) ? $options['api_key'] : '';
        ?>
        <input type="text" name="skypanel_settings[api_key]" value="<?php echo esc_attr($api_key); ?>" class="regular-text" />
        <p class="description"><?php _e('API key for SkyPANEL authentication', 'skypanel-integration'); ?></p>
        <?php
    }
    
    public function sync_enabled_field_callback() {
        $options = get_option('skypanel_settings', array());
        $sync_enabled = isset($options['sync_enabled']) ? $options['sync_enabled'] : false;
        ?>
        <input type="checkbox" name="skypanel_settings[sync_enabled]" value="1" <?php checked(1, $sync_enabled); ?> />
        <p class="description"><?php _e('Enable automatic content synchronization', 'skypanel-integration'); ?></p>
        <?php
    }
    
    /**
     * Register REST API routes
     */
    public function register_rest_routes() {
        register_rest_route('skypanel/v1', '/pages', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_pages'),
            'permission_callback' => array($this, 'check_permission'),
        ));
        
        register_rest_route('skypanel/v1', '/pages', array(
            'methods' => 'POST',
            'callback' => array($this, 'create_page'),
            'permission_callback' => array($this, 'check_permission'),
        ));
        
        register_rest_route('skypanel/v1', '/pages/(?P<id>\d+)', array(
            'methods' => 'PUT',
            'callback' => array($this, 'update_page'),
            'permission_callback' => array($this, 'check_permission'),
        ));
        
        register_rest_route('skypanel/v1', '/pages/(?P<id>\d+)', array(
            'methods' => 'DELETE',
            'callback' => array($this, 'delete_page'),
            'permission_callback' => array($this, 'check_permission'),
        ));
        
        register_rest_route('skypanel/v1', '/posts', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_posts'),
            'permission_callback' => array($this, 'check_permission'),
        ));
        
        register_rest_route('skypanel/v1', '/posts', array(
            'methods' => 'POST',
            'callback' => array($this, 'create_post'),
            'permission_callback' => array($this, 'check_permission'),
        ));
        
        register_rest_route('skypanel/v1', '/posts/(?P<id>\d+)', array(
            'methods' => 'PUT',
            'callback' => array($this, 'update_post'),
            'permission_callback' => array($this, 'check_permission'),
        ));
        
        register_rest_route('skypanel/v1', '/posts/(?P<id>\d+)', array(
            'methods' => 'DELETE',
            'callback' => array($this, 'delete_post'),
            'permission_callback' => array($this, 'check_permission'),
        ));
        
        register_rest_route('skypanel/v1', '/categories', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_categories'),
            'permission_callback' => array($this, 'check_permission'),
        ));
        
        register_rest_route('skypanel/v1', '/tags', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_tags'),
            'permission_callback' => array($this, 'check_permission'),
        ));
    }
    
    /**
     * Check API permission
     */
    public function check_permission($request) {
        $options = get_option('skypanel_settings', array());
        $enabled = isset($options['enabled']) ? $options['enabled'] : false;
        
        if (!$enabled) {
            return new WP_Error('skypanel_disabled', 'SkyPANEL integration is disabled', array('status' => 403));
        }
        
        // Check for API key in headers
        $api_key = $request->get_header('X-API-Key');
        $stored_api_key = isset($options['api_key']) ? $options['api_key'] : '';
        
        if (empty($stored_api_key) || $api_key !== $stored_api_key) {
            return new WP_Error('invalid_api_key', 'Invalid API key', array('status' => 401));
        }
        
        return true;
    }
    
    /**
     * REST API callbacks
     */
    public function get_pages($request) {
        $args = array(
            'post_type' => 'page',
            'post_status' => 'publish',
            'posts_per_page' => -1,
        );
        
        $pages = get_posts($args);
        $response = array();
        
        foreach ($pages as $page) {
            $response[] = array(
                'id' => $page->ID,
                'title' => $page->post_title,
                'content' => $page->post_content,
                'slug' => $page->post_name,
                'status' => $page->post_status,
                'modified' => $page->post_modified,
                'link' => get_permalink($page->ID),
            );
        }
        
        return new WP_REST_Response($response, 200);
    }
    
    public function create_page($request) {
        $params = $request->get_params();
        
        $page_data = array(
            'post_title' => sanitize_text_field($params['title']),
            'post_content' => wp_kses_post($params['content']),
            'post_name' => sanitize_title($params['slug'] ?? $params['title']),
            'post_status' => sanitize_text_field($params['status'] ?? 'publish'),
            'post_type' => 'page',
        );
        
        $page_id = wp_insert_post($page_data);
        
        if (is_wp_error($page_id)) {
            return new WP_Error('page_creation_failed', 'Failed to create page', array('status' => 500));
        }
        
        $page = get_post($page_id);
        
        return new WP_REST_Response(array(
            'id' => $page->ID,
            'title' => $page->post_title,
            'content' => $page->post_content,
            'slug' => $page->post_name,
            'status' => $page->post_status,
            'modified' => $page->post_modified,
            'link' => get_permalink($page->ID),
        ), 201);
    }
    
    public function update_page($request) {
        $page_id = $request->get_param('id');
        $params = $request->get_params();
        
        $page_data = array(
            'ID' => $page_id,
        );
        
        if (isset($params['title'])) {
            $page_data['post_title'] = sanitize_text_field($params['title']);
        }
        
        if (isset($params['content'])) {
            $page_data['post_content'] = wp_kses_post($params['content']);
        }
        
        if (isset($params['slug'])) {
            $page_data['post_name'] = sanitize_title($params['slug']);
        }
        
        if (isset($params['status'])) {
            $page_data['post_status'] = sanitize_text_field($params['status']);
        }
        
        $result = wp_update_post($page_data);
        
        if (is_wp_error($result)) {
            return new WP_Error('page_update_failed', 'Failed to update page', array('status' => 500));
        }
        
        $page = get_post($page_id);
        
        return new WP_REST_Response(array(
            'id' => $page->ID,
            'title' => $page->post_title,
            'content' => $page->post_content,
            'slug' => $page->post_name,
            'status' => $page->post_status,
            'modified' => $page->post_modified,
            'link' => get_permalink($page->ID),
        ), 200);
    }
    
    public function delete_page($request) {
        $page_id = $request->get_param('id');
        
        $result = wp_delete_post($page_id, true);
        
        if (!$result) {
            return new WP_Error('page_deletion_failed', 'Failed to delete page', array('status' => 500));
        }
        
        return new WP_REST_Response(array('success' => true), 200);
    }
    
    public function get_posts($request) {
        $args = array(
            'post_type' => 'post',
            'post_status' => 'publish',
            'posts_per_page' => -1,
        );
        
        $posts = get_posts($args);
        $response = array();
        
        foreach ($posts as $post) {
            $response[] = array(
                'id' => $post->ID,
                'title' => $post->post_title,
                'content' => $post->post_content,
                'excerpt' => $post->post_excerpt,
                'slug' => $post->post_name,
                'status' => $post->post_status,
                'categories' => wp_get_post_categories($post->ID, array('fields' => 'ids')),
                'tags' => wp_get_post_tags($post->ID, array('fields' => 'ids')),
                'author' => $post->post_author,
                'date' => $post->post_date,
                'modified' => $post->post_modified,
                'link' => get_permalink($post->ID),
            );
        }
        
        return new WP_REST_Response($response, 200);
    }
    
    public function create_post($request) {
        $params = $request->get_params();
        
        $post_data = array(
            'post_title' => sanitize_text_field($params['title']),
            'post_content' => wp_kses_post($params['content']),
            'post_excerpt' => wp_kses_post($params['excerpt'] ?? ''),
            'post_name' => sanitize_title($params['slug'] ?? $params['title']),
            'post_status' => sanitize_text_field($params['status'] ?? 'publish'),
            'post_type' => 'post',
        );
        
        if (isset($params['categories'])) {
            $post_data['post_category'] = array_map('intval', $params['categories']);
        }
        
        $post_id = wp_insert_post($post_data);
        
        if (is_wp_error($post_id)) {
            return new WP_Error('post_creation_failed', 'Failed to create post', array('status' => 500));
        }
        
        if (isset($params['tags'])) {
            wp_set_post_tags($post_id, $params['tags']);
        }
        
        $post = get_post($post_id);
        
        return new WP_REST_Response(array(
            'id' => $post->ID,
            'title' => $post->post_title,
            'content' => $post->post_content,
            'excerpt' => $post->post_excerpt,
            'slug' => $post->post_name,
            'status' => $post->post_status,
            'categories' => wp_get_post_categories($post->ID, array('fields' => 'ids')),
            'tags' => wp_get_post_tags($post->ID, array('fields' => 'ids')),
            'author' => $post->post_author,
            'date' => $post->post_date,
            'modified' => $post->post_modified,
            'link' => get_permalink($post->ID),
        ), 201);
    }
    
    public function update_post($request) {
        $post_id = $request->get_param('id');
        $params = $request->get_params();
        
        $post_data = array(
            'ID' => $post_id,
        );
        
        if (isset($params['title'])) {
            $post_data['post_title'] = sanitize_text_field($params['title']);
        }
        
        if (isset($params['content'])) {
            $post_data['post_content'] = wp_kses_post($params['content']);
        }
        
        if (isset($params['excerpt'])) {
            $post_data['post_excerpt'] = wp_kses_post($params['excerpt']);
        }
        
        if (isset($params['slug'])) {
            $post_data['post_name'] = sanitize_title($params['slug']);
        }
        
        if (isset($params['status'])) {
            $post_data['post_status'] = sanitize_text_field($params['status']);
        }
        
        if (isset($params['categories'])) {
            $post_data['post_category'] = array_map('intval', $params['categories']);
        }
        
        $result = wp_update_post($post_data);
        
        if (is_wp_error($result)) {
            return new WP_Error('post_update_failed', 'Failed to update post', array('status' => 500));
        }
        
        if (isset($params['tags'])) {
            wp_set_post_tags($post_id, $params['tags']);
        }
        
        $post = get_post($post_id);
        
        return new WP_REST_Response(array(
            'id' => $post->ID,
            'title' => $post->post_title,
            'content' => $post->post_content,
            'excerpt' => $post->post_excerpt,
            'slug' => $post->post_name,
            'status' => $post->post_status,
            'categories' => wp_get_post_categories($post->ID, array('fields' => 'ids')),
            'tags' => wp_get_post_tags($post->ID, array('fields' => 'ids')),
            'author' => $post->post_author,
            'date' => $post->post_date,
            'modified' => $post->post_modified,
            'link' => get_permalink($post->ID),
        ), 200);
    }
    
    public function delete_post($request) {
        $post_id = $request->get_param('id');
        
        $result = wp_delete_post($post_id, true);
        
        if (!$result) {
            return new WP_Error('post_deletion_failed', 'Failed to delete post', array('status' => 500));
        }
        
        return new WP_REST_Response(array('success' => true), 200);
    }
    
    public function get_categories($request) {
        $categories = get_categories(array(
            'hide_empty' => false,
        ));
        
        $response = array();
        
        foreach ($categories as $category) {
            $response[] = array(
                'id' => $category->term_id,
                'name' => $category->name,
                'slug' => $category->slug,
                'count' => $category->count,
            );
        }
        
        return new WP_REST_Response($response, 200);
    }
    
    public function get_tags($request) {
        $tags = get_tags(array(
            'hide_empty' => false,
        ));
        
        $response = array();
        
        foreach ($tags as $tag) {
            $response[] = array(
                'id' => $tag->term_id,
                'name' => $tag->name,
                'slug' => $tag->slug,
                'count' => $tag->count,
            );
        }
        
        return new WP_REST_Response($response, 200);
    }
    
    /**
     * Enqueue frontend scripts
     */
    public function enqueue_scripts() {
        // Add any frontend scripts if needed
    }
    
    /**
     * Enqueue admin scripts
     */
    public function admin_enqueue_scripts($hook) {
        if ($hook !== 'settings_page_skypanel-integration') {
            return;
        }
        
        wp_enqueue_script('skypanel-admin', SKYPANEL_PLUGIN_URL . 'js/admin.js', array('jquery'), SKYPANEL_PLUGIN_VERSION, true);
        wp_enqueue_style('skypanel-admin', SKYPANEL_PLUGIN_URL . 'css/admin.css', array(), SKYPANEL_PLUGIN_VERSION);
    }
    
    /**
     * Add settings link to plugins page
     */
    public function add_settings_link($links) {
        $settings_link = '<a href="' . admin_url('options-general.php?page=skypanel-integration') . '">' . __('Settings', 'skypanel-integration') . '</a>';
        array_unshift($links, $settings_link);
        return $links;
    }
    
    /**
     * Plugin activation
     */
    public function activate() {
        // Set default options
        $default_options = array(
            'enabled' => false,
            'api_key' => '',
            'sync_enabled' => false,
        );
        
        add_option('skypanel_settings', $default_options);
        
        // Flush rewrite rules for REST API
        flush_rewrite_rules();
    }
    
    /**
     * Plugin deactivation
     */
    public function deactivate() {
        // Flush rewrite rules
        flush_rewrite_rules();
    }
}

// Initialize the plugin
new SkyPANELIntegration(); 