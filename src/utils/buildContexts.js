const fs = require('fs-extra');
const ContextManager = require('./contextManager');
const config = require('../../config/config');

class ContextBuilder {
    constructor() {
        this.contextManager = new ContextManager();
    }

    // Dịch tất cả survivor perks
    async buildSurvivorContexts() {
        console.log('🏃 Building Survivor perk contexts...');
        
        try {
            const survivorData = await fs.readJson(config.dataFiles.survivorPerks);
            const result = await this.contextManager.translateAllPerks(survivorData.perks);
            
            console.log(`✅ Survivor perks: ${result.translated} translated, ${result.skipped} skipped`);
            return result;
        } catch (error) {
            console.error('❌ Error building survivor contexts:', error.message);
            throw error;
        }
    }

    // Dịch tất cả killer perks
    async buildKillerContexts() {
        console.log('🔪 Building Killer perk contexts...');
        
        try {
            const killerData = await fs.readJson(config.dataFiles.killerPerks);
            const result = await this.contextManager.translateAllPerks(killerData.perks);
            
            console.log(`✅ Killer perks: ${result.translated} translated, ${result.skipped} skipped`);
            return result;
        } catch (error) {
            console.error('❌ Error building killer contexts:', error.message);
            throw error;
        }
    }

    // Dịch tất cả perks
    async buildAllContexts() {
        console.log('🚀 Building all perk contexts...');
        
        try {
            const survivorResult = await this.buildSurvivorContexts();
            const killerResult = await this.buildKillerContexts();
            
            const totalTranslated = survivorResult.translated + killerResult.translated;
            const totalSkipped = survivorResult.skipped + killerResult.skipped;
            
            console.log(`🎉 All contexts built!`);
            console.log(`   📊 Total: ${totalTranslated} translated, ${totalSkipped} skipped`);
            
            // Hiển thị thống kê
            const stats = this.contextManager.getStats();
            console.log(`   📈 Context file now contains ${stats.totalTranslations} translations`);
            
            return {
                survivor: survivorResult,
                killer: killerResult,
                total: { translated: totalTranslated, skipped: totalSkipped }
            };
            
        } catch (error) {
            console.error('❌ Error building all contexts:', error.message);
            throw error;
        }
    }

    // Test một vài perks
    async testContexts(count = 5) {
        console.log(`🧪 Testing ${count} perk contexts...`);
        
        try {
            const survivorData = await fs.readJson(config.dataFiles.survivorPerks);
            const testPerks = survivorData.perks.slice(0, count);
            
            for (const perk of testPerks) {
                console.log(`\n📝 Testing: ${perk.name}`);
                
                const uriName = perk.URIName || perk.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
                const originalText = perk.contentText || perk.content;
                
                const translation = await this.contextManager.getTranslation(uriName, originalText);
                
                console.log('Original:', originalText.substring(0, 100) + '...');
                console.log('Translated:', translation.substring(0, 100) + '...');
                console.log('---');
            }
            
        } catch (error) {
            console.error('❌ Test failed:', error.message);
        }
    }

    // Hiển thị thống kê contexts
    showStats() {
        const stats = this.contextManager.getStats();
        
        console.log('📊 Context Statistics:');
        console.log(`   Total translations: ${stats.totalTranslations}`);
        console.log(`   Last updated: ${stats.lastUpdated}`);
        console.log(`   Version: ${stats.version}`);
    }

    // Tìm kiếm trong contexts
    async searchContexts(query) {
        console.log(`🔍 Searching contexts for: "${query}"`);
        
        const results = this.contextManager.searchContexts(query);
        
        console.log(`Found ${results.length} results:`);
        results.forEach((result, index) => {
            console.log(`${index + 1}. ${result.uriName}`);
            console.log(`   Vietnamese: ${result.vietnamese.substring(0, 80)}...`);
        });
        
        return results;
    }
}

// CLI usage
if (require.main === module) {
    const builder = new ContextBuilder();
    
    const command = process.argv[2];
    const arg = process.argv[3];
    
    switch (command) {
        case 'test':
            const count = parseInt(arg) || 5;
            builder.testContexts(count);
            break;
            
        case 'survivor':
            builder.buildSurvivorContexts();
            break;
            
        case 'killer':
            builder.buildKillerContexts();
            break;
            
        case 'stats':
            builder.showStats();
            break;
            
        case 'search':
            if (arg) {
                builder.searchContexts(arg);
            } else {
                console.log('Usage: node buildContexts.js search <query>');
            }
            break;
            
        case 'all':
        default:
            builder.buildAllContexts();
            break;
    }
}

module.exports = ContextBuilder;
