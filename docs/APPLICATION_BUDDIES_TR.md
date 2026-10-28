# Başvuru arkadaşları

Ülke → Arkadaşlar ekranı gerçek, isteğe bağlı katılım kayıtlarını kullanır. Örnek kişiler ve yerel prototip kaydı kaldırılmıştır. Eski prototipte girilen planlar otomatik yayımlanmaz.

## Canlıya açma

1. Supabase projesinde **SQL Editor → New query** aç.
2. `docs/APPLICATION_BUDDIES_UPGRADE.sql` dosyasının tamamını yapıştırıp **Run** seç.
3. Uygulamayı yenile. Ülke → Arkadaşlar → **Plan ekle** ile katıl.

Mevcut sohbet kurulumu (`docs/CHAT_UPGRADE.sql`) önceden uygulanmış olmalıdır. Yeni Edge Function, gizli anahtar veya ortam değişkeni gerekmez. Bu oturumda Supabase yönetim erişimi bulunmadığından SQL uzaktan uygulanmamıştır.

## Davranış

- Kullanıcı başına her ülke için tek plan; düzenleme aynı kaydı günceller.
- Listeye katılım yalnız **Katıl** düğmesiyle olur. Üye olmayanlar listeyi göremez.
- Başvuru yeri ve dönem önceliklidir. Münih ve Berlin'e gidenler aynı listede olabilir; varış filtresi ayrıca uygulanır.
- Dönemi geçen kayıt diğer üyelere gösterilmez; sahibi güncelleyebilir veya silebilir.
- İki yöndeki engeller uygulanır. Planlar tablodan yalnız sahibince okunabilir/silinebilir; diğer üyeler liste RPC'sinden sınırlı profil ve başvuru bilgisi alır.
- Mesaj ikonu mevcut `chat_create_private` akışını açar; karşı tarafın kabul kuralları değişmez. Otomatik mesaj gönderilmez.
- Hesap veya ülke silinirse ilgili planlar da silinir.

Güncelleme örnek veri eklemez ve tekrar çalıştırılması mevcut katılımları değiştirmez.
