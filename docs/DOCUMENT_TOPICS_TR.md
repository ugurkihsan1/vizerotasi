# Ülkeye özel belge notları ve vize ücreti

Önemli bilgi → Belgeler seçicisindeki maddeler, ülkenin Belgeler ekranıyla aynı yerel + Supabase belge birleştirmesinden gelir. İspanya'daki 13 maddenin dışında kalan eski yapay başvuru formu/öğrenci/sponsor/genel belge seçenekleri kaldırıldı. Bir maddenin kendi alt açıklamaları, ayrı belge kartı değilse ayrıca seçilmez. Seçicinin başlıkları yönetici güncellemelerini de izler.

Vize ücreti ayrı konu seçeneğidir; Belgeler ekranında fiziksel belge sayısına eklenmeyen bir bölüm olarak görünür. Yeni ve onaylanmış ücret notları bu bölümde okunur. Ücret/ödeme deneyimi resmî tarife veya herkes için geçerli kural onayı değildir.

## Supabase kurulumu

Mevcut projede SQL Editor açıp [DOCUMENT_TOPICS_UPGRADE.sql](DOCUMENT_TOPICS_UPGRADE.sql) dosyasını çalıştır. Önceki ülke ve belge güncellemelerinin kurulu olması gerekir. Edge Function veya yeni gizli anahtar gerekmez. Uzak SQL yönetim erişimi bulunmadığı için burada uygulanmadı.

SQL, her gerçek belge için `document-<belge UUID>` konu kaydını ve `visa-fee` konusunu oluşturur. Yeni belge ekleme/ad değiştirme işlemlerinde konu da otomatik güncellenir. Sunucu, önemli bilgi paylaşımında belge ile seçilen ülkenin eşleşmesini doğrular. Sadece aynı isimde oldukları için iki ayrı belge birleştirilmez.

Mevcut BLS ücret notu (`0542061e-8117-444f-9c79-2d7755095dd4`), açıkça tespit edilen eski `doc-form` kategorisinden `visa-fee` kategorisine alınır. Düzeltme yalnız aynı ülke/tür/başlık hâlâ eşleşiyorsa yapılır; metin ve yayın durumu değişmez. Diğer yazılara başlık/içerik tarayarak otomatik kategori tahmini yapılmaz. Uygulamadaki dar kapsamlı uyumluluk okuması, bu eski notu SQL uygulanmadan önce de ücret bölümünde gösterir.

Güncelleme öncesi bilinen belge konuları eski kategoriyle paylaşılabilir; yeni ve özel belgeler için SQL kurulmalıdır. Ücret konusu da SQL ile etkinleşir. Eski onaylı belge notları eski konularından okunmaya devam eder; yeni belge notları belgeye özgü kimlik ile bağlanır. Güncellemeyi çalıştırdıktan sonra uygulamayı yenile.
