const fs = require('fs-extra');
const path = require('path');
const Translator = require('./translator');

class ContextManager {
    constructor() {
        this.contextFile = path.join(__dirname, '../data/translated_contexts.json');
        this.contexts = null;
        this.translator = new Translator();
    }

    // Load contexts từ file
    async loadContexts() {
        if (this.contexts) return; // Đã load rồi
        try {
            if (await fs.pathExists(this.contextFile)) {
                this.contexts = await fs.readJson(this.contextFile);
                console.log(`✅ Loaded ${Object.keys(this.contexts.perkDescriptions || {}).length} translated contexts`);
            } else {
                console.log('📝 No translated contexts found, creating new file...');
                this.contexts = {
                    perkDescriptions: {},
                    commonPhrases: {},
                    metadata: {
                        version: "1.0",
                        lastUpdated: new Date().toISOString(),
                        totalPerks: 0,
                        language: "vi-VN"
                    }
                };
                await this.saveContexts();
            }
        } catch (error) {
            console.error('❌ Error loading contexts:', error.message);
            this.contexts = { perkDescriptions: {}, commonPhrases: {}, metadata: {} };
        }
    }

    // Lưu contexts vào file
    async saveContexts() {
        try {
            this.contexts.metadata.lastUpdated = new Date().toISOString();
            this.contexts.metadata.totalPerks = Object.keys(this.contexts.perkDescriptions).length;
            
            await fs.writeJson(this.contextFile, this.contexts, { spaces: 2 });
            console.log(`💾 Saved ${this.contexts.metadata.totalPerks} translated contexts`);
        } catch (error) {
            console.error('❌ Error saving contexts:', error.message);
        }
    }

    // Lấy bản dịch từ context hoặc dịch mới
    async getTranslation(perkURIName, originalText) {
        // Đảm bảo contexts đã được load
        await this.loadContexts();
        
        // Kiểm tra xem đã có bản dịch sẵn chưa
        if (this.contexts.perkDescriptions[perkURIName]) {
            const context = this.contexts.perkDescriptions[perkURIName];
            
            // Kiểm tra xem original text có khớp không
            if (context.original === originalText) {
                return context.vietnamese;
            }
        }

        // Nếu chưa có hoặc text đã thay đổi, dịch mới
        console.log(`🔄 Translating new context for: ${perkURIName}`);
        const translated = await this.translator.translateDescription(originalText);
        
        // Lưu vào context
        await this.addContext(perkURIName, originalText, translated);
        
        return translated;
    }

    // Thêm context mới
    async addContext(perkURIName, original, vietnamese) {
        this.contexts.perkDescriptions[perkURIName] = {
            original: original,
            vietnamese: vietnamese,
            updatedAt: new Date().toISOString()
        };

        await this.saveContexts();
    }

    // Cập nhật context hiện có
    async updateContext(perkURIName, original, vietnamese) {
        if (this.contexts.perkDescriptions[perkURIName]) {
            this.contexts.perkDescriptions[perkURIName].original = original;
            this.contexts.perkDescriptions[perkURIName].vietnamese = vietnamese;
            this.contexts.perkDescriptions[perkURIName].updatedAt = new Date().toISOString();
            
            await this.saveContexts();
            return true;
        }
        return false;
    }

    // Xóa context
    async removeContext(perkURIName) {
        if (this.contexts.perkDescriptions[perkURIName]) {
            delete this.contexts.perkDescriptions[perkURIName];
            await this.saveContexts();
            return true;
        }
        return false;
    }

    // Dịch tất cả perks và lưu vào context
    async translateAllPerks(perksData) {
        console.log(`🚀 Starting translation of ${perksData.length} perks...`);
        
        let translated = 0;
        let skipped = 0;

        for (const perk of perksData) {
            const uriName = perk.URIName || perk.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const content = perk.contentText || perk.content;

            if (!content) {
                console.log(`⚠️  Skipping ${perk.name}: No content`);
                skipped++;
                continue;
            }

            // Kiểm tra xem đã có bản dịch chưa
            if (this.contexts.perkDescriptions[uriName] && 
                this.contexts.perkDescriptions[uriName].original === content) {
                console.log(`✅ Already translated: ${perk.name}`);
                skipped++;
                continue;
            }

            // Dịch mới
            console.log(`🔄 Translating: ${perk.name}`);
            try {
                const vietnameseText = await this.translator.translateDescription(content);
                await this.addContext(uriName, content, vietnameseText);
                translated++;
                
                // Progress update
                if (translated % 10 === 0) {
                    console.log(`   📊 Progress: ${translated} translated, ${skipped} skipped`);
                }
            } catch (error) {
                console.error(`❌ Failed to translate ${perk.name}:`, error.message);
            }
        }

        console.log(`🎉 Translation complete! ${translated} new, ${skipped} skipped`);
        return { translated, skipped };
    }

    // Lấy thống kê
    getStats() {
        const total = Object.keys(this.contexts.perkDescriptions).length;
        const lastUpdated = this.contexts.metadata.lastUpdated;
        
        return {
            totalTranslations: total,
            lastUpdated: lastUpdated,
            version: this.contexts.metadata.version
        };
    }

    // Tìm kiếm trong contexts
    searchContexts(query) {
        const results = [];
        const searchTerm = query.toLowerCase();

        for (const [uriName, context] of Object.entries(this.contexts.perkDescriptions)) {
            if (uriName.includes(searchTerm) || 
                context.vietnamese.toLowerCase().includes(searchTerm) ||
                context.original.toLowerCase().includes(searchTerm)) {
                results.push({
                    uriName,
                    ...context
                });
            }
        }

        return results;
    }
}

module.exports = ContextManager;
