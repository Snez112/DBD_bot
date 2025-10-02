module.exports = {
  apps: [{
    name: 'dbd-bot',
    script: 'src/bot.js',
    
    // Basic settings
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    
    // Environment
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    },
    
    // Logging
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    
    // Advanced settings
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    // Restart settings
    min_uptime: '10s',
    max_restarts: 10,
    
    // Source map support
    source_map_support: true,
    
    // Instance variables
    instance_var: 'INSTANCE_ID'
  }],

  deploy: {
    production: {
      user: 'dbdbot',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'https://github.com/yourusername/DBD_bot.git',
      path: '/home/dbdbot/bots',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build-contexts && npm run deploy-commands && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
