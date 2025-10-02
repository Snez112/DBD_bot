const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

class Translator {
    constructor() {
        // Cache dịch để tránh dịch lại
        this.translationCache = new Map();
        
        // Load từ điển từ file JSON
        this.loadDictionary();
    }

    // Load từ điển từ file JSON
    loadDictionary() {
        try {
            const dictionaryPath = path.join(__dirname, '../data/dictionary.json');
            // Xóa cache của require để load file mới
            delete require.cache[require.resolve('../data/dictionary.json')];
            const dictionary = JSON.parse(fs.readFileSync(dictionaryPath, 'utf8'));
            
            this.gameTerms = dictionary.gameTerms || {};
            this.keepEnglish = dictionary.keepEnglish || [];
            this.dbdPhrases = dictionary.dbdPhrases || {};
            this.commonWords = dictionary.commonWords || {};
            
            // Xóa translation cache khi reload dictionary
            this.translationCache.clear();
            
            console.log('✅ Loaded dictionary with', Object.keys(this.gameTerms).length, 'game terms');
        } catch (error) {
            console.error('❌ Failed to load dictionary:', error.message);
            // Fallback to empty dictionaries
            this.gameTerms = {};
            this.keepEnglish = [];
            this.dbdPhrases = {};
            this.commonWords = {};
        }
    }

    // Reload dictionary (để update mà không cần restart)
    reloadDictionary() {
        console.log('🔄 Reloading dictionary...');
        this.loadDictionary();
    }

    // Dịch description sang tiếng Việt (chỉ dùng thủ công)
    async translateDescription(description) {
        if (!description) return '';
        
        // Kiểm tra cache
        if (this.translationCache.has(description)) {
            return this.translationCache.get(description);
        }

        // Dịch thủ công 100% cho chuẩn ngữ cảnh game
        let translated = this.translateManually(description);
        
        // Lưu vào cache
        this.translationCache.set(description, translated);
        
        return translated;
    }


    // Áp dụng các cụm từ DBD đặc biệt
    applyDBDPhrases(text) {
        let result = text;
        
        for (const [english, vietnamese] of Object.entries(this.dbdPhrases)) {
            const regex = new RegExp(english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            result = result.replace(regex, vietnamese);
        }
        
        return result;
    }

    // Giữ nguyên các thuật ngữ tiếng Anh
    preserveEnglishTerms(text) {
        let result = text;
        
        for (const term of this.keepEnglish) {
            // Tìm các từ tiếng Việt có thể là bản dịch sai của thuật ngữ
            const possibleTranslations = this.getPossibleVietnameseTranslations(term);
            
            for (const viTerm of possibleTranslations) {
                const regex = new RegExp(`\\b${viTerm}\\b`, 'gi');
                result = result.replace(regex, term);
            }
        }
        
        return result;
    }

    // Lấy các bản dịch tiếng Việt có thể có của thuật ngữ
    getPossibleVietnameseTranslations(englishTerm) {
        const translations = {
            'Exhausted': ['kiệt sức', 'mệt mỏi', 'cạn kiệt'],
            'Endurance': ['sức bền', 'sức chịu đựng', 'bền bỉ'],
            'Haste': ['vội vã', 'nhanh chóng', 'tăng tốc'],
            'Hindered': ['cản trở', 'bị cản', 'làm chậm'],
            'Exposed': ['tiếp xúc', 'bị lộ', 'phơi bày'],
            'Undetectable': ['không thể phát hiện', 'vô hình', 'ẩn'],
            'Oblivious': ['mơ màng', 'không biết', 'vô tình'],
            'Blindness': ['mù lòa', 'mù', 'không nhìn thấy'],
            'Broken': ['gãy', 'hỏng', 'bị phá'],
            'Deep Wound': ['vết thương sâu', 'thương tích sâu'],
            'Survivor': ['người sống sót', 'kẻ sống sót', 'người thoát'],
            'Killer': ['kẻ giết người', 'sát thủ', 'kẻ sát hại']
        };
        
        return translations[englishTerm] || [];
    }

    // Áp dụng thuật ngữ game đã dịch sẵn
    applyGameTerms(text) {
        let result = text;
        
        for (const [english, vietnamese] of Object.entries(this.gameTerms)) {
            const regex = new RegExp(`\\b${english}\\b`, 'gi');
            result = result.replace(regex, vietnamese);
        }
        
        return result;
    }

    // Dịch thủ công chính xác theo ngữ cảnh DBD
    translateManually(description) {
        let translated = description;
        
        // Bước 0: Tách và bảo vệ các quote của nhân vật
        const { textWithoutQuotes, quotes } = this.extractQuotes(translated);
        translated = textWithoutQuotes;
        
        // Bước 1: Áp dụng cụm từ DBD đặc biệt trước (ưu tiên cao nhất)
        translated = this.applyDBDPhrases(translated);
        
        // Bước 2: Áp dụng thuật ngữ game đã dịch sẵn
        translated = this.applyGameTerms(translated);
        
        // Bước 3a: Xử lý các từ có prefix trước (để tránh tách nhầm)
        const prefixWords = {
            'deactivates': 'bị vô hiệu hóa',
            'reactivates': 'được kích hoạt lại',
            'preactivates': 'được kích hoạt trước'
        };
        
        for (const [english, vietnamese] of Object.entries(prefixWords)) {
            const regex = new RegExp(english, 'gi');
            translated = translated.replace(regex, vietnamese);
        }
        
        // Bước 3b: Dịch từ thông thường (từng từ)
        for (const [english, vietnamese] of Object.entries(this.commonWords)) {
            if (vietnamese && !prefixWords.hasOwnProperty(english)) { // Bỏ qua từ đã xử lý
                const regex = new RegExp(`\\b${english}\\b`, 'gi');
                translated = translated.replace(regex, vietnamese);
            }
        }
        
        // Bước 4: Giữ nguyên thuật ngữ tiếng Anh (ưu tiên cao nhất)
        translated = this.preserveEnglishTerms(translated);
        
        // Bước 5: Ghép lại các quote gốc
        translated = this.restoreQuotes(translated, quotes);
        
        // Bước 6: Làm sạch và chuẩn hóa
        return this.cleanTranslation(translated);
    }

    // Loại bỏ hoàn toàn các quote của nhân vật
    extractQuotes(text) {
        let textWithoutQuotes = text;
        
        // Loại bỏ các quote pattern: "..." — Character hoặc "..." - Character
        const quotePatterns = [
            /"[^"]+"\s*[—-]\s*[^"\n]+/g,  // "quote" — Character
            /"[^"]+"\s*-\s*[^"\n]+/g,     // "quote" - Character  
            /\n?"[^"]+"\s*[—-]\s*[^"\n]+/g // Có thể có newline trước
        ];
        
        for (const pattern of quotePatterns) {
            textWithoutQuotes = textWithoutQuotes.replace(pattern, '');
        }
        
        // Làm sạch khoảng trắng thừa
        textWithoutQuotes = textWithoutQuotes
            .replace(/\n\s*\n/g, '\n') // Loại bỏ dòng trống thừa
            .replace(/\s+$/g, '')      // Loại bỏ khoảng trắng cuối
            .trim();
        
        return { textWithoutQuotes, quotes: [] };
    }

    // Không cần khôi phục quote nữa
    restoreQuotes(text, quotes) {
        return text; // Trả về text đã loại bỏ quote
    }

    // Làm sạch bản dịch
    cleanTranslation(text) {
        return text
            .replace(/\s+/g, ' ') // Chuẩn hóa khoảng trắng
            .replace(/\s*([,.!?:;])/g, '$1') // Loại bỏ khoảng trắng trước dấu câu
            .replace(/([,.!?:;])\s*/g, '$1 ') // Thêm khoảng trắng sau dấu câu
            .trim();
    }

    // Dịch một perk object
    async translatePerk(perk) {
        const translatedPerk = { ...perk };
        
        if (perk.content) {
            translatedPerk.contentVi = await this.translateDescription(perk.content);
        }
        
        if (perk.contentText) {
            translatedPerk.contentTextVi = await this.translateDescription(perk.contentText);
        }
        
        return translatedPerk;
    }
}

module.exports = Translator;