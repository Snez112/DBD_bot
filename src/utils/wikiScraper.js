const axios = require('axios');
const cheerio = require('cheerio');
const config = require('../../config/config');

class WikiScraper {
    constructor() {
        this.baseUrl = config.wiki.baseUrl;
        this.headers = {
            'User-Agent': 'DBD-Discord-Bot/1.0.0 (Educational Purpose)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        };
    }

    // Fetch HTML từ URL
    async fetchPage(url) {
        try {
            console.log(`Fetching page: ${url}`);
            const response = await axios.get(url, {
                headers: this.headers,
                timeout: 15000,
                maxRedirects: 5
            });
            return response.data;
        } catch (error) {
            console.error(`Error fetching ${url}:`, error.message);
            throw error;
        }
    }

    // Scrape tất cả perks từ wiki
    async scrapeAllPerks() {
        try {
            const html = await this.fetchPage(config.wiki.perksPage);
            const $ = cheerio.load(html);
            
            const killerPerks = [];
            const survivorPerks = [];

            // Tìm section "All Perks" và các bảng perk
            console.log('Looking for perk tables...');
            
            // Tìm bảng perks theo selector chính xác
            console.log('Looking for perk tables with correct selectors...');
            
            // Selector cho Survivor Perks: h3 có span với id bắt đầu bằng 'Survivor_Perks_' + table tbody
            const survivorSelector = "h3:has(span[id*='Survivor_Perks']) + table tbody";
            const survivorTableBody = $(survivorSelector);
            if (survivorTableBody.length > 0) {
                console.log(`Found Survivor Perks table with ${survivorTableBody.find('tr').length} rows`);
                this.parsePerksTable($, survivorTableBody, 'survivor', survivorPerks);
            } else {
                console.log('Survivor perks table not found, trying alternative...');
                // Fallback: tìm theo text content
                $('h3').each((i, header) => {
                    const headerText = $(header).text().trim();
                    if (headerText.includes('Survivor Perks')) {
                        const table = $(header).nextAll('table').first();
                        if (table.length > 0) {
                            const tbody = table.find('tbody');
                            if (tbody.length > 0) {
                                this.parsePerksTable($, tbody, 'survivor', survivorPerks);
                            } else {
                                this.parsePerksTable($, table, 'survivor', survivorPerks);
                            }
                        }
                    }
                });
            }
            
            // Selector cho Killer Perks
            const killerSelector = "h3:has(span[id*='Killer_Perks']) + table tbody";
            const killerTableBody = $(killerSelector);
            if (killerTableBody.length > 0) {
                console.log(`Found Killer Perks table with ${killerTableBody.find('tr').length} rows`);
                this.parsePerksTable($, killerTableBody, 'killer', killerPerks);
            } else {
                console.log('Killer perks table not found, trying alternative...');
                // Fallback: tìm theo text content
                $('h3').each((i, header) => {
                    const headerText = $(header).text().trim();
                    if (headerText.includes('Killer Perks')) {
                        const table = $(header).nextAll('table').first();
                        if (table.length > 0) {
                            const tbody = table.find('tbody');
                            if (tbody.length > 0) {
                                this.parsePerksTable($, tbody, 'killer', killerPerks);
                            } else {
                                this.parsePerksTable($, table, 'killer', killerPerks);
                            }
                        }
                    }
                });
            }

            // Nếu không tìm thấy bảng theo cách trên, thử tìm bằng cách khác
            if (survivorPerks.length === 0 && killerPerks.length === 0) {
                console.log('Trying alternative parsing method...');
                
                // Tìm tất cả bảng lớn có nhiều hàng
                $('table').each((i, table) => {
                    const $table = $(table);
                    const rows = $table.find('tr');
                    
                    if (rows.length > 10) { // Bảng lớn có thể chứa perks
                        console.log(`Checking large table ${i} with ${rows.length} rows`);
                        
                        // Kiểm tra header để xác định loại
                        const prevHeaders = $table.prevAll('h1, h2, h3, h4').first().text().toLowerCase();
                        let type = 'survivor';
                        if (prevHeaders.includes('killer')) {
                            type = 'killer';
                        }
                        
                        const perksArray = type === 'killer' ? killerPerks : survivorPerks;
                        this.parsePerksTable($, $table, type, perksArray);
                    }
                });
            }

            console.log(`Scraped ${survivorPerks.length} survivor perks and ${killerPerks.length} killer perks`);

            return {
                survivorPerks: { perks: survivorPerks },
                killerPerks: { perks: killerPerks }
            };

        } catch (error) {
            console.error('Error scraping perks:', error.message);
            throw error;
        }
    }

    // Parse bảng perks từ cấu trúc HTML thực tế
    parsePerksTable($, table, type, perksArray) {
        const rows = table.find('tr');
        console.log(`Parsing ${type} perks table with ${rows.length} rows`);
        
        // Tìm cấu trúc bảng thực tế - mỗi perk có thể có cấu trúc khác nhau
        rows.each((index, row) => {
            if (index === 0) return; // Skip header row
            
            const $row = $(row);
            const cells = $row.find('td');
            
            if (cells.length === 0) return;
            
            // Cách tiếp cận mới: tìm tên perk từ link hoặc tiêu đề trong HTML
            const perk = this.parseFromTableStructure($, $row, type);
            if (perk && perk.name && perk.name.length > 2) {
                console.log(`Successfully parsed perk: ${perk.name}`);
                perksArray.push(perk);
            }
        });
        
        console.log(`Parsed ${perksArray.length} ${type} perks`);
    }

    // Parse perk từ cấu trúc bảng HTML thực tế của DBD Wiki
    parseFromTableStructure($, row, type) {
        try {
            // DBD Wiki sử dụng cấu trúc: th (icon) | th (name) | th (character) | td (description)
            const headerCells = row.find('th');
            const dataCells = row.find('td');
            
            if (headerCells.length === 0) return null;

            let name = '';
            let iconURL = '';
            let description = '';
            let characterName = '';
            
            // Cấu trúc chuẩn: th[0] = icon, th[1] = name, th[2] = character, td[0] = description
            if (headerCells.length >= 2) {
                // Lấy icon từ th[0]
                const iconCell = $(headerCells[0]);
                const iconLink = iconCell.find('a').first();
                if (iconLink.length > 0) {
                    const href = iconLink.attr('href') || '';
                    if (href) {
                        // Icon URL thường là href của link
                        iconURL = href.startsWith('http') ? href : this.baseUrl + href;
                    }
                }
                
                // Lấy tên perk từ th[1]
                const nameCell = $(headerCells[1]);
                const nameLink = nameCell.find('a').first();
                if (nameLink.length > 0) {
                    name = nameLink.text().trim();
                } else {
                    name = nameCell.text().trim();
                }
                
                // Lấy character từ th[2] nếu có
                if (headerCells.length >= 3) {
                    const characterCell = $(headerCells[2]);
                    const characterLink = characterCell.find('a').first();
                    if (characterLink.length > 0) {
                        characterName = characterLink.text().trim();
                    }
                }
            }
            
            // Lấy description từ td[0] (có class formattedPerkDesc)
            if (dataCells.length > 0) {
                const descCell = $(dataCells[0]);
                const formattedDesc = descCell.find('.formattedPerkDesc').first();
                if (formattedDesc.length > 0) {
                    description = formattedDesc.text().trim();
                } else {
                    description = descCell.text().trim();
                }
                
                // Loại bỏ các thông báo về patch ngay khi lấy description
                description = this.cleanPatchNotifications(description);
            }
            
            // Nếu không có tên, skip
            if (!name || name.length < 3) return null;

            // Tạo URI name
            const URIName = name.toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .replace(/\s+/g, '_')
                .replace(/^_+|_+$/g, '');

            // Nếu chưa có character name, tìm từ quote trong description
            if (!characterName && description) {
                const quoteMatch = description.match(/[""].*?[""].*?—\s*([A-Z][a-zA-Z\s]+?)(?:\s|$)/);
                if (quoteMatch && quoteMatch[1]) {
                    const quotedName = quoteMatch[1].trim();
                    if (!quotedName.includes('Status Effect') && 
                        quotedName.length > 2 && 
                        quotedName.length < 25) {
                        characterName = quotedName;
                    }
                }
            }

            const perk = {
                _id: `${type}_${URIName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: name,
                URIName: URIName,
                iconURL: iconURL,
                content: description,
                contentText: description,
                type: type
            };

            // Thêm character info nếu có
            if (characterName) {
                perk.characterName = characterName;
                perk.character = `${type}_${characterName.toLowerCase().replace(/\s+/g, '_')}`;
            }

            return perk;

        } catch (error) {
            console.error('Error parsing table structure:', error.message);
            return null;
        }
    }

    // Parse một row trong bảng perk
    parsePerkRow($, row, type) {
        try {
            const $row = $(row);
            const cells = $row.find('td');
            
            if (cells.length === 0) return null;

            // DBD Wiki có cấu trúc đặc biệt - mỗi row có 1 cell chứa tất cả thông tin
            const mainCell = $(cells[0]);
            
            // Tìm icon perk (không phải status effect icon)
            let iconURL = '';
            const allImages = mainCell.find('img');
            
            // Tìm icon perk thực sự (thường có tên chứa "IconPerks")
            allImages.each((i, img) => {
                const imgSrc = $(img).attr('data-src') || $(img).attr('src') || '';
                const imgAlt = $(img).attr('alt') || '';
                
                if (imgSrc && 
                    !imgSrc.includes('data:image') && 
                    !imgSrc.includes('base64') &&
                    !imgSrc.includes('1x1') &&
                    imgSrc.length > 20) {
                    
                    // Ưu tiên icon perk thực sự
                    if (imgSrc.includes('IconPerks') || 
                        imgAlt.toLowerCase().includes('perk') ||
                        imgSrc.includes('/perks/')) {
                        iconURL = imgSrc;
                        return false; // Break loop khi tìm thấy icon perk
                    }
                    
                    // Loại bỏ status effect icons và các icon không liên quan
                    if (!imgSrc.includes('IconStatusEffects') &&
                        !imgSrc.includes('IconHelp') &&
                        !imgSrc.includes('IconItems') &&
                        !imgSrc.includes('IconAddons') &&
                        !iconURL) { // Chỉ lấy nếu chưa có icon nào
                        iconURL = imgSrc;
                    }
                }
            });
            
            // Đảm bảo URL đầy đủ
            if (iconURL && !iconURL.startsWith('http')) {
                iconURL = this.baseUrl + iconURL;
            }

            // Tìm tên perk - cần tìm tên thực sự từ description
            let name = '';
            const cellText = mainCell.text().trim();
            
            // Tìm tên perk từ các pattern phổ biến trong description
            const perkNamePatterns = [
                // Pattern: "PerkName allows you to..." hoặc "PerkName activates"
                /([A-Z][a-zA-Z\s:'-]+?)\s+(?:allows you to|activates|triggers|grants|provides|causes|reveals|increases|reduces|unlocks|cannot be used|has a|deactivates)/i,
                // Pattern: "...quoted text" — PerkName
                /[""].*?[""].*?—\s*([A-Z][a-zA-Z\s:'-]+?)(?:\s|$)/,
                // Pattern: PerkName at the beginning followed by description
                /^([A-Z][a-zA-Z\s:'-]{3,35}?)\s+(?:is|will|can|may|does|has|gives|makes|lets)/i,
                // Pattern: "After/When... PerkName activates/triggers"
                /(?:After|When|While|During).*?([A-Z][a-zA-Z\s:'-]+?)\s+(?:activates|triggers|causes)/i,
                // Pattern: "Press... to trigger PerkName" hoặc "PerkName triggers"
                /(?:Press.*?to trigger|trigger)\s+([A-Z][a-zA-Z\s:'-]+?)(?:\s|$|\.)/i,
                // Pattern: "PerkName ignores..." or "PerkName resets..."
                /([A-Z][a-zA-Z\s:'-]+?)\s+(?:ignores|resets|works|functions|operates)/i
            ];

            // Thử các pattern để tìm tên perk
            for (const pattern of perkNamePatterns) {
                const match = cellText.match(pattern);
                if (match && match[1]) {
                    const potentialName = match[1].trim();
                    // Kiểm tra tên có hợp lệ không
                    if (potentialName.length >= 3 && 
                        potentialName.length <= 50 && 
                        !potentialName.includes('This description') &&
                        !potentialName.includes('You are') &&
                        !potentialName.includes('Your ') &&
                        !potentialName.includes('When ') &&
                        !potentialName.includes('Once ') &&
                        !potentialName.includes('The ') &&
                        !potentialName.includes('you benefit') &&
                        !potentialName.includes('following effect') &&
                        !potentialName.includes('Status Effect') &&
                        !potentialName.includes('Aura') &&
                        !potentialName.includes('Token') &&
                        !potentialName.includes('seconds') &&
                        !potentialName.includes('metres') &&
                        !/^\d/.test(potentialName) &&
                        !/^(you|your|when|after|while|during|press|the|a|an)\s/i.test(potentialName)) {
                        name = potentialName;
                        break;
                    }
                }
            }

            // Nếu vẫn không tìm thấy, thử tìm từ link perk đầu tiên
            if (!name) {
                const allLinks = mainCell.find('a');
                allLinks.each((i, link) => {
                    const linkText = $(link).text().trim();
                    const href = $(link).attr('href') || '';
                    
                    // Tìm link perk (thường có href chứa tên perk)
                    if (href.includes('/wiki/') && 
                        !href.includes('Status_Effect') &&
                        !href.includes('Aura') &&
                        linkText.length >= 3 && 
                        linkText.length <= 50 &&
                        !linkText.includes('Status Effect') &&
                        !linkText.includes('Aura')) {
                        name = linkText;
                        return false; // Break loop
                    }
                });
            }

            // Cuối cùng thử từ bold text
            if (!name) {
                const boldText = mainCell.find('b, strong').first();
                if (boldText.length > 0) {
                    const boldTextContent = boldText.text().trim();
                    if (boldTextContent.length >= 3 && 
                        boldTextContent.length <= 50 &&
                        !boldTextContent.includes('Status Effect') &&
                        !boldTextContent.includes('you benefit')) {
                        name = boldTextContent;
                    }
                }
            }

            // Làm sạch tên perk
            if (name) {
                name = name.replace(/[""]/g, '"').replace(/'/g, "'").trim();
                // Loại bỏ các ký tự đặc biệt ở cuối
                name = name.replace(/[.,:;!?]+$/, '').trim();
            }

            // Skip nếu không có tên hợp lệ
            if (!name || name.length < 3 || name.length > 100) return null;

            // Lấy description - toàn bộ text trong cell
            let description = mainCell.text().trim();
            
            // Làm sạch description
            description = description.replace(/\s+/g, ' ').trim();
            
            // Loại bỏ tên perk khỏi description nếu nó xuất hiện ở đầu
            if (description.toLowerCase().startsWith(name.toLowerCase())) {
                description = description.substring(name.length).trim();
            }

            // Tìm character name từ quote attribution hoặc link
            let characterName = '';
            
            // Tìm từ quote attribution (— Character Name)
            const quoteMatch = description.match(/[""].*?[""].*?—\s*([A-Z][a-zA-Z\s]+?)(?:\s|$)/);
            if (quoteMatch && quoteMatch[1]) {
                const quotedName = quoteMatch[1].trim();
                // Kiểm tra tên có hợp lệ không (không phải từ khóa game)
                if (!quotedName.includes('Status Effect') && 
                    !quotedName.includes('Aura') && 
                    !quotedName.includes('Token') &&
                    quotedName.length > 2 && 
                    quotedName.length < 25) {
                    characterName = quotedName;
                }
            }
            
            // Nếu không tìm thấy từ quote, tìm từ link
            if (!characterName) {
                const allLinks = mainCell.find('a');
                allLinks.each((i, link) => {
                    const linkText = $(link).text().trim();
                    const href = $(link).attr('href') || '';
                    
                    // Kiểm tra nếu link trỏ đến character page
                    if (href.includes('/wiki/') && 
                        !href.includes('Perk') && 
                        !href.includes('Status_Effect') &&
                        !href.includes('Aura') &&
                        linkText !== name && 
                        linkText.length > 2 && 
                        linkText.length < 25) {
                        characterName = linkText;
                        return false; // Break loop
                    }
                });
            }

            // Tạo URI name (URL-safe)
            const URIName = name.toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .replace(/\s+/g, '_')
                .replace(/^_+|_+$/g, '');

            const perk = {
                _id: `${type}_${URIName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: name,
                URIName: URIName,
                iconURL: iconURL,
                content: description,
                contentText: description,
                type: type
            };

            // Thêm character info nếu có và hợp lệ
            if (characterName && 
                characterName !== 'All' && 
                characterName !== 'General' && 
                characterName !== name &&
                characterName.length > 1) {
                perk.characterName = characterName;
                perk.character = `${type}_${characterName.toLowerCase().replace(/\s+/g, '_')}`;
            }

            return perk;

        } catch (error) {
            console.error('Error parsing perk row:', error.message);
            return null;
        }
    }

    // Phương pháp scraping thay thế
    async scrapePerksAlternative($) {
        const survivorPerks = [];
        const killerPerks = [];

        try {
            // Tìm tất cả các bảng có chứa perk
            $('table').each((tableIndex, table) => {
                const $table = $(table);
                const tableText = $table.text().toLowerCase();
                
                // Kiểm tra xem bảng này có phải là bảng perk không
                if (tableText.includes('perk') || tableText.includes('icon') || tableText.includes('description')) {
                    
                    $table.find('tbody tr').each((rowIndex, row) => {
                        const $row = $(row);
                        const cells = $row.find('td');
                        
                        if (cells.length >= 3) {
                            // Xác định loại perk dựa trên context
                            let type = 'survivor';
                            const prevHeaders = $table.prevAll('h3, h2').first().text().toLowerCase();
                            if (prevHeaders.includes('killer')) {
                                type = 'killer';
                            }
                            
                            const perk = this.parsePerkRow($, row, type);
                            if (perk && perk.name) {
                                if (type === 'killer') {
                                    killerPerks.push(perk);
                                } else {
                                    survivorPerks.push(perk);
                                }
                            }
                        }
                    });
                }
            });

            console.log(`Alternative method: ${survivorPerks.length} survivor perks, ${killerPerks.length} killer perks`);

            return {
                survivorPerks: { perks: survivorPerks },
                killerPerks: { perks: killerPerks }
            };

        } catch (error) {
            console.error('Error in alternative scraping:', error.message);
            return {
                survivorPerks: { perks: [] },
                killerPerks: { perks: [] }
            };
        }
    }

    // Scrape thông tin chi tiết của một perk
    async scrapePerkDetails(perkName) {
        try {
            const perkUrl = `${this.baseUrl}/wiki/${encodeURIComponent(perkName.replace(/\s+/g, '_'))}`;
            const html = await this.fetchPage(perkUrl);
            const $ = cheerio.load(html);

            // Lấy description chi tiết
            const infobox = $('.infobox, .portable-infobox');
            let description = '';
            
            if (infobox.length > 0) {
                // Tìm description trong infobox
                const descRow = infobox.find('tr').filter((i, el) => {
                    return $(el).text().toLowerCase().includes('description') || 
                           $(el).text().toLowerCase().includes('effect');
                });
                
                if (descRow.length > 0) {
                    description = descRow.next('tr').find('td').text().trim();
                }
            }

            // Nếu không tìm thấy trong infobox, tìm trong content
            if (!description) {
                const contentDiv = $('#mw-content-text .mw-parser-output');
                const paragraphs = contentDiv.find('p');
                
                paragraphs.each((i, p) => {
                    const text = $(p).text().trim();
                    if (text.length > 50 && !description) {
                        description = text;
                    }
                });
            }

            return {
                description: description,
                url: perkUrl
            };

        } catch (error) {
            console.error(`Error scraping perk details for ${perkName}:`, error.message);
            return {
                description: '',
                url: ''
            };
        }
    }

    // Làm sạch description: loại bỏ patch notifications và quotes
    cleanPatchNotifications(description) {
        if (!description) return '';
        
        let cleaned = description;
        
        // Loại bỏ các thông báo về patch
        cleaned = cleaned.replace(/^This description is based on.*?(?=You|Your|When|After|Press|Grants|Increases|Reduces|Unlocks|The|A)/i, '');
        cleaned = cleaned.replace(/^the changes announced for.*?(?=You|Your|When|After|Press|Grants|Increases|Reduces|Unlocks|The|A)/i, '');
        cleaned = cleaned.replace(/^.*?Patch \d+\.\d+\.\d+.*?(?=You|Your|When|After|Press|Grants|Increases|Reduces|Unlocks|The|A)/i, '');
        
        // Loại bỏ hoàn toàn các quote của nhân vật
        cleaned = this.removeCharacterQuotes(cleaned);
        
        // Loại bỏ khoảng trắng thừa
        cleaned = cleaned.replace(/^\s+/, '').trim();
        
        return cleaned;
    }

    // Loại bỏ hoàn toàn các quote của nhân vật
    removeCharacterQuotes(text) {
        if (!text) return '';
        
        let cleaned = text;
        
        // Loại bỏ các quote pattern: "..." — Character hoặc "..." - Character
        const quotePatterns = [
            /"[^"]+"\s*[—-]\s*[^"\n]+/g,     // "quote" — Character
            /"[^"]+"\s*-\s*[^"\n]+/g,       // "quote" - Character  
            /\n"[^"]+"\s*[—-]\s*[^"\n]+/g,  // Có newline trước quote
            /"[^"]*"\s*[—-]\s*[A-Z][^.\n]*\.?/g, // Pattern rộng hơn
            /\s*"[^"]*"\s*[—-]\s*[^"\n]*$/g     // Quote ở cuối
        ];
        
        for (const pattern of quotePatterns) {
            cleaned = cleaned.replace(pattern, '');
        }
        
        // Làm sạch khoảng trắng và dòng trống thừa
        cleaned = cleaned
            .replace(/\n\s*\n/g, '\n')  // Loại bỏ dòng trống thừa
            .replace(/\s+$/gm, '')      // Loại bỏ khoảng trắng cuối dòng
            .replace(/^\s+/gm, '')      // Loại bỏ khoảng trắng đầu dòng
            .trim();
        
        return cleaned;
    }

    // Test scraping function
    async testScraping() {
        try {
            console.log('Testing wiki scraping...');
            const html = await this.fetchPage(config.wiki.perksPage);
            const $ = cheerio.load(html);
            
            console.log('Page title:', $('title').text());
            console.log('Number of tables found:', $('table').length);
            console.log('Headers found:', $('h1, h2, h3').map((i, el) => $(el).text().trim()).get());
            
            // Test scraping perks
            const result = await this.scrapeAllPerks();
            console.log('Scraping test results:', {
                survivorPerks: result.survivorPerks.perks.length,
                killerPerks: result.killerPerks.perks.length
            });
            
            // Show first few perks as examples
            if (result.survivorPerks.perks.length > 0) {
                console.log('Sample survivor perk:', result.survivorPerks.perks[0]);
            }
            if (result.killerPerks.perks.length > 0) {
                console.log('Sample killer perk:', result.killerPerks.perks[0]);
            }
            
            return result;
            
        } catch (error) {
            console.error('Test scraping failed:', error.message);
            throw error;
        }
    }
}

module.exports = WikiScraper;

// Test nếu file được chạy trực tiếp
if (require.main === module) {
    const scraper = new WikiScraper();
    scraper.testScraping()
        .then(() => {
            console.log('Test completed!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Test failed:', error);
            process.exit(1);
        });
}
