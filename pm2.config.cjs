module.exports = {
  apps: [
    {
      name: "skypanel",
      script: "dist/index.js",
      env: {
        NODE_ENV: "production"
      },
      exec_mode: "cluster",
      instances: "max",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G"
    }
  ]
};
