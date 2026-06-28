import { getDb } from "./db";

interface ClassificationSeed {
  code: string;       // e.g. "eng-000" or "chi-000"
  description: string;
  icon: string;
}

interface BookSeed {
  isbn: string;
  book_number: string;
  title: string;
  author: string;
  publisher: string;
  classification: string;
}

// ──────────────────────────────────────────────
//  Classifications (Dewey Decimal — English)
// ──────────────────────────────────────────────
const englishClassifications: ClassificationSeed[] = [
  { code: "eng-F",    description: "Fiction",                            icon: "📖" },
  { code: "eng-000",  description: "Computer Science, Information & General Works", icon: "💻" },
  { code: "eng-010",  description: "Bibliographies",                     icon: "📚" },
  { code: "eng-020",  description: "Library & Information Sciences",     icon: "🏛️" },
  { code: "eng-030",  description: "Encyclopedias & Books of Facts",     icon: "📔" },
  { code: "eng-040",  description: "General Collected Essays",           icon: "📝" },
  { code: "eng-050",  description: "General Serial Publications",        icon: "📰" },
  { code: "eng-060",  description: "Associations, Organizations & Museums", icon: "🏛️" },
  { code: "eng-070",  description: "News Media, Journalism & Publishing", icon: "📰" },
  { code: "eng-080",  description: "General Collections",                icon: "📚" },
  { code: "eng-090",  description: "Manuscripts & Rare Works",           icon: "📜" },
  { code: "eng-100",  description: "Philosophy & Psychology",            icon: "🧠" },
  { code: "eng-110",  description: "Metaphysics",                        icon: "🔮" },
  { code: "eng-120",  description: "Epistemology",                       icon: "🤔" },
  { code: "eng-130",  description: "Parapsychology & Occultism",         icon: "🔮" },
  { code: "eng-140",  description: "Philosophical Schools of Thoughts",  icon: "🏛️" },
  { code: "eng-150",  description: "Psychology",                         icon: "🧠" },
  { code: "eng-160",  description: "Logic",                              icon: "🔢" },
  { code: "eng-170",  description: "Ethics",                             icon: "⚖️" },
  { code: "eng-180",  description: "Ancient, Medieval & Eastern Philosophy", icon: "🏛️" },
  { code: "eng-190",  description: "Modern Western Philosophy",          icon: "🏛️" },
  { code: "eng-200",  description: "Religion",                           icon: "⛪" },
  { code: "eng-210",  description: "Philosophy & Theory of Religion",    icon: "📖" },
  { code: "eng-220",  description: "Bible",                              icon: "✝️" },
  { code: "eng-230",  description: "Christianity & Christian Theology",  icon: "✝️" },
  { code: "eng-240",  description: "Christian Devotional & Practical Theology", icon: "✝️" },
  { code: "eng-250",  description: "Christian Pastoral Theology",        icon: "✝️" },
  { code: "eng-260",  description: "Christian Social & Ecclesiastical Theology", icon: "✝️" },
  { code: "eng-270",  description: "History of Christianity & Christian Church", icon: "✝️" },
  { code: "eng-280",  description: "Christian Denominations & Sects",    icon: "✝️" },
  { code: "eng-290",  description: "Other Religions",                    icon: "☯️" },
  { code: "eng-300",  description: "Social Sciences",                    icon: "🏛️" },
  { code: "eng-310",  description: "Statistics",                         icon: "📊" },
  { code: "eng-320",  description: "Political Science",                  icon: "🏛️" },
  { code: "eng-330",  description: "Economics",                          icon: "💰" },
  { code: "eng-340",  description: "Law",                                icon: "⚖️" },
  { code: "eng-350",  description: "Public Administration & Military Science", icon: "🎖️" },
  { code: "eng-360",  description: "Social Problems, Social Services & Associations", icon: "🤝" },
  { code: "eng-370",  description: "Education",                          icon: "🎓" },
  { code: "eng-380",  description: "Commerce, Communications & Transportation", icon: "🚚" },
  { code: "eng-390",  description: "Customs, Etiquette & Folklore",      icon: "🎭" },
  { code: "eng-400",  description: "Language",                           icon: "💬" },
  { code: "eng-410",  description: "Linguistics",                        icon: "🔤" },
  { code: "eng-420",  description: "English & Old English Languages",    icon: "📖" },
  { code: "eng-430",  description: "German & Related Languages",         icon: "📖" },
  { code: "eng-440",  description: "French & Related Languages",         icon: "📖" },
  { code: "eng-450",  description: "Italian, Romanian & Related Languages", icon: "📖" },
  { code: "eng-460",  description: "Spanish & Portuguese",               icon: "📖" },
  { code: "eng-470",  description: "Latin & Other Italic Languages",     icon: "📖" },
  { code: "eng-480",  description: "Classical & Modern Greek",           icon: "📖" },
  { code: "eng-490",  description: "Other Languages",                    icon: "📖" },
  { code: "eng-500",  description: "Science",                            icon: "🔬" },
  { code: "eng-510",  description: "Mathematics",                        icon: "🔢" },
  { code: "eng-520",  description: "Astronomy",                          icon: "🔭" },
  { code: "eng-530",  description: "Physics",                            icon: "⚛️" },
  { code: "eng-540",  description: "Chemistry",                          icon: "🧪" },
  { code: "eng-550",  description: "Earth Sciences",                     icon: "🌍" },
  { code: "eng-560",  description: "Paleontology",                       icon: "🦕" },
  { code: "eng-570",  description: "Anthropology & Biology",             icon: "🧬" },
  { code: "eng-580",  description: "Botany (Plants)",                    icon: "🌿" },
  { code: "eng-590",  description: "Zoology (Animals)",                  icon: "🐾" },
  { code: "eng-600",  description: "Technology",                         icon: "🔧" },
  { code: "eng-610",  description: "Medicine & Health",                  icon: "🏥" },
  { code: "eng-620",  description: "Engineering",                        icon: "⚙️" },
  { code: "eng-630",  description: "Agriculture",                        icon: "🌾" },
  { code: "eng-640",  description: "Home & Family Management",           icon: "🏠" },
  { code: "eng-650",  description: "Management & Auxiliary Services",    icon: "📊" },
  { code: "eng-660",  description: "Chemical Engineering",               icon: "🧪" },
  { code: "eng-670",  description: "Manufactures",                       icon: "🏭" },
  { code: "eng-680",  description: "Manufactures (continued)",           icon: "🏭" },
  { code: "eng-690",  description: "Building Construction",              icon: "🏗️" },
  { code: "eng-700",  description: "Arts & Recreation",                  icon: "🎨" },
  { code: "eng-710",  description: "Landscape & Civic Art",              icon: "🌳" },
  { code: "eng-720",  description: "Architecture",                       icon: "🏛️" },
  { code: "eng-730",  description: "Sculpture, Ceramics & Metalwork",    icon: "🗿" },
  { code: "eng-740",  description: "Drawing & Decorative Arts",          icon: "🎨" },
  { code: "eng-750",  description: "Painting",                           icon: "🖼️" },
  { code: "eng-760",  description: "Graphic Arts & Printmaking",         icon: "🖨️" },
  { code: "eng-770",  description: "Photography",                        icon: "📷" },
  { code: "eng-780",  description: "Music",                              icon: "🎵" },
  { code: "eng-790",  description: "Recreation, Sports & Performing Arts", icon: "🎭" },
  { code: "eng-800",  description: "Literature & Rhetoric",              icon: "📝" },
  { code: "eng-810",  description: "American Literature in English",     icon: "📖" },
  { code: "eng-820",  description: "English & Old English Literatures",  icon: "📖" },
  { code: "eng-830",  description: "German & Related Literatures",       icon: "📖" },
  { code: "eng-840",  description: "French & Related Literatures",       icon: "📖" },
  { code: "eng-850",  description: "Italian, Romanian & Related Literatures", icon: "📖" },
  { code: "eng-860",  description: "Spanish & Portuguese Literatures",   icon: "📖" },
  { code: "eng-870",  description: "Latin & Other Italic Literatures",   icon: "📖" },
  { code: "eng-880",  description: "Classical & Modern Greek Literatures", icon: "📖" },
  { code: "eng-890",  description: "Other Literatures",                  icon: "📖" },
  { code: "eng-900",  description: "History, Geography & Related Disciplines", icon: "🌍" },
  { code: "eng-910",  description: "Geography, Travel & Maps",           icon: "🗺️" },
  { code: "eng-920",  description: "Biography, Genealogy & Insignia",    icon: "👤" },
  { code: "eng-930",  description: "Ancient History",                    icon: "🏛️" },
  { code: "eng-940",  description: "History of Europe",                  icon: "🌍" },
  { code: "eng-950",  description: "History of Asia & Far East",         icon: "🌏" },
  { code: "eng-951",  description: "History of Hong Kong",               icon: "🇭🇰" },
  { code: "eng-960",  description: "History of Africa",                  icon: "🌍" },
  { code: "eng-970",  description: "History of North America",           icon: "🌎" },
  { code: "eng-980",  description: "History of South America",           icon: "🌎" },
  { code: "eng-990",  description: "History of Other Areas",             icon: "🌍" },
];

// ──────────────────────────────────────────────
//  Classifications (Liu Guojun System — Chinese)
// ──────────────────────────────────────────────
const chineseClassifications: ClassificationSeed[] = [
  { code: "chi-000",  description: "總類",          icon: "📚" },
  { code: "chi-010",  description: "目錄學",        icon: "📋" },
  { code: "chi-020",  description: "圖書館學",      icon: "🏛️" },
  { code: "chi-030",  description: "國學",          icon: "📖" },
  { code: "chi-040",  description: "普通類書",      icon: "📔" },
  { code: "chi-050",  description: "普通雜誌",      icon: "📰" },
  { code: "chi-060",  description: "普通社會出版物", icon: "📰" },
  { code: "chi-070",  description: "普通論叢",      icon: "📝" },
  { code: "chi-080",  description: "普通叢書",      icon: "📚" },
  { code: "chi-090",  description: "群經",          icon: "📜" },
  { code: "chi-100",  description: "哲學總論",      icon: "🧠" },
  { code: "chi-110",  description: "思想史",        icon: "📜" },
  { code: "chi-120",  description: "中國哲學",      icon: "☯️" },
  { code: "chi-130",  description: "東方哲學",      icon: "☯️" },
  { code: "chi-140",  description: "西方哲學",      icon: "🏛️" },
  { code: "chi-150",  description: "論理學",        icon: "🔢" },
  { code: "chi-160",  description: "形而上學、玄學", icon: "🔮" },
  { code: "chi-170",  description: "心理學",        icon: "🧠" },
  { code: "chi-180",  description: "美學",          icon: "🎨" },
  { code: "chi-190",  description: "倫理學",        icon: "⚖️" },
  { code: "chi-200",  description: "宗教總論",      icon: "⛪" },
  { code: "chi-210",  description: "比較宗教學",    icon: "📖" },
  { code: "chi-220",  description: "佛教",          icon: "☸️" },
  { code: "chi-230",  description: "道教",          icon: "☯️" },
  { code: "chi-240",  description: "基督教",        icon: "✝️" },
  { code: "chi-250",  description: "回教",          icon: "☪️" },
  { code: "chi-270",  description: "其他各教",      icon: "🕉️" },
  { code: "chi-280",  description: "神話",          icon: "🐉" },
  { code: "chi-290",  description: "術數",          icon: "🔮" },
  { code: "chi-300",  description: "自然科學",      icon: "🔬" },
  { code: "chi-310",  description: "數學",          icon: "🔢" },
  { code: "chi-320",  description: "天文學",        icon: "🔭" },
  { code: "chi-330",  description: "物理學",        icon: "⚛️" },
  { code: "chi-340",  description: "化學",          icon: "🧪" },
  { code: "chi-350",  description: "地質學",        icon: "⛰️" },
  { code: "chi-360",  description: "生物學",        icon: "🧬" },
  { code: "chi-370",  description: "植物學",        icon: "🌿" },
  { code: "chi-380",  description: "動物學",        icon: "🐾" },
  { code: "chi-390",  description: "人類學",        icon: "👤" },
  { code: "chi-400",  description: "應用科學",      icon: "🔧" },
  { code: "chi-410",  description: "醫學",          icon: "🏥" },
  { code: "chi-420",  description: "家事",          icon: "🏠" },
  { code: "chi-430",  description: "農業",          icon: "🌾" },
  { code: "chi-440",  description: "工程",          icon: "⚙️" },
  { code: "chi-460",  description: "應用化學、化學工藝", icon: "🧪" },
  { code: "chi-470",  description: "製造",          icon: "🏭" },
  { code: "chi-480",  description: "各種營業",      icon: "🏪" },
  { code: "chi-490",  description: "營業方法",      icon: "📊" },
  { code: "chi-500",  description: "社會科學",      icon: "🏛️" },
  { code: "chi-510",  description: "統計",          icon: "📊" },
  { code: "chi-520",  description: "教育",          icon: "🎓" },
  { code: "chi-530",  description: "禮俗",          icon: "🎎" },
  { code: "chi-540",  description: "社會學",        icon: "🤝" },
  { code: "chi-550",  description: "經濟",          icon: "💰" },
  { code: "chi-560",  description: "財政",          icon: "💰" },
  { code: "chi-570",  description: "政治",          icon: "🏛️" },
  { code: "chi-580",  description: "法律",          icon: "⚖️" },
  { code: "chi-590",  description: "軍事",          icon: "🎖️" },
  { code: "chi-600",  description: "中國史地",      icon: "🇨🇳" },
  { code: "chi-610",  description: "中國通史",      icon: "📜" },
  { code: "chi-620",  description: "斷代史",        icon: "📜" },
  { code: "chi-629.38", description: "香港歷史",    icon: "🇭🇰" },
  { code: "chi-630",  description: "文化史",        icon: "📜" },
  { code: "chi-640",  description: "外交史",        icon: "🤝" },
  { code: "chi-650",  description: "史料",          icon: "📜" },
  { code: "chi-660",  description: "地理",          icon: "🗺️" },
  { code: "chi-670",  description: "中國方志",      icon: "🗺️" },
  { code: "chi-673.8", description: "香港地方志",   icon: "🇭🇰" },
  { code: "chi-680",  description: "中國類志",      icon: "📚" },
  { code: "chi-690",  description: "中國遊記",      icon: "✈️" },
  { code: "chi-693.8", description: "香港遊記",     icon: "🇭🇰" },
  { code: "chi-700",  description: "世界史地、傳記", icon: "🌍" },
  { code: "chi-710",  description: "世界史地",      icon: "🌍" },
  { code: "chi-720",  description: "海洋",          icon: "🌊" },
  { code: "chi-730",  description: "亞洲史地",      icon: "🌏" },
  { code: "chi-740",  description: "歐洲史地",      icon: "🌍" },
  { code: "chi-750",  description: "美洲史地",      icon: "🌎" },
  { code: "chi-760",  description: "非洲史地",      icon: "🌍" },
  { code: "chi-770",  description: "澳洲及其他史地", icon: "🌏" },
  { code: "chi-780",  description: "傳記",          icon: "👤" },
  { code: "chi-790",  description: "考古學",        icon: "🏛️" },
  { code: "chi-800",  description: "語言學、文學",  icon: "📝" },
  { code: "chi-810",  description: "文學",          icon: "📖" },
  { code: "chi-820",  description: "中國文學",      icon: "📖" },
  { code: "chi-830",  description: "總集",          icon: "📚" },
  { code: "chi-840",  description: "別集",          icon: "📖" },
  { code: "chi-850",  description: "中國特種文學",  icon: "📖" },
  { code: "chi-857",  description: "小說",          icon: "📖" },
  { code: "chi-860",  description: "東方文學",      icon: "📖" },
  { code: "chi-870",  description: "西方文學",      icon: "📖" },
  { code: "chi-880",  description: "翻譯詩詞戲劇",  icon: "🎭" },
  { code: "chi-889",  description: "翻譯小說",      icon: "📖" },
  { code: "chi-890",  description: "新聞學",        icon: "📰" },
  { code: "chi-900",  description: "美術、遊藝",    icon: "🎨" },
  { code: "chi-910",  description: "音樂",          icon: "🎵" },
  { code: "chi-920",  description: "建築",          icon: "🏛️" },
  { code: "chi-930",  description: "雕刻",          icon: "🗿" },
  { code: "chi-940",  description: "書畫",          icon: "🖼️" },
  { code: "chi-950",  description: "攝影",          icon: "📷" },
  { code: "chi-990",  description: "遊藝",          icon: "🎮" },
];

// ──────────────────────────────────────────────
//  Sample Books (20)
// ──────────────────────────────────────────────
const sampleBooks: BookSeed[] = [
  { isbn: "978-0-141-03963-9", book_number: "1", title: "1984",                        author: "George Orwell",          publisher: "Penguin Books",           classification: "eng-800" },
  { isbn: "978-0-061-12008-4", book_number: "1", title: "To Kill a Mockingbird",       author: "Harper Lee",             publisher: "HarperCollins",           classification: "eng-800" },
  { isbn: "978-0-743-27356-5", book_number: "1", title: "The Great Gatsby",            author: "F. Scott Fitzgerald",    publisher: "Scribner",                classification: "eng-800" },
  { isbn: "978-0-452-28423-4", book_number: "1", title: "Brave New World",             author: "Aldous Huxley",          publisher: "Harper Perennial",        classification: "eng-800" },
  { isbn: "978-0-140-44926-6", book_number: "1", title: "The Odyssey",                 author: "Homer",                  publisher: "Penguin Classics",        classification: "eng-880" },
  { isbn: "978-0-521-67543-1", book_number: "1", title: "A Brief History of Time",     author: "Stephen Hawking",        publisher: "Bantam Books",            classification: "eng-530" },
  { isbn: "978-0-465-06710-7", book_number: "1", title: "The Selfish Gene",            author: "Richard Dawkins",        publisher: "Oxford University Press", classification: "eng-570" },
  { isbn: "978-0-393-35730-5", book_number: "1", title: "Silent Spring",               author: "Rachel Carson",          publisher: "Mariner Books",           classification: "eng-630" },
  { isbn: "978-0-14-143960-0", book_number: "1", title: "Pride and Prejudice",         author: "Jane Austen",            publisher: "Penguin Classics",        classification: "eng-800" },
  { isbn: "978-0-307-47769-1", book_number: "1", title: "The Catcher in the Rye",      author: "J.D. Salinger",          publisher: "Back Bay Books",          classification: "eng-800" },
  { isbn: "978-988-97022-8-1", book_number: "1", title: "香港的故事",                  author: "陳冠中",                 publisher: "牛津大學出版社",           classification: "chi-620" },
  { isbn: "978-988-85073-4-8", book_number: "1", title: "香港方物志",                  author: "葉靈鳳",                 publisher: "香港三聯書店",            classification: "chi-670" },
  { isbn: "978-962-04382-5-9", book_number: "1", title: "中國現代史",                  author: "張玉法",                 publisher: "東華書局",               classification: "chi-610" },
  { isbn: "978-957-32654-3-2", book_number: "1", title: "哲學概論",                    author: "傅佩榮",                 publisher: "天下文化",                classification: "chi-100" },
  { isbn: "978-957-11684-0-5", book_number: "1", title: "普通心理學",                  author: "游恆山",                 publisher: "五南圖書",                classification: "chi-170" },
  { isbn: "978-986-359-782-3", book_number: "1", title: "紅樓夢",                      author: "曹雪芹",                 publisher: "時報出版",                classification: "chi-850" },
  { isbn: "978-986-406-374-6", book_number: "1", title: "三體",                        author: "劉慈欣",                 publisher: "貓頭鷹出版",              classification: "chi-857" },
  { isbn: "978-962-678-740-3", book_number: "1", title: "香港中藥材圖鑑",              author: "李甯漢",                 publisher: "香港中文大學出版社",       classification: "chi-410" },
  { isbn: "978-957-08634-5-9", book_number: "1", title: "臺灣史",                      author: "戚嘉林",                 publisher: "海峽學術",                classification: "chi-620" },
  { isbn: "978-988-23713-4-7", book_number: "1", title: "香港地鐵地圖",                author: "三采文化",               publisher: "三采文化出版事業有限公司", classification: "chi-660" },
];

// ──────────────────────────────────────────────
//  Import function
// ──────────────────────────────────────────────
export function seedDatabase() {
  const db = getDb();

  // Insert classifications
  const insertClass = db.prepare(
    "INSERT OR IGNORE INTO classifications (classification, description, class_icon) VALUES (?, ?, ?)"
  );

  const allClassifications = [...englishClassifications, ...chineseClassifications];
  for (const c of allClassifications) {
    insertClass.run(c.code, c.description, c.icon);
  }
  console.log(`Inserted ${allClassifications.length} classifications.`);

  // Insert books
  const insertBook = db.prepare(
    `INSERT OR IGNORE INTO books (isbn, book_number, title, author, publisher, classification)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  for (const b of sampleBooks) {
    insertBook.run(b.isbn, b.book_number, b.title, b.author, b.publisher, b.classification);
  }
  console.log(`Inserted ${sampleBooks.length} books.`);
}
