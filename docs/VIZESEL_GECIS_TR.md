# Vizesel adına geçiş

**Güncel tercih:** Alan adı satın alma ertelendi. Uygulamanın iletişim adresi `vizeselapp@gmail.com`. Alan adı gerektirmeyen Gmail SMTP kurulumu için [Gmail rehberini](GMAIL_SMTP_TR.md) izle. Aşağıdaki alan adı/Resend adımları ilerisi için alternatiftir. Uzak SMTP henüz bağlanmadı.

## Kontrol sonucu — 28 Ekim 2026

- Verisign RDAP sorgusu `vizesel.com` için HTTP 404 döndü: sorgu anında kayıt bulunamadı. Bu rezervasyon veya satın alma garantisi değildir; satıcının ödeme ekranında müsaitliği ve varsa premium fiyatı doğrula.
- Türkiye App Store aramasında sonuç çıkmadı. Google Play aramasında tam bu isimde uygulama görülmedi. Mağaza adı rezervasyonu yapılmadı.
- Web aramasında kelimenin gündelik kullanımları var; belirgin aynı isimli vize uygulaması görülmedi. TÜRKPATENT sicili ve benzer marka incelemesi tamamlanmadı. Bu araştırma tescil uygunluğu sonucu değildir.
- Resmi kaynaklar: https://rdap.verisign.com/com/v1/domain/vizesel.com ; https://itunes.apple.com/search?term=vizesel&country=tr&entity=software ; https://play.google.com/store/search?q=vizesel&c=apps&hl=tr&gl=TR ; https://www.turkpatent.gov.tr/ (Araştırma → Marka araştırma).

## 1. Alan adı ve marka

TÜRKPATENT marka araştırmasında `Vizesel` ve benzerlerini kontrol et; hizmet kapsamına göre sınıfları değerlendir. Mağaza ve alan adı müsaitliği marka hakkı vermez.

Alan adını kendi hesabında satın al; kayıt sahibi sen ol. Ödeme öncesi ilk yıl, yenileme ve vergi dahil toplamı kontrol et. Yalnız e-posta gönderimi için hosting, web sitesi paketi veya ücretli posta kutusu almak gerekmez. Alan adını burada satın almadık.

## 2. Markalı e-posta gönderimi

Hedef gönderici: **Vizesel <merhaba@vizesel.com>**. Bu adres henüz etkinleştirilmedi.

1. https://resend.com üzerinde hesap aç; Domains → Add domain bölümünden `vizesel.com` ekle.
2. Resend’in o alan adına özel verdiği DNS kayıtlarını alan adının DNS paneline **birebir** ekle. DKIM ile gönderim/return-path SPF ve varsa MX kayıtlarını Resend’in belirttiği adlara ekle; başka bir posta hizmetinin kök MX/SPF kayıtlarını silme. Aynı DNS adına ikinci SPF kaydı ekleme. DMARC politikasını mevcut e-posta hizmetleriyle uyumlu ayarla.
3. Resend’de alan adı **Verified** olana kadar bekle. Yalnız SMTP gönderimi için alıcı posta kutusu kurmak gerekmez; `merhaba@` adresine gelen yanıtları okumak istersen ayrıca gelen posta/yönlendirme hizmeti kur.
4. Resend’de yalnız gönderim yetkili ve mümkünse sadece bu alan adına sınırlandırılmış bir API anahtarı oluştur.
5. Supabase → Project Settings → Authentication / Authentication → Email → SMTP Settings (panel sürümüne göre konum değişebilir) içinde Custom SMTP’yi aç:

| Alan         | Değer                 |
| ------------ | --------------------- |
| Sender name  | `Vizesel`             |
| Sender email | `merhaba@vizesel.com` |
| Host         | `smtp.resend.com`     |
| Port         | `465` (TLS)           |
| Username     | `resend`              |
| Password     | Resend API anahtarı   |

API anahtarını **yalnız Supabase SMTP şifre alanına** gir. Sohbete, depoya, uygulama koduna veya `EXPO_PUBLIC_*` değişkenlerine koyma. Mobil uygulama mevcut Supabase Auth akışını kullanır; SMTP kodunun telefonda çalışmasına gerek yok.

Resend alan adı için click/link tracking'i kapat: doğrulama ve kurtarma URL’lerinin değiştirilmesini önler. Supabase Auth gönderim limitlerini kullanımına göre ayrıca kontrol et. Resend’in ücretsiz plan kotası ve Supabase’in limiti ayrı uygulanır; güncel limitler https://resend.com/pricing adresindedir.

Resmi bağlantı talimatı: https://resend.com/docs/send-with-supabase-smtp

## 3. E-posta şablonları

Supabase → Authentication → Email → Templates içinde HTML dosyasını ilgili Body alanına kopyala:

| Supabase şablonu     | Konu                                   | Dosya                                            |
| -------------------- | -------------------------------------- | ------------------------------------------------ |
| Confirm signup       | Vizesel — E-posta adresini doğrula     | [confirm-signup.html](email/confirm-signup.html) |
| Reset password       | Vizesel — Şifreni yenile               | [reset-password.html](email/reset-password.html) |
| Change email address | Vizesel — E-posta değişikliğini onayla | [change-email.html](email/change-email.html)     |

Dosyalarda `{{ .ConfirmationURL }}` korunur. Bu güvenli bağlantıyı elle sabit bir site adresiyle değiştirme. Güvenli e-posta değişikliği için eski/yeni adres onayını kapatma. E-posta adresi değişiminde iki adresin de onayını test et.

Şablonlar repoda hazırdır; uzak Supabase paneline yüklenmedi. Henüz kullanmadığımız Magic link/Invite/Reauthentication şablonlarını kullanmaya başladığında bunları da markalaştır.

## 4. Uygulama ve bağlantılar

- Uygulamanın görünen adı ve paylaşım metni Vizesel oldu.
- Mevcut depo, GitHub Pages URL’si, Supabase projesi, kullanıcılar ve auth şeması korunur. İsim değişikliği hesap/veri taşımayı gerektirmez.
- Mevcut destek bağlantısı `vizeselapp@gmail.com` adresini açar. `merhaba@vizesel.com` henüz etkinleştirilmedi.
- Maili kendi alan adından göndermek için uygulamanın web adresini taşımak gerekmez. Şimdilik Supabase Site URL ve Redirect URL izinlerinde mevcut GitHub Pages `/vizerotasi/auth` adresini koru.
- Sonradan web uygulamasını `vizesel.com` alanına taşımak ayrı adımdır: önce DNS/hosting ve HTTPS doğrulanır, build base path `/vizerotasi` yerine boş yapılır, Supabase redirect izinleri ve paylaşımların native URL’si güncellenir. Alan adı kontrol edilmeden `CNAME` eklenmez.
- App Store’a ilk gönderim öncesi yeni Bundle ID/package ve URL scheme istersen ayrıca planlanır. Yayımlanmış bir mağaza uygulamasının Bundle ID’si değiştirilemez. Mevcut `com.vizerotasi.app` ve `vizerotasi://auth` bugün kırılmaması için değiştirilmedi.

## 5. Son kontrol

SMTP ve şablonlar kaydedildikten sonra kendi kontrolündeki bir adresle kayıt doğrulama ve şifre yenileme dene. Gönderen adının/adresinin doğru olduğunu, bağlantının mevcut uygulamaya döndüğünü, SPF/DKIM/DMARC sonuçlarını, gelen kutusu/spam durumunu ve Resend/Supabase gönderim kayıtlarını kontrol et. Uygulamanın gerçek kullanıcılarına toplu test maili gönderme.

Şu anda tamamlanmamış dış adımlar: marka araştırması, alan adı satın alma, DNS doğrulama, SMTP ve şablonların uzak panele girilmesi, gerçek teslim testi.
