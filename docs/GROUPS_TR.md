# Yönetici onaylı paylaşım grupları

Supabase Dashboard → SQL Editor → New query: `docs/GROUPS_UPGRADE.sql` dosyasının tamamını çalıştırın. Temel 001 şeması gerekir. Tekrar çalıştırılabilir; mevcut grupları ve üyelikleri sıfırlamaz. Ardından uygulamayı yenileyin. Ortam değişkeni veya yeni gizli anahtar gerekmez.

- Keşfet ve ana ekrandaki Gruplar satırı → grup listesi. Erasmus otomatik eklenir; gerçek üyeler/gönderiler uydurulmaz.
- Erasmus katılım isteklerini mevcut uygulama yöneticileri ve moderatörleri onaylar. Grup içinden aktif bir üyeyi yönetici atayabilirler.
- Üyeler yeni grup oluşturabilir. Oluşturan kişi sahibi/yöneticisidir. Diğer herkes önce katılım isteği gönderir. Açıklama, isim ve üye sayısı keşifte görünür; gönderiler, yorumlar ve beğeniler yalnız onaylı üyelere görünür. Onaylanan üyeler eski paylaşımları da görebilir.
- Üyeler metin paylaşır, yorumlar ve beğenir. Her gönderi için tekrar moderasyon beklenmez. Grup paylaşımları genel ülke akışına, mor belge notlarına veya rozet puanlarına otomatik taşınmaz. Görsel/dosya ekleri bu sürümde yoktur.
- Grup bilgisi ve yönetimi (…) → Üyeler ve istekler → kişinin yanındaki (…) → onay/ret/çıkarma. Çıkarılan kişi yönetici izin vermeden yeniden başvuramaz. Reddedilen kişi yeniden istek gönderebilir.
- Sahip diğer yöneticilerin yetkisini değiştirir, sahipliği aktif bir üyeye devredebilir. Sıradan yönetici başka yöneticileri çıkaramaz veya kendine sahiplik veremez. Sahip ayrılmadan önce sahipliği devreder. Sistem Erasmus grubunun sahipliği devredilemez.
- Kullanıcı kendi içeriğini, yöneticiler grubun içeriklerini silebilir. Kullanıcı gruptan ayrılınca içerik erişimi kapanır; önceki paylaşımları grupta kalır. Ayrılmadan önce kendi içeriğini silebilir. Grup içinde yeni içerik için ekranı aşağı çekerek yenileyin. Mesajlaşma ayrı özelliktir.
- Özel kullanıcı gruplarına uygulama personeli için genel içerik okuma istisnası yoktur; yönetim yalnız Erasmus gibi sistem grubunda otomatik uygulanır. Veritabanı işletmecisi teknik olarak veriye erişebilir. Uçtan uca şifreleme yoktur.
- Tüm içerik yazmaları yetkili RPC ile yapılır; doğrudan tablo yazmaları kapalıdır. Sunucu üyelik ve yetkiyi tekrar denetler; grup kilidi onay/çıkarma/yazma yarışlarını sıraya alır. Tekrar gönderme aynı istemci kimliğiyle çoğalmaz. Yeni grup: 5/gün; gönderi: 30/saat; yorum: 60/saat. Dizin en fazla 200 yeni grubu listeler; doğrudan grup bağlantısı daha eski grupları da açar. Gönderiler ve üye/yorum listeleri sayfalanır.

SQL yerel PostgreSQL uyumlu test ortamında yetki, onay, içerik gizliliği, yönetici devri ve yinelenen gönderimler ile doğrulanır. Bu dosya uzak projede SQL çalıştırıldığı anlamına gelmez.

## Topluluk silme

Mevcut kurulumda yalnız [GROUP_DELETION_UPGRADE.sql](GROUP_DELETION_UPGRADE.sql) dosyasını SQL Editor’da çalıştır. Bu SQL hiçbir grubu otomatik silmez; onaylı silme yetkisini ekler. Uzak yönetim erişimi olmadığı için bu güncelleme burada uygulanmadı. Edge Function veya yeni gizli anahtar gerekmez.

Kurucu, aktif grup yöneticileri ve uygulama adminleri grup menüsünden Topluluğu sil → Topluluğu kalıcı olarak sil ile kaldırabilir. Üyelikler, grup paylaşımları, yorumları ve beğenileri birlikte silinir. Uygulama admininin bu yetkisi özel grupların içeriklerini okuma izni vermez. Silme sonrası ana akışa dönülür ve sekme kaldırılır. Erasmus dahil sistem topluluğunu da yetkili yönetici silebilir; eski ilk kurulum/seed SQL’ini tekrar çalıştırmak Erasmus’u yeniden ekleyebilir.
