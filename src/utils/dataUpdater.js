const fs = require('fs-extra');
const path = require('path');
const config = require('../../config/config');
const WikiScraper = require('./wikiScraper');

class DataUpdater {
    constructor() {
        this.ensureDataDirectory();
        this.wikiScraper = new WikiScraper();
    }

    // Đảm bảo thư mục data tồn tại
    async ensureDataDirectory() {
        const dataDir = path.dirname(config.dataFiles.killerPerks);
        await fs.ensureDir(dataDir);
    }

    // Kiểm tra xem data có cần update không (dựa trên thời gian cache)
    async needsUpdate(filePath) {
        try {
            const stats = await fs.stat(filePath);
            const now = Date.now();
            const fileAge = now - stats.mtime.getTime();
            return fileAge > config.cacheTime;
        } catch (error) {
            // File không tồn tại, cần fetch data
            return true;
        }
    }

    // Scrape data từ wiki
    async scrapeData() {
        try {
            console.log('Scraping data from DBD Wiki...');
            const data = await this.wikiScraper.scrapeAllPerks();
            return data;
        } catch (error) {
            console.error('Error scraping data from wiki:', error.message);
            throw error;
        }
    }

    // Lưu data vào file JSON
    async saveData(filePath, data) {
        try {
            await fs.writeJson(filePath, data, { spaces: 2 });
            console.log(`Data saved to: ${filePath}`);
        } catch (error) {
            console.error(`Error saving data to ${filePath}:`, error.message);
            throw error;
        }
    }

    // Load data từ file JSON
    async loadData(filePath) {
        try {
            return await fs.readJson(filePath);
        } catch (error) {
            console.error(`Error loading data from ${filePath}:`, error.message);
            return null;
        }
    }

    // Update killer perks
    async updateKillerPerks() {
        const filePath = config.dataFiles.killerPerks;
        
        if (await this.needsUpdate(filePath)) {
            try {
                const allData = await this.scrapeData();
                const data = allData.killerPerks;
                await this.saveData(filePath, data);
                return data;
            } catch (error) {
                // Nếu scrape fail, thử load từ file cũ
                console.log('Scraping failed, trying to load cached data...');
                return await this.loadData(filePath);
            }
        } else {
            console.log('Killer perks data is up to date, loading from cache...');
            return await this.loadData(filePath);
        }
    }

    // Update survivor perks
    async updateSurvivorPerks() {
        const filePath = config.dataFiles.survivorPerks;
        
        if (await this.needsUpdate(filePath)) {
            try {
                const allData = await this.scrapeData();
                const data = allData.survivorPerks;
                await this.saveData(filePath, data);
                return data;
            } catch (error) {
                console.log('Scraping failed, trying to load cached data...');
                return await this.loadData(filePath);
            }
        } else {
            console.log('Survivor perks data is up to date, loading from cache...');
            return await this.loadData(filePath);
        }
    }

    // Update killers data (placeholder - có thể implement sau)
    async updateKillers() {
        const filePath = config.dataFiles.killers;
        
        // Tạm thời return empty data vì chưa implement scraping killers
        if (await this.needsUpdate(filePath)) {
            const data = { killers: [] };
            await this.saveData(filePath, data);
            return data;
        } else {
            return await this.loadData(filePath) || { killers: [] };
        }
    }

    // Update survivors data (placeholder - có thể implement sau)
    async updateSurvivors() {
        const filePath = config.dataFiles.survivors;
        
        // Tạm thời return empty data vì chưa implement scraping survivors
        if (await this.needsUpdate(filePath)) {
            const data = { survivors: [] };
            await this.saveData(filePath, data);
            return data;
        } else {
            return await this.loadData(filePath) || { survivors: [] };
        }
    }

    // Update tất cả data
    async updateAllData() {
        console.log('Starting data update...');
        
        try {
            // Scrape perks một lần và chia ra killer/survivor
            let killerPerks, survivorPerks;
            
            const killerFilePath = config.dataFiles.killerPerks;
            const survivorFilePath = config.dataFiles.survivorPerks;
            
            const needsKillerUpdate = await this.needsUpdate(killerFilePath);
            const needsSurvivorUpdate = await this.needsUpdate(survivorFilePath);
            
            if (needsKillerUpdate || needsSurvivorUpdate) {
                try {
                    console.log('Scraping fresh data from wiki...');
                    const allData = await this.scrapeData();
                    
                    if (needsKillerUpdate) {
                        killerPerks = allData.killerPerks;
                        await this.saveData(killerFilePath, killerPerks);
                    } else {
                        killerPerks = await this.loadData(killerFilePath);
                    }
                    
                    if (needsSurvivorUpdate) {
                        survivorPerks = allData.survivorPerks;
                        await this.saveData(survivorFilePath, survivorPerks);
                    } else {
                        survivorPerks = await this.loadData(survivorFilePath);
                    }
                    
                } catch (error) {
                    console.log('Scraping failed, loading cached data...');
                    killerPerks = await this.loadData(killerFilePath) || { perks: [] };
                    survivorPerks = await this.loadData(survivorFilePath) || { perks: [] };
                }
            } else {
                console.log('Data is up to date, loading from cache...');
                killerPerks = await this.loadData(killerFilePath) || { perks: [] };
                survivorPerks = await this.loadData(survivorFilePath) || { perks: [] };
            }

            // Update killers và survivors (placeholder)
            const killers = await this.updateKillers();
            const survivors = await this.updateSurvivors();

            console.log('All data updated successfully!');
            return {
                killerPerks,
                survivorPerks,
                killers,
                survivors
            };
        } catch (error) {
            console.error('Error updating data:', error.message);
            throw error;
        }
    }

    // Tìm kiếm perk theo tên
    async searchPerks(query, type = 'all') {
        const results = [];
        
        try {
            if (type === 'all' || type === 'killer') {
                const killerPerks = await this.updateKillerPerks();
                if (killerPerks && killerPerks.perks) {
                    const matches = killerPerks.perks.filter(perk => 
                        this.normalizeText(perk.name).includes(this.normalizeText(query)) ||
                        (perk.characterName && this.normalizeText(perk.characterName).includes(this.normalizeText(query)))
                    );
                    results.push(...matches.map(perk => ({ ...perk, type: 'killer' })));
                }
            }

            if (type === 'all' || type === 'survivor') {
                const survivorPerks = await this.updateSurvivorPerks();
                if (survivorPerks && survivorPerks.perks) {
                    const matches = survivorPerks.perks.filter(perk => 
                        this.normalizeText(perk.name).includes(this.normalizeText(query)) ||
                        (perk.characterName && this.normalizeText(perk.characterName).includes(this.normalizeText(query)))
                    );
                    results.push(...matches.map(perk => ({ ...perk, type: 'survivor' })));
                }
            }

            // Sắp xếp kết quả theo độ chính xác
            results.sort((a, b) => {
                const aExact = this.normalizeText(a.name) === this.normalizeText(query);
                const bExact = this.normalizeText(b.name) === this.normalizeText(query);
                if (aExact && !bExact) return -1;
                if (!aExact && bExact) return 1;
                return a.name.localeCompare(b.name);
            });

            return results.slice(0, config.bot.maxResults);
        } catch (error) {
            console.error('Error searching perks:', error.message);
            return [];
        }
    }

    // Chuẩn hóa text để tìm kiếm không phân biệt dấu và hoa thường
    normalizeText(text) {
        if (!text) return '';
        
        return text
            .toLowerCase()
            .normalize('NFD') // Tách dấu ra khỏi chữ cái
            .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu
            .replace(/[^\w\s]/g, '') // Loại bỏ ký tự đặc biệt
            .replace(/\s+/g, ' ') // Chuẩn hóa khoảng trắng
            .trim();
    }
}

module.exports = DataUpdater;

// Nếu file được chạy trực tiếp, update tất cả data
if (require.main === module) {
    const updater = new DataUpdater();
    updater.updateAllData()
        .then(() => {
            console.log('Data update completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Data update failed:', error);
            process.exit(1);
        });
}
