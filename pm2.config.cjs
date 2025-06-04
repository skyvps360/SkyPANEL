module.exports = {
  apps: [
    {
      name: "skypanel",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production"
      },
      exec_mode: "cluster", // Using cluster mode for high availability
      instances: "max",
      autorestart: true,
      watch: false, // Disable watch mode in production
      max_memory_restart: "1G",
      // Production specific settings
      merge_logs: true,
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z"
    }
  ]
};
