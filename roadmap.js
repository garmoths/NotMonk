// ── NotMonk Roadmap & Curriculum Database ─────────────────────────────────────
const NOTMONK_CATEGORIES = [
  "0. Profesyonel Temel",
  "1. Programlama & CS",
  "2. Ağ & Web Temeli",
  "3. Backend & Database",
  "4. Application Security",
  "5. DevSecOps & Cloud",
  "6. Pentest & Red Team",
  "7. LLM & AI Engineering",
  "8. AI AppSec",
  "9. AI Red Teaming",
  "10. MLSecOps",
  "11. Detection & IR"
];

const c = (title, category, goal, topics, exitCriteria, resource = "") => ({
  title,
  category,
  resource,
  notes: `HEDEF
${goal}

ALT KONULAR & İÇERİK
${topics.map(t => `• ${t}`).join("\n")}

ÇIKIŞ KRİTERİ
${exitCriteria}

KENDİ ÇALIŞMA NOTLARIM
`
});

const NOTMONK_ROADMAP = [
  // ── 0. Profesyonel çalışma temeli ──────────────────────────────────────────
  c(
    "0.1 Geliştirme Ortamı & Terminal",
    "0. Profesyonel Temel",
    "macOS / Linux terminalinde profesyonelce hareket edebilme, process, port ve paket yöneticilerini tanıma.",
    [
      "macOS terminal ve zsh kabuğu",
      "Dosya sistemi hiyerarşisi ve navigasyon",
      "Process, port ve environment variable (ortam değişkenleri)",
      "SSH bağlantısı ve anahtar yönetimi",
      "Paket yöneticileri: brew, npm/pnpm, pip/uv",
      "Editor/IDE yapılandırması ve debugger kullanımı",
      "Log okuma ve hata izleme"
    ],
    "Bir projeyi klonlayıp çalıştırabilir, port ve process yönetimini yapabilir, logları okuyarak hata ayıklayabilirsin.",
    "https://developer.apple.com"
  ),
  c(
    "0.2 Git & Ekip Çalışması",
    "0. Profesyonel Temel",
    "Git versiyon kontrolünü ve profesyonel ekip akışlarını eksiksiz yönetebilme.",
    [
      "Commit, branch, merge, rebase kavramları",
      "Pull request (PR) ve code review kültürü",
      "Merge conflict çözümü",
      ".gitignore ve secret sızdırmama kuralları",
      "Conventional commits standardı",
      "GitHub Issues & Projects kullanımı"
    ],
    "Temiz branch açıp düzgün commit mesajlarıyla PR üretebilir, merge conflict çözebilirsin.",
    "https://git-scm.com/doc"
  ),
  c(
    "0.3 Teknik İletişim & Dokümantasyon",
    "0. Profesyonel Temel",
    "Teknik karar, mimari, hata ve güvenlik bulgularını uluslararası standartta raporlayabilme.",
    [
      "İngilizce teknik doküman ve RFC okuyabilme",
      "Profesyonel README yazma",
      "Architecture Decision Record (ADR) oluşturma",
      "Etkili hata raporu (Bug report) yazma",
      "Security finding (güvenlik bulgusu) raporlama formatı"
    ],
    "Anlaşılır README, mimari karar kaydı ve güvenlik bulgusu raporu hazırlayabilirsin."
  ),

  // ── 1. Programlama ve bilgisayar bilimi temeli ──────────────────────────────
  c(
    "1.1 Python Temelleri & Test",
    "1. Programlama & CS",
    "Python ile script, veri işleme, hata yönetimi ve async kod yazabilme.",
    [
      "Veri tipleri ve kontrol akışı",
      "Fonksiyonlar ve modüler yapı",
      "Class / nesne tabanlı programlama (OOP)",
      "Exception & hata yönetimi",
      "Dosya işlemleri (I/O), JSON ve HTTP istekleri",
      "Virtual environment ve uv/pip",
      "Pytest ile test yazımı",
      "Asyncio temel mantığı"
    ],
    "Python ile CLI/script ve API çağrıları yazabilir, pytest ile test edebilirsin.",
    "https://docs.python.org/3/tutorial/"
  ),
  c(
    "1.2 TypeScript & Node.js",
    "1. Programlama & CS",
    "Modern JavaScript ve tip güvenli TypeScript ile backend ve async akışları kurabilme.",
    [
      "Scope, function, object, array ve ES6+",
      "Promise ve async/await yapısı",
      "Module sistemi (ESM / CommonJS)",
      "TypeScript type & interface sistemi",
      "Node.js runtime mantığı ve event loop",
      "HTTP API çağrıları (Fetch / Axios)",
      "Test mantığı (Jest / Vitest)"
    ],
    "TypeScript ile tip güvenli async kod yazabilir, Node.js event loop mantığını açıklayabilirsin.",
    "https://www.typescriptlang.org/docs/"
  ),
  c(
    "1.3 Veri Yapıları & Algoritma Temeli",
    "1. Programlama & CS",
    "Yazdığın kodun karmaşıklığını (Big-O) anlamak ve doğru veri yapısını seçebilmek.",
    [
      "Array / List",
      "Stack & Queue",
      "Hash Map / Dictionary",
      "Set",
      "Tree & Graph mantığı",
      "Search ve Sort algoritmaları",
      "Big-O zaman ve alan karmaşıklığı sezgisi"
    ],
    "Kodunun neden yavaş çalıştığını analiz edebilir ve uygun veri yapısını seçebilirsin."
  ),
  c(
    "1.4 İşletim Sistemi Temeli",
    "1. Programlama & CS",
    "İşletim sistemlerinin bellek, süreç, sinyal ve izin yönetimini kavrama.",
    [
      "Process vs Thread farkı",
      "Memory (RAM, Heap, Stack) temel mantığı",
      "File permissions (chmod, chown)",
      "User & Group yetkilendirmesi",
      "Process signals (SIGINT, SIGTERM, SIGKILL)",
      "Service & Daemon yönetimi (systemd / launchd)",
      "Concurrency ve Race condition temel mantığı"
    ],
    "Process yaşam döngüsünü anlayabilir, signal ve izin hatalarını çözebilirsin."
  ),

  // ── 2. Ağ, web ve internet temeli ──────────────────────────────────────────
  c(
    "2.1 Bilgisayar Ağları Temeli",
    "2. Ağ & Web Temeli",
    "Paketlerin internette nasıl dolaştığını ve temel ağ bileşenlerini anlama.",
    [
      "IP adresi (IPv4 / IPv6) ve Subnet",
      "Port ve Socket mantığı",
      "TCP vs UDP farkları",
      "NAT ve Firewall",
      "DNS çözümleme süreci",
      "Proxy vs Reverse Proxy",
      "Load Balancer çalışma mantığı"
    ],
    "Bir isteğin istemciden sunucuya ağ üzerindeki seyahatini ve olası kırılma noktalarını açıklayabilirsin."
  ),
  c(
    "2.2 Web Protokolleri & HTTP/HTTPS",
    "2. Ağ & Web Temeli",
    "HTTP protokolünün tüm detaylarını ve TLS/HTTPS şifrelemesini eksiksiz kavrama.",
    [
      "HTTP Request / Response anatomisi",
      "Method, path, query, header, body",
      "HTTP Status Code'ları (2xx, 3xx, 4xx, 5xx)",
      "Cookie, Session ve Browser Storage",
      "CORS (Cross-Origin Resource Sharing) mekanizması",
      "WebSocket protokolü",
      "HTTPS, TLS Handshake ve Sertifika zinciri"
    ],
    "HTTP mesajlarını okuyabilir, CORS hatalarını çözebilir ve TLS güvenliğini açıklayabilirsin.",
    "https://developer.mozilla.org/en-US/docs/Web/HTTP"
  ),
  c(
    "2.3 Web Uygulaması Mimarisi",
    "2. Ağ & Web Temeli",
    "Uçtan uca modern web mimarisi akışını şematize edebilme.",
    [
      "Browser / Mobile istemci",
      "CDN / Reverse Proxy (Cloudflare, Nginx)",
      "API Gateway / Backend Service",
      "Database / Cache / Message Queue",
      "Background Worker süreçleri"
    ],
    "Bir isteğin browser'dan database'e kadar olan yolunu ve mimari bileşenlerini açıklayabilirsin."
  ),

  // ── 3. Backend ve database engineering ─────────────────────────────────────
  c(
    "3.1 API Geliştirme & REST Tasarımı",
    "3. Backend & Database",
    "Profesyonel, ölçeklenebilir ve standartlara uygun RESTful API geliştirebilme.",
    [
      "RESTful API tasarım prensipleri",
      "Request validation ve schema doğrulama",
      "Tutarlı response ve hata formatı tasarımı",
      "API versioning stratejileri",
      "OpenAPI / Swagger dokümantasyonu",
      "Pagination, filtering ve sorting",
      "Rate limiting mekanizmaları",
      "Webhook altyapısı ve güvenliği"
    ],
    "OpenAPI dokümantasyonlu, validasyonlu ve rate limit'li bir REST API yazabilirsin."
  ),
  c(
    "3.2 Kimlik ve Yetkilendirme (AuthN / AuthZ)",
    "3. Backend & Database",
    "Güvenli authentication ve authorization sistemleri kurabilme.",
    [
      "Authentication vs Authorization farkı",
      "Password hashing (Argon2, bcrypt, scrypt)",
      "Session-based auth vs Token-based auth",
      "JWT (JSON Web Token) ve güvenlik riskleri",
      "Access Token & Refresh Token rotasyonu",
      "OAuth 2.0 & OpenID Connect (OIDC) akışları",
      "RBAC (Role-Based Access Control)",
      "ABAC & Resource Ownership (sahiplik kontrolü)"
    ],
    "Token rotasyonlu, güvenli parola hash'lemeli ve rol/sahiplik kontrollü auth kurabilirsin."
  ),
  c(
    "3.3 SQL & PostgreSQL Mühendisliği",
    "3. Backend & Database",
    "İlişkisel veritabanı modelleme, performans optimizasyonu ve transaction yönetimi.",
    [
      "Tablo, satır, sütun, data types",
      "Primary key, Foreign key ve Constraints (Unique, Check, Not Null)",
      "JOIN çeşitleri ve karmaşık sorgular",
      "Index türleri (B-Tree, GIN) ve index stratejileri",
      "EXPLAIN & Query plan okuma",
      "Transaction ve ACID prensipleri",
      "Isolation levels ve Lock mekanizmaları",
      "Database migration yönetimi",
      "Backup & Restore temelleri"
    ],
    "PostgreSQL'de ilişkisel şema tasarlayabilir, migration yönetebilir ve query plan optimize edebilirsin.",
    "https://www.postgresql.org/docs/"
  ),
  c(
    "3.4 Gerçek Backend Problemleri & Dayanıklılık",
    "3. Backend & Database",
    "Dağıtık ve yüksek yüklü sistemlerde ortaya çıkan backend problemlerini çözebilme.",
    [
      "Race Condition ve concurrency problemleri",
      "Idempotency anahtarları ve tasarımı",
      "Timeout & Retry stratejileri (Exponential Backoff)",
      "Connection Pool yönetimi",
      "Caching (Redis) ve Cache Invalidation stratejileri",
      "Message Queue / Background Jobs (RabbitMQ, BullMQ, Kafka)",
      "Dead Letter Queue (DLQ) mantığı",
      "Structured Logging, Metrics ve Tracing (Observability)",
      "Graceful Shutdown ve global error handling"
    ],
    "Idempotent API yazabilir, Redis caching ve background queue ile dayanıklı sistem kurabilirsin."
  ),
  c(
    "3.5 Backend Test Stratejileri",
    "3. Backend & Database",
    "Test piramidine uygun olarak uçtan uca test yazabilme.",
    [
      "Unit test vs Integration test",
      "API & End-to-End testler",
      "Test database izolasyonu",
      "Mocking / Stubbing ne zaman ve nasıl kullanılır?",
      "Regression testleri ve CI çalıştırma"
    ],
    "Test database'i ile çalışan entegrasyon testleri yazıp CI pipeline'ında çalıştırabilirsin."
  ),

  // ── 4. Application Security / AppSec ───────────────────────────────────────
  c(
    "4.1 Güvenlik Düşüncesi & Tehdit Modelleme",
    "4. Application Security",
    "Bir yazılıma saldırgan ve savunmacı gözüyle bakıp tehdit modeli çıkarabilme.",
    [
      "CIA Triadı: Gizlilik, Bütünlük, Erişilebilirlik",
      "Asset, Threat, Vulnerability, Risk kavramları",
      "Attack Surface (Saldırı Yüzeyi) analizi",
      "Trust Boundary (Güven Sınırları)",
      "Least Privilege & Defense in Depth ilkeleri",
      "STRIDE ile Tehdit Modelleme (Threat Modeling)"
    ],
    "Bir uygulama mimarisinin STRIDE tehdit modelini çıkarıp güven sınırlarını belirleyebilirsin.",
    "https://owasp.org/www-community/Threat_Modeling"
  ),
  c(
    "4.2 Web & API Zafiyetleri (OWASP Top 10)",
    "4. Application Security",
    "Web ve API dünyasındaki kritik güvenlik açıklarını tanıma, sömürme ve önleme.",
    [
      "Broken Access Control: IDOR/BOLA, Privilege Escalation, Tenant Isolation",
      "Authentication Failures: Session Fixation, Weak Reset Flow, Token Hataları",
      "Injection: SQLi, Command Injection, SSTI",
      "XSS: Reflected, Stored, DOM-based XSS",
      "CSRF & SSRF (Server-Side Request Forgery)",
      "Path Traversal & Insecure File Upload",
      "Open Redirect, Clickjacking & CORS Misconfiguration",
      "Security Misconfiguration & Error/Info Disclosure",
      "Insecure Deserialization mantığı"
    ],
    "Web Security Academy lab'lerinde zafiyetleri tespit edip sömürebilir ve kök nedenini açıklayabilirsin.",
    "https://portswigger.net/web-security"
  ),
  c(
    "4.3 Secure Coding (Güvenli Kod Geliştirme)",
    "4. Application Security",
    "Zafiyetsiz kod yazma standartlarını ve güvenli geliştirme prensiplerini uygulama.",
    [
      "Strict Input Validation & Allowlisting",
      "Context-aware Output Encoding",
      "Parameterized Queries & ORM güvenliği",
      "Güvenli Token ve Kriptografik Rastgelelik",
      "Secret Management (Koddaki secret'ları önleme)",
      "Güvenli loglama (Log Forgery & PII sızdırmama)",
      "Security Headers: CSP, HSTS, X-Frame-Options",
      "Secure Code Review metodolojisi"
    ],
    "Kod incelemesinde (Code Review) güvenlik açıklarını yakalayabilir ve güvenli yamalar yazabilirsin."
  ),
  c(
    "4.4 Uygulama Güvenliği Doğrulama (AppSec Tools)",
    "4. Application Security",
    "Otomatik ve manuel AppSec araçlarını pipeline'a entegre edip yönetebilme.",
    [
      "OWASP ASVS (Application Security Verification Standard)",
      "SAST (Static Application Security Testing) araçları: Semgrep",
      "DAST (Dynamic Application Security Testing) araçları: ZAP",
      "Dependency Scanning (SCA) & Trivy",
      "Secret Scanning (Gitleaks)",
      "Manual Security Code Review",
      "Security Regression Testleri"
    ],
    "CI/CD'ye SAST, SCA ve secret scanner entegre edip bulguları doğrulayabilirsin."
  ),

  // ── 5. DevSecOps ve cloud security ─────────────────────────────────────────
  c(
    "5.1 Container & Docker Güvenliği",
    "5. DevSecOps & Cloud",
    "Güvenli container imajları oluşturma ve container runtime güvenliği.",
    [
      "Dockerfile best practices & Multi-stage builds",
      "Root olmayan (non-root) kullanıcı ile çalıştırma",
      "Container imaj tarama (Trivy / Grype)",
      "Container secret yönetimi ve volume güvenliği",
      "Container isolation & runtime kısıtlamaları (cap-drop)"
    ],
    "Minimal, non-root ve sıfır kritik zafiyetli Docker imajı üretebilirsin.",
    "https://docs.docker.com"
  ),
  c(
    "5.2 CI/CD Güvenliği & GitHub Actions",
    "5. DevSecOps & Cloud",
    "CI/CD pipeline güvenliğini sağlama ve DevSecOps otomasyonu.",
    [
      "GitHub Actions pipeline tasarımı",
      "Branch protection rules ve PR kontrolleri",
      "Pipeline içi SAST, SCA ve Gitleaks taramaları",
      "SBOM (Software Bill of Materials) üretimi",
      "Artifact güvenliği ve imzalama (Cosign)",
      "CI Token izinleri (GITHUB_TOKEN Least Privilege)"
    ],
    "Tüm güvenlik kontrollerini otomatik koşan güvenli bir CI/CD pipeline kurabilirsin."
  ),
  c(
    "5.3 Cloud & IAM Güvenliği (AWS/GCP)",
    "5. DevSecOps & Cloud",
    "Bulut altyapısında kimlik, ağ ve veri güvenliği yapılandırması.",
    [
      "IAM: Users, Roles, Policies, Service Accounts",
      "Least Privilege IAM policy tasarımı",
      "VPC, Subnets, Security Groups, Public/Private ayrımı",
      "Object Storage (S3 / GCS) güvenliği ve bucket izinleri",
      "Managed Database ve Secrets Manager kullanımı",
      "Cloud Logging ve Audit Trail (CloudTrail)",
      "Yaygın Cloud Misconfiguration hataları"
    ],
    "Cloud IAM politikalarını sıkılaştırabilir ve güvenli VPC/Storage mimarisi kurabilirsin."
  ),
  c(
    "5.4 Infrastructure as Code (IaC) & Terraform",
    "5. DevSecOps & Cloud",
    "Altyapıyı kodla yönetirken güvenlik denetimleri uygulama.",
    [
      "Terraform temelleri ve kaynak tanımlama",
      "Terraform State güvenliği (Remote state & encryption)",
      "IaC Güvenlik taraması (tfsec, Checkov, Trivy)",
      "Hardcoded secret önleme ve güvenli default'lar"
    ],
    "Terraform ile güvenli altyapı kodu yazabilir ve statik taramadan geçirebilirsin."
  ),
  c(
    "5.5 Kubernetes Güvenliği Temelleri",
    "5. DevSecOps & Cloud",
    "Kubernetes küme ve pod güvenliğini temel düzeyde anlama.",
    [
      "Pod, Deployment, Service, Ingress mantığı",
      "Namespace izolasyonu ve RBAC kuralları",
      "ConfigMap ve Kubernetes Secret yönetimi",
      "Network Policy ile pod izolasyonu",
      "Admission Controllers (OPA / Kyverno mantığı)"
    ],
    "Pod güvenlik standartlarını (PSS) ve temel RBAC kurallarını uygulayabilirsin."
  ),

  // ── 6. Pentest ve red-team metodolojisi ────────────────────────────────────
  c(
    "6.1 Pentest Etiği, Kapsam & Metodoloji",
    "6. Pentest & Red Team",
    "Yasal ve etik sınırlar içinde sızma testi yürütme kuralları.",
    [
      "Yazılı izin ve Rules of Engagement (RoE)",
      "Scope (Kapsam) belirleme ve sınırları koruma",
      "Veri güvenliği ve test ortamı izolasyonu",
      "Responsible Disclosure (Sorumlu İfşa) ilkeleri"
    ],
    "Etik ve yasal çerçevede kapsamlı bir test anlaşması (Scope/RoE) hazırlayabilirsin."
  ),
  c(
    "6.2 Web & API Sızma Testi Süreci",
    "6. Pentest & Red Team",
    "Sistematik olarak web ve API penetrasyon testi adımlarını uygulama.",
    [
      "Reconnaissance (Keşif) ve Attack Surface Mapping",
      "Burp Suite ile Request Manipulation ve Proxy analizi",
      "Authentication & Authorization bypass testleri",
      "Business Logic (İş Mantığı) testleri",
      "Rate Limit, File Upload ve SSRF test senaryoları",
      "Retest (Yama Doğrulama) süreci"
    ],
    "Burp Suite kullanarak bir hedef API üzerinde sistematik pentest gerçekleştirebilirsin."
  ),
  c(
    "6.3 Profesyonel Pentest Raporlama",
    "6. Pentest & Red Team",
    "Yöneticilerin ve yazılımcıların anlayacağı nitelikte bulgu raporu üretme.",
    [
      "Bulgu Tanımı ve Yönetici Özeti (Executive Summary)",
      "Risk Seviyesi (CVSS skorlama mantığı)",
      "Güvenli Kanıt (Proof of Concept / PoC) hazırlama",
      "Etki analizi ve Kök Neden (Root Cause)",
      "Net Düzeltme / İyileştirme (Remediation) adımları"
    ],
    "CVSS skorlu, PoC içeren ve eyleme dönük profesyonel bir sızma testi raporu yazabilirsin."
  ),

  // ── 7. LLM ve AI application engineering ──────────────────────────────────
  c(
    "7.1 LLM Temelleri & Model API Entegrasyonu",
    "7. LLM & AI Engineering",
    "Büyük dil modellerinin çalışma prensipleri ve API entegrasyonu.",
    [
      "Token, Context Window, Tokenizer mantığı",
      "Prompt, System Prompt ve Role ayrımı",
      "Temperature, Top-P, Presence/Frequency Penalty",
      "Model API çağrıları ve Streaming response",
      "Maliyet (Cost) ve Gecikme (Latency) optimizasyonu",
      "Model sağlayıcı farkları (OpenAI, Anthropic, Gemini, Local Ollama)"
    ],
    "LLM API'leri ile streaming çalışan, maliyet ve token kontrollü uygulama geliştirebilirsin."
  ),
  c(
    "7.2 RAG (Retrieval-Augmented Generation) Mimarisi",
    "7. LLM & AI Engineering",
    "Kendi verilerinizle beslenen RAG sistemleri kurma ve optimize etme.",
    [
      "Vector Embedding ve Semantic Search",
      "Chunking stratejileri (Fixed size, Semantic chunking)",
      "Vector Database (Chroma, Qdrant, pgvector)",
      "Retrieval, Reranking ve Hybrid Search",
      "Ingestion Pipeline tasarımı",
      "Doküman Yetkilendirme (Document Permissions in RAG)",
      "Citation & Grounding (Kaynak gösterme)"
    ],
    "Yetki kontrollü, vektör veritabanlı çalışan bir RAG hattı kurabilirsin."
  ),
  c(
    "7.3 AI Agent & Tool Calling Sistemleri",
    "7. LLM & AI Engineering",
    "Otonom araç kullanan yapay zeka ajanları inşa etme.",
    [
      "Tool / Function Calling mantığı",
      "Agent Loop ve Karar mekanizması (ReAct)",
      "Agent Memory (Short-term & Long-term)",
      "Tool Permission ve İnsan Onayı (Human-in-the-loop)",
      "Agent Sandboxing ve İzolasyon",
      "Agent Observability & Tracing (LangSmith, Phoenix)"
    ],
    "Güvenli araç izinlerine sahip, function calling yapan bir AI Agent geliştirebilirsin."
  ),
  c(
    "7.4 AI Uygulama Kalitesi & Evaluation",
    "7. LLM & AI Engineering",
    "Model çıktılarının doğruluğunu, halüsinasyonunu ve kalitesini ölçme.",
    [
      "Evaluation Datasets (Eval setleri)",
      "Hallucination tespiti ve önleme",
      "Prompt Versioning ve Test otomasyonu",
      "Structured Output (JSON Schema) zorlama",
      "Fallback ve Rate Limit yönetimi"
    ],
    "AI uygulamanız için otomatik evaluation seti oluşturup başarı skorunu ölçebilirsin."
  ),

  // ── 8. AI Application Security ─────────────────────────────────────────────
  c(
    "8.1 AI Threat Modeling (Yapay Zeka Tehdit Modellemesi)",
    "8. AI AppSec",
    "AI ve LLM içeren sistemlerin saldırı yüzeyini ve güven sınırlarını modelleme.",
    [
      "AI Bileşenleri: Model, Kullanıcı, Prompt, RAG verisi, Tool, Agent, API Key",
      "Bileşen bazlı saldırı yüzeyi analizi",
      "Trust Boundary ihlalleri",
      "AI Sistemlerinde Least Privilege yaklaşımı"
    ],
    "Bir RAG veya Agent uygulamasının uçtan uca AI Tehdit Modelini çıkarabilirsin."
  ),
  c(
    "8.2 LLM Saldırı Sınıfları & Zafiyetleri",
    "8. AI AppSec",
    "OWASP Top 10 for LLM kapsamındaki saldırı vektörlerini analiz etme.",
    [
      "Direct Prompt Injection & Jailbreak teknikleri",
      "Indirect Prompt Injection (RAG, Web, E-posta verisi üzerinden)",
      "System Prompt Leakage ve Bilgi İfşası",
      "Insecure Output Handling (XSS / SQLi tetikleme)",
      "Excessive Agency ve Tool Abuse (Yetkisiz araç çalıştırma)",
      "RAG Poisoning ve Embedding manipülasyonu",
      "Model/API Supply Chain riskleri",
      "Unbounded Consumption (DoS & Token Tüketimi)",
      "Cross-Tenant Data Leaks (RAG izolasyon hatası)"
    ],
    "OWASP LLM zafiyetlerini simüle edebilir ve zafiyetin sistemdeki etkisini gösterebilirsin.",
    "https://owasp.org/www-project-top-10-for-large-language-model-applications/"
  ),
  c(
    "8.3 AI Savunma Mimarisi & Guardrails",
    "8. AI AppSec",
    "LLM ve Agent sistemlerine çok katmanlı savunma kalkanları kurma.",
    [
      "Prompt'u asla güvenlik sınırı saymama ilkesi",
      "Tool / Ajanlar için Least Privilege ve Allowlist",
      "Structured Output ve Server-side Authorization",
      "RAG seviyesinde Data & Tenant Isolation",
      "Input / Output Guardrails (NeMo Guardrails, Llama Guard)",
      "Human Confirmation gereksinimleri",
      "Kapsamlı Audit Logging ve Anomali Tespiti"
    ],
    "AI Agent için savunma mimarisi ve guardrail kurallarını uygulayabilirsin."
  ),
  c(
    "8.4 AI Güvenlik Standartları & Çerçeveleri",
    "8. AI AppSec",
    "Endüstri standardı AI güvenlik rehberlerini ve framework'lerini tanıma.",
    [
      "OWASP Top 10 for LLM / GenAI",
      "MITRE ATLAS (Adversarial Threat Landscape for AI Systems)",
      "NIST AI Risk Management Framework (AI RMF)"
    ],
    "Sistemi MITRE ATLAS ve OWASP LLM kontrollerine göre denetleyebilirsin.",
    "https://atlas.mitre.org/"
  ),

  // ── 9. AI Red Teaming ──────────────────────────────────────────────────────
  c(
    "9.1 AI Red Team Test Stratejisi & Kapsam",
    "9. AI Red Teaming",
    "AI uygulamalarını sistematik olarak hack'leme ve stres testine tabi tutma.",
    [
      "Scope ve Saldırı Hipotezi (Threat Hypothesis) belirleme",
      "Attack Path (Saldırı Patikası) tasarımı",
      "Başarı Kriteri (Success Criterion) ve Etki Ölçümü",
      "Güvenli Test Verisi ile çalışma",
      "Otomatik vs Manuel Red Teaming araçları (PyRIT, Garak)"
    ],
    "Bir AI uygulaması için kapsamlı Red Team Test Planı oluşturabilirsin."
  ),
  c(
    "9.2 AI Red Team Test Alanları & Tatbikat",
    "9. AI Red Teaming",
    "Gerçek dünya senaryolarıyla AI sistemine penetrasyon tatbikatı.",
    [
      "Prompt Injection & Jailbreak dayanıklılık testleri",
      "Indirect Prompt Injection ile veri sızdırma (Data Exfiltration)",
      "RAG Document Poisoning testleri",
      "Agent Tool Misuse ve Authorization Bypass",
      "System Prompt / Hidden Instructions Leakage",
      "Cost Abuse & DoS simülasyonları",
      "Cross-tenant veri erişim denemeleri",
      "Guardrail bypass ve zayıflık tespiti"
    ],
    "Hedef AI uygulamasını başarıyla bypass eden kanıtlanmış saldırı senaryoları geliştirebilirsin."
  ),
  c(
    "9.3 AI Red Team Raporu & Regresyon Testleri",
    "9. AI Red Teaming",
    "Bulguları raporlama, kök neden analizi ve otomatik regresyon testine dönüştürme.",
    [
      "Bulgu -> Kanıt (PoC) -> Etki -> Kök Neden zinciri",
      "Önerilen Kontrol ve Savunma yamaları",
      "Düzeltme sonrası Retest",
      "Otomatik Red-Team Regresyon Test Paketleri oluşturma"
    ],
    "Profesyonel AI Red Team Raporu ve CI'da çalışan otomatik güvenlik regresyon testi sunabilirsin."
  ),

  // ── 10. MLSecOps (Opsiyonel Derin Uzmanlık) ─────────────────────────────────
  c(
    "10.1 Makine Öğrenmesi & Veri Temeli",
    "10. MLSecOps",
    "Model eğitimi ve klasik makine öğrenmesi veri hattı temelleri.",
    [
      "Python Data Stack: NumPy, Pandas, Scikit-learn",
      "Classification vs Regression modelleri",
      "Overfitting, Underfitting ve Evaluation Metrics",
      "Dataset Split ve Feature Engineering",
      "Temel Olasılık, İstatistik ve Lineer Cebir sezgisi"
    ],
    "Basit bir ML modeli eğitebilir ve evaluation metriklerini yorumlayabilirsin."
  ),
  c(
    "10.2 MLOps Pipeline Mimarisi",
    "10. MLSecOps",
    "Model yaşam döngüsü ve üretim ortamı dağıtım süreçleri.",
    [
      "Dataset Versioning (DVC)",
      "Experiment Tracking (MLflow, Weights & Biases)",
      "Model Registry & Artifact Yönetimi",
      "Training Pipeline otomasyonu",
      "Model Serving ve Drift Monitoring (Veri/Kavram Kayması)"
    ],
    "Uçtan uca MLOps pipeline bileşenlerini ve risk noktalarını açıklayabilirsin."
  ),
  c(
    "10.3 Makine Öğrenmesi Saldırıları",
    "10. MLSecOps",
    "Model ve veri hattına yönelik özelleşmiş ML saldırılarını anlama.",
    [
      "Data Poisoning (Veri Zehirleme)",
      "Model Poisoning & Backdoor Attacks",
      "Adversarial Examples (Evasion Attacks)",
      "Model Extraction & Stealing",
      "Model Inversion & Membership Inference (Gizlilik İhlalleri)",
      "Model Supply Chain Zafiyetleri (Pickle / SafeTensors)"
    ],
    "Veri-Eğitim-Artifact-Deployment zincirindeki ML güvenlik risklerini analiz edebilirsin."
  ),

  // ── 11. Detection, incident response ve uzmanlaşma ─────────────────────────
  c(
    "11.1 Güvenlik Tespiti (Detection Engineering)",
    "11. Detection & IR",
    "Saldırıları ve anomalileri gerçek zamanlı tespit eden kurallar yazma.",
    [
      "Security Logging & Telemetry toplama",
      "SIEM mantığı (Splunk, Elastic, OpenSearch)",
      "Alert Tasarımı ve False Positive azaltma",
      "Detection Rules yazma (Sigma, YARA)",
      "MITRE ATT&CK & MITRE ATLAS ile Tehdit Eşleme"
    ],
    "Saldırı tekniklerini yakalayan Sigma veya tespit kuralları yazabilirsin.",
    "https://sigmahq.io"
  ),
  c(
    "11.2 Olay Müdahalesi (Incident Response)",
    "11. Detection & IR",
    "Bir güvenlik ihlali anında sistematik müdahale adımlarını yönetme.",
    [
      "Triage: Olayı sınıflandırma ve önceliklendirme",
      "Containment: Yayılmayı durdurma ve izole etme",
      "Eradication: Tehdidi sistemden tamamen temizleme",
      "Recovery: Sistemleri güvenle ayağa kaldırma",
      "Postmortem & Lessons Learned raporlama",
      "Sürekli Zafiyet Yönetimi (Vulnerability Management)"
    ],
    "Bir güvenlik olayını baştan sona analiz edip Postmortem raporu hazırlayabilirsin."
  ),
  c(
    "11.3 İleri Düzey Nişler & Sürekli Gelişim",
    "11. Detection & IR",
    "Kariyerin ilerleyen aşamalarında derinleşebileceğin uzmanlık alanları.",
    [
      "Kubernetes Security & Cloud Red Teaming",
      "Supply-Chain Security & Software Provenance",
      "OAuth / OIDC Internals & Identity Security",
      "Mobile AppSec (iOS / Android)",
      "Reverse Engineering, Binary Exploitation & Fuzzing"
    ],
    "Hedeflediğin niş alanda derinleşme planı ve araştırma konusu belirleyebilirsin."
  )
];

globalThis.NOTMONK_CATEGORIES = NOTMONK_CATEGORIES;
globalThis.NOTMONK_ROADMAP = NOTMONK_ROADMAP;
