// Load environment variables
require('dotenv').config();

const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

// Load commands
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️ Command at ${filePath} is missing required "data" or "execute" property.`);
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(config.token);

// Deploy commands
(async () => {
    try {
        console.log(`🚀 Started refreshing ${commands.length} application (/) commands.`);

        let data;
        
        if (config.guildId) {
            // Deploy to specific guild (faster for development)
            console.log(`📍 Deploying to guild: ${config.guildId}`);
            data = await rest.put(
                Routes.applicationGuildCommands(config.clientId, config.guildId),
                { body: commands }
            );
        } else {
            // Deploy globally (takes up to 1 hour to update)
            console.log('🌍 Deploying globally...');
            data = await rest.put(
                Routes.applicationCommands(config.clientId),
                { body: commands }
            );
        }

        console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
        
        // List deployed commands
        console.log('\n📋 Deployed commands:');
        data.forEach(command => {
            console.log(`  • /${command.name} - ${command.description}`);
        });
        
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
        
        if (error.code === 50001) {
            console.log('💡 Lỗi: Bot thiếu quyền. Hãy đảm bảo bot có quyền "applications.commands"');
        } else if (error.code === 10002) {
            console.log('💡 Lỗi: CLIENT_ID không hợp lệ. Kiểm tra lại CLIENT_ID trong file .env');
        } else if (error.rawError?.message?.includes('Invalid Form Body')) {
            console.log('💡 Lỗi: Command format không hợp lệ. Kiểm tra lại cấu trúc commands');
        }
    }
})();
