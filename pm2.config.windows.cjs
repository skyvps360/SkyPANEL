module.exports = {
  apps: [
    {
      name: "skypanel",
      script: "node",
      args: "dist/index.js",
      exec_mode: "fork",
      instances: "1",
      autorestart: true,
      watch: false,
      max_memory_restart: "2G",
      // Windows specific settings
      merge_logs: true,
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env: {
        "NODE_ENV": "production",
        "PATH": process.env.PATH
      },
      // Windows-specific paths
      cwd: __dirname,
      // Avoid interpreter issues on Windows
      interpreter: null
    }
  ]
};

