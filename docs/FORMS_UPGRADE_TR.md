# Üyelik ve paylaşım alanları güncellemesi

Mevcut kurulumda Supabase → SQL Editor’da [FORMS_UPGRADE.sql](FORMS_UPGRADE.sql) dosyasının tamamını çalıştırın. Bu tek transaction, `202610220007_richer_experiences.sql` migration’ıyla aynıdır ve tekrar çalıştırılabilir. Önceki migration’ların kurulmuş olması gerekir. Yeni projede CLI bütün migration’ları sırasıyla uygular.

Güncelleme `posts.previous_visas` ve `posts.invitation_notes` alanlarını, bunların RLS korumalı view alanlarını ve yeni belge alt kategorilerini ekler. Deneyim açıklaması boş kalabilir; soru ve kritik paylaşımın 20 karakter sınırı korunur. Önceki vizeler en fazla 10 kayıt, ülke zorunlu, tarih/süre/giriş hakkı/not isteğe bağlıdır. İlk Schengen seçiliyken geçmiş vize kaydı kabul edilmez. Mevcut içerik veya yönetici değişiklikleri silinmez; gönderilerin inceleme süreci korunur.

Supabase → Authentication → Sign In / Providers → Email bölümünde **Minimum password length** değerini **8** yapın ve kaydedin. Dashboard sürümüne göre bu ayar Password security altında olabilir. Yerel `supabase/config.toml` ve uygulama doğrulaması 8 karakterdir; yerel dosya uzak Auth ayarını değiştirmez. Yönetici erişimi bulunmadığı için uzak SQL ve Auth ayarı bu kod değişikliğiyle uygulanmadı.

Kayıtta Adınız ve Kullanıcı adı ayrı alanlardır. Profil fotoğrafı isteğe bağlıdır; JPG/PNG, en fazla 2 MB. Fotoğraf anonim olarak Storage’a yüklenmez. E-posta doğrulaması gerekirse bu cihazda kullanıcıya özel taslak olarak saklanır; aynı cihazdan oturum açılınca kullanıcının kendi avatar yoluna yüklenir ve taslak kaldırılır. Başka cihazdan girişte fotoğraf Ayarlar’dan eklenebilir. Yükleme hatası üyelik hesabını iptal etmez.

Arayüz tarihleri gün/ay/yıl gösterir. Form üç sayısal alan kullanır; iki haneli günden aya, aydan yıla otomatik geçer. Saklanan tarihler ISO biçimindedir; saatli etkinlikler Türkiye saat diliminde gösterilir.

Kritik paylaşımda Belgeler seçilince ilgili ülkenin belge listesi açılır. Seçim gerçek `category_id` olarak kaydedilir; gönderi onaylanınca ilgili ülke rehberindeki belge altında mor topluluk notu görünür. Bu, ayrı bir kopya içerik oluşturmaz. Randevu, davet mektubu ve ret konuları ilgili rehber adımlarına bağlanır.
