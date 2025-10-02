const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const DataUpdater = require('../utils/dataUpdater');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('update')
        .setDescription('Cập nhật dữ liệu perk từ DBD Wiki (chỉ admin)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Defer reply vì việc update có thể mất thời gian
        await interaction.deferReply();

        try {
            const embed = new EmbedBuilder()
                .setColor(config.bot.embedColor)
                .setTitle('🔄 Đang cập nhật dữ liệu...')
                .setDescription('Đang tải dữ liệu mới từ DBD Wiki, vui lòng đợi...')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            const dataUpdater = new DataUpdater();
            const startTime = Date.now();
            
            // Force update tất cả data
            const data = await dataUpdater.updateAllData();
            
            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);

            // Đếm số lượng data
            const killerPerksCount = data.killerPerks?.perks?.length || 0;
            const survivorPerksCount = data.survivorPerks?.perks?.length || 0;
            const killersCount = data.killers?.killers?.length || 0;
            const survivorsCount = data.survivors?.survivors?.length || 0;

            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('✅ Cập nhật dữ liệu thành công!')
                .setDescription('Dữ liệu đã được cập nhật từ DBD Wiki')
                .addFields(
                    {
                        name: '🔪 Killer Perks',
                        value: `${killerPerksCount} perks`,
                        inline: true
                    },
                    {
                        name: '🏃 Survivor Perks',
                        value: `${survivorPerksCount} perks`,
                        inline: true
                    },
                    {
                        name: '👹 Killers',
                        value: `${killersCount} killers`,
                        inline: true
                    },
                    {
                        name: '👥 Survivors',
                        value: `${survivorsCount} survivors`,
                        inline: true
                    },
                    {
                        name: '⏱️ Thời gian',
                        value: `${duration}s`,
                        inline: true
                    },
                    {
                        name: '📅 Cập nhật lúc',
                        value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                        inline: true
                    }
                )
                .setTimestamp()
                .setFooter({
                    text: 'Dead by Daylight • Data from DBD Wiki',
                    iconURL: 'https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/f/f0/IconHelp_DBDlogo.png'
                });

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error in update command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('❌ Lỗi cập nhật dữ liệu')
                .setDescription(`Đã xảy ra lỗi khi cập nhật dữ liệu:\n\`\`\`${error.message}\`\`\``)
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};
