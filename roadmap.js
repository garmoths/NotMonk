const MDN="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide";
const NODE="https://nodejs.org/learn";
const LAB="https://portswigger.net/web-security";
const ATTACK="https://attack.mitre.org/";
const NOTMONK_CATEGORIES=["Başlangıç","JavaScript","Frontend Temeli","Ağ & HTTP","Backend","Veri & SQL","Mimari & Test","Web Güvenliği","Threat Intelligence","Diğer"];
const q=(title,category,goal,mission,done,resource="")=>({title,category,resource,notes:`HEDEF
${goal}

MİNİ GÖREV
${mission}

TAMAMLAMA KRİTERİ
${done}

KENDİ NOTLARIM
`});
const NOTMONK_ROADMAP=[
q("Çalışma ortamını hazırla","Başlangıç","VS Code, Node.js LTS ve Git'in rollerini tanı.","Sürümleri kontrol et ve learning-lab klasörü oluştur.","node, npm ve git çalışıyor; klasörü VS Code ile açabiliyorsun.",NODE),
q("Terminalde hareket etmeyi öğren","Başlangıç","pwd, ls, cd, mkdir, touch ve clear komutlarını öğren.","Terminalden js-basics klasörü ve index.js oluştur.","Dosya yöneticisi olmadan klasör ve dosya oluşturabiliyorsun."),
q("Git ile ilk repository'ni oluştur","Başlangıç","Repository, staging area, commit ve working tree kavramlarını öğren.","git init çalıştır; dosyanı stage edip commit oluştur.","git status çıktısını yorumlayıp commit atabiliyorsun.","https://git-scm.com/docs/gittutorial"),
q("Değişkenler ve primitive type'lar","JavaScript","let, const, string, number, boolean, null ve undefined öğren.","Kullanıcı profili oluşturup değerlerin type'ını yazdır.","const/let seçimini ve null/undefined farkını anlatabiliyorsun.",MDN),
q("Operator ve type conversion","JavaScript","Karşılaştırma, logical operator, truthy/falsy ve conversion öğren.","String gelen yaş değerini doğrulayan script yaz.","=== kullanma nedenini ve beş falsy değeri biliyorsun.",MDN),
q("Condition ve karar akışı","JavaScript","if/else, switch, ternary ve guard clause öğren.","Role ve login durumuna göre erişim kararı veren fonksiyon yaz.","Dört senaryoyu doğru sonuçlandırıyorsun.",MDN),
q("Loop yapılarını kullan","JavaScript","for, while, for...of, break ve continue öğren.","Log listesinden yalnızca error kayıtlarını çıkar.","Loop seçimini açıklayabiliyorsun.",MDN),
q("Function mantığını kavra","JavaScript","Parameter, argument, return ve arrow function öğren.","Parola koşullarını denetleyen saf fonksiyon yaz.","Fonksiyonun input ve output'unu tarif edebiliyorsun.",MDN),
q("Scope ve closure","JavaScript","Block, function, lexical scope ve closure ilişkisini öğren.","Dışarıdan değiştirilemeyen sayaç closure'ı yaz.","Closure'ın neyi neden hatırladığını anlatabiliyorsun.",MDN),
q("Array ile veri işle","JavaScript","map, filter, find, some, every ve reduce öğren.","Logları severity'ye göre filtreleyip say.","Bir listeyi dönüştürüp filtreleyebiliyorsun.",MDN),
q("Object ve destructuring","JavaScript","Property, method, destructuring ve spread syntax öğren.","HTTP request object'i oluşturup kopyasını güncelle.","Reference ile shallow copy farkını gösterebiliyorsun.",MDN),
q("String, Date ve RegExp","JavaScript","Metin, tarih ve temel regular expression işlemlerini öğren.","Log satırından IP ve timestamp çıkaran parser yaz.","Eşleşmeyen input'u güvenli ele alıyorsun.",MDN),
q("Error handling","JavaScript","Error, throw, try/catch/finally öğren.","Geçersiz JSON'u anlamlı hatayla karşılayan fonksiyon yaz.","Beklenen hatayı programlama hatasından ayırıyorsun.",MDN),
q("Module sistemi","JavaScript","ES module, export ve import öğren.","Log parser'ı üç module'e ayır.","Her module'ün tek sorumluluğu var.",MDN),
q("Async JavaScript ve Promise","JavaScript","Event loop, Promise ve async/await öğren.","API çağrısında loading, success ve error ele al.","Rejected Promise'i ve çalışma sırasını anlatabiliyorsun.",MDN),
q("Proje: Log Analyzer CLI","JavaScript","JavaScript temellerini tek programda birleştir.","JSON loglarını severity, IP ve tarihe göre özetleyen CLI yaz.","Hatalı input programı çökertmiyor; kod module'lere ayrılmış.",NODE),
q("Semantic HTML","Frontend Temeli","Element, attribute, form ve semantic HTML öğren.","Quest ekleme formu ve liste içeren sayfa hazırla.","Elementler doğru anlamla kullanılıyor.","https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content"),
q("CSS box model ve layout","Frontend Temeli","Cascade, box model, Flexbox ve Grid öğren.","Quest sayfasını responsive iki kolonlu tasarla.","Dar ekranda taşma yok.","https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout"),
q("DOM ve event'ler","Frontend Temeli","DOM manipulation, bubbling ve delegation öğren.","Quest ekleme, silme ve durum değiştirme davranışlarını yaz.","UI sayfa yenilenmeden güncelleniyor."),
q("Form doğrulama ve güvenli çıktı","Frontend Temeli","Validation ile textContent/innerHTML farkını öğren.","Kullanıcı girdisini güvenli göster.","Basit HTML payload çalışmıyor; client validation sınırını biliyorsun."),
q("Fetch ile API tüket","Frontend Temeli","fetch, JSON, status code ve UI state öğren.","API'den veri çekip loading/error durumlarıyla göster.","Network ve başarısız response doğru ele alınıyor."),
q("Web nasıl çalışır?","Ağ & HTTP","Client, server, URL, DNS ve request/response zincirini öğren.","URL'den rendering'e kadar akışı çiz.","Adımları doğru sırayla anlatabiliyorsun.","https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Web_standards/How_the_web_works"),
q("IP, subnet, port ve socket","Ağ & HTTP","IPv4, private/public IP, subnet, port ve socket öğren.","Local IP'ni ve Node process'inin portunu bul.","IP ile portu karıştırmıyorsun."),
q("TCP, UDP ve TLS","Ağ & HTTP","Handshake, reliability ve TLS'in amaçlarını öğren.","HTTPS'te gizlenen ve gizlenmeyen bilgileri listele.","TLS'in encryption, integrity ve authentication sağladığını biliyorsun."),
q("HTTP request ve response","Ağ & HTTP","Method, path, query, header, body ve status code öğren.","DevTools'tan bir request'in tüm parçalarını açıkla.","HTTP method ve status sınıflarını örnekleyebiliyorsun."),
q("Cookie, session ve browser storage","Ağ & HTTP","Cookie attribute, session ve storage farklarını öğren.","Secure, HttpOnly ve SameSite değerlerini incele.","Hassas veriyi nerede tutmaman gerektiğini biliyorsun."),
q("Node.js runtime'ını tanı","Backend","Node.js ile browser JavaScript'inin farkını öğren.","process.argv ve environment variable okuyan CLI yaz.","Node.js'in ne olduğunu anlatabiliyorsun.",NODE),
q("npm ve package yönetimi","Backend","package.json, dependency, script ve lockfile öğren.","Package ekle, script tanımla ve kaldır.","Projeyi node_modules olmadan yeniden kurabiliyorsun.",NODE),
q("Node core module'leri","Backend","fs, path, os ve process module'lerini öğren.","Log dosyalarını okuyup özet üreten script yaz.","Path'leri path module'üyle kuruyorsun.",NODE),
q("İlk HTTP server'ını yaz","Backend","Framework olmadan request ve response üret.","/health ve /logs endpoint'leri oluştur.","Doğru status, header ve body dönüyor.",NODE),
q("Express ile REST API","Backend","Routing, middleware, controller ve lifecycle öğren.","Quest CRUD API'si oluştur.","CRUD endpoint'leri doğru HTTP semantics ile çalışıyor.","https://expressjs.com/en/starter/basic-routing.html"),
q("Input validation","Backend","Schema, allowlist ve hiçbir girdiye güvenmeme ilkesini öğren.","Body, params ve query değerlerini doğrula.","Geçersiz alanlar kontrollü 4xx alıyor."),
q("Error handling ve logging","Backend","Operational error, structured log ve correlation ID öğren.","Tek error middleware ve request ID ekle.","Stack trace sızmıyor; request izlenebiliyor."),
q("Environment ve secret yönetimi","Backend","Config, secret ve environment variable farkını öğren.","Database URL ve token secret'ını koddan çıkar.","Secret Git'e girmiyor."),
q("Authentication","Backend","Password hashing, session ve token akışlarını öğren.","Register/login endpoint'i kur ve password'ü hash'le.","Plaintext password yok; login bilgi sızdırmıyor."),
q("Authorization ve access control","Backend","Role ve ownership kontrolünü öğren.","Kullanıcı yalnızca kendi quest'ini değiştirebilsin.","Başkasının ID'siyle erişim engelleniyor."),
q("Proje: Secure Quest API","Backend","Backend temellerini güvenli REST API'de birleştir.","Auth, validation, logging ve CRUD içeren API geliştir.","README, örnek env ve API dokümanı var."),
q("Relational database ve SQL","Veri & SQL","Table, key, constraint ve relation öğren.","User, quest ve category schema'sını PostgreSQL'de oluştur.","İlişkileri ve constraint'leri anlatabiliyorsun.","https://www.postgresql.org/docs/current/tutorial.html"),
q("CRUD query ve JOIN","Veri & SQL","SELECT, INSERT, UPDATE, DELETE, WHERE ve JOIN öğren.","Quest'leri kategorileriyle getiren query yaz.","İki JOIN türünü açıklayabiliyorsun."),
q("Index ve query performansı","Veri & SQL","Index trade-off'u ve query plan öğren.","EXPLAIN çıktısını index öncesi/sonrası karşılaştır.","Index kararını erişim desenine göre veriyorsun."),
q("Transaction ve concurrency","Veri & SQL","ACID, race condition, lock ve isolation level öğren.","Aynı kaydı güncelleyen iki isteği simüle et.","Transaction gereğini ve lost update'i anlatabiliyorsun."),
q("Separation of concerns","Mimari & Test","Route, controller, service ve repository'yi ayır.","API'yi katmanlara böl.","HTTP detayı olmadan service'i test edebiliyorsun."),
q("API tasarımı ve contract","Mimari & Test","Pagination, filtering, versioning ve idempotency öğren.","Liste endpoint'i için contract tasarla.","API davranışı dokümandan tahmin edilebilir."),
q("Unit ve integration test","Mimari & Test","Test pyramid, AAA ve mock farkını öğren.","Service için unit, auth için integration test yaz.","Happy path ve üç failure senaryosu test ediliyor.","https://nodejs.org/api/test.html"),
q("Docker temeli","Mimari & Test","Image, container, volume, network ve Dockerfile öğren.","API ve PostgreSQL'i Docker Compose ile çalıştır.","Tek komutla ortam başlıyor.","https://docs.docker.com/get-started/"),
q("Caching ve queue","Mimari & Test","Cache invalidation ile producer/consumer öğren.","Rate limit için cache, audit için queue taslağı çiz.","Ne zaman gerekli ve gereksiz olduklarını biliyorsun."),
q("Monolith ve distributed system","Mimari & Test","Modular monolith ve microservice trade-off'larını öğren.","Önce modular monolith çiz; bölünme koşullarını yaz.","Microservice'i hedef değil trade-off görüyorsun."),
q("Threat model oluştur","Web Güvenliği","Asset, actor, trust boundary ve attack surface öğren.","API için data-flow diagram ve beş abuse case çıkar.","Neyi kimden koruduğunu yazabiliyorsun.","https://owasp.org/www-community/Threat_Modeling"),
q("Güvenli lab ortamını hazırla","Web Güvenliği","Yalnızca izinli sistemlerde test yaklaşımını öğren.","Web Security Academy'de ilk beginner lab'i aç.","Testlerin kendi sistemin veya izinli lab üzerinde.",LAB),
q("XSS","Web Güvenliği","Reflected, stored, DOM XSS; context ve encoding öğren.","Beginner XSS lab'leri çöz.","Source, sink ve context'i anlatabiliyorsun.","https://portswigger.net/web-security/cross-site-scripting"),
q("SQL injection","Web Güvenliği","Injection nedenini ve parameterized query savunmasını öğren.","Beginner SQLi lab'i çöz; API query'lerini düzelt.","String birleştirerek query üretmiyorsun.","https://portswigger.net/web-security/sql-injection"),
q("CSRF ve cookie güvenliği","Web Güvenliği","SameSite, anti-CSRF token ve cookie davranışını öğren.","Bir CSRF lab'i çöz ve savunma tasarla.","CORS'un tek başına CSRF savunması olmadığını biliyorsun.","https://portswigger.net/web-security/csrf"),
q("Access control ve IDOR","Web Güvenliği","Horizontal/vertical privilege escalation öğren.","Access control lab'i çöz; ownership testlerini genişlet.","UI'da buton gizlemeyi authorization sanmıyorsun.","https://portswigger.net/web-security/access-control"),
q("SSRF","Web Güvenliği","Server-side request ve internal network risklerini öğren.","Beginner SSRF lab'i çöz; URL allowlist tasarla.","Redirect ve DNS bypass yüzeylerini tanıyorsun.","https://portswigger.net/web-security/ssrf"),
q("File upload ve path traversal","Web Güvenliği","MIME, extension, storage ve path risklerini öğren.","Lab'leri çöz; upload kontrol listesi hazırla.","Dosyayı yalnızca uzantısına güvenerek kabul etmiyorsun.",LAB),
q("Security header, CORS ve CSP","Web Güvenliği","CSP, HSTS ve CORS policy mantığını öğren.","Frontend/API için gerekçeli policy oluştur.","Her directive'in etkisini anlatabiliyorsun.","https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP"),
q("Dependency ve secret güvenliği","Web Güvenliği","Supply-chain, audit, lockfile ve secret scanning öğren.","Dependency audit yap ve sahte secret'ı taramayla yakala.","Bulguyu exploitability ile değerlendiriyorsun."),
q("Secure Quest API security review","Web Güvenliği","Kendi sistemini threat model üzerinden test et.","Beş kontrolü doğrula ve security report yaz.","Her bulguda etki, tekrar adımı ve düzeltme var."),
q("Threat Intelligence nedir?","Threat Intelligence","Data, information, intelligence ve türlerini öğren.","Bir olayı dört intelligence düzeyinde özetle.","Haber özetiyle intelligence farkını biliyorsun."),
q("Intelligence lifecycle","Threat Intelligence","Direction, collection, processing, analysis, dissemination ve feedback öğren.","Stakeholder seçip requirement ve collection plan yaz.","Desteklenen kararı araştırmadan önce netleştiriyorsun."),
q("IOC ve observable analizi","Threat Intelligence","IP, domain, URL, hash ve certificate observable'larını öğren.","IOC setini context ve confidence ile normalize et.","IOC'yi bağlamsız kötü ilan etmiyorsun."),
q("OSINT doğrulama","Threat Intelligence","Source reliability, credibility, corroboration ve bias öğren.","Bir iddiayı iki bağımsız kaynaktan doğrula.","Fact, assessment ve assumption'ı ayırıyorsun."),
q("MITRE ATT&CK ile mapping","Threat Intelligence","Tactic, technique, sub-technique ve procedure öğren.","Incident davranışlarını kanıtlarıyla ATT&CK'e eşle.","Tool adına değil davranışa göre mapping yapıyorsun.",ATTACK),
q("Diamond Model","Threat Intelligence","Adversary, capability, infrastructure ve victim ilişkisini öğren.","Bir olay için confidence seviyeli model oluştur.","Doğrulanmış ve varsayımsal ilişkiyi ayırıyorsun.","https://www.cisa.gov/sites/default/files/publications/diamond-model.pdf"),
q("STIX/TAXII","Threat Intelligence","Machine-readable intelligence ve STIX ilişkilerini öğren.","Indicator, malware ve relationship içeren bundle oluştur.","Raporu belirsizlikleri koruyarak yapılandırıyorsun.","https://oasis-open.github.io/cti-documentation/"),
q("YARA ve Sigma'yı tanı","Threat Intelligence","Artifact/log eşleme ve false positive riskini öğren.","Zararsız veri için basit YARA ve Sigma kuralı yaz.","Kuralın neyi yakalayıp kaçıracağını anlatabiliyorsun.","https://sigmahq.io/docs/guide/getting-started.html"),
q("Threat report yaz","Threat Intelligence","Key judgment, confidence, evidence ve recommendation öğren.","Açık kaynak bir olay için kısa report hazırla.","Rapor kaynaklı, belirsizlikleri açık ve eyleme dönük."),
q("Capstone: Threat Intelligence araştırması","Threat Intelligence","Toplama, doğrulama, analiz, mapping ve raporlamayı birleştir.","Public incident seç; IOC doğrula, ATT&CK'e eşle ve report üret.","Fact/assessment ayrımı ve confidence tutarlı.",ATTACK)
];
