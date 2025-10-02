const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Hiển thị hướng dẫn sử dụng bot'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(config.bot.embedColor)
            .setTitle('🆘 Hướng dẫn sử dụng DBD Bot')
            .setDescription('Bot này giúp bạn tìm kiếm thông tin về các perk trong Dead by Daylight')
            .addFields(
                {
                    name: '🔍 `/perk <name> [type]`',
                    value: 'Tìm kiếm perk theo tên\n' +
                           '• `name`: Tên perk cần tìm\n' +
                           '• `type`: Loại perk (killer/survivor/all - mặc định: all)\n' +
                           '**Ví dụ:** `/perk name:Hex type:killer`',
                    inline: false
                },
                {
                    name: '🔄 `/update`',
                    value: 'Cập nhật dữ liệu từ DBD Wiki (chỉ admin)\n' +
                           'Dữ liệu sẽ tự động cập nhật mỗi giờ',
                    inline: false
                },
                {
                    name: '🆘 `/help`',
                    value: 'Hiển thị hướng dẫn này',
                    inline: false
                },
                {
                    name: '💡 Mẹo sử dụng',
                    value: '• Bạn có thể tìm kiếm theo tên perk hoặc tên character\n' +
                           '• Bot sẽ hiển thị danh sách nếu tìm thấy nhiều kết quả\n' +
                           '• Sử dụng tên chính xác để xem thông tin chi tiết\n' +
                           '• Dữ liệu được cache và cập nhật tự động',
                    inline: false
                }
            )
            .setThumbnail('https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/f/f0/IconHelp_DBDlogo.png')
            .setTimestamp()
            .setFooter({
                text: 'Dead by Daylight Bot • Dữ liệu từ DBD Wiki',
                iconURL: 'https://static.wikia.nocookie.net/deadbydaylight_gamepedia_en/images/f/f0/IconHelp_DBDlogo.png'
            });

        await interaction.reply({ embeds: [embed] });
    }
};
