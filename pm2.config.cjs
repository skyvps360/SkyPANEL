module.exports = {
  apps: [
    {
      name: "skypanel-dev",
      script: "npm",
      args: "run dev",
      env: {
        NODE_ENV: "development"
      },
      exec_mode: "cluster", // Use fork mode for development
      instances: "max",
      autorestart: true,
      watch: true, // tsx already handles file watching
      max_memory_restart: "1G",
      // Development specific settings
      merge_logs: true,
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z"
    }
  ]
};
