# Vizesel — Alan adı almadan Gmail SMTP

İletişim adresi: **vizeselapp@gmail.com**. Uygulamada Ayarlar → Veri ve uygulama → Destek ve iletişim bu adrese e-posta taslağı açar. Bu düğme otomatik doğrulama maili gönderimini yapılandırmaz.

Hedef otomatik gönderici: **Vizesel <vizeselapp@gmail.com>**. Kayıt, şifre yenileme ve e-posta değişikliği yine Supabase Auth üzerinden yürür; SMTP parolası mobil/web uygulamaya eklenmez.

## Google hesabında

1. `vizeselapp@gmail.com` hesabınla https://myaccount.google.com/security adresine gir. **2 Adımlı Doğrulama** özelliğini aç.
2. https://myaccount.google.com/apppasswords adresini aç; `Vizesel Supabase` adıyla uygulama şifresi oluştur.
3. Oluşan 16 karakterli şifreyi yalnız Supabase SMTP Password alanına gir. Normal Gmail şifreni kullanma. Bu şifreyi sohbete, repoya veya `EXPO_PUBLIC_*` değişkenlerine koyma.

Uygulama şifreleri seçeneği hesabın güvenlik politikası/Advanced Protection gibi nedenlerle görünmeyebilir. Google bu özelliği sunmuyorsa normal şifreyi deneyerek veya güvenliği kapatarak aşmaya çalışma. Google hesap şifresini değiştirince uygulama şifresi iptal olabilir; gerektiğinde yeniden oluştur.

Google resmi açıklaması: https://support.google.com/accounts/answer/185833?hl=tr

## Supabase panelinde

Authentication → Email → SMTP Settings / Project Settings → Authentication içindeki Custom SMTP bölümünü aç. Panel sürümüne göre yer değişebilir.

| Alan               | Değer                                  |
| ------------------ | -------------------------------------- |
| Enable custom SMTP | Açık                                   |
| Sender name        | `Vizesel`                              |
| Sender email       | `vizeselapp@gmail.com`                 |
| Host               | `smtp.gmail.com`                       |
| Port               | `465` (TLS)                            |
| Username           | `vizeselapp@gmail.com`                 |
| Password           | Google'ın oluşturduğu uygulama şifresi |

Kaydet. Aynı Gmail hesabından ve aynı gönderici adresiyle gönder; sahip olmadığın `@vizesel.com` adresini yazma. DNS kaydı/alan adı/Resend hesabı gerekmiyor. Uygulama kodunda SMTP kimlik bilgisi saklanmıyor. Supabase servis anahtarı gerekmez.

Templates bölümünde hazır HTML'leri ilgili Body alanına kopyala:

| Şablon               | Konu                                   | HTML                                             |
| -------------------- | -------------------------------------- | ------------------------------------------------ |
| Confirm signup       | Vizesel — E-posta adresini doğrula     | [confirm-signup.html](email/confirm-signup.html) |
| Reset password       | Vizesel — Şifreni yenile               | [reset-password.html](email/reset-password.html) |
| Change email address | Vizesel — E-posta değişikliğini onayla | [change-email.html](email/change-email.html)     |

`{{ .ConfirmationURL }}` değişkenini koru. Mevcut GitHub Pages Site URL ve `/vizerotasi/auth` redirect izinlerini koru; e-posta göndericisi değişimi web adresini değiştirmeyi gerektirmez.

## Doğrulama

Kendi kontrolündeki bir kullanıcı adresiyle kayıt doğrulama ve şifre yenileme dene. Gelen mailde `Vizesel <vizeselapp@gmail.com>` görünmeli; onay bağlantısı mevcut uygulamayı açmalı. Spam klasörünü ve Supabase Auth gönderim kayıtlarını kontrol et. E-posta değişikliğinin eski/yeni adres onaylarını kapatma.

Gmail kişisel hesabının gönderim/kötüye kullanım limitleri ve Supabase Auth hız limitleri ayrı uygulanır. Bu düşük hacimli başlangıç çözümüdür; ücretsiz sınırsız işlem maili hizmeti değildir. Google gönderimi engellerse Auth teslimatını kontrol et; büyüdüğünde özel alan adı ve işlem e-postası sağlayıcısına geç.

Uzak Supabase yönetim erişimi ve Google uygulama şifresi olmadan bu SMTP bağlantısı buradan etkinleştirilemedi. Kod ve şablonların yayımlanması SMTP'nin bağlandığı anlamına gelmez; son iki panel adımı ve gerçek teslim testi hesap sahibi tarafından tamamlanmalı.
