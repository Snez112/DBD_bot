# 🤖 Setup Public Discord Bot

## 1. Tạo OAuth2 Invite Link

### Bước 1: Vào Discord Developer Portal
- Truy cập: https://discord.com/developers/applications
- Chọn bot của bạn

### Bước 2: OAuth2 > URL Generator
- **Scopes:** ✅ `bot` + ✅ `applications.commands`
- **Bot Permissions:**
  - ✅ Send Messages
  - ✅ Use Slash Commands  
  - ✅ Embed Links
  - ✅ Attach Files
  - ✅ Read Message History
  - ✅ Add Reactions

### Bước 3: Copy Generated URL
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_ID&permissions=2147483648&scope=bot%20applications.commands
```

## 2. Host Bot 24/7

### Option 1: VPS (Khuyến nghị)
- **DigitalOcean:** $5/tháng
- **Vultr:** $2.5/tháng  
- **AWS EC2:** Free tier 1 năm

### Option 2: Free Hosting
- **Railway:** 500h/tháng free
- **Render:** Free tier
- **Heroku:** $7/tháng (không còn free)

### Option 3: Raspberry Pi
- Chạy tại nhà 24/7
- Chi phí điện ~$2/tháng

## 3. Cấu hình Production

### Environment Variables (.env)
```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
NODE_ENV=production
```

### Package.json Scripts
```json
{
  "scripts": {
    "start": "node src/bot.js",
    "pm2": "pm2 start src/bot.js --name dbd-bot"
  }
}
```

### PM2 (Process Manager)
```bash
npm install -g pm2
pm2 start src/bot.js --name dbd-bot
pm2 startup
pm2 save
```

## 4. Deploy Steps

### VPS Setup:
```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PM2
sudo npm install -g pm2

# 4. Clone your bot
git clone your-repo-url
cd your-bot-folder

# 5. Install dependencies
npm install

# 6. Setup environment
nano .env
# Add your tokens

# 7. Deploy commands
npm run deploy-commands

# 8. Start bot
pm2 start src/bot.js --name dbd-bot
pm2 startup
pm2 save
```

## 5. Bot Features for Public Use

### Auto-deploy commands khi start
```javascript
// src/bot.js
client.once('ready', async () => {
    console.log('Bot is ready!');
    
    // Auto deploy commands
    try {
        await deployCommands();
        console.log('✅ Commands deployed');
    } catch (error) {
        console.error('❌ Failed to deploy commands:', error);
    }
});
```

### Error handling
```javascript
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    process.exit(1);
});
```

### Logging
```javascript
const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});
```

## 6. Bot Listing (Optional)

### Top.gg
- Submit bot tại: https://top.gg/
- Cần 75+ servers để list

### Discord Bot List
- https://discordbotlist.com/
- Free listing

### Yêu cầu:
- ✅ Bot hoạt động 24/7
- ✅ Có invite link
- ✅ Mô tả rõ ràng
- ✅ Icon đẹp
- ✅ Commands hữu ích

## 7. Monitoring

### Uptime monitoring
```javascript
// Health check endpoint
const express = require('express');
const app = express();

app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        uptime: process.uptime(),
        guilds: client.guilds.cache.size 
    });
});

app.listen(3000);
```

### Stats tracking
```javascript
// Track usage
client.on('interactionCreate', async (interaction) => {
    if (interaction.isCommand()) {
        console.log(`Command used: ${interaction.commandName} by ${interaction.user.tag} in ${interaction.guild?.name}`);
        
        // Save to database or file
        logUsage(interaction);
    }
});
```
