const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const DataUpdater = require('../utils/dataUpdater');
const ContextManager = require('../utils/contextManager');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('perk')
        .setDescription('Tìm kiếm thông tin perk trong Dead by Daylight')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Tên perk cần tìm kiếm')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Loại perk (killer/survivor/all)')
                .setRequired(false)
                .addChoices(
                    { name: 'Tất cả', value: 'all' },
                    { name: 'Killer', value: 'killer' },
                    { name: 'Survivor', value: 'survivor' }
                ))
        .addBooleanOption(option =>
            option.setName('translate')
                .setDescription('Dịch mô tả sang tiếng Việt')
                .setRequired(false)),

    async execute(interaction) {
        const perkName = interaction.options.getString('name');
        const perkType = interaction.options.getString('type') || 'all';
        const shouldTranslate = interaction.options.getBoolean('translate') || false;

        // Defer reply vì việc tìm kiếm có thể mất thời gian
        await interaction.deferReply();

        try {
            const dataUpdater = new DataUpdater();
            const results = await dataUpdater.searchPerks(perkName, perkType);

            if (results.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(config.bot.embedColor)
                    .setTitle('❌ Không tìm thấy perk')
                    .setDescription(`Không tìm thấy perk nào với tên "${perkName}"`)
                    .setTimestamp();

                return await interaction.editReply({ embeds: [embed] });
            }

            // Nếu chỉ có 1 kết quả, hiển thị chi tiết
            if (results.length === 1) {
                const perk = results[0];
                const embed = await this.createDetailedPerkEmbed(perk, shouldTranslate);
                return await interaction.editReply({ embeds: [embed] });
            }

            // Nếu có nhiều kết quả, hiển thị danh sách
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor)
                .setTitle(`🔍 Tìm thấy ${results.length} perk`)
                .setDescription(`Kết quả tìm kiếm cho "${perkName}":`)
                .setTimestamp();

            results.forEach((perk, index) => {
                const typeIcon = perk.type === 'killer' ? '🔪' : '🏃';
                const characterInfo = perk.characterName ? ` (${perk.characterName})` : '';
                
                embed.addFields({
                    name: `${index + 1}. ${typeIcon} ${perk.name}`,
                    value: `${perk.type.toUpperCase()}${characterInfo}\n*Dùng \`/perk name:${perk.name}\` để xem chi tiết*`,
                    inline: false
                });
            });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in perk command:', error);
            
            const embed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Lỗi')
                .setDescription('Đã xảy ra lỗi khi tìm kiếm perk. Vui lòng thử lại sau.')
                .setTimestamp();

            try {
                // Kiểm tra xem interaction đã được reply chưa
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ embeds: [embed] });
                } else {
                    await interaction.reply({ embeds: [embed] });
                }
            } catch (replyError) {
                console.error('Error sending error message:', replyError);
            }
        }
    },

    async createDetailedPerkEmbed(perk, shouldTranslate = false) {
        const typeIcon = perk.type === 'killer' ? '🔪' : '🏃';
        const typeText = perk.type === 'killer' ? 'Killer Perk' : 'Survivor Perk';

        // Sử dụng Context Manager để lấy bản dịch
        let description;
        if (shouldTranslate) {
            const contextManager = new ContextManager();
            const originalText = perk.contentText || perk.content;
            const perkURIName = perk.URIName || perk.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            
            description = await contextManager.getTranslation(perkURIName, originalText);
        } else {
            description = this.cleanDescription(perk.contentText || perk.content);
        }
        
        // Format description với bullet points và cấu trúc rõ ràng
        const formattedDescription = this.formatDescription(description, perk.name);
        
        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor)
            .setTitle(`${typeIcon} ${perk.name}`)
            .setDescription(formattedDescription)
            .setTimestamp();

        // Thêm icon nếu có và hợp lệ
        if (perk.iconURL && this.isValidImageURL(perk.iconURL)) {
            embed.setThumbnail(perk.iconURL);
        }

        // Thêm thông tin character nếu có
        if (perk.characterName) {
            embed.addFields({
                name: '👤 Character',
                value: perk.characterName,
                inline: true
            });
        }

        embed.addFields({
            name: '📋 Type',
            value: typeText,
            inline: true
        });

        // Thêm footer
        embed.setFooter({
            text: 'Dead by Daylight • Data from DBD Wiki',
            iconURL: 'https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/f/f0/IconHelp_DBDlogo.png'
        });

        return embed;
    },

    // Làm sạch description và rút ngắn
    cleanDescription(description) {
        if (!description) return 'Không có mô tả.';
        
        // Loại bỏ HTML tags
        let cleaned = description.replace(/<[^>]*>/g, '');
        
        // Thay thế các entity HTML
        cleaned = cleaned
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
        
        // Loại bỏ khoảng trắng thừa
        cleaned = cleaned.replace(/\s+/g, ' ').trim();
        
        // Loại bỏ các thông báo về patch và version
        cleaned = cleaned.replace(/^This description is based on.*?(?=You|Your|When|After|Press|Grants|Increases|Reduces|Unlocks|The|A)/i, '');
        cleaned = cleaned.replace(/^the changes announced for.*?(?=You|Your|When|After|Press|Grants|Increases|Reduces|Unlocks|The|A)/i, '');
        cleaned = cleaned.replace(/^.*?Patch \d+\.\d+\.\d+.*?(?=You|Your|When|After|Press|Grants|Increases|Reduces|Unlocks|The|A)/i, '');
        
        // Loại bỏ khoảng trắng thừa sau khi xóa patch info
        cleaned = cleaned.replace(/^\s+/, '').trim();
        
        // Loại bỏ quote ở cuối nhưng giữ lại toàn bộ mô tả perk
        cleaned = cleaned.replace(/\s*"[^"]*"\s*—\s*[^"]*$/g, '').trim();
        
        // Đảm bảo câu kết thúc đúng cách
        if (cleaned && !cleaned.match(/[.!?]$/)) {
            // Tìm dấu chấm cuối cùng hợp lý
            const lastPeriod = cleaned.lastIndexOf('.');
            if (lastPeriod > cleaned.length - 100 && lastPeriod > cleaned.length * 0.7) {
                cleaned = cleaned.substring(0, lastPeriod + 1);
            }
        }
        
        // Giới hạn độ dài hợp lý (Discord embed limit)
        if (cleaned.length > 1000) {
            cleaned = cleaned.substring(0, 997) + '...';
        }
        
        return cleaned || 'Không có mô tả.';
    },

    // Format description giống hệt như trong game
    formatDescription(description, perkName = '') {
        if (!description) return 'Không có mô tả.';

        let formatted = description;

        // Làm nổi bật tên perk
        if (perkName) {
            formatted = formatted.replace(new RegExp(`\\b${perkName}\\b`, 'g'), `**${perkName}**`);
        }

        // Làm nổi bật các thuật ngữ game
        formatted = formatted
            .replace(/\b(Aura|Skill Check|Terror Radius|Generator|Hook|Health State)\b/g, '**$1**')
            .replace(/\b(Exhausted|Endurance|Haste|Hindered|Exposed|Undetectable|Oblivious|Blindness|Broken|Deep Wound)\b/g, '**$1**')
            .replace(/(\d+(?:[/]\d+)*)\s*(%|giây|mét|seconds?|metres?)/g, '**$1$2**');

        // Xử lý cấu trúc đặc biệt cho Aftercare-style perks
        if (formatted.includes('một khi bất kỳ điều kiện nào sau đây được đáp ứng') || 
            formatted.includes('once any of the following conditions have been met')) {
            
            // Tách phần mở đầu và điều kiện
            const parts = formatted.split(/(?:một khi bất kỳ điều kiện nào sau đây được đáp ứng|once any of the following conditions have been met)[.:]/i);
            
            if (parts.length >= 2) {
                const intro = parts[0].trim();
                const conditions = parts[1].trim();
                
                // Tách các điều kiện thành bullet points
                const conditionList = conditions
                    .split(/\.\s+/)
                    .filter(c => c.trim())
                    .map(condition => {
                        let c = condition.trim();
                        if (!c.endsWith('.')) c += '.';
                        
                        // Thêm bullet point cho các điều kiện
                        if (c.match(/^(Bạn đã|Họ đã|You have|They have)/)) {
                            return '• ' + c;
                        }
                        return c;
                    })
                    .join('\n');
                
                formatted = intro + ':\n\n' + conditionList;
            }
        } else {
            // Format thông thường - tách câu và thêm bullet points
            const sentences = formatted.split(/\.\s+/);
            const formattedSentences = [];
            
            for (let i = 0; i < sentences.length; i++) {
                let sentence = sentences[i].trim();
                if (!sentence) continue;
                
                if (!sentence.endsWith('.')) sentence += '.';
                
                // Thêm bullet point cho điều kiện
                if (sentence.match(/^(Bạn đã|Họ đã|You have|They have|Tăng|Giảm|Increases?|Decreases?)/)) {
                    sentence = '• ' + sentence;
                }
                
                formattedSentences.push(sentence);
            }
            
            formatted = formattedSentences.join('\n');
        }

        // Làm sạch format cuối cùng
        formatted = formatted
            .replace(/\n\s*\n\s*\n/g, '\n\n')
            .replace(/^\s+/gm, '')
            .trim();

        return formatted;
    },

    // Kiểm tra URL hình ảnh có hợp lệ không
    isValidImageURL(url) {
        if (!url || typeof url !== 'string') return false;

        // Loại bỏ data URLs và placeholder images
        if (url.startsWith('data:image') || url.includes('base64')) return false;

        // Kiểm tra URL có hợp lệ không
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    }
};
