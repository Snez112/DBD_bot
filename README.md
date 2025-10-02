# DBD Discord Bot

Discord bot để tìm kiếm thông tin perk trong Dead by Daylight, scrape dữ liệu trực tiếp từ [Dead by Daylight Wiki](https://deadbydaylight.fandom.com/wiki/Perks).

## Tính năng

- 🔍 **Tìm kiếm perk**: Tìm kiếm perk theo tên hoặc character
- 📊 **Hiển thị chi tiết**: Tên, icon, mô tả và thông tin character
- 💾 **Cache thông minh**: Dữ liệu được lưu trong JSON và tự động cập nhật
- 🔄 **Auto-update**: Tự động cập nhật dữ liệu mỗi giờ
- 🎨 **Giao diện đẹp**: Sử dụng Discord embeds với theme DBD

## Cấu trúc thư mục

```
DBD_bot/
├── src/
│   ├── commands/          # Slash commands
│   │   ├── perk.js       # Command tìm kiếm perk
│   │   ├── update.js     # Command cập nhật data (admin)
│   │   └── help.js       # Command trợ giúp
│   ├── utils/
│   │   └── dataUpdater.js # Module fetch và cache data
│   ├── data/             # File JSON cache (tự động tạo)
│   └── bot.js            # Main bot file
├── config/
│   └── config.js         # Cấu hình bot
├── package.json
├── .env.example
└── README.md
```

## Cài đặt

### 1. Clone repository

```bash
git clone <your-repo-url>
cd DBD_bot
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Tạo Discord Application

1. Truy cập [Discord Developer Portal](https://discord.com/developers/applications)
2. Tạo New Application
3. Vào tab "Bot" và tạo bot
4. Copy Bot Token
5. Vào tab "OAuth2" > "URL Generator":
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Use Slash Commands`, `Embed Links`

### 4. Cấu hình environment

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Điền thông tin vào `.env`:

```env
DISCORD_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_application_client_id
GUILD_ID=your_test_server_id_optional
```

### 5. Deploy commands

```bash
node src/deploy-commands.js
```

### 6. Chạy bot

```bash
# Production
npm start

# Development (với nodemon)
npm run dev
```

## Commands

### `/perk <name> [type]`
Tìm kiếm perk theo tên

**Parameters:**
- `name` (required): Tên perk cần tìm
- `type` (optional): Loại perk (`killer`/`survivor`/`all`)

**Ví dụ:**
- `/perk name:Hex` - Tìm tất cả perk có chứa "Hex"
- `/perk name:Dead Hard type:survivor` - Tìm perk "Dead Hard" trong survivor perks
- `/perk name:Trapper` - Tìm perk của Trapper

### `/update`
Cập nhật dữ liệu từ DBD Wiki (chỉ admin)

### `/help`
Hiển thị hướng dẫn sử dụng

## Dữ liệu

Bot scrape dữ liệu trực tiếp từ [Dead by Daylight Wiki](https://deadbydaylight.fandom.com/wiki/Perks):

- **Killer Perks**: Tất cả perk của killer (133 perks)
- **Survivor Perks**: Tất cả perk của survivor (149 perks)
- **Icon và Description**: Lấy từ wiki chính thức
- **Character Info**: Thông tin character sở hữu perk

Dữ liệu được cache trong file JSON và tự động cập nhật mỗi giờ.

## Cấu hình

Chỉnh sửa `config/config.js` để thay đổi:

- Màu embed
- Thời gian cache
- Số lượng kết quả tối đa
- API endpoints

## Scripts

```bash
# Chạy bot
npm start

# Development với auto-reload
npm run dev

# Cập nhật dữ liệu thủ công
npm run update-data
```

## Troubleshooting

### Bot không phản hồi commands
1. Kiểm tra bot đã được invite với đúng permissions
2. Đảm bảo commands đã được deploy: `node src/deploy-commands.js`
3. Kiểm tra console logs để xem lỗi

### Lỗi fetch dữ liệu
1. Kiểm tra kết nối internet
2. API có thể tạm thời không khả dụng
3. Bot sẽ sử dụng dữ liệu cache nếu có

### Commands không hiển thị
1. Đợi vài phút sau khi deploy (guild commands)
2. Hoặc đợi tối đa 1 giờ (global commands)
3. Kick và re-invite bot

## Contributing

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push và tạo Pull Request

## License

MIT License - xem file LICENSE để biết thêm chi tiết.

## Credits

- Dữ liệu từ [Dead by Daylight Wiki](https://deadbydaylight.fandom.com/wiki/Perks)
- Dead by Daylight © Behaviour Interactive Inc.
- Cảm ơn [DBD-Database](https://github.com/Techial/DBD-Database.git) by Techial cho ý tưởng ban đầu
