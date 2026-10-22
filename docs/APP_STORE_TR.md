# Vize Rotası’nı App Store’a gönderme

Bu proje Expo / React Native uygulamasıdır. Netlify adresini App Store’a yüklemek yerine, aynı projenin iOS uygulaması EAS Build ile derlenir. Bulutta derleme ve gönderim için Mac zorunlu değildir. Apple hesabı, imzalama, gerçek iPhone testi ve App Review bu ortamda yapılmadı.

## Önce tamamlanacak gerçek eksikler

Apple’ın 1.2 ve 5.1.1 kurallarına göre bu sürüm henüz mağazaya hazır sayılmamalı:

- Uygulama içinden hesap ve ilişkili kişisel verileri silme akışı henüz yok. Üyelik açıldığı için uygulamadan hesap silmeyi başlatabilmek gerekir; yalnız çıkış yapmak veya e-posta gönder demek yeterli değildir.
- İçerik bildirme var; kullanıcı engelleme ve uygunsuz içerik filtresi ayrıca tamamlanmalı. Yorumların anında yayımlanması bunları kaldırma gerekçesi değildir. Moderasyon ve bildirimlerin zamanında incelenmesi gerekir.
- Tam ve erişilebilir gizlilik politikası, kullanım koşulları ve gerçek destek iletişimi yayımlanmalı. Mevcut kısa ayarlar açıklaması tamamlanmış bir mağaza gizlilik politikası değildir. Gizlilik URL’si App Store Connect’e eklenmeli.
- Supabase’te `docs/COUNTRIES_AND_COMMENTS_UPGRADE.sql` uygulanmalı. Önceki rozet özellikleri kullanılacaksa 004 topluluk güncellemesi de kurulmuş olmalı. E-posta doğrulama ve şifre sıfırlamanın gerçek cihazda çalıştığı kontrol edilmeli.

Bu eksikler giderilmeden yalnız IPA dosyasını yüklemek mağaza onayı anlamına gelmez.

## 1. Hesapları aç ve uygulama kimliğini seç

1. [Apple Developer Program](https://developer.apple.com/programs/enroll/) üyeliğini tamamla. Ücretli üyelik gerekir; ülkeye ve kur türüne göre görünen güncel ücreti Apple’dan kontrol et. Şahıs hesabında mağazada geliştirici adı kişisel adın olabilir; kuruluşta şirket doğrulaması gerekir.
2. [Expo](https://expo.dev/) hesabı oluştur.
3. [App Store Connect](https://appstoreconnect.apple.com/)'te yeni iOS uygulaması aç: **Vize Rotası**, ana dil **Türkçe**, Bundle ID **com.vizerotasi.app**, kendin belirleyeceğin benzersiz SKU.

`com.vizerotasi.app` bu depoda hazırdır. Bu kimlik Apple hesabında müsait değilse ilk mağaza kaydından önce `app.json` içindeki `ios.bundleIdentifier` değerini değiştir. Başka birine ait Bundle ID’yi kullanma. Uygulamanın numeric Apple ID’si, daha sonra EAS gönderiminde istenen `ascAppId` değeridir; Bundle ID veya Apple kullanıcı e-postası değildir.

## 2. Projeyi Expo hesabına bağla

Bilgisayarında Node.js 24 ve Git kurulu olsun. Terminalde:

```bash
git clone https://github.com/ugurkihsan1/vizerotasi.git
cd vizerotasi
npm ci
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build:configure
```

Depo zaten bilgisayarındaysa yeniden klonlama; doğru klasörde `git pull` ve `npm ci` kullan. `eas init` gerçek Expo hesabında proje oluşturur/bağlar ve `extra.eas.projectId` bilgisini kaydeder; bu ID önceden uydurulmadı. `eas.json` içinde üretim ve dahili test profilleri hazır. Komutların oluşturduğu proje bağlantısı değişikliklerini depoya kaydet.

Supabase bağlantısında yalnız URL ve publishable/anon anahtarı kullanılır. Mevcut public yapılandırma paketlenir; başka projeye geçiyorsan Expo’nun production ortamına `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY` ekle. Bunlar istemciye açık değerlerdir. Service-role veya veritabanı parolasını mobil pakete koyma.

## 3. Gerçek iOS uygulamasını derle

```bash
npx eas-cli@latest build --platform ios --profile production
```

Apple Developer hesabınla oturum aç; ilk derlemede EAS’in dağıtım sertifikası ve provisioning profile oluşturma yönlendirmelerini tamamla. İmzalama özel anahtarları paylaşılmaz veya Git’e eklenmez. Bulut derlemesi sonunda imzalı iOS uygulaması oluşur. Expo Go’da açmak ile App Store için imzalı derleme farklı işlemlerdir.

`app.json` sürümü `1.0.0`; `eas.json` production profili build numarasını otomatik artırır. Galeri izni açıklaması Türkçedir; uygulama kamera ve mikrofon istemez. Standart HTTPS dışında özel şifreleme eklenirse export compliance bildirimi yeniden değerlendirilmeli. 1024×1024 RGB uygulama simgesi mevcuttur.

## 4. TestFlight’a gönder ve iPhone’unda dene

```bash
npx eas-cli@latest submit --platform ios --profile production --latest
```

Komut Apple uygulama kaydını ve gerekiyorsa App Store Connect API anahtarı kurulumunu yönlendirir. İlk etkileşimli gönderimde gerçek Apple hesabını kullan. Otomatik CI gönderimi için `eas.json` production submission profiline kendi numeric `ascAppId` değerini yazıp Apple API anahtarını Expo’nun güvenli kimlik yönetiminde bağla; depoya `.p8` koyma.

Apple işlemeyi tamamlayınca App Store Connect → **TestFlight** bölümünde derlemeyi seç. iPhone’una TestFlight yükle ve kendini dahili test kullanıcısı olarak ekle. Haricî test gruplarında Beta App Review gerekebilir. Giriş, üyelik doğrulama bağlantısı, şifre sıfırlama, anında yorum, kritik notlar, belge listeleri, bildirme/engelleme ve hesap silmeyi gerçek cihazda dene. Uygulama şeması `vizerotasi://auth`; Supabase Redirect URLs’e bu native dönüş adresini ekle, web dönüş adreslerini koru. Bağlantıları cihazda gerçekten test et.

## 5. Mağaza sayfasını tamamla

App Store Connect’te:

- Türkçe açıklama, alt başlık, anahtar kelimeler, kategori ve hak sahipliği bilgileri.
- Apple’ın o anda istediği boyutlarda gerçek uygulama ekran görüntüleri. Bu projede `supportsTablet: true`; iPad desteğiyle devam edersen gerekli iPad ekran görüntülerini ve düzenini de hazırla.
- Çalışan Support URL, Privacy Policy URL ve gerçek destek iletişimi.
- App Privacy beyanları: gerçekten toplanan hesap/e-posta, profil, gönderi/yorum ve profil fotoğrafı verilerini, Supabase ve kullanılan üçüncü tarafların gerçek davranışına göre belirt. “Veri toplamıyoruz” seçme; projede üyelik verisi tutulur.
- Yaş derecelendirmesi sorularına kullanıcı içeriğini dikkate alarak cevap ver.
- Apple inceleyicisi için kalıcı, normal kullanıcı yetkili test hesabı ve açıklayıcı inceleme notu. Admin hesabını verme. İnceleyicinin üyelik veya e-posta onayında takılmamasını sağla; üretim güvenliğini kapatma.
- Build’i sürüme bağla, fiyat/bölge erişimini ve yayınlama şeklini seç.

Sonra **Add for Review / Submit for Review** adımlarını tamamla. EAS Submit dosyayı yükler; mağaza açıklamasını doldurmaz ve App Review’u tek başına tamamlamaz. İnceleme süresi veya kabul sonucu garanti edilmez. Kabulden sonra manuel yayın seçtiysen ayrıca **Release** gerekir.

## Resmî kaynaklar

22.10.2026 tarihinde kontrol edildi:

- [Expo – Submit to the Apple App Store](https://docs.expo.dev/submit/ios/)
- [Apple – App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — 1.2 kullanıcı içeriği; 5.1 gizlilik.
- [Apple – Account deletion](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion)
