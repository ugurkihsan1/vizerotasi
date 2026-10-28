# Vize Rotası

Türkiye’den Schengen başvurusu yapanlar için Türkçe sosyal topluluk uygulaması. Expo SDK 58, React Native, Expo Router, TypeScript, Supabase ve TanStack Query kullanır. İçerikler gerçek Supabase tablolarından gelir; bağlantı yokken sahte deneyimler veya sayaçlar üretilmez.

## Ücretsiz web önizlemesi

GitHub Pages kurulumu ve sonraki yayınlar: [GITHUB_PAGES_TR.md](docs/GITHUB_PAGES_TR.md).

## Çalıştırma

Node 24 ve npm gerekir. Proje kökünde:

```sh
npm ci
cp .env.example .env.local
# .env.local içindeki iki public Supabase değerini doldur
npm start
```

`npm run android`, `npm run ios` veya `npm run web`. iOS simülatörü macOS/Xcode; Android emülatörü Android SDK gerektirir. Mobil auth dönüşleri için `vizerotasi` şemasını destekleyen geliştirme derlemesi kullanın. Expo Go içindeki auth dönüş adresi geliştirme sunucusuna bağlıdır; Dashboard redirect allowlist’ine o adresi eklemek gerekir.

Bulut ortamında npm cache veya Expo telemetry dizini yazılamıyorsa:

```sh
npm_config_cache=/tmp/vizerotasi-npm npm ci
EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 npm start -- --port 8081 --max-workers 2
```

Offline bayrağı uygulamanın Supabase isteklerini kapatmaz; Expo CLI’ın yardımcı servislerine bağlantısını kapatır. Her bulut görevi zaten izoledir; mevcut `/workspace/vizerotasi` checkout’unu kullanın, ek Git worktree oluşturmayın.

## Supabase

1. Supabase’te proje oluşturun. Dashboard SQL Editor’da `supabase/migrations/202610220001_community.sql` dosyasının **tamamını bir kez** uygulayın. Alternatif: Supabase CLI ile `supabase link --project-ref <ref>` ve `supabase db push`. Yerel Supabase için Docker ve CLI ile `supabase start` / `supabase db reset` kullanılabilir; bu ortamda Docker tabanlı kurulum çalıştırılmadı.
2. `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY` değerlerini `.env.local` veya ortam ayarlarına ekleyin. İkinci değer yalnız publishable/anon anahtarıdır. `service_role` anahtarını mobil pakete, repoya veya Expo public değişkenlerine koymayın.
3. Auth → URL Configuration bölümüne geliştirme adreslerini ve `vizerotasi://auth` dönüş adresini ekleyin. Production’da gerçek alan adı / universal link ve uygulama şemasını yapılandırın. E-posta doğrulamasını açın, minimum şifreyi 8 karakter yapın ve SMTP gönderimini yapılandırın.
4. İlk hesabı uygulamadan oluşturup e-postasını doğrulayın. İlk yöneticiyi yalnız güvenilir SQL yönetim oturumunda atayın:

```sql
update public.profiles set role = 'admin' where username = 'kendi_kullanici_adiniz';
```

5. İkinci bir moderatör hesabı oluşturun. Moderatörler kendi içeriklerini onaylayamaz. `202610220003_admin_review.sql` sonrasında yalnız adminler kendi gönderilerini kayıt altına alınan moderasyon işlemiyle yayınlayabilir. Yönetim ekranından üyeye moderatör rolü atanabilir.
6. Supabase adresiniz için bulut ağ ayarlarında `<proje-ref>.supabase.co` erişimine izin verin. Henüz proje olmadığı için tahmini ağ kuralı veya kimlik bilgisi kaydedilmedi.

Ülkeler ve kategori/rozet tanımları migration’da seed edilir. Kullanıcı içeriği seed edilmez. `is_sample` işaretli kayıt varsa arayüz “Örnek İçerik” etiketini gösterir; production’da örnek kullanıcı içeriği yayınlamayın. Ülke belge içerikleri yönetici tarafından resmî kaynaklarla eklenir; migration evrensel bir vize belge listesi iddia etmez.

## Mimari

- `app/`: beş sekme, ülke, deneyim/soru/ipucu detayı, profil, dört adımlı paylaşım, auth, moderasyon ve yönetim rotaları.
- `src/components/`: sosyal kartlar, ülke hikâyeleri, etkileşimler, bottom sheet, skeleton, onboarding, kayıtlı belgeler.
- `src/lib/`: Supabase/session, tipler, Query sorguları, Zod validasyonu, çeşitlilik sıralaması.
- `supabase/migrations/`: PostgreSQL şeması, indeksler, RLS, storage, trusted RPC ve trigger’lar.
- `tests/`: gerçek PostgreSQL motoru PGlite üzerinde yetki ve moderasyon testleri; form/sıralama birim testleri; Chromium ile misafir akışı.
- `docs/PRODUCT_BRIEF.md`: kullanıcının tam ürün talebi.

Tek `posts` tablosu paylaşım kimliğini sabit tutar. `visa_experiences`, `threads`, `critical_tips` **security-invoker view**’larıdır; ayrı kopya tablolar değildir. Deneyim alanları typed sütunlardır. `feed` view’ı RLS’yi koruyarak faydalı/yorum sayılarını hesaplar. Yorumlar en fazla iki seviyedir. RLS bekleyen içeriği yalnız yazarına ve personele açar; public yalnız onaylı içeriği görür.

İstemci rol, puan, üyelik seviyesi, kaynak doğrulaması veya onay sütunlarına yazamaz. `moderate` RPC’si satırı kilitleyerek kararı, audit kaydını, bildirimi, rozetleri ve benzersiz reputation event’ini tek transaction’da işler. Tekrar onay puanı çoğaltmaz. Kaydetme, takip ve faydalı oylar unique constraint’lerle korunur; kendi içeriğine oy vermek RLS ile engellenir. Moderasyon notları yalnız personele, bildirimler yalnız sahibine görünür. Temel saatlik gönderim limitleri sunucuda uygulanır.

Avatarlar 2 MB JPEG/PNG/WebP ile sınırlı public storage bucket’ında tutulur; yükleme yolu oturum sahibine aittir. Kimlik yükleme akışı yoktur. İsteğe bağlı sigorta/bilet gibi destekleyici belgeler ayrı private `post-evidence` bucket’ında, yalnız sahibi ve personel erişimiyle tutulur; ayrıntılar [belge doğrulama kılavuzunda](docs/EVIDENCE_UPGRADE_TR.md). Yalnız public akış/ülke sorguları cihazda cache edilir; özel bekleyen içerikler ve bildirimler diske cache edilmez. Oturum değişiminde bellek sorguları temizlenir. Akış sayfalıdır; “Sana Özel” sıralaması yakınlık, takip, faydalı/yorum sayısı ve içerik/ülke çeşitliliği kullanır. Bu ilk sürüm sıralaması yüklenmiş pencere üzerinde çalışır.

## Kontroller

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 npm run export -- --max-workers 2
EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 npx expo export --platform ios --platform android --max-workers 2 --output-dir dist-native
```

E2E varsayılan olarak `/usr/bin/chromium` kullanır; farklı sistemde `CHROMIUM_PATH` verin. PGlite testleri auth/storage şemalarının sınırlı test tanımlarını oluşturur, uygulamanın **aynı migration dosyasını** çalıştırır ve gerçek PostgreSQL RLS’yi `anon`/`authenticated` rolleriyle test eder. Bunlar Supabase Auth sunucusu, SMTP veya Storage HTTP uçlarını test etmez.

## Doğrulama sınırları ve yayın öncesi işler

Bu repo çalıştırılabilir bir ilk uygulama sağlar; henüz production’a hazır olduğu iddia edilmez. Canlı Supabase projesinin Auth ve public veri erişimi doğrulandı. Gerçek bir kullanıcı hesabıyla e-posta teslimi henüz test edilmedi. Gerçek kayıt/giriş/doğrulama/şifre kurtarma, avatar HTTP upload, çok kullanıcılı uçtan uca akışlar ve gerçek cihaz etkileşimleri projenin bağlanmasından sonra doğrulanmalıdır. Native export, imzalı IPA/APK derlemesi veya cihaz testi değildir.

Tam ürün talebindeki henüz tamamlanmamış işler: anket ve topluluk özeti kartları, gelişmiş ülke yönetimi ve production analytics sağlayıcısı bağlantısı. Push delivery, Google/Apple girişleri ve universal links sonraki entegrasyonlar olarak bırakıldı; çalışmayan butonlar gösterilmez. Bildirimler veritabanında üretilir ve uygulama açıkken sorgulanır; gereksiz Realtime aboneliği açılmaz.

Yayın için hukuki metinler/veri sorumlusu/iletişim ve hesap silme süreci, gerçek app icon/splash, erişilebilirlik ve cihaz kontrolleri, SMTP/rate limit ayarları, production backend denetimi, mağaza imzalama ve EAS proje kimlikleri tamamlanmalıdır. Yönetim ekranındaki kritik kararlar ayrı incelemeye alınmalıdır. Mağaza yayını yapılmadı.

## Netlify üzerinden iPhone’da açma

Netlify’da **Add new project → Import an existing project → GitHub** üzerinden `ugurkihsan1/vizerotasi` deposunu seçin. `netlify.toml` derleme komutunu ve yayın klasörünü tanımlar. `src/config/supabase.public.json` yalnız herkese açık proje URL’si ve publishable anahtarını içerir; sunucu yetkili bir sır değildir. Netlify değişkenleri boş olduğunda yayın bu public yapılandırmayı kullanır. Başka bir projeye geçmek için `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY` değerlerini birlikte tanımlayın; secret/service-role anahtarı kullanmayın. Ardından deploy başlatın ve oluşan HTTPS adresini iPhone’da Safari ile açın.

Supabase **Authentication → URL Configuration** içinde Site URL’yi yayınlanan HTTPS adresi yapın ve Redirect URLs listesine `<yayınlanan-HTTPS-adresi>/auth` ekleyin. Web sürümü ve native geliştirme derlemesi farklı dağıtımlardır; Netlify bağlantısı iPhone’a native uygulama kurmaz.

## İspanya turistik vize kaynağı

`src/content/spain-tourism.json`, yüklenen BLS İstanbul PDF’sinden hazırlanmış 13 sıralı belge, çalışma durumu alt listeleri, kaynak kapsamı ve rehber bölümlerini içerir. Orijinal yüklenen PDF `public/documents/spain-tourism.pdf` altında sunulur. Yayın/güncelleme tarihi bilinmiyor; tarih üretilmedi. Bu kaynak İstanbul turistik C vizesi kapsamındadır; bütün İspanya temsilciliklerine genellenmez.

`supabase/migrations/202610220002_spain_tourism.sql` mevcut belge modeline ek kaynak/koşul/sıra metadata’sı ekler ve yalnız yeni, deterministik İspanya kaynak kayıtlarını oluşturur. Önceki migration’dan sonra SQL Editor’da bu yeni dosyanın tamamını çalıştırın veya Supabase CLI ile `db push` kullanın. Migration tekrar çalıştırılabilir, mevcut içerikleri ve moderasyon kayıtlarını güncellemez, RLS’yi değiştirmez. Canlı veritabanına bu migration yönetici erişimi olmadan uygulanmadı.

Migration uygulanana kadar İspanya ekranı paketlenmiş aynı kaynak verisini gösterir. Sonrasında veritabanındaki yönetici düzenlemeleri bu kayıtlara öncelik kazanır; frontend içeriği ayrı kopyalarla elle değiştirilmez. Özel `details` JSON alanı belge 7 ve 12’nin alt koşullarını taşır. Checklist işaretleri kullanıcı/cihaz bazında saklanır, belge uygunluğu veya vize onayı anlamına gelmez.

Yayımlanan web için Supabase Auth Site URL: `https://delicate-scone-eeabc7.netlify.app`; Redirect URLs: `https://delicate-scone-eeabc7.netlify.app/auth` ve parola kurtarma için `https://delicate-scone-eeabc7.netlify.app/auth?recovery=1`. Bu yönetim ayarları public API anahtarıyla değiştirilemez; Dashboard’da kaydedilmelidir.

## İlk admin ve kendi gönderisini yayınlama

Proje sahibi, Supabase SQL Editor’da `docs/ADMIN_SETUP.sql` dosyasının tamamını çalıştırabilir. Bu açık bootstrap işlemi yalnız `uugurrk` hesabını admin yapar ve admin self-review fonksiyonunu aynı transaction’da kurar. Uygulamanın public anahtarı rol atayamaz. Migration kullanan kurulumlarda `202610220003_admin_review.sql` uygulanır; ilk admin ataması yine güvenilir SQL yönetim oturumunda yapılır. Moderatörlerin kendi gönderilerini onaylama yasağı, normal kullanıcı RLS’si, audit kayıtları ve tek seferlik puan korunur.

Arayüz; yerel olarak paketlenen gerçek ülke fotoğrafları, sıcak nötr zemin, lacivert/yeşil vurgular, mobil sekmeler, masaüstü içerik çerçevesi, kişisel inceleme durumu ve mevcut BLS İspanya rehberiyle güncellendi. Ülke kartları tanınan turistik yerlerin gerçek fotoğraflarını ve ülke bayraklarını gösterir. Wikimedia Commons kaynakları, fotoğrafçılar ve lisanslar uygulamadaki Fotoğraf kaynakları ekranında ve `assets/destinations/README.md` dosyasında bulunur. Fotoğraflar kullanıcı deneyimi veya istatistik değildir. Örnek gönderi ya da sahte aktivite sayısı eklenmez.

## Topluluk seviyeleri ve kritik belge uyarıları

Ülke görselleri kendi bayraklarını taşır. Profil → Rozetlerim ve ilerlemem ekranı Gezgin, Kaşif, Seyyah, Rehber, Elçi ve Büyükelçi seviyelerinin tüm koşullarını gösterir. Avrupa Fatihi, Yol Arkadaşı, Dedektif ve ilk 1000 üyeye Öncü Üye ek rozetleri sunulur. Puan ve rozetler yalnızca sunucuda hesaplanır; doğrulanmış ihlaller gerekçeli yönetici işlemiyle puan düşürür.

Mevcut Supabase projesinde [COMMUNITY_UPGRADE.sql](docs/COMMUNITY_UPGRADE.sql) dosyasının tamamını SQL Editor’da **bir defa** uygulayın. Bu dosya 002/003 güncellemelerini içerir ve 004 topluluk kurallarını kurar. Yeni Supabase projelerinde CLI tüm migration’ları sırasıyla uygular. Ayrıntılı eşikler, puan tavanları, inceleme süreci ve belge notları için [topluluk kuralları](docs/COMMUNITY_RULES.md). Şema uygulanana kadar ekranlar mevcut profilleri okumayı sürdürür; yeni ödüller ve belge notu işlemleri etkinleşmez.

### Kritik paylaşımdan rehberde topluluk notuna

İspanya için normal üyenin onaylanan kritik paylaşımı seçilen konuya göre ilgili rehber adımında veya belge altında mor **Topluluk notu** olarak otomatik görünür. Randevu → Randevu; Davet Mektubu → Konaklama ve davet mektubu / Konaklama belgeleri. Form notun yerini gösterir; rehberden açılan form ülke ve konuyu önceden seçer. Mevcut onaylı paylaşımlar da dahildir. Bu bağlantı için yeni SQL çalıştırılmaz; mevcut gönderi onayı yeterlidir. Konu eşleştirmeleri [topluluk kurallarında](docs/COMMUNITY_RULES.md) açıklanır.

## Tüm ülke rehberleri, Norveç ve anında yorumlar

Mevcut İspanya rehberine ek olarak Almanya, Estonya, Polonya, Fransa, İtalya, Yunanistan, Macaristan, Hollanda ve Norveç için kaynaklı turistik vize rehberleri ve 117 belge maddesi eklidir. Ortak Schengen çerçevesi ile ülkeye özgü resmî koşullar ayrı gösterilir. [Kaynaklar ve kapsam](docs/COUNTRY_SOURCES.md).

Supabase SQL Editor’da [COUNTRIES_AND_COMMENTS_UPGRADE.sql](docs/COUNTRIES_AND_COMMENTS_UPGRADE.sql) dosyasının tamamını uygulayın. Tekrarlanabilir dosya mevcut yönetici düzenlemelerini korur; 002 metadata, 005 anında yorum ve 006 ülke kayıtlarını kurar. Gönderiler inceleme akışında kalır; yorumlar ve yanıtlar doğrudan yayımlanır. Önceden kaldırılmış yorumlar yeniden yayımlanmaz. Veritabanı güncellenene kadar mevcut yorum durumu arayüzde doğru gösterilir; Norveç topluluğuna gönderim henüz açılmaz.

[EAS / App Store gönderim kılavuzu](docs/APP_STORE_TR.md) bu proje için hazırlanmıştır. `eas.json`, üretim build sayacı ve Türkçe galeri izni açıklaması hazırdır. Gerçek Expo proje bağlantısı, Apple kimliği/sertifikaları, imzalı IPA ve mağaza başvurusu oluşturulmadı. Hesap silme, kullanıcı engelleme/filtreleme ve eksiksiz gizlilik/destek metinleri mağaza başvurusundan önce tamamlanmalıdır.

## Üyelik ve ayrıntılı deneyim formu

Adınız / kullanıcı adı ayrımı, 8 karakter şifre alt sınırı, isteğe bağlı kayıt fotoğrafı, genişletilmiş seyahat amaçları, önceki vize geçmişi, davetiye notları ve gün/ay/yıl alanları eklidir. Deneyim anlatımı isteğe bağlıdır. Kritik bilgide Belgeler seçimi ülkeye özel belge alt türlerini açar; onaylanan not ilgili belgeye bağlanır. Deneyim kartlarının üst kenarı sonuca göre yeşil/kırmızı/sarı şerit taşır; web’de ülke bayrakları SVG ile gösterilir, native’de emoji kullanılır.

Mevcut Supabase projesinde [FORMS_UPGRADE.sql](docs/FORMS_UPGRADE.sql) uygulanmalı ve uzak Auth minimum şifresi 8 yapılmalıdır. [Kurulum ve fotoğraf davranışı](docs/FORMS_UPGRADE_TR.md). Uzak yönetici erişimi bulunmadığı için bu iki işlem yayınla otomatik uygulanmaz.

## İlk girişte randevu ve seyahat planı

Ana sayfadaki ilk karşılama; alınmış randevu, planlanan randevu, seyahat planı veya plansız keşif seçeneklerini sorar. Ülke seçildikten sonra randevusu olan ziyaretçi isterse doğrudan o ülkenin Belgeler sekmesindeki mevcut checklisti açar; diğer planlar Rehber sekmesine gider. Atlamak ve toplulukta kalmak mümkündür. Yeni planlama karşılama ekranı daha önce eski tanıtımı görmüş ziyaretçilere de bir kez gösterilir; tamamlandıktan veya atlandıktan sonra aynı cihazda tekrarlanmaz. Yanıtlar yalnız bu tarayıcı/cihazda saklanır; otomatik takip veya sunucuya yeni kişisel kayıt oluşturulmaz. Checklistin mevcut cihaz/kullanıcı bazlı işaretleme davranışı korunur. Bu akış yeni bir Supabase migration’ı gerektirmez.

## Sade paylaşım ve özel belge doğrulaması

Paylaşım ülkesini seçmek için aramalı tek alan kullanılır; 35 ülke de olsa formda tüm bayraklar sıralanmaz. Metin alanlarında gerçek içerik olarak gönderilmeyen örnek placeholder’lar vardır. Kritik notta bağlanacak belge ve ülke yolu önceden mor kutuda gösterilir. Belge kartları kapalıyken daha kompakttır. Ana sayfa; topluluk akışını koruyarak seçilen başvuru aşaması, takip edilen ülkeler ve gerçek checklist ilerlemesini öne çıkarır.

Yayın onayı ile belge doğrulaması ayrı durumlardır; onaylanan kullanıcı aktarımı resmî kural olarak etiketlenmez. Çoklu özel belge ekleme, ayrı personel inceleme kuyruğu ve tekil +10 doğrulama puanı için [EVIDENCE_UPGRADE.sql](docs/EVIDENCE_UPGRADE.sql) dosyasını uygulayın. Bu dosya mevcut topluluk/rozet kurulumu üzerine 007 ve 008 güncellemelerini birlikte kurar; mevcut iki yanlış bağlanan Almanya sigorta notunu da düzeltir. [Erişim, inceleme, saklama ve test kapsamı](docs/EVIDENCE_UPGRADE_TR.md). Uzak SQL bu çalışma sırasında uygulanmadı.

## Birleşik arama

Keşfet araması öncelikle deneyim, kritik nokta ve soruları gösterir; içerik türleri, ülkeler, belgeler ve kişiler ayrı sekmelerden seçilir. Ülke adı/kodu ve tek kelimelik ülke başlangıcı tanınır. `Almanya sigorta`, Almanya ile sınırlandırılmış sigorta paylaşımlarını bulur; yalnız ülke adı aranınca o ülkenin paylaşımları gelir. Konu adları ve deneyim metadata’sı da aranır. Başlık/gövde araması alt dize eşleştirir; örneğin `sigorta`, `sigortası` içinde bulunur. Kelimeler AND, kelimenin aranacağı alanlar OR ile bağlanır; filtre sözdizimine kullanıcı noktalaması taşınmaz. Yalnız yayımlanmış gönderiler ve public profil/belge verileri aranır. Sonuçlar sayfalıdır; belgelerde ülke adı ve bayrağı her kartta gösterilir. Bu değişiklik için SQL migration gerekmez.

## Sohbet odaları ve mesajlar

Takip edilen ülke topluluklarında ortak oda, üyeler arasında davet kabulüne bağlı birebir ve en fazla 10 kişilik grup mesajlaşması eklidir. Üst menüdeki Mesajlar simgesi ve profil/ülke düğmeleri üzerinden açılır. Realtime metin mesajları, okunmamış/istek sayısı, özel odalarda görüldü, grup daveti/ayrılma, engelleme, mesaj kaldırma ve bildirilen tekil mesajın yönetim incelemesi bulunur. Özel sohbet geçmişi staff rolüne topluca açılmaz.

Supabase SQL Editor’da [CHAT_UPGRADE.sql](docs/CHAT_UPGRADE.sql) dosyasının tamamını uygulayın. Yalnız temel topluluk şemasını gerektirir; tekrar çalıştırılabilir ve mevcut veriyi silmez. [Akış, erişim kuralları, sınırlar ve test kapsamı](docs/CHAT_TR.md). Uzak SQL yönetici erişimi bulunmadığı için bu çalışma sırasında uygulanmadı. Bu sürüm metin mesajlaşmasıdır; medya, arama ve arka plan push gönderimi eklenmedi.

### Yönetici onaylı paylaşım grupları

Erasmus ve kullanıcıların oluşturduğu gruplar için Supabase SQL Editor’da [GROUPS_UPGRADE.sql](docs/GROUPS_UPGRADE.sql) çalıştırılır. Kurulum ve gizlilik ayrıntıları: [Gruplar rehberi](docs/GROUPS_TR.md).

Danimarka rehberi ve ülke topluluğu için [DENMARK_UPGRADE.sql](docs/DENMARK_UPGRADE.sql) dosyası Supabase SQL Editor'da çalıştırılır (001–002 temeli gerekir). Rehber ve kontrol listesi uygulamada da bulunur; SQL ülkeye paylaşım yapmayı etkinleştirir. Kaynak: Danimarka Göçmenlik Servisi'nin özel ziyaret/turizm sayfası ve ApplyVisa, 27/10/2026 kontrolü. Rosenborg Kalesi fotoğrafının atfı Fotoğraf kaynakları ekranındadır. Gruplar artık ana akıştaki topluluk sekmelerinden seçilir; üyelik onayı ve gizlilik değişmez.

### Mobil kontroller

Ayarlar, silme ve yönetici ülke ekleme: [kurulum rehberi](docs/MOBILE_CONTROLS_TR.md). Yeni sunucu yetkileri için [MOBILE_CONTROLS_UPGRADE.sql](docs/MOBILE_CONTROLS_UPGRADE.sql) Supabase SQL Editor’da çalıştırılır. Tema ve diğer cihaz tercihleri SQL gerektirmez.

Sosyal profiller, sohbet fotoğrafları ve son mobil düzenlemeler: [SOCIAL_MOBILE_TR.md](docs/SOCIAL_MOBILE_TR.md).
