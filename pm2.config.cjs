module.exports = {
  apps: [
    {
      name: "skypanel",
      script: "npm",
      args: "run start",
      exec_mode: "cluster", // Using cluster mode for high availability
      instances: "max",
      autorestart: true,
      watch: false, // Disable watch mode in production
      max_memory_restart: "2G",
      // Production specific settings
      merge_logs: true,
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      
      // Advanced metrics configuration
      node_args: "--expose-gc",
      env: {
        NODE_ENV: "production"
      },
      
      // PM2 metrics configuration
      metrics: {
        http: true,               // Enable HTTP metrics
        runtime: true,            // Enable runtime metrics
        network: true,            // Enable network metrics
        custom_metrics: true      // Enable ability to create custom metrics
      },
      
      // Set up metrics retention
      trace: true,                // Enable tracing for better debugging
      deep_monitoring: true,      // Enable deep monitoring for more granular metrics
      
      // Garbage collection profiling
      profiling: true,
      
      // Instance restart behavior
      min_uptime: "120s",          // Minimum uptime to consider app as running successfully
      // max_restarts: 10,           // Maximum number of restarts if app crashes
      restart_delay: 4000,        // Delay between automatic restarts (ms)
      
      // Increase log capabilities
      error_file: "logs/skypanel-error.log",
      out_file: "logs/skypanel-out.log",
      log_type: "json"
    }
  ],
  
  // Module configuration for additional metrics
  module_conf: {
    // CPU/Memory profiling
    profiling: {
      enabled: true,
      heap_snapshot: true,
      cpu_js: true
    }
  }
};
