# Vizesel — Hesap silmeyi etkinleştirme

Uygulamada Ayarlar → Hesap ve güvenlik → Hesabımı sil bulunur. Mevcut şifre ve `SİL` onayı gerekir. Sunucu, oturumun gerçek sahibini ve şifresini doğrular; istemcinin gönderebileceği başka kullanıcı kimliğini hedef almaz.

**Bu çalışma uzak Supabase'e SQL/Edge Function dağıtımı yapmadı. Özelliğin gerçek hesapları silebilmesi için aşağıdaki iki adım gerekir.** Frontend'i yayımlamak tek başına backend'i etkinleştirmez. Hiçbir gerçek hesap test amacıyla silinmedi.

## 1. SQL güncellemesi

Mevcut uygulamanın önceki güncellemelerinin (özellikle topluluk/özel belgeler/sohbet ve 013 sosyal-mobil) kurulu olduğu aynı Supabase projesinde SQL Editor aç. [ACCOUNT_DELETION_UPGRADE.sql](ACCOUNT_DELETION_UPGRADE.sql) içeriğini çalıştır. Bu kurulum SQL'i hiçbir hesabı silmez; servis işlevlerini ve gerekli silme ilişkilerini tanımlar. İşlem hata verirse uzak işlevi etkinleştirmeden önce hatayı gider.

## 2. Sunucu işlevi

**Panelden:** Supabase → Edge Functions → Deploy a new function → Via Editor. İşlev adı **`delete-account`** olsun. `index.ts` içeriğinin tamamını [DELETE_ACCOUNT_FUNCTION.txt](DELETE_ACCOUNT_FUNCTION.txt) dosyasındaki hazır TypeScript ile değiştir ve Deploy et.

İşlevin **Verify JWT / Enforce JWT verification** ayarını kapat (CLI karşılığı `--no-verify-jwt`). İşlev her POST isteğinde bearer token'ı `auth.getUser(token)` ile sunucuda doğrular; kimlik doğrulama atlanmaz. Bu seçim yeni Supabase JWT imza anahtarlarıyla da çalışmasını sağlar. Yetkisiz istek hiçbir silme işlemi başlatamaz.

**CLI alternatifi:**

```bash
supabase login
supabase functions deploy delete-account --project-ref ebnkdgvngufxarkwiyxt --no-verify-jwt
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` hosted Edge Function ortamında sağlanır. Servis anahtarını veya kullanıcının şifresini sohbetle paylaşma, mobil uygulamaya veya `EXPO_PUBLIC_*` değişkenlerine ekleme. Normal kullanıcı/admin hesapları silme RPC'lerini doğrudan çağıramaz; bu işlevler yalnız server `service_role` içindir.

## Silinenler ve güvenli işlem sırası

- Parola yeniden doğrulanır; ardından kullanıcıya ait silme işi kaydedilir. O hesap yeni dosya yükleyemez/güncelleyemez.
- Profil fotoğrafları (eski fotoğraflar dahil), özel kanıt belgeleri ve kendi gönderdiği sohbet fotoğrafları gerçek Storage API ile kaldırılır. Başka hesapların dosyaları kapsam dışıdır. SQL ile yalnız storage metadata satırlarını silmek kullanılmaz.
- Dosya temizliği tamamlandıktan sonra Auth hesabı ve profil tek veritabanı işleminde silinir. Sahip olunan gönderiler, yorumlar, mesajlar, grup paylaşımları, takipler, kayıtlar, bildirimler ve bağlı özel belge kayıtları FK cascade ile kaldırılır. Gönderinin altındaki yanıtlar da gönderiyle birlikte kalkar.
- Mesaj şikâyetlerindeki kişisel metin/görsel kopyaları da silinir. Başkalarının mesajları ve grupları korunur. Eski yöneticinin başka kişilerin içerikleri üzerindeki kararları, silinmiş yönetici kimliği NULL olacak şekilde korunur.
- Başarı yanıtından sonra cihazdaki kullanıcıya özel taslaklar/checklist/arama verileri ve oturum temizlenir. Diğer cihazların yerel kopyaları uzaktan silinemez; bulut hesabı ve yenileme oturumları silinir. Önceden verilmiş JWT'ler süreleri dolana kadar var olabilir; kaldırılan hesap yeni avatar yükleyemez ve sohbet üyelikleri artık yoktur.

Storage/sunucu hatasında başarılı silinmiş gibi gösterilmez. Bazı dosyalar kaldırılmış olabilir; hesap oturumu ve silme işi korunur, kullanıcı aynı işlemi yeniden deneyebilir. Dosya yükleme kilidi bitirilmemiş silme işi boyunca sürer. Her çağrı en fazla 25 × 1000 dosya tarar; çok büyük hesaplarda yeniden deneme gerekir. Bu iş bir arka plan çalışanı olmadan kendiliğinden devam ediyor diye gösterilmez. Hata kayıtlarında parola, token veya özel dosya adı yazdırılmaz.

Canlı ana tablolar ve Storage nesneleri silinir; sağlayıcının yedek saklama politikaları ve daha önce indirilmiş/CDN'de önbelleğe alınmış kopyalar ayrıca geçerlidir. Gizlilik politikasında bunların gerçek saklama sürelerini belirt. Bu özellik tek başına bütün App Store veya KVKK gerekliliklerinin tamamlandığı anlamına gelmez.

## Kontrol

Önce silinmesinde sakınca olmayan **kendi test hesabınla** dene: yanlış şifre/eksik onay silmemeli; doğru onay sonrası Auth Users, profil, gönderiler ve o kullanıcının Storage klasörleri kalkmalı. Başka kullanıcıların verileri kalmalı. Mevcut gerçek üyelerin hesaplarını test için silme. SQL ve Edge Function yoksa uygulama hizmetin şu anda kullanılamadığını belirtir, oturumu kapatıp hesabı silinmiş gibi göstermez.
