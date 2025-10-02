# 🖥️ Cấu hình Server để Deploy DBD Bot

## 📋 Yêu cầu hệ thống

### Minimum Requirements:
- **RAM:** 512MB (khuyến nghị 1GB+)
- **CPU:** 1 vCPU
- **Storage:** 10GB SSD
- **Bandwidth:** 1TB/tháng
- **OS:** Ubuntu 20.04+ / CentOS 8+ / Debian 11+

### Recommended VPS Providers:
- **DigitalOcean:** $4-6/tháng
- **Vultr:** $2.5-5/tháng  
- **Linode:** $5/tháng
- **AWS EC2:** t2.micro (free tier)
- **Google Cloud:** e2-micro (free tier)

## 🚀 Setup Server từ đầu

### 1. Kết nối SSH
```bash
ssh root@your-server-ip
# Hoặc
ssh username@your-server-ip
```

### 2. Update hệ thống
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
# hoặc
sudo dnf update -y
```

### 3. Tạo user cho bot (khuyến nghị)
```bash
# Tạo user mới
sudo adduser dbdbot

# Thêm vào sudo group
sudo usermod -aG sudo dbdbot

# Chuyển sang user mới
su - dbdbot
```

### 4. Cài đặt Node.js
```bash
# Cách 1: NodeSource repository (khuyến nghị)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Cách 2: Snap
sudo snap install node --classic

# Cách 3: NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

### 5. Cài đặt Git
```bash
sudo apt install git -y
```

### 6. Cài đặt PM2 (Process Manager)
```bash
sudo npm install -g pm2
```

### 7. Cài đặt Nginx (optional - cho reverse proxy)
```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

## 📁 Deploy Bot

### 1. Clone repository
```bash
# Tạo thư mục cho bot
mkdir ~/bots
cd ~/bots

# Clone từ GitHub
git clone https://github.com/yourusername/DBD_bot.git
cd DBD_bot

# Hoặc upload file qua SCP/SFTP
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Cấu hình environment
```bash
# Tạo file .env
nano .env

# Thêm nội dung:
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_client_id
GUILD_ID=your_test_guild_id
NODE_ENV=production
```

### 4. Build contexts và deploy commands
```bash
# Build tất cả contexts
npm run build-contexts

# Deploy slash commands
npm run deploy-commands
```

### 5. Test bot local trước
```bash
npm start
# Ctrl+C để dừng sau khi test
```

### 6. Start với PM2
```bash
# Start bot
pm2 start src/bot.js --name dbd-bot

# Xem status
pm2 status

# Xem logs
pm2 logs dbd-bot

# Setup auto-restart khi server reboot
pm2 startup
# Copy và chạy command được suggest

# Save current processes
pm2 save
```

## 🔧 Cấu hình nâng cao

### 1. PM2 Ecosystem File
```bash
# Tạo ecosystem.config.js
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'dbd-bot',
    script: 'src/bot.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

```bash
# Tạo thư mục logs
mkdir logs

# Start với ecosystem
pm2 start ecosystem.config.js
```

### 2. Nginx Reverse Proxy (nếu cần web interface)
```bash
sudo nano /etc/nginx/sites-available/dbd-bot
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /health {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/dbd-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Firewall setup
```bash
# UFW (Ubuntu)
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Hoặc iptables
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

### 4. SSL Certificate (nếu có domain)
```bash
# Certbot
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## 📊 Monitoring & Maintenance

### 1. System monitoring
```bash
# Cài đặt htop
sudo apt install htop -y

# Check system resources
htop
free -h
df -h
```

### 2. Bot monitoring
```bash
# PM2 monitoring
pm2 monit

# Logs
pm2 logs dbd-bot --lines 100

# Restart bot
pm2 restart dbd-bot

# Update bot
cd ~/bots/DBD_bot
git pull
npm install
pm2 restart dbd-bot
```

### 3. Auto-update script
```bash
nano update-bot.sh
```

```bash
#!/bin/bash
cd ~/bots/DBD_bot
echo "Pulling latest changes..."
git pull
echo "Installing dependencies..."
npm install
echo "Building contexts..."
npm run build-contexts
echo "Restarting bot..."
pm2 restart dbd-bot
echo "Bot updated successfully!"
```

```bash
chmod +x update-bot.sh
```

### 4. Backup script
```bash
nano backup-bot.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="~/backups/dbd-bot_$DATE"

mkdir -p ~/backups
cp -r ~/bots/DBD_bot $BACKUP_DIR
echo "Backup created: $BACKUP_DIR"

# Keep only last 7 backups
cd ~/backups
ls -t | tail -n +8 | xargs rm -rf
```

```bash
chmod +x backup-bot.sh

# Setup cron job cho auto backup
crontab -e
# Thêm dòng: 0 2 * * * ~/backup-bot.sh
```

## 🔒 Security Best Practices

### 1. SSH Security
```bash
# Đổi SSH port
sudo nano /etc/ssh/sshd_config
# Port 2222

# Disable root login
# PermitRootLogin no

# Restart SSH
sudo systemctl restart ssh
```

### 2. Fail2Ban
```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Regular updates
```bash
# Setup auto security updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure unattended-upgrades
```

## 📈 Performance Optimization

### 1. Swap file (nếu RAM thấp)
```bash
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2. Node.js optimization
```bash
# Trong .env thêm:
NODE_OPTIONS="--max-old-space-size=512"
```

### 3. PM2 cluster mode (nếu cần)
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'dbd-bot',
    script: 'src/bot.js',
    instances: 'max', // Hoặc số cụ thể
    exec_mode: 'cluster'
  }]
};
```

## 🚨 Troubleshooting

### Common Issues:

1. **Bot không start:**
```bash
pm2 logs dbd-bot
# Check .env file
# Check permissions
```

2. **Out of memory:**
```bash
# Check memory usage
free -h
# Add swap file
# Restart bot
pm2 restart dbd-bot
```

3. **Commands không work:**
```bash
# Re-deploy commands
npm run deploy-commands
```

4. **Data không update:**
```bash
# Check internet connection
# Check API endpoints
# Manual update
npm run update-data
```

## 📞 Support Commands

```bash
# Generate invite link
npm run generate-invite

# Check bot status
pm2 status

# View real-time logs
pm2 logs dbd-bot --lines 0

# Restart bot
pm2 restart dbd-bot

# Update contexts
npm run retranslate-all

# Full redeploy
git pull && npm install && npm run deploy && pm2 restart dbd-bot
```
