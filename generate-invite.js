require('dotenv').config();

const CLIENT_ID = process.env.CLIENT_ID;

if (!CLIENT_ID) {
    console.error('❌ CLIENT_ID không được thiết lập trong file .env');
    console.log('📝 Vui lòng thêm CLIENT_ID=your_client_id vào file .env');
    process.exit(1);
}

// Permissions cần thiết cho bot
const permissions = [
    'SendMessages',           // 2048
    'UseSlashCommands',       // 2147483648  
    'EmbedLinks',            // 16384
    'AttachFiles',           // 32768
    'ReadMessageHistory',    // 65536
    'AddReactions'           // 64
];

// Tính toán permission value
const permissionValue = 2048 + 2147483648 + 16384 + 32768 + 65536 + 64;

// Generate invite URL
const inviteURL = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=${permissionValue}&scope=bot%20applications.commands`;

console.log('🤖 DBD Discord Bot - Invite Link Generator');
console.log('=' .repeat(50));
console.log('');
console.log('📋 Bot Permissions:');
permissions.forEach(perm => console.log(`   ✅ ${perm}`));
console.log('');
console.log('🔗 Invite Link:');
console.log(inviteURL);
console.log('');
console.log('📝 Hướng dẫn:');
console.log('1. Copy link trên');
console.log('2. Paste vào browser');
console.log('3. Chọn server muốn add bot');
console.log('4. Confirm permissions');
console.log('5. Bot sẽ join server!');
console.log('');
console.log('🎮 Commands available:');
console.log('   /perk <name> - Tìm kiếm perk');
console.log('   /perk <name> translate:true - Tìm perk + dịch tiếng Việt');
console.log('');
