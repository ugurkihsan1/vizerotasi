# Vizesel — Apple ve Google girişini açma

Apple/Google ile ilk üyelikte önce kullanıcı adı, ardından ad, isteğe bağlı profil fotoğrafı ve üç onay istenir. E-posta ve şifre yeniden sorulmaz. Profilini tamamlamış kullanıcılar sonraki girişlerde bu adımları tekrar görmez. Aşağıdaki panel ayarları yapılmadan sağlayıcı düğmeleri gerçek hesaplarla çalışmaz. Bu ayarları uygulama kodu açamaz.

## 1. Supabase veritabanı

Vizesel projesi → **SQL Editor → New query**.

1. Daha önce uygulanmadıysa [202610290023_legal_preferences.sql](../supabase/migrations/202610290023_legal_preferences.sql) dosyasının tamamını çalıştır.
2. Ardından [202610300024_social_signin.sql](../supabase/migrations/202610300024_social_signin.sql) dosyasının tamamını çalıştır.

İkinci dosya e-posta ile üyelikteki mevcut onay kontrolünü korur. Apple/Google ile ilk kez gelen hesaplara geçici bir profil açar; kullanıcı adı ve üç onay tamamlanmadan uygulama bu hesabı profil tamamlama ekranında tutar. Zaten var olan hesapların kullanıcı adı veya onayları değiştirilmez. Aynı e-posta için Supabase'in doğrulanmış kimlik eşleştirmesi geçerlidir; Apple'ın gizli e-postası farklı bir hesap oluşturabilir. Hesaplar istemcide e-posta benzerliğine göre birleştirilmez.

## 2. Dönüş adresleri

Supabase → **Authentication → URL Configuration → Redirect URLs**. Mevcut adresleri silmeden ekle:

```text
vizerotasi://**
https://ugurkihsan1.github.io/vizerotasi/auth**
```

`vizesel.pages.dev` mevcut durumda destek sitesidir; uygulama giriş dönüş adresi olarak kullanılmaz. Uygulamayı başka bir adrese taşırsan gerçek uygulamanın `/auth**` adresini de listeye ekle. Supabase Site URL alanındaki çalışan uygulama adresini koru.

## 3. Google

1. [Google Cloud Console](https://console.cloud.google.com/) → bir proje seç/oluştur → **Google Auth Platform**.
2. **Branding** bölümünde uygulama adı **Vizesel**, destek e-postası **vizeselapp@gmail.com**, gizlilik politikası adresi `https://ugurkihsan1.github.io/vizerotasi/privacy.html` olsun. Google'ın istediği alan adı doğrulamalarını tamamla.
3. **Audience**: External. Test aşamasında **Test users** listesine deneyecek Google hesaplarını ekle. Herkese açmadan önce Publishing status alanını **In production** yap; Google doğrulama isterse paneldeki işlemleri tamamla.
4. **Clients → Create client → Web application**. Telefon uygulaması için de bu akışta **Web application** kullanılır; Google dönüşünü Supabase yönetir.
5. **Authorized redirect URIs** alanına şu adresi ekle:

```text
https://ebnkdgvngufxarkwiyxt.supabase.co/auth/v1/callback
```

6. Supabase → **Authentication → Sign In / Providers → Google** → Enable. Google'dan aldığın **Client ID** ve **Client secret** değerlerini girip kaydet. Yalnız standart `openid`, `email`, `profile` kapsamları gerekir; Drive/Gmail erişimi istenmez.

Client secret uygulamanın `.env` dosyasına, `EXPO_PUBLIC_*` değişkenlerine veya GitHub'a konmaz.

### iPhone'da Google'ın yerel giriş ekranı

Google Auth Platform → Clients → Create client → **iOS**, Bundle ID **com.vizesel.app**. Proje sahibi tarafından oluşturulan iOS Client ID ve Supabase Google sağlayıcısında kullanılan Web Client ID, `src/config/google-signin.public.json` dosyasında kayıtlıdır. Bunlar herkese açık istemci tanımlayıcılarıdır; client secret içermez. iOS uygulaması Google SDK'sından aldığı ID tokenini Supabase'e gönderir. Google Web client ID değişirse bu dosyayı da güncelle.

Expo yapılandırması iOS Client ID'den geri dönüş URL şemasını üretir. İstersen `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` ve `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` ile değerleri değiştirebilirsin; bu durumda aynı değerleri build sırasında da kullan. Bu değişiklik yeni native build gerektirir; Expo Go ile denenmez. Web ve Android mevcut tarayıcı üzerinden OAuth akışını kullanır.

iOS'un sistem izin metni uygulamadan yeniden yazılamaz. Google SDK'sı da cihaz ve oturum durumuna göre Google alan adı için bir sistem izni gösterebilir; Google girişini başlatırken Supabase'in teknik alan adıyla tarayıcı oturumu açılmaz.


## 4. Apple — iPhone uygulaması

Bu bölüm Apple Developer hesabının **sahibi** tarafından yapılır; bireysel hesapta App Store Connect Admin rolü imzalama portalına erişim sağlamaz.

1. [Apple Developer](https://developer.apple.com/account/resources/identifiers/list) → **Identifiers** → `com.vizesel.app` → **Sign in with Apple** özelliğini aç. Gerekirse Primary App ID olarak yapılandırıp kaydet.
2. Supabase → **Authentication → Sign In / Providers → Apple** → Enable. **Client IDs / Audience** alanına `com.vizesel.app` ekle. Native Apple girişi kimlik tokeniyle çalışır; web girişinin ek ayarları aşağıdadır.
3. Yeni EAS build'de Apple yeteneği ve provisioning profile güncellenecek. Gerekirse hesap sahibinin Apple girişiyle mevcut profili yenile.

## 5. Apple — web ve Android üzerinden giriş

1. Apple Developer → **Identifiers → + → Services IDs**: örneğin `com.vizesel.app.web` oluştur.
2. Services ID için Sign in with Apple özelliğini aç, Primary App ID olarak `com.vizesel.app` seç.
3. Website Domains alanına `ebnkdgvngufxarkwiyxt.supabase.co`, Return URLs alanına `https://ebnkdgvngufxarkwiyxt.supabase.co/auth/v1/callback` gir.
4. **Keys → + → Sign in with Apple** anahtarı oluştur, ilgili App ID ile yapılandır. Key ID, Team ID ve yalnız bir kez indirilebilen `.p8` anahtarını güvenli sakla.
5. Services ID için client secret üret (aşağıdaki araçta `--client-id com.vizesel.app.web` kullan). Supabase Apple ayarına Services ID'yi de ekle ve bu Services ID için üretilmiş secret'ı kaydet.

Apple client secret sürelidir. Süresi dolmadan yenilenmesi gerekir; araç 180 gün geçerli secret üretir. Native bundle ID için üretilen secret ile web Services ID secret'ı birbirinin yerine kullanılmaz.

## 6. Apple/Google hesaplarının uygulama içinden silinmesi

Mevcut `delete-account` Edge Function'ını güncelle. Yeni sürüm sosyal hesaplar için şifre yerine sunucunun doğruladığı son giriş zamanını kontrol eder. Apple hesaplarında iPhone üzerinde yeniden Apple doğrulaması alır ve Apple yetkisini iptal ettikten sonra hesabı siler.

Apple Developer'daki Sign in with Apple anahtarının `.p8` dosyasını Codespaces'e, örneğin `/tmp/AuthKey.p8` olarak yükle. `.p8` dosyasını veya secret'ı commit etme ve sohbetlere yapıştırma.

Codespaces terminalinde gerçek Team ID ve Key ID ile:

```bash
node scripts/apple-client-secret.mjs --team-id SENIN_TEAM_ID --key-id SENIN_KEY_ID --key-file /tmp/AuthKey.p8 --client-id com.vizesel.app --output /tmp/apple-native-secret.txt
```

Supabase → **Edge Functions → Secrets**:

```text
APPLE_NATIVE_CLIENT_ID = com.vizesel.app
APPLE_NATIVE_CLIENT_SECRET = /tmp/apple-native-secret.txt dosyasının içeriği
```

Dosya yolunu değil, içindeki JWT metnini secret alanına yapıştır. Bu native secret'ı da süresi dolmadan yenile.

Supabase CLI erişimin varsa:

```bash
npx supabase login
npx supabase link --project-ref ebnkdgvngufxarkwiyxt
npx supabase functions deploy delete-account --no-verify-jwt
```

Kimlik doğrulaması Edge Function içindeki `Auth.getUser` çağrısıyla yapılır; `--no-verify-jwt` bu kontrolü kaldırmaz. CLI yerine Dashboard editöründen güncelliyorsan `delete-account/index.ts` ile `_shared/delete-account.ts` ve `_shared/apple-revoke.ts` dosyalarını birlikte yükle. Mevcut hesap silme SQL/RPC'leri korunur; bunları yeniden oluşturman gerekmez.

Apple ile açılmış hesaplar, Apple yetkisini yeniden doğrulayıp iptal edebilmek için iOS uygulamasından silinir. Google web girişinin yeniden doğrulama yönlendirmesinden sonra kullanıcı Ayarlar'a dönüp silmeyi onaylar; dönüşte kendiliğinden hesap silinmez.

## 7. Build ve kontrol

```bash
git pull origin main
nvm use 24
npm install
npx eas-cli@latest build --platform ios --profile production
```

Build tamamlanınca:

```bash
npx eas-cli@latest submit --platform ios --profile production --latest
```

TestFlight'ta şu durumları gerçek sağlayıcı hesaplarıyla dene:

- Apple ve Google ile ilk üyelik: kullanıcı adı, ad ve üç boş onay kutusu; şifre sorulmaz.
- Aynı hesapla tekrar giriş: profil tamamlama tekrar çıkmaz.
- Apple e-postamı gizle seçeneği ve girişten vazgeçme.
- Mevcut e-posta hesabının sağlayıcıyla eşleştirilmesi; başka hesaba geçerek silme denenirse işlemin reddi.
- Apple ve Google hesaplarını silme; eski e-posta/şifre hesabını silme.
- Bildirimler sayfasına girmeden okunmamış sayısı korunur; girince otomatik temizlenir.
- Faydalı sayısına dokununca liste açılır; uçak simgesi yalnız beğeniyi değiştirir. Profil bağlantısı ve 30'dan fazla kişi için “Daha fazla göster”.

Bu depodaki testler sağlayıcıların canlı panel ayarlarının yerine geçmez. Apple/Google panelleri ve Supabase yönetim erişimi olmadan bu ayarlar uzaktan etkinleştirilmiş sayılmaz.
