# Vizesel — Supabase'te kalmak için araştırma ve adımlar

**Araştırma tarihi: 29 Ekim 2026.** Bu dosya işletmeciler içindir; kullanıcı politikasının parçası değildir.

## Doğrulananlar

Supabase'in güncel DPA'sı, kullanım şartlarının 7(b) maddesiyle sözleşmeye dahil edilir. DPA'nın giriş hükmü de bunu doğrular. İncelenen metinlerde DPA için ücretli plan şartı bulunmadı. Her müşterinin ayrıca DPA imzası kovalamak zorunda olduğunu söylemek doğru değildir.

Ancak DPA'daki SCC tanımı Avrupa Komisyonunun 2021/914 sayılı sözleşmeleridir. 12.2'deki çevrim içi kabulün imza yerine geçmesi hükmü, Türkiye'nin standart sözleşmesinin de imzalandığını göstermiyor.

Ek 2, bölüm 4 “Transfers of personal data from Other Jurisdictions” altında 4.4 başka ülkelerin benimsediği aktarım mekanizmalarını içeren ek anlaşmayı; 4.5 gerekiyorsa ulusal makama bildirimi düzenliyor. Bu, Türkiye ekini talep etmek için somut dayanak; otomatik Türk sözleşmesi veya kesin kabul garantisi değil.

## 1. Müşteri bilgilerini doğru eşleştir

Vizesel bir uygulama adıdır, tek başına şirket değildir. Supabase hesabının sözleşme tarafı ile iki işletmecinin durumu uyumlu olmalı. Olmayan şirket veya temsil yetkisi beyan etmeyin. İki gerçek kişinin sözleşmede nasıl yer alacağını teyit edin.

Proje: ebnkdgvngufxarkwiyxt. Bölge: Seoul / ap-northeast-2. AWS Marketplace üzerinden farklı sipariş yoksa güncel şartlara göre karşı taraf Supabase Pte. Ltd.'dir; veritabanının Kore'de olması karşı tarafın Kore şirketi olduğu anlamına gelmez.

## 2. Belgeleri sakla

Hesabınıza uygulanabilir sözleşme sürümlerini ve bildirimleri kontrol edip kaydedin. İncelenen güncel resmî kaynaklar:

- Şartlar: https://supabase.com/terms — giriş, 1(j), 7(b), 14(b).
- DPA, Version 1 / 1 Ağustos 2026: https://supabase.com/legal/customer-resources/data-processing-addendum — giriş, 12.1–12.2, Ek 2 4.4–4.5, Ek 3.
- Konum/aktarım açıklaması, 6 Ekim 2026: https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq
- Alt işleyenler: https://supabase.com/legal/customer-resources/subprocessor-list
- Yedekler: https://supabase.com/docs/guides/platform/backups

Bu araştırmada kamuya açık metinler okundu; özel hesap kabul kaydı veya ayrı sipariş sözleşmesi doğrulanmadı.

## 3. Doğrudan gizlilik/hukuk ekibine talep gönder

Supabase'in kendi FAQ sayfasında yayımlanan adresler:

**Alıcı:** privacy@supabase.io
**Bilgi:** legal@supabase.io
**Konu:** Request under DPA Schedule 2 section 4.4 — Türkiye KVKK standard contract

```text
Hello Supabase Privacy and Legal Team,

We operate Vizesel, a visa and travel community app for users in Türkiye, jointly as two individuals: Mustafa Enes Aygün and Uğur İhsan Kaya.

Organization: vizerotasi (Free plan)
Project reference: ebnkdgvngufxarkwiyxt
Region: Seoul, South Korea (ap-northeast-2)
Contact: vizeselapp@gmail.com

We reviewed the incorporated DPA, particularly Schedule 2 sections 4.4 and 4.5 regarding other jurisdictions' transfer mechanisms.

Türkiye's Personal Data Protection Authority has adopted standard contracts under Article 9 of Law No. 6698. For our application data, we intend to use the controller-to-processor contract.

Please confirm your process for executing that Turkish contract / the supplementary agreement contemplated by section 4.4, and provide the authorized-signatory and processing/subprocessor details required for filing. Please clarify how our two individual controllers should be identified.

Official templates:
https://www.kvkk.gov.tr/Icerik/7929/Standart-Sozlesmeler

Our continuous processing covers account/profile data, posts/comments, messages and images, optional supporting documents, and service/security metadata for authentication, hosting, storage, realtime functionality and verification. We do not intend to collect special-category data and instruct users to redact identifiers and health information.

We understand that acceptance of the EU SCCs alone does not execute the Turkish standard contract. Please provide the applicable Turkish instrument and supporting signature/authority documents, or explain any other mechanism already available to Turkish customers and the required customer steps.

Is this available on our Free plan? If not, please identify the limitation and options before we purchase anything.

Please also confirm Free-plan retention/deletion periods for database backups, Auth/Storage/service logs and telemetry, distinguishing deletion of an end-user account/file from deletion of our entire project or Supabase customer account.

Thank you,
Mustafa Enes Aygün and Uğur İhsan Kaya
Vizesel
vizeselapp@gmail.com
```

Bu çalışma kapsamında e-posta gönderilmedi. Anahtar, şifre veya kullanıcı belgeleri eklenmemeli. Yanıt verilmemesi kabul sayılmaz; genel GDPR cevabı, Türk sözleşmesinin icrası teyidi değildir.

## 4. Resmî Türk sözleşmesini tamamla

Şablon sayfasından **Standart Sözleşme–2 / Veri Sorumlusundan Veri İşleyene** modelini kullanın. Standart hükümleri değiştirmeden, tarafları ve ekleri gerçek bilgilere göre tamamlayın. Aktaranlar, Supabase'in doğruladığı alıcı tüzel kişi, ilgili kişiler, veri türleri, amaçlar, sürekli aktarım, saklama, güvenlik ve alt işleyen bilgilerinde resmî formu izleyin.

Her iki tarafın yetkili imzaları gerekir. Yalnızca sizin imzanız veya genel DPA'nın dosyalanması Türk standart sözleşmesini tamamlamaz. İmza yetkileri belgelenmeli; yabancı dildeki belgelerin mevzuatça istenen noter onaylı Türkçe çevirileri dahil bildirim evrakı tamamlanmalı. İki işletmeci adına imza yetkisini varsaymayın.

Resmî şablon: https://www.kvkk.gov.tr/Icerik/7929/Standart-Sozlesmeler

Not: Bu içerik sayfasının resmî indeksinde şablon doğrulandı; doğrudan sayfa bu ortamda HTTP500 verdi. Şablon PDF'si indirildi veya incelendi diye bir iddiada bulunulmuyor.

## 5. İmzalar tamamlanınca bildir

İmzaların tamamlandığı tarihten itibaren **5 iş günü içinde** Kuruma bildirin. Bu yol, standart sözleşme için önceden Kurul izni beklemek değildir. Portalın istediği sözleşme, ek, yetki ve çeviri belgelerini yükleyin ve alındı kaydını saklayın. Değişiklik/sona erme bildirim kurallarını izleyin.

- Portal: https://standartsozlesme.kvkk.gov.tr/
- Kılavuz: https://standartsozlesme.kvkk.gov.tr/sharedFolder/kullanim-kilavuzu.pdf
- Kanun: https://www.mevzuat.gov.tr/mevzuatmetin/1.5.6698.pdf — madde 9.
- Yönetmelik: https://www.resmigazete.gov.tr/eskiler/2024/07/20240710-2.htm — madde 14 ve 16.

Kanun ve Yönetmelik okundu, portal ve kılavuz erişimi doğrulandı. İlgili aktarımı kapsayan güncel yeterlilik kararı bu araştırmada teyit edilemedi; kesinlikle hiç karar yoktur iddiasında bulunulmuyor. Sürekli bulut barındırmasını m.9/6'daki arızi aktarım istisnasına veya genel üyelik rızasına dayanarak çözülmüş saymayın.

## 6. Diğer sağlayıcıları ve teknik kuralları tamamla

Supabase'in sözleşmesi Gmail/Google veya GitHub'ın veri işlemesini kapsamaz. E-posta ve web barındırma veri akışları için de uygun işleme/aktarım düzeni belirlenmeli. Bölgeyi Avrupa'ya değiştirmek, Türkiye'de barındırma veya kendiliğinden hukuki çözüm değildir.

Onaylanan uygulama kuralları: sonuçlanmış belgeler 30 gün; sonuçlanmamışlar yüklemeden 90 gün; Vizesel'in yönettiği teknik kayıtlar 90 gün; kapanmış destek 1 yıl; ayrıca oluşturduğumuz yedekler 30 günlük döngü.

Bu araştırmada silme otomasyonu kurulmadı ve canlı veri silinmedi. Storage dosyaları Storage API ile fiziksel olarak kaldırılmalı; sadece SQL kayıtlarını silmek yeterli değildir. Zamanlayıcı, başarısızlık takibi ve silme kontrolü kurulmalı.

Free planın size 30 günlük otomatik yedek sunduğu varsayılmamalı. Supabase ücretsiz projeler için manuel dışa aktarma öneriyor; ücretli plan yedek süreleri farklı. Sağlayıcının tüm loglarını 90 gün kuralıyla sizin silebildiğiniz de varsayılmamalı. Proje kapatılınca 30 gün içinde silme açıklaması, tek bir uygulama kullanıcısının silinmesi için aynı garanti değildir.

## 7. Politikayı yayımlamadan önce

Tam kullanıcı metni **GIZLILIK_POLITIKASI.md** dosyasındadır. Saklama tablosu onaylanan hedefleri içerir; otomasyon kurulmadan bu süreler uygulanıyormuş gibi yayımlanamaz. Metin imzalanmamış Türk sözleşmesini imzalanmış göstermiyor. Aktarım aracı tamamlanınca ilgili bölüm gerçek mekanizma/tarih bilgisiyle güncellenmeli.

Politika giriş gerektirmeyen kalıcı HTTPS sayfasında sunulmalı; üyelik, ayarlar ve App Store Connect'ten bağlanmalı. “Gizlilik politikasını kabul ediyorum” ifadesi, aydınlatmayı okuma/bilgi edinme kaydı olarak ayrıştırılmalı ve aktarım açık rızası yerine kullanılmamalı. Bilgilendirme sürümü kaydedilmeli. App Store beyanları gerçek veri akışıyla eşleştirilmeli.

**Durum:** Altyapı değişmedi. Özel Türk sözleşmesi imzalanmadı/bildirilmedi, sağlayıcıya ileti gönderilmedi, otomatik silme kurulmadı, politika yayımlanmadı. Yerel araştırma ve taslak dokümanlar hazırlandı.
