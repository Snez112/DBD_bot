// Load environment variables
require('dotenv').config();

const { Client, Collection, GatewayIntentBits, Events, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const DataUpdater = require('./utils/dataUpdater');

// Tạo Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// Collection để lưu commands
client.commands = new Collection();

// Load commands từ thư mục commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️ Command at ${filePath} is missing required "data" or "execute" property.`);
    }
}

// Event: Bot ready
client.once(Events.ClientReady, async (readyClient) => {
    console.log(`🚀 Bot đã sẵn sàng! Đăng nhập với tên: ${readyClient.user.tag}`);
    
    // Set bot status
    client.user.setActivity('/perk - Dead by Daylight Perks', { type: ActivityType.Playing });
    console.log(`🌐 Bot đang hoạt động trên ${client.guilds.cache.size} servers`);
    
    // Khởi tạo data updater và load data ban đầu
    try {
        console.log('📥 Đang tải dữ liệu ban đầu...');
        const dataUpdater = new DataUpdater();
        await dataUpdater.updateAllData();
        console.log('✅ Dữ liệu đã được tải thành công!');
        
        // Setup auto-update mỗi giờ
        setInterval(async () => {
            try {
                console.log('🔄 Tự động cập nhật dữ liệu...');
                await dataUpdater.updateAllData();
                console.log('✅ Tự động cập nhật thành công!');
            } catch (error) {
                console.error('❌ Lỗi tự động cập nhật:', error.message);
            }
        }, config.cacheTime);
        
    } catch (error) {
        console.error('❌ Lỗi khi tải dữ liệu ban đầu:', error.message);
        console.log('⚠️ Bot sẽ tiếp tục chạy nhưng có thể không có dữ liệu.');
    }
});

// Event: Interaction (slash commands)
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`❌ Không tìm thấy command: ${interaction.commandName}`);
        return;
    }

    try {
        console.log(`📝 Executing command: ${interaction.commandName} by ${interaction.user.tag}`);
        await command.execute(interaction);
    } catch (error) {
        console.error(`❌ Lỗi khi thực thi command ${interaction.commandName}:`, error);
        
        const errorMessage = {
            content: '❌ Đã xảy ra lỗi khi thực thi lệnh này!',
            ephemeral: true
        };
        
        try {
            if (interaction.replied) {
                await interaction.followUp(errorMessage);
            } else if (interaction.deferred) {
                await interaction.editReply(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        } catch (replyError) {
            console.error('❌ Không thể gửi error message:', replyError);
        }
    }
});

// Event: Error handling
client.on(Events.Error, error => {
    console.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('❌ Uncaught exception:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Đang tắt bot...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Đang tắt bot...');
    client.destroy();
    process.exit(0);
});

// Kiểm tra token
if (!config.token) {
    console.error('❌ DISCORD_TOKEN không được thiết lập trong file .env');
    console.log('📝 Vui lòng tạo file .env và thêm DISCORD_TOKEN=your_bot_token');
    process.exit(1);
}

// Error handling cho production
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error);
    // Không exit trong production để bot không crash
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
});

// Đăng nhập bot
client.login(config.token);
