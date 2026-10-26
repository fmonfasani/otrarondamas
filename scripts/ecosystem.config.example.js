/**
 * PM2 Ecosystem Configuration for Wapsell
 *
 * Copy this file to /var/www/wapsell/ecosystem.config.js on Hetzner
 * Then run: pm2 start ecosystem.config.js
 *
 * Author: Claude Haiku 4.5
 * Date: 2026-10-26
 */

module.exports = {
  apps: [
    {
      // Application name
      name: 'wapsell',

      // Main entry point (after build)
      script: './dist/src/main.js',

      // Number of instances (1 for single, 'max' for CPU count)
      instances: 1,

      // Execution mode: 'fork' (single) or 'cluster'
      exec_mode: 'fork',

      // Watch mode (restart on file changes - DISABLE in production)
      watch: false,

      // Ignore files when watching
      ignore_watch: ['node_modules', 'dist', '.git', '.env'],

      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },

      // Error log file
      error_file: '/var/log/wapsell.err.log',

      // Output log file
      out_file: '/var/log/wapsell.out.log',

      // Combined log file
      log_file: '/var/log/wapsell.log',

      // Include date/time in logs
      time: true,

      // Max memory allowed
      max_memory_restart: '1G',

      // Merge logs from all instances
      merge_logs: true,

      // Graceful shutdown timeout (ms)
      kill_timeout: 5000,

      // Wait time before considering app crashed (ms)
      listen_timeout: 3000,

      // Max restarts in a minute before stopping auto-restart
      max_restarts: 10,

      // Min uptime before considering app as unstable (ms)
      min_uptime: '10s',

      // Auto-restart if app uses more than max_memory_restart
      autorestart: true,

      // Cron string for scheduled restart
      cron_restart: '0 0 * * *', // Daily at midnight

      // Enable auto-increase of ulimit
      autogrow_memory: true,

      // Custom error handlers
      error_handler: true,

      // Node args (if needed)
      // node_args: ['--max-old-space-size=4096']
    }
  ],

  // Deploy configuration (optional)
  deploy: {
    production: {
      user: 'root',
      host: '89.167.96.239',
      ref: 'origin/main',
      repo: 'git@github.com:fmonfasani/wapsell.git',
      path: '/var/www/wapsell',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
};

/**
 * USAGE EXAMPLES:
 *
 * Start application:
 *   pm2 start ecosystem.config.js
 *
 * Restart application:
 *   pm2 restart wapsell
 *
 * Stop application:
 *   pm2 stop wapsell
 *
 * Delete from PM2:
 *   pm2 delete wapsell
 *
 * View logs:
 *   pm2 logs wapsell
 *   pm2 logs wapsell --lines 100
 *
 * Monitor:
 *   pm2 monit
 *
 * Status:
 *   pm2 status
 *
 * Enable auto-start on reboot:
 *   pm2 startup
 *   pm2 save
 *
 * Disable auto-start:
 *   pm2 unstartup
 *
 * Remove from startup:
 *   pm2 save --force
 */
