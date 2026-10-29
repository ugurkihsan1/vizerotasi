# Panelden kurulum — bilgisayara program kurmadan

**Henüz sunucuda etkinleştirildiği doğrulanmadı.** Supabase projenizde şu üç adımı tamamlayın. Anahtarları sohbete göndermeyin.

## 1. SQL'i çalıştır

Supabase → **SQL Editor → New query**: [PRIVACY_RETENTION_UPGRADE.sql](PRIVACY_RETENTION_UPGRADE.sql) içeriğinin tamamını yapıştırıp **Run** seçin. Bu dosya, belge saklama ve gizlilik tercih kayıtları için 022 ve 023 işlemlerini içerir. Dosya silme görevi henüz bu adımda çalışmaya başlamaz.

## 2. Gizli anahtar ve Edge Function oluştur

SQL Editor'da ayrı bir sorguyla yalnızca kendi panelinizde bir rastgele anahtar üretin:

```sql
select gen_random_uuid()::text || gen_random_uuid()::text as private_retention_secret;
```

Çıkan değeri **Edge Functions → Secrets** bölümünde, adını **`RETENTION_CRON_SECRET`** yaparak kaydedin. Değeri üçüncü adım için de saklayın; ekran görüntüsüyle veya sohbette paylaşmayın.

**Edge Functions → Deploy a new function / Via Editor** yolunu açın. İşlev adı **`retention-cleanup`** olsun. [RETENTION_FUNCTION.txt](RETENTION_FUNCTION.txt) içeriğinin tamamını editördeki `index.ts` dosyasına yapıştırın. Dosya, bütün yardımcı kodu içerir; ek dosya oluşturmanız gerekmez. **Deploy** seçin. İşlevin ayarlarında ağ geçidinin **Verify JWT / legacy JWT verification** seçeneğini kapatın. İşlev kendi özel anahtarını her istekte kontrol eder; bu ayar başka işlevlerin JWT ayarını değiştirmez.

## 3. Saatlik görevi kur ve çalıştığını doğrula

Panelde **Cron** ve **Vault** özelliklerini etkinleştirin. SQL Editor'da [RETENTION_SCHEDULE.sql](RETENTION_SCHEDULE.sql) dosyasını açın. İçindeki **`BURAYA_EDGE_SECRET_ILE_AYNI_DEGER`** alanını ikinci adımda oluşturduğunuz değerle değiştirip tamamını çalıştırın. Dosya, aynı isimli eski görevi yeniler, Vault değerlerini günceller ve ilk çağrıyı başlatır. Anahtar değiştirirseniz Edge Secrets ve bu SQL'de aynı yeni değeri kullanın.

İlk çağrı asenkrondur. Kısa süre sonra SQL Editor'da tekrar çalıştırın:

```sql
select * from public.retention_policy_status();
select jobname,schedule,active from cron.job
where jobname='vizesel-evidence-retention-hourly';
```

İlk sonuçta **`active = true`** ve güncel **`last_success_at`**; ikinci sonuçta da görevin **`active = true`** olduğunu doğrulayın. Edge Function çağrı kayıtlarında **HTTP 200 / completed** görünmeli. Hata varsa silmenin etkin olduğunu varsaymayın. Gerçek kullanıcı belgelerinin tarihini test için geriye çekmeyin.

Bu görev sonuçlanmış belgeleri 30 gün, bekleyen/yarım kalmış yüklemeleri 90 gün eşiğinden sonra temizler. İlk kurulumdaki geçiş süreleri ve yeniden deneme davranışı için [ayrıntılı kurulum notuna](RETENTION_UPGRADE_TR.md) bakın. **Supabase'in kendi loglarını/yedeklerini veya Gmail yazışmalarını silmez; yurt dışı aktarım sözleşmesini de tamamlamaz.**
