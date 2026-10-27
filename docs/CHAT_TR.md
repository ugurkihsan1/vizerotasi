# Topluluk odaları ve özel mesajlar

## Kurulum

Mevcut Supabase SQL Editor’da [CHAT_UPGRADE.sql](CHAT_UPGRADE.sql) dosyasının tamamını çalıştırın. Dosya 009 migration’ını tek transaction’da kurar, tekrar çalıştırılabilir, mevcut paylaşımları/rolleri değiştirmez. Temel 001 topluluk şeması gereklidir; önceki form/belge güncellemelerinden bağımsızdır. Yeni kurulumlarda CLI bütün migration’ları sırasıyla uygular. Bu çalışma sırasında uzak SQL yönetim erişimi bulunmadığı için uygulanmadı.

Migration `chat_rooms`, `chat_members`, `chat_messages`, `chat_blocks`, `chat_reports` tablolarını, erişim politikalarını ve yalnız authenticated çağrılabilen RPC’leri oluşturur. `chat_messages`, varsa `supabase_realtime` publication’ına eklenir. Projede Realtime servisi de açık olmalıdır. PostgREST schema cache için NOTIFY gönderilir.

## Üye akışı

- Üst menüdeki sohbet simgesinden veya kendi profilindeki **Mesajlarım** düğmesinden gelen kutusu açılır. Ülke sayfasında **Topluluk sohbeti** bulunur.
- Topluluk odasına giriş takip gerektirir. Takip etmeyen kişiye **Takip et ve sohbeti aç** seçeneği açıklanır; takip ancak bu açık seçimle yapılır. Takip bırakılınca geçmiş ve yeni mesajlara erişim kapanır. Odalar ilk gerçek katılımda oluşturulur; örnek sohbet veya kullanıcı mesajı seed edilmez.
- Başkasının profilindeki **Mesaj gönder** bir birebir sohbet isteği açar. İki kişi için tek birebir oda kullanılır; ters yönden yeniden açmak kopya oda oluşturmaz.
- **Yeni sohbet / Grup kur** üzerinden bir veya birden fazla kişi seçilebilir. Gruplar sahibi dahil en fazla 10 kişidir. Birden çok kişi seçilirse grup adı gerekir.
- Yeni kişi daveti kabul etmeden özel mesaj geçmişini göremez veya mesaj gönderemez. Reddedebilir ya da davet edeni engelleyebilir. Kabul eden yeni grup üyeleri eski mesajları da görebilir; kişi davet ederken bu durum belirtilir.
- Birebir istek kabul edilene kadar gönderen en fazla 3 mesaj bırakabilir. İstek reddedilirse yeni mesaj gönderilemez. Reddeden kişi daha sonra kendisi sohbeti başlatarak katılımını etkinleştirebilir; karşı tarafın izni uygulama tarafından otomatik verilmez.
- Grup sahibi kişi davet edebilir/çıkarabilir ve grubu kapatabilir. Üye gruptan ayrılabilir; ayrılan/çıkarılan kişinin geçmiş erişimi de kapanır. Sahip ayrılırsa sahiplik diğer aktif üyeye geçer; hiç aktif üye kalmamışsa grup kapanır. Kapalı grup okunabilir, yeni mesaj kabul etmez.

## Mesajlar ve okunma

Yalnız metin mesajları desteklenir. Mesaj en fazla 2000 karakterdir. Yeni mesajlar Supabase Postgres Changes üzerinden alınır; bağlantı sorunlarında aktif ekranda 5 saniyelik sorgulama yedeği vardır. Sohbet sorguları ekran odağına/uygulama durumuna göre durur; Realtime arka planda kapatılır. Arka plan push bildirimi, medya/dosya/sesli mesaj, arama, yazıyor/çevrimiçi durumu bu değişiklikte yoktur.

Mesaj geçmişi 40’lık cursor sayfalarıyla, gelen kutusu 30’luk sayfalarla yüklenir. Eşit zaman damgaları UUID ile sıralanır. İstekler gelen kutusunda önce görünür. Okunmamış sayısı ve istek sayısı üst simgede gösterilir. Topluluk geçmişi için okunmamış sayacı kişinin odaya ilk katılımından başlar.

Özel odalarda görüldü bilgisi üyelerin son okuma zamanından türetilir. Daveti kabul etmek tek başına görüldü kaydı oluşturmaz. Oda aktifken mesajlar başarıyla yüklenmiş ve kullanıcı en yeni mesajların bulunduğu bölümdeyken okuma kaydı sunucuda güncellenir; istemci gelecekte bir tarih gönderemez. Bu, ayrı bir cihaz teslim garantisi değildir.

Gönderim denemesi için istemcide rastgele UUID üretilir. Ağ hatasında aynı metin aynı odada tekrar denenirse aynı kimlik kullanılır; RPC ikinci kayıt oluşturmaz. Oda/hesap değişince mesaj taslağı ve deneme bilgisi sıfırlanır. Taslaklar, mesajlar ve özel sohbet sorguları diskteki public cache’e yazılmaz.

## Erişim ve moderasyon

- Tüm tablo yazmaları sunucu RPC’leri üzerinden yapılır. Kimlik, gönderen, üyelik, zaman, davet ve oda sahibi istemci tarafından doğrudan değiştirilemez.
- Özel mesajlarda admin/moderatör rolüne tüm geçmişi görme ayrıcalığı verilmez. Üye yalnız seçtiği mesajı gerekçesiyle bildirirse o mesajın kopyası yönetimin sohbet bildirim ekranına gelir. Yönetim bildirilen mesajı kaldırabilir veya bildirimi kapatabilir; başka özel mesajlar açılmaz.
- Topluluk odasına katılmış personel odadaki uygunsuz mesajı kaldırabilir. Üye kendi mesajını kaldırabilir. Kaldırma gövdeyi boşaltır, katılımcılara “Mesaj kaldırıldı” görünür; önceden kopyalanmış/indirilmiş içerik geri alınamaz. Daha önce bildirilmiş mesajın rapor kopyası inceleme için tutulur.
- Engelleme karşılıklı birebir mesajlaşmayı ve engelleyen kişiyle yeni oda davetini durdurur; ortak grup/topluluk mesajlarını gizlemez. Var olan özel geçmiş otomatik silinmez. Birebir engelleme sırasında yeni görüldü kaydı ve okunmamış uyarısı da oluşturulmaz. Engeli kaldırmak için gelen kutusunda **Engellenen kişiler** bulunur. Reddedilen grup daveti aynı oda sahibince tekrar zorlanamaz.
- Sunucuda kişi başına dakikada 60 mesaj ve saatte 10 yeni özel oda sınırı vardır. Grup sayısı ve üyelik koşulları sunucuda da kontrol edilir. Mesajlaşma rozet puanı kazandırmaz.
- Realtime yalnız INSERT/UPDATE olaylarını dinler; event içeriği doğrudan ekrana yazılmaz, RLS korumalı sorgular yenilenir. Anonim kişiler, yabancı üyeler, daveti kabul etmemiş kişiler ve ayrılmış üyeler özel mesaj verisi alamaz.

## Saklama ve test sınırları

Bu özellik uçtan uca şifreleme sağlamaz. Mesajlar Supabase veritabanında saklanır; proje sahibi/sunucu yönetimi teknik olarak veritabanına erişebilir. Otomatik süreli mesaj/rapor silme işçisi kurulmadı. Hesap silme ve gerçek gizlilik/saklama politikası mağaza hazırlığı kapsamında ayrıca tamamlanmalıdır.

PGlite testleri aynı SQL dosyasını gerçek PostgreSQL rollerinde çalıştırır: takip/üyelik/davet, yabancı ve staff erişimi, sahte yazmalar, engelleme, sınırlar, oda tekilliği, idempotent gönderim, grup yönetimi, okunma, rapor gizliliği ve migration tekrarı. Tarayıcı testleri fixture kullanıcılarla özel/grup oluşturma, davet kabulü, başarısız gönderim sonrası tekrar ve açık takip onayını doğrular. Testlerde gerçek kullanıcıya mesaj gönderilmez. Uzak SQL uygulanmadan iki gerçek kullanıcıyla Realtime veya gerçek iPhone klavye/okuma senaryosu denenmiş değildir. Native export imzalı IPA/APK veya gerçek cihaz testi değildir.
