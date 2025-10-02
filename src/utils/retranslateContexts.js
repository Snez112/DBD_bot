const fs = require('fs-extra');
const path = require('path');
const Translator = require('./translator');

class ContextRetranslator {
    constructor() {
        this.translator = new Translator();
        this.contextFile = path.join(__dirname, '../data/translated_contexts.json');
        this.backupFile = path.join(__dirname, '../data/translated_contexts_backup.json');
    }

    // Backup file hiện tại
    async backupCurrentFile() {
        try {
            if (await fs.pathExists(this.contextFile)) {
                await fs.copy(this.contextFile, this.backupFile);
                console.log('✅ Backed up current contexts to translated_contexts_backup.json');
            }
        } catch (error) {
            console.error('❌ Failed to backup:', error.message);
        }
    }

    // Kiểm tra xem text có cần dịch lại không
    needsRetranslation(text) {
        if (!text || typeof text !== 'string') return true;
        
        // Kiểm tra các dấu hiệu chưa được dịch hoặc dịch sai
        const englishPatterns = [
            /\b(You|Your|The|When|After|Press|Grants|Increases|Reduces|Unlocks)\b/,
            /\b(activates|triggers|causes|reveals|allows|enables)\b/,
            /\b(seconds|minutes|metres|meters)\b/,
            /\b(Survivor|Killer)\s+(perks?|abilities?)/i,
            /^[A-Z][a-z]+\s+[a-z]+.*[a-z]\.$/  // Câu tiếng Anh thông thường
        ];
        
        return englishPatterns.some(pattern => pattern.test(text));
    }

    // Dịch lại một context
    async retranslateContext(key, context) {
        try {
            const original = context.original;
            const currentVietnamese = context.vietnamese;
            
            // Kiểm tra xem có cần dịch lại không
            if (!this.needsRetranslation(currentVietnamese)) {
                console.log(`✅ Skip ${key}: Already well translated`);
                return context;
            }
            
            console.log(`🔄 Retranslating ${key}...`);
            
            // Dịch lại
            const newVietnamese = await this.translator.translateDescription(original);
            
            // So sánh với bản cũ
            if (newVietnamese !== currentVietnamese) {
                console.log(`   📝 Updated translation for ${key}`);
                console.log(`   Old: ${currentVietnamese.substring(0, 80)}...`);
                console.log(`   New: ${newVietnamese.substring(0, 80)}...`);
            }
            
            return {
                ...context,
                vietnamese: newVietnamese,
                retranslatedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error(`❌ Failed to retranslate ${key}:`, error.message);
            return context; // Giữ nguyên nếu lỗi
        }
    }

    // Dịch lại tất cả contexts
    async retranslateAll() {
        console.log('🚀 Starting retranslation of all contexts...');
        
        try {
            // Backup trước
            await this.backupCurrentFile();
            
            // Load contexts hiện tại
            const contexts = await fs.readJson(this.contextFile);
            
            if (!contexts.perkDescriptions) {
                throw new Error('Invalid contexts file structure');
            }
            
            const perkKeys = Object.keys(contexts.perkDescriptions);
            console.log(`📊 Found ${perkKeys.length} perks to check`);
            
            let retranslated = 0;
            let skipped = 0;
            
            // Dịch lại từng perk
            for (let i = 0; i < perkKeys.length; i++) {
                const key = perkKeys[i];
                const context = contexts.perkDescriptions[key];
                
                const newContext = await this.retranslateContext(key, context);
                
                if (newContext.retranslatedAt) {
                    retranslated++;
                } else {
                    skipped++;
                }
                
                contexts.perkDescriptions[key] = newContext;
                
                // Progress update
                if ((i + 1) % 20 === 0) {
                    console.log(`   📈 Progress: ${i + 1}/${perkKeys.length} (${retranslated} retranslated, ${skipped} skipped)`);
                }
                
                // Lưu định kỳ để tránh mất dữ liệu
                if ((i + 1) % 50 === 0) {
                    await this.saveContexts(contexts);
                    console.log('   💾 Saved progress...');
                }
            }
            
            // Cập nhật metadata
            contexts.metadata = {
                ...contexts.metadata,
                lastRetranslated: new Date().toISOString(),
                totalPerks: perkKeys.length,
                retranslatedCount: retranslated
            };
            
            // Lưu file cuối cùng
            await this.saveContexts(contexts);
            
            console.log('🎉 Retranslation complete!');
            console.log(`   📊 Results: ${retranslated} retranslated, ${skipped} skipped`);
            
            return { retranslated, skipped, total: perkKeys.length };
            
        } catch (error) {
            console.error('❌ Retranslation failed:', error.message);
            throw error;
        }
    }

    // Lưu contexts
    async saveContexts(contexts) {
        try {
            await fs.writeJson(this.contextFile, contexts, { spaces: 2 });
        } catch (error) {
            console.error('❌ Failed to save contexts:', error.message);
            throw error;
        }
    }

    // Dịch lại chỉ những perks cụ thể
    async retranslateSpecific(perkNames) {
        console.log(`🎯 Retranslating specific perks: ${perkNames.join(', ')}`);
        
        try {
            const contexts = await fs.readJson(this.contextFile);
            let retranslated = 0;
            
            for (const perkName of perkNames) {
                // Tìm perk theo tên
                const key = Object.keys(contexts.perkDescriptions).find(k => 
                    k.toLowerCase().includes(perkName.toLowerCase()) ||
                    contexts.perkDescriptions[k].original.toLowerCase().includes(perkName.toLowerCase())
                );
                
                if (key) {
                    const newContext = await this.retranslateContext(key, contexts.perkDescriptions[key]);
                    contexts.perkDescriptions[key] = newContext;
                    if (newContext.retranslatedAt) retranslated++;
                } else {
                    console.log(`❌ Perk not found: ${perkName}`);
                }
            }
            
            await this.saveContexts(contexts);
            console.log(`✅ Retranslated ${retranslated} specific perks`);
            
        } catch (error) {
            console.error('❌ Specific retranslation failed:', error.message);
        }
    }

    // Tìm các perks cần dịch lại
    async findPerksNeedingRetranslation() {
        try {
            const contexts = await fs.readJson(this.contextFile);
            const needsRetranslation = [];
            
            for (const [key, context] of Object.entries(contexts.perkDescriptions)) {
                if (this.needsRetranslation(context.vietnamese)) {
                    needsRetranslation.push({
                        key,
                        vietnamese: context.vietnamese.substring(0, 100) + '...'
                    });
                }
            }
            
            console.log(`🔍 Found ${needsRetranslation.length} perks needing retranslation:`);
            needsRetranslation.forEach((perk, index) => {
                console.log(`${index + 1}. ${perk.key}: ${perk.vietnamese}`);
            });
            
            return needsRetranslation;
            
        } catch (error) {
            console.error('❌ Failed to analyze contexts:', error.message);
        }
    }
}

// CLI usage
if (require.main === module) {
    const retranslator = new ContextRetranslator();
    
    const command = process.argv[2];
    const args = process.argv.slice(3);
    
    switch (command) {
        case 'all':
            retranslator.retranslateAll();
            break;
            
        case 'find':
            retranslator.findPerksNeedingRetranslation();
            break;
            
        case 'specific':
            if (args.length > 0) {
                retranslator.retranslateSpecific(args);
            } else {
                console.log('Usage: node retranslateContexts.js specific <perk1> <perk2> ...');
            }
            break;
            
        case 'backup':
            retranslator.backupCurrentFile();
            break;
            
        default:
            console.log('Usage:');
            console.log('  node retranslateContexts.js all        - Retranslate all contexts');
            console.log('  node retranslateContexts.js find       - Find perks needing retranslation');
            console.log('  node retranslateContexts.js specific <names> - Retranslate specific perks');
            console.log('  node retranslateContexts.js backup     - Backup current file');
            break;
    }
}

module.exports = ContextRetranslator;
