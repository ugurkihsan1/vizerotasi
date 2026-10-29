# Belge saklama ve otomatik silme kurulumu

Bu değişiklik **yerel kodda hazırdır**. SQL'i çalıştırmak tek başına dosyaları silmez. Edge Function'ın yayımlanması, gizli anahtarın ayarlanması, zamanlayıcının kurulması ve başarılı bir çalışmanın doğrulanması gerekir. Bu çalışma ortamından Supabase yönetim yetkisi bulunmadığı için uzakta etkinleştirildiği varsayılmamalıdır.

## Uygulanan kapsam

- İncelemesi doğrulandı veya doğrulanmadı olarak sonuçlanan destekleyici dosyalar: son karar tarihinden **30 gün** sonra.
- İncelemesi sonuçlanmamış kayıtlı dosyalar: yükleme tarihinden **90 gün** sonra.
- Storage'a yüklenmiş, kaydı tamamlanmamış sahipsiz destekleyici dosyalar: Storage'ın gerçek `created_at` tarihinden **90 gün** sonra. Yaşı bilinmeyen dosyalar tahminen silinmez.
- Kullanıcı dosyayı/paylaşımı silerse metadata silinirken kalıcı bir temizleme işi oluşturulur; istemci dosya silme isteği başarısız olsa da iş tekrar denenir.
- Saatlik çalışma nedeniyle eşik tarihinde ilk başarılı görev dosyayı siler; kesinti/hata durumunda yeniden deneme gerekir. Başarısız dosyalar silindi olarak gösterilmez.
- İlk kurulumda tarihi bilinen/bilinmeyen eski sonuçlanmış dosyalara en az **30 günlük geçiş süresi**; zaten 90 günü geçmiş bekleyen dosyalara en az **1 günlük geçiş süresi** tanınır. Yeniden kurulum bu süreleri yeniden başlatmaz.

Yalnızca `post-evidence` dosyaları bu işin kapsamındadır. Profil fotoğrafları, sohbet görselleri, paylaşımlar, yayın durumları, doğrulama kararları ve kazanılmış puanlar süre doldu diye kaldırılmaz. Sağlayıcının altyapı logları/yedekleri veya Gmail'deki destek yazışmaları bu görev tarafından yönetilmez. Bunlar için 90 gün/30 gün/yıl gibi otomatik silme iddiasında bulunmayın.

## 1. SQL

Önce mevcut özel belge inceleme (008) ve hesap silme (016) kurulumlarının uygulanmış olması gerekir. Supabase → SQL Editor'da [RETENTION_UPGRADE.sql](RETENTION_UPGRADE.sql) dosyasının tamamını çalıştırın. Migration karşılığı `202610290022_evidence_retention.sql` dosyasıdır; ikisini ayrıca ayrı ayrı çalıştırmanız gerekmez.

İş kuyruğu ve dosya kapsamı yalnızca `service_role` fonksiyonlarına açıktır. İstemcilere anahtar veya kuyruk izni vermeyin.

## 2. Edge Function ve zamanlayıcı anahtarı

Supabase CLI ile kendi makinenizde, projenin kökünde çalıştırın. Hesabınızla CLI oturumu açmış olmanız gerekir. Aşağıdaki anahtar çıktısını sohbete veya GitHub'a yapıştırmayın.

```bash
supabase login
supabase link --project-ref ebnkdgvngufxarkwiyxt
umask 077
python3 - <<'PY'
import secrets
from pathlib import Path
Path('/tmp/vizesel-retention.env').write_text('RETENTION_CRON_SECRET=' + secrets.token_hex(32) + '\n')
PY
supabase secrets set --env-file /tmp/vizesel-retention.env --project-ref ebnkdgvngufxarkwiyxt
supabase functions deploy retention-cleanup --no-verify-jwt --project-ref ebnkdgvngufxarkwiyxt
```

Dashboard üzerinden de `retention-cleanup` adıyla `supabase/functions/retention-cleanup/index.ts` girişini ve `_shared/retention-cleanup.ts` bağımlılığını yayımlayabilirsiniz. İşlev secret'ı `RETENTION_CRON_SECRET` en az 32 karakterlik rastgele bir değer olmalıdır. Yerleşik `SUPABASE_SERVICE_ROLE_KEY` yalnızca Edge ortamında kullanılır. Tarayıcıya, mobil uygulamaya veya `EXPO_PUBLIC_*` değişkenine konmaz.

JWT doğrulaması bu işlev için kapalıdır; bunun yerine her istekte ayrı `x-retention-token` kontrol edilir. Secret yoksa işlev hiçbir silme işlemi yapmaz. İstemci kullanıcılarının oturum tokenları bu işlevi çalıştıramaz.

## 3. Vault ve saatlik Cron

Supabase panelinde **Integrations → Cron** ve **Vault** erişimini etkinleştirin. Cron/pg_net ve Vault'un proje üzerinde kullanılabilir olduğunu doğrulayın. Bu servisler Supabase'in mevcut plan/kota koşullarına tabidir; ayrı ücretli veritabanına geçiş şartı varsayılmaz.

Aşağıdaki SQL yalnızca **zamanlayıcı kurulumu** içindir, uygulama migration'ına eklenmemiştir. `BURAYA_AYNI_GIZLI_DEGER` kısmına ikinci adımda ürettiğiniz `.env` dosyasındaki `=` işaretinden sonraki değeri kendi panelinizde yazın. Buraya `service_role` anahtarı yazmayın.

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select vault.create_secret(
 'https://ebnkdgvngufxarkwiyxt.supabase.co/functions/v1/retention-cleanup',
 'vizesel_retention_url'
) where not exists(select 1 from vault.secrets where name='vizesel_retention_url');

select vault.create_secret(
 'BURAYA_AYNI_GIZLI_DEGER',
 'vizesel_retention_token'
) where not exists(select 1 from vault.secrets where name='vizesel_retention_token');

-- Yeniden kurulumda aynı isimli ikinci zamanlayıcı oluşturmayın.
do $$ declare old_job record; begin
 for old_job in select jobid from cron.job where jobname='vizesel-evidence-retention-hourly' loop
  perform cron.unschedule(old_job.jobid);
 end loop;
end $$;

select cron.schedule(
 'vizesel-evidence-retention-hourly',
 '17 * * * *',
 $job$
 select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name='vizesel_retention_url'),
  headers := jsonb_build_object(
   'Content-Type','application/json',
   'x-retention-token',(select decrypted_secret from vault.decrypted_secrets where name='vizesel_retention_token')
  ),
  body := '{}'::jsonb,
  timeout_milliseconds := 100000
 );
 $job$
);
```

Vault eklentisi veya `vault.create_secret` bulunmuyorsa panelden Vault'u etkinleştirmeden devam etmeyin. Önceden oluşturulmuş secret'ı değiştirirken Vault'ta ve Edge secrets'ta **aynı değeri** güncelleyin; yukarıdaki `where not exists` mevcut değeri değiştirmez.

## 4. Gerçek çalışma kontrolü

SQL Editor'da ilk çağrıyı başlatın (tam URL ve secret SQL çıktısında gösterilmez):

```sql
select net.http_post(
 url := (select decrypted_secret from vault.decrypted_secrets where name='vizesel_retention_url'),
 headers := jsonb_build_object(
  'Content-Type','application/json',
  'x-retention-token',(select decrypted_secret from vault.decrypted_secrets where name='vizesel_retention_token')
 ),
 body := '{}'::jsonb,
 timeout_milliseconds := 100000
);
```

İstek asenkrondur. Edge Function panelinde HTTP **200** ve `completed` yanıtını doğrulayın. İçeriğe veya gerçek özel belgelere bakmanız gerekmez. Ardından:

```sql
select * from public.retention_policy_status();
select jobname, schedule, active from cron.job
 where jobname='vizesel-evidence-retention-hourly';
select count(*) as queued_files, min(created_at) as oldest_job
 from public.evidence_cleanup_jobs;
```

`retention_policy_status()` kamuya yalnızca `active`, `last_success_at`, `reviewed_days=30`, `pending_days=90` döndürür; kişi, belge veya kuyruk bilgisi döndürmez. `active`, son 36 saatte başarılı bir çalışmaya ve 24 saatten eski silme birikimi olmamasına bağlı **sağlık göstergesidir**; tek başına Cron kurulduğunun veya tüm sağlayıcı yedeklerinin temizlendiğinin kanıtı değildir. Cron'un aktif olduğunu da ayrıca kontrol edin. Başarılı saatlik çağrılar sürmeden politikada “otomatik silinir” vaadini etkinleştirmeyin.

İlk doğrulama için gerçek kullanıcı dosyalarının tarihini geriye çekmeyin. Gerekirse ayrı test projesinde, sentetik bir dosya ile süre ve fiziksel silme akışını deneyin.

## Hata ve güvenlik davranışı

- Dosya önce Storage API üzerinden fiziksel olarak silinir. SQL daha sonra Storage kaydının gerçekten kalktığını ve işin geçerli lease tokenını doğrulamadan belge metadata'sını silmez. SQL ile `storage.objects` silmek fiziksel dosya silmenin yerine geçmez.
- Storage/metadata hatalarında iş bir saat sonra yeniden denenir. Çöken çalışanın lease'i 10 dakika sonra başka çalışana açılır.
- Temizlemeye alınmış paylaşımın yeni belge kaydı ve yeniden incelemesi kısa süreli engellenir. Yeni dosya ekleme/inceleme ile silme yarışa girmez. Paylaşımın yayından çekilmesi doğrulamayı mevcut kurallara göre geri alabilir; temizleme işlemi kendisi puan değiştirmez.
- Tamamlanan dosya yolunun yalnızca tek yönlü parmak izi tutulur. Bu kayıt; dosya adı, kullanıcı, paylaşım veya içerik içermez ve gecikmiş bir Storage isteğinin tekrar kullanılan dosya yolunu silmesini engeller. Dosya yolları yeniden kullanılmaz.
- Destek, güvenlik logları ve sağlayıcı yedekleri ayrıca yönetilmelidir. Moderasyon delillerini veya denetim kayıtlarını bu görev kapsamında topluca silmeyin.
- Çok sayıda dosyada görev en fazla 50 işi bir çağrıda işler. Kuyruk büyürse sıklığı veya kapasiteyi izleyin; birikim varken kesin silme süresi taahhüt etmeyin.
- Kurulum sırasında kullanılan geçici secret dosyasını işlem bittikten sonra kendi makinenizden silin. Secret'ı ekrana, GitHub'a veya destek mesajına koymayın.

Resmî zamanlama kaynağı: https://supabase.com/docs/guides/functions/schedule-functions
