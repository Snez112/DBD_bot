// Load environment variables
require('dotenv').config();

module.exports = {
    // Discord Bot Token - Cần được set trong environment variable
    token: process.env.DISCORD_TOKEN,
    
    // Client ID của Discord Application
    clientId: process.env.CLIENT_ID,
    
    // Guild ID (Server ID) để test commands (optional)
    guildId: process.env.GUILD_ID,
    
    // Wiki URLs cho scraping DBD data
    wiki: {
        baseUrl: 'https://deadbydaylight.fandom.com',
        perksPage: 'https://deadbydaylight.fandom.com/wiki/Perks',
        killersPage: 'https://deadbydaylight.fandom.com/wiki/Killers',
        survivorsPage: 'https://deadbydaylight.fandom.com/wiki/Survivors'
    },
    
    // Đường dẫn file JSON để lưu data
    dataFiles: {
        killerPerks: './src/data/killer_perks.json',
        survivorPerks: './src/data/survivor_perks.json',
        killers: './src/data/killers.json',
        survivors: './src/data/survivors.json'
    },
    
    // Thời gian cache data (milliseconds) - 1 hour
    cacheTime: 60 * 60 * 1000,
    
    // Bot settings
    bot: {
        prefix: '!',
        embedColor: '#8B0000', // Dark red color matching DBD theme
        maxResults: 5 // Maximum number of search results to show
    }
};
