# Topluluk rozetleri ve belge uyarıları

## Etkinleştirme

Mevcut uygulama veritabanında Supabase → SQL Editor üzerinden `docs/COMMUNITY_UPGRADE.sql` dosyasının tamamını **bir defa** çalıştırın. Dosya tek işlem içinde 002/003 güncellemelerini ve yeni 004 kurallarını kurar. Kullanıcıları, gönderileri ve yönetici rollerini silmez. 004 zaten uygulanmışsa dosyayı tekrar çalıştırmayın. Yeni projelerde normal migration sırası 001 → 002 → 003 → 004 kullanılır.

Yalnızca publishable anahtarı ile şema kurulamaz. Anahtarları uygulamaya yeniden eklemek gerekmez. Başarıdan sonra uygulamadan çıkıp yeniden giriş yaparak profil verisini yenileyin.

## Ana seviyeler

Her satırdaki koşulların **tamamı** gerekir. Yalnızca puan veya çok sayıda yorum yeterli değildir.

| Seviye | Puan | Onaylı deneyim | Onaylı yorum | Beğenilen farklı yorum | Nitelikli yorum oyu | Farklı destekçi | Schengen ülkesi | Üyelik günü |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Gezgin | 40 | 2 | 0 | 2 | 3 | 2 | 1 | 0 |
| Kaşif | 160 | 5 | 10 | 5 | 12 | 5 | 2 | 7 |
| Seyyah | 450 | 10 | 25 | 15 | 40 | 15 | 3 | 30 |
| Rehber | 1100 | 20 | 50 | 30 | 120 | 35 | 4 | 90 |
| Elçi | 2800 | 35 | 100 | 60 | 300 | 80 | 6 | 180 |
| Büyükelçi | 8000 | 60 | 150 | 100 | 1000 | 200 | 8 | 365 |

Nitelikli oy: en az 7 günlük üyeliği ve onaylı, örnek olmayan bir katkısı bulunan başka üyenin faydalı oyudur. Bir üye aynı yoruma tek oy verebilir. Aynı kişinin farklı yorumlara oyları, farklı destekçi sayısını artırmaz. Örnek içerikler, bekleyen/reddedilen gönderiler ve bunların yorumları ilerleme sağlamaz.

Puan: ilk 120 deneyim × 12; ilk 400 yorum × 1; ilk 80 soru × 3; farklı Schengen deneyim ülkesi × 30; ilk 2000 nitelikli yorum oyu × 3; ilk 200 beğenilen farklı yorum × 2; ilk 400 nitelikli gönderi oyu × 1. Doğrulanmış ihlal kesintileri ve kayıtlı yönetici puan düzeltmeleri eklenir; toplam sıfırın altına inmez. Tavanlar tekrar paylaşarak sınırsız puan biriktirmeyi engeller. Üst seviyelerde asgari koşullara ek olarak puan eşiği de sağlanmalıdır.

Sunucu puanları ve rozetleri hesaplar; istemci bunları yazamaz. Onaylar, kaldırılan oylar ve doğrulanan ihlaller yeniden hesaplama yapar. Koşullar kaybolursa seviye düşer. Zaman koşulları girişte/kişisel yenilemede yeniden değerlendirilir. Ana seviye rozeti güncel seviyeyi gösterir.

## Ek rozetler

- **Avrupa Fatihi:** 5 farklı Schengen ülkesinden onaylı deneyim. Schengen dışındaki ülkeler sayılmaz.
- **Yol Arkadaşı:** ilk 30 günündeki 3 farklı üyeye, onların onaylı gönderilerinde onaylı yorumla destek.
- **Dedektif:** randevu kategorisinde 3 onaylı bilgi, güncelleme veya deneyim. Sadece soru sormak sayılmaz.
- **Öncü Üye:** kalıcı kayıt sıra numarası ilk 1000 içinde olanlar. Silinen hesapların numaraları yeniden kullanılmaz. Mevcut üyeler kurulumda kayıt tarihi ve kimlik sırasıyla numaralanır. Üst seviyeye ulaşana kadar üyelik etiketi de Öncü Üye olur; rozet daha sonra korunur.

## Olumsuz bildirimler

3 farklı üyeden çözülmemiş bildirim alan hesap, yönetici inceleme kuyruğunda öne çıkar. Bildirim sayısı tek başına puan düşürmez; organize kötüye kullanımı önlemek için yönetici ihlali doğrular ve gerekçe yazar. İhlal başına 1–2000 puan kesilebilir; varsayılan 25'tir. Aynı içeriğe gelen çok sayıda bildirim tekrar tekrar ceza vermez. Gerekçe ve bildirim sahipleri yönetim dışında görünmez. Puan düzeltmeleri mevcut yönetici aracından kayıtlı ve gerekçeli yapılabilir.

## Kritik belge uyarıları

İspanya belge listesinde önemli kaynak koşulları mor, açılır uyarılarla görünür. Diğer ülkelerde de ilgili belgeye yönetici notu eklenebilir. Yönetim → Belge uyarılarını yönet ekranında ülke ve belge seçilir. Kullanıcı deneyimi notu aynı ülkedeki onaylı, örnek olmayan bir **deneyim gönderisine** bağlanmalıdır. Editör açıklaması ayrı etiket taşır. Notlar önce bekler; yetkili onayından sonra görünür. Kaynak gönderi kaldırılırsa deneyim notu da halktan gizlenir.

Benzer deneyim sayısı yalnızca gerçek, farklı hesapların bildirimlerinden hesaplanır. Notu oluşturan kişi ve kaynak deneyimin yazarı kendi notunu doğrulayamaz. Ekran görüntüsündeki demo sayılar ve doğrulanmamış ıslak imza talepleri gerçek bilgi olarak eklenmemiştir. Kullanıcı notları resmî belge koşulunun yerine geçmez.
