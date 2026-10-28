# Sosyal özellikler ve mobil düzenleme

## Kurulum

Supabase SQL Editor’da [SOCIAL_MOBILE_UPGRADE.sql](SOCIAL_MOBILE_UPGRADE.sql) dosyasını çalıştır. Dosya 012 (sahibinin içerik silmesi) ve 013 (sosyal/medya) geçişlerini tekrar uygulanabilir bir işlemde içerir. Temel şema, topluluk geçişleri ve 009 sohbet geçişi önceden bulunmalıdır. Bu çalışmada uzak veritabanına yönetici erişimi olmadığından SQL otomatik uygulanmadı.

## Davranış

- Kart üzerindeki gönder düğmesi kabul edilmiş özel/grup sohbetine aynı paylaşımın kimliğini gönderir. İçerik kopyası oluşturulmaz; paylaşım silinir veya erişim kapanırsa kart içeriği açılamaz. Alıcı henüz özel paylaşımı göremiyorsa gönderim reddedilir. Yeni biriyle önce Mesajlar’dan sohbet isteği oluşturup kabulünü bekle. Sistem paylaşımı gerçek HTTPS bağlantısı kullanır.
- Silme kart üzerinde doğrudan çöp simgesidir; geri alınamayan işlemi bir kez onaylamak gerekir. Yalnız sahibinin içeriği silinir.
- Gün/ay/yıl bir ortak çerçevedeki dar alanlardır. Gün dolunca ay, ay dolunca yıl odağı korunur. Sunucuya ISO tarih gönderilir.
- Keşfet, son 30 günün onaylı, örnek olmayan ve görüntüleyenin erişebildiği paylaşımlarını sıralar. Puan: `(8 × ln(1 + faydalı) + ln(1 + yorum)) / (1 + yaş_gün / 3)^1.3`. Böylece faydalı oy daha etkilidir ve zamanla ağırlığı azalır. Sıralama SQL’de tüm uygun paylaşımlara uygulanır, ardından sayfalanır. Ana akışın takip edilen ülke önceliği değişmez. Geçiş henüz yoksa son 30 günün faydalı sıralaması yedek olarak kullanılır.
- Profilde takipçi/takip sayıları ve listeleri, takip/takibi bırak, gizli profil isteğini kabul/ret, takipçiyi çıkarma bulunur. Liste 30’ar sayfalanır. Karşılıklı engel takibi keser. Takipleşme puan kazandırmaz.
- Gizli profilde onaylı paylaşımlar yalnız sahibi, kabul edilen takipçiler ve mevcut moderasyon yetkisi kapsamında yönetim tarafından okunur. Bu kural RLS ile akış, paylaşım bağlantısı, arama ve bağlı belge notlarına uygulanır. Ad, kullanıcı adı, biyografi, avatar, rozetler ve takip sayıları görünür kalır; herkese açık paylaşım altındaki yorumlar da görünürdür. Hesabı yeniden herkese açmak bekleyen istekleri kabul eder.
- Profil sekmeleri aynı dikey listeyi kullanır; sekme değiştirmek ekranı yeniden oluşturmaz. Yatay sürükleme önceki/sonraki sekmeyi açar, hareket azaltma tercihine göre kısa geçiş uygulanır. Daha kısa içerik listesinde kaydırma yüksekliği doğal olarak sınırlanabilir.
- Ayarlar kapalı bölüm listesiyle açılır: Görünüm, Profili düzenle, Bildirimler, Hesap ve gizlilik, Veri ve uygulama. E-posta değişikliği Supabase Auth updateUser ile yapılır; güvenli e-posta değişikliği ayarına göre mevcut ve yeni adres onayı gerekebilir. Uygulama bu onayları atlamaz.

## Özel sohbet fotoğrafları

Yalnız kabul edilmiş birebir sohbetlerde galeriden JPG/PNG, en fazla 5 MB fotoğraf gönderilir. Gönderim öncesi küçük önizleme ve kaldırma bulunur. Başarısız kayıt aynı mesaj kimliğiyle tekrar denenir. Fotoğraf gönderildikten sonra metin ayrı mesaj olabilir; fotoğraf gönderimi başarılı fakat metin başarısızsa yalnız metin tekrar gönderilir.

`chat-media` özel bucket kullanılır. Yükleme yolu oda/kullanıcı/tekil-kimlik şeklindedir; oda üyeliği, kabul, engel ve kapalı oda durumu sunucuda doğrulanır. Yalnız sohbet üyeleri imzalı URL isteyebilir; URL 60 saniye geçerlidir, ayrılma veya engelleme önceden verilmiş URL’yi o sürenin sonuna kadar geri alamaz. Görseller uygulama tarafından kalıcı diske önbelleklenmez. Bu uçtan uca şifreleme değildir.

Bildirilen fotoğraf için yalnız o dosyanın yolu rapora eklenir. Bağımsız moderatör yalnız çözülmemiş raporun fotoğrafını inceleyebilir; özel sohbetin tamamına erişmez. Mesaj silindiğinde dosya diğer üyelerce indirilemez; çözülmemiş rapor için erişim korunur. Kullanıcının gönderim öncesi iptal ettiği yükleme Storage API ile temizlenir. Sohbetten çıktıktan sonra veya uygulama kapanırken yarım kalmış yüklemeler otomatik süreli silme sistemine sahip değildir; bir kullanıcıya en fazla 5 kayıtsız yükleme izni vardır. Süreli saklama ve hesap silme politikası ayrıca işletilmelidir.

Özel paylaşımlar gelebileceği için disk önbelleği yalnız ülke kataloğuyla sınırlanır. Eski akış önbelleği sürüm değişikliğiyle geçersizleşir. Supabase'e geçiş uygulamak, GitHub Pages web dosyalarını yayımlamaktan ayrı adımdır.
