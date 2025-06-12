module.exports = {
  apps: [
    {
      name: "skypanel",
      script: "npm",
      args: "run start",
      exec_mode: "fork", // Using cluster mode for high availability
      instances: "1",
      autorestart: true,
      watch: false, // Disable watch mode in production
      max_memory_restart: "2G",
      // Production specific settings
      merge_logs: true,
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z"
    }
  ]
};
