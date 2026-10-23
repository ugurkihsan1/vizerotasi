# Özel destekleyici belgeler ve doğrulama

## Kurulum

Temel topluluk ve rozet migration’ları (001–004) kurulu olan mevcut Supabase projesinde SQL Editor’dan [EVIDENCE_UPGRADE.sql](EVIDENCE_UPGRADE.sql) dosyasının tamamını çalıştırın. Dosya tekrar çalıştırılabilir 007 form güncellemesini ve 008 özel belge güncellemesini tek transaction’da içerir; 007 önceden uygulanmışsa da güvenle tekrar çalışır. Yeni kurulumda CLI migration’ları sırasıyla uygular. Bu çalışma sırasında uzak yönetici kimlik bilgisi bulunmadığı için uzak SQL uygulanmadı.

Bu dosya ilk olarak `post-evidence` adlı **private** Storage bucket’ını ve RLS korumalı `post_evidence` / `post_verifications` tablolarını oluşturur. Public avatar bucket’ından ayrıdır. Destekleyici dosyalar PDF/JPEG/PNG, her dosya en fazla 8 MB, paylaşım başına en fazla 5 adettir. Dosya yolu `üyenin-uuid/paylaşım-uuid/rastgele-ad.uzantı` biçimindedir; orijinal ad yalnız özel metadata’da tutulur.

İki mevcut Almanya sigorta notu sahibinin bildirdiği yanlış kategorilerden `doc-insurance` kategorisine taşınır: `63cf9771-c5fc-4793-ac68-47effcc007f6` ve `a5997c85-bcbe-48a6-9642-b60e4a5bfec1`. Ülke, başlık, yayın durumu ve eski kategori de kontrol edilir; sonraki personel düzeltmeleri tekrar çalıştırmada ezilmez. Diğer kullanıcı metinlerinden otomatik konu tahmini yapılmaz.

## Üye ve yönetim akışı

1. Üye deneyim veya kritik not paylaşır. Belgeler isteğe bağlıdır; normal yayın kararı belgesiz de verilebilir. Sorular destekleyici belge kabul etmez.
2. Kritik notta ülke aramalı tek alandan seçilir. Belgeler konusu seçilirse ilgili ülkenin checklist maddeleri açılır. Mor önizleme bağlanacağı tam yolu gösterir. Genel finans/sponsor etiketleri sigortaya yönlendirmez.
3. Üye sigorta/bilet gibi birden fazla belge seçebilir. Yüklemeden önce kimlik/pasaport, adres, poliçe/bilet kodu ve barkod gibi alanları kapatması; incelenecek tarih ve ilgili alanı görünür bırakması istenir. Dosyalar herkese açık gönderi metnine eklenmez.
4. Paylaşım önce bir kez kaydedilir, dosyalar o kimliğe yüklenir. Kısmi yükleme hatasında aynı paylaşım üzerinden yeniden denenir; üye belgeleri sonra ekleyerek devam edebilir. Kayıtlı paylaşımın detayından da belge eklenebilir.
5. Yönetim → Belge doğrulama kuyruğu, yayın kuyruğundan ayrıdır. Yetkili kişi kısa ömürlü (60 saniye) imzalı indirme bağlantısıyla dosyayı açar. Paylaşım yayımlanmadan doğrulama verilemez. Kendi dosyasını admin dahil hiç kimse doğrulayamaz; başka bir personel inceler.
6. Personel iddianın belgeyle desteklenip desteklenmediğini inceler. Sigorta poliçesi veya biletin varlığı, örneğin “ıslak imza istendi” iddiasını tek başına kanıtlamaz. “Belgeleri yeterli buldum · Doğrula” ayrı bir karar penceresi açar. İç inceleme notu yalnız personel audit tablosunda tutulur.
7. Doğrulama, “Belgeyle doğrulanmış deneyim” etiketi ve paylaşım başına **+10** ek puan verir. Bu bir resmî kural onayı değildir. Tekrarlanan karar puan çoğaltmaz. Geri alma puanı kaldırır; yeniden doğrulama yalnız mevcut +10’u geri getirir. Yayının kaldırılması, metnin/başlığın/ülkenin değiştirilmesi ve paylaşımın silinmesi doğrulama puanını kaldırır. Mevcut çok boyutlu seviye koşulları korunur.
8. Yanlış bağlanan kritik not, personel tarafından “Notun belge bağlantısını düzelt” üzerinden aynı ülkenin doğru maddesine taşınabilir. İşlem audit kaydı oluşturur; onaylı not ilgili mor alana otomatik taşınır.

## Erişim ve saklama

- Diğer üyeler ve anonim ziyaretçiler dosyalara, adlarına veya özel inceleme notlarına erişemez. Paylaşım sahibi kendi dosyalarını, yetkili personel inceleme için ilgili dosyaları görebilir. Public tarafta yalnız doğrulama durumu gösterilir.
- Uygulama bu özel sorguları diskteki public cache’e dahil etmez. İmzalı URL’ler veritabanına veya gönderi metnine yazılmaz. İndirilen dosya kopyaları/alınan bağlantılar alıcının cihazında kalabilir; URL süresi daha önce indirilmiş bir dosyayı geri alamaz.
- Doğrulanmış dosyalar aynı iddia için değiştirilemez. Diğer dosyalar sahibi tarafından detaydan kaldırılabilir. Doğrulanmış dosya kaldırma taleplerinde önce personelin doğrulamayı geri alması gerekir. Metadata silinince istemci Storage nesnesini kaldırır; başarısız temizlikte yetim nesne kalabilir. Otomatik süreli silme veya arşiv işçisi kurulmadı; yönetim saklama/silme politikasını ve Storage temizliğini işletmelidir. Paylaşım silinince dosya metadata’sı silinir, Storage dosyaları için ayrıca temizlik gerekir.
- Gerçek kişilerle belge toplamaya başlamadan önce ürünün mevcut gizlilik metni/veri sorumlusu/iletişim bilgileri bu yeni özel belge işleme amacını kapsamalıdır. Bu dosya hukuki politika yerine geçmez.

## Doğrulama kapsamı

PGlite testleri aynı migration’ları gerçek PostgreSQL RLS altında çalıştırır: diğer üyelerin metadata/Storage okuması, sahte doğrulama, kendi kendine inceleme, dosya limiti, gerçek Storage metadata’sı, geri alma/puan tekilliği ve migration tekrarları. Tarayıcı testleri fixture dosyalarıyla çoklu seçim, özel upload yolları, moderasyon, doğru sigorta bağlantısı ve hata sonrası tek paylaşım üzerinden yeniden yüklemeyi doğrular. Testler gerçek kullanıcı belgelerini yüklemez. Uzak Supabase Storage HTTP erişimi ve gerçek iPhone dosya seçimi ayrıca denenmelidir.
