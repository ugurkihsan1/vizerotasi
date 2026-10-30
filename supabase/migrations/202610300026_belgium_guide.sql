-- Belgium tourism guide and checklist, reviewed against the consulate's published list.
-- Additive and repeatable: existing administrator edits are retained.
insert into public.countries(id,name,code,flag,is_schengen)
values('belgium','Belçika','BE','🇧🇪',true) on conflict do nothing;
update public.countries set
 summary=case when summary='' then $summary$Belçika’ya kısa süreli turistik Schengen (C) başvuruları içindir. Türkiye’den başvurular VFS Global üzerinden alınır ve İstanbul’daki Belçika Başkonsolosluğu tarafından değerlendirilir. Aile ziyareti, çalışma ve 90 günden uzun kalışlarda amacına uygun ayrı listeyi kullan.$summary$ else summary end,
 source_url=coalesce(source_url,'https://turkiye.diplomatie.belgium.be/en/travel-belgium/visa-belgium'),
 appointment_url=coalesce(appointment_url,'https://turkiye.diplomatie.belgium.be/en/travel-belgium/visa-belgium')
where id='belgium';
insert into public.country_documents(id,country_id,title,body,category,source_url,visa_type,sort_order,requirement,source_name,source_document,source_type,source_scope,source_updated_at,source_checked_at,topic_ids)
select id,country_id,title,body,category,source_url,visa_type,sort_order,requirement,source_name,source_document,source_type,source_scope,source_updated_at,source_checked_at,topic_ids from jsonb_to_recordset($documents$
[
  {
    "id": "f51ce854-3b9f-5858-8bba-41674c2329bd",
    "country_id": "belgium",
    "title": "Pasaport",
    "body": "Pasaportun Schengen’den planlanan ayrılışından sonra en az 3 ay geçerli, son 10 yıl içinde düzenlenmiş ve en az 2 boş sayfalı olmalı. Aslını, kimlik sayfasını ve vize ya da damga bulunan tüm kullanılmış sayfaların kopyalarını sayfa sırasıyla hazırla.",
    "category": "Turistik vize",
    "source_url": "https://visa.vfsglobal.com/one-pager/belgium/turkey/english/pdf/tourism_visa_c.pdf",
    "visa_type": "tourism_c",
    "sort_order": 1,
    "requirement": "required",
    "source_name": "Belçika Başkonsolosluğu – Turistik C vizesi kontrol listesi",
    "source_document": "Konsolosluğun VFS üzerinde yayımlanan turistik vize belge listesi",
    "source_type": "official",
    "source_scope": "Belçika’ya kısa süreli turistik Schengen (C) başvuruları içindir. Türkiye’den başvurular VFS Global üzerinden alınır ve İstanbul’daki Belçika Başkonsolosluğu tarafından değerlendirilir. Aile ziyareti, çalışma ve 90 günden uzun kalışlarda amacına uygun ayrı listeyi kullan.",
    "source_updated_at": null,
    "source_checked_at": "2026-10-30",
    "topic_ids": [
      "passport"
    ]
  },
  {
    "id": "9ea78960-9377-5c3c-b579-dc1d86875f28",
    "country_id": "belgium",
    "title": "Başvuru formu",
    "body": "Visa on Web portalında formu doldur; çıktısını al, tarih at ve imzala. Konsolosluğun kontrol listesine göre belgelerin her birinin A4 fotokopisini de belirtilen sırada dosyala. Formun tamamlanmasının ardından verilen VFS randevu yönlendirmesini izle.",
    "category": "Turistik vize",
    "source_url": "https://visa.vfsglobal.com/one-pager/belgium/turkey/english/pdf/tourism_visa_c.pdf",
    "visa_type": "tourism_c",
    "sort_order": 2,
    "requirement": "required",
    "source_name": "Belçika Başkonsolosluğu – Turistik C vizesi kontrol listesi",
    "source_document": "Konsolosluğun VFS üzerinde yayımlanan turistik vize belge listesi",
    "source_type": "official",
    "source_scope": "Belçika’ya kısa süreli turistik Schengen (C) başvuruları içindir. Türkiye’den başvurular VFS Global üzerinden alınır ve İstanbul’daki Belçika Başkonsolosluğu tarafından değerlendirilir. Aile ziyareti, çalışma ve 90 günden uzun kalışlarda amacına uygun ayrı listeyi kullan.",
    "source_updated_at": null,
    "source_checked_at": "2026-10-30",
    "topic_ids": []
  },
  {
    "id": "263a89c8-2f87-5f7c-8ecb-7d3e8144f9d6",
    "country_id": "belgium",
    "title": "Biyometrik fotoğraf",
    "body": "Forma eklenecek 1 adet güncel renkli fotoğraf hazırla. VFS talimatına göre fotoğraf son 6 ay içinde çekilmiş, 35 × 45 mm ve açık fonlu olmalı; çeneden saçın üstüne mesafe 30–36 mm olmalı. Yüz öne dönük, gözler görünür ve ağız kapalı olmalı.",
    "category": "Turistik vize",
    "source_url": "https://visa.vfsglobal.com/one-pager/belgium/turkey/english/",
    "visa_type": "tourism_c",
    "sort_order": 3,
    "requirement": "required",
    "source_name": "VFS Global – Belçika Türkiye vize bilgileri",
    "source_document": "Yetkili başvuru merkezi; fotoğraf ve başvuru talimatları",
    "source_type": "official",
    "source_scope": "Belçika’ya kısa süreli turistik Schengen (C) başvuruları içindir. Türkiye’den başvurular VFS Global üzerinden alınır ve İstanbul’daki Belçika Başkonsolosluğu tarafından değerlendirilir. Aile ziyareti, çalışma ve 90 günden uzun kalışlarda amacına uygun ayrı listeyi kullan.",
    "source_updated_at": null,
    "source_checked_at": "2026-10-30",
    "topic_ids": []
  },
  {
    "id": "2289370f-802f-5847-af30-31e83095f75b",
    "country_id": "belgium",
    "title": "Seyahat sağlık sigortası",
    "body": "Tüm Schengen ülkelerinde ve seyahat tarihlerinin en az tamamında geçerli, en az 30.000 € teminatlı seyahat sağlık sigortası sun. Acil tıbbi bakım, hastane tedavisi ve sağlık nedenleriyle ülkeye geri dönüş giderlerini kapsamalı.",
    "category": "Turistik vize",
    "source_url": "https://visa.vfsglobal.com/one-pager/belgium/turkey/english/pdf/tourism_visa_c.pdf",
    "visa_type": "tourism_c",
    "sort_order": 4,
    "requirement": "required",
    "source_name": "Belçika Başkonsolosluğu – Turistik C vizesi kontrol listesi",
    "source_document": "Konsolosluğun VFS üzerinde yayımlanan turistik vize belge listesi",
    "source_type": "official",
    "source_scope": "Belçika’ya kısa süreli turistik Schengen (C) başvuruları içindir. Türkiye’den başvurular VFS Global üzerinden alınır ve İstanbul’daki Belçika Başkonsolosluğu tarafından değerlendirilir. Aile ziyareti, çalışma ve 90 günden uzun kalışlarda amacına uygun ayrı listeyi kullan.",
    "source_updated_at": null,
    "source_checked_at": "2026-10-30",
    "topic_ids": []
  },
  {
    "id": "59ba06f0-de5d-5977-9ce3-e4fe100e2545",
    "country_id": "belgium",
    "title": "Ulaşım rezervasyonu ve seyahat planı",
    "body": "Seyahat planını ve rezervasyonlarını ya da organize tur kaydını sun. Uçuş rezervasyonu, diğer ulaşım araçlarına ilişkin kanıt veya seyahat güzergâhı ekle; birden fazla Schengen ülkesi varsa tarihleri ve ülkeler arası yolculukları açıkla.",
    "category": "Turistik vize",
    "source_url": "https://visa.vfsglobal.com/one-pager/belgium/turkey/english/pdf/tourism_visa_c.pdf",
    "visa_type": "tourism_c",
    "sort_order": 5,
    "requirement": "required",
    "source_name": "Belçika Başkonsolosluğu – Turistik C vizesi kontrol listesi",
    "source_document": "Konsolosluğun VFS üzerinde yayımlanan turistik vize belge listesi",
    "source_type": "official",
    "source_scope": "Belçika’ya kısa süreli turistik Schengen (C) başvuruları içindir. Türkiye’den başvurular VFS Global üzerinden alınır ve İstanbul’daki Belçika Başkonsolosluğu tarafından değerlendirilir. Aile ziyareti, çalışma ve 90 günden uzun kalışlarda amacına uygun ayrı listeyi kullan.",
    "source_updated_at": null,
    "source_checked_at": "2026-10-30",
    "topic_ids": []
  },
  {
    "id": "b7d2e6ca-0d3c-5088-bdee-dca80538af40",
    "country_id": "belgium",
    "title": "Konaklama ve davet mektubu",
    "body": "Schengen bölgesindeki kalışının tamamı için otel rezervasyonu, imzalı kira sözleşmesi veya konaklamayı gösteren başka bir belge hazırla. Konaklamayı ev sahibi ya da organizatör sağlıyorsa bunu doğrulayan yazıyı ekle. Aile veya arkadaş ziyareti için turistik liste yerine ilgili ziyaret kategorisini kontrol et.",
    "category": "Turistik vize",
    "source_url": "https://visa.vfsglobal.com/one-pager/belgium/turkey/english/pdf/tourism_visa_c.pdf",
    "visa_type": "tourism_c",
    "sort_order": 6,
    "requirement": "required",
    "source_name": "Belçika Başkonsolosluğu – Turistik C vizesi kontrol listesi",
    "source_document": "Konsolosluğun VFS üzerinde yayımlanan turistik vize belge listesi",
    "source_type": "official",
    "source_scope": "Belçika’ya kısa süreli turistik Schengen (C) başvuruları içindir. Türkiye’den başvurular VFS Global üzerinden alınır ve İstanbul’daki Belçika Başkonsolosluğu tarafından değerlendirilir. Aile ziyareti, çalışma ve 90 günden uzun kalışlarda amacına uygun ayrı listeyi kullan.",
    "source_updated_at": null,
    "source_checked_at": "2026-10-30",
    "topic_ids": [
      "invitation"
    ]
  },
  {
    "id": "f7b577f6-5264-5652-b6a7-ff44e061ad52",
    "country_id": "belgium",
    "title": "Maddi durum ve banka hesap dökümleri",
    "body": "Son 3 aylık hareketleri ve düzenli gelir kaynağını gösteren banka hesap dökümlerini sun. Son 3 aylık maaş bordroları gibi düzenli gelir kanıtlarını, emekliysen ilgili emeklilik belgelerini ekle. Belgelerin seyahat masraflarını nasıl karşılayacağını açıklamalı.",
    "category": "Turistik vize",
    "source_url": "https://visa.vfsglobal.com/one-pager/belgium/turkey/english/pdf/tourism_visa_c.pdf",
    "visa_type": "tourism_c",
    "sort_order": 7,
    "requirement": "required",
    "source_name": "Belçika Başkonsolosluğu – Turistik C vizesi kontrol listesi",
    "source_document": "Konsolosluğun VFS üzerinde yayımlanan turistik vize belge listesi",
    "source_type": "official",
    "source_scope": "Belçika’ya kısa süreli turistik Schengen (C) başvuruları içindir. Türkiye’den başvurular VFS Global üzerinden alınır ve İstanbul’daki Belçika Başkonsolosluğu tarafından değerlendirilir. Aile ziyareti, çalışma ve 90 günden uzun kalışlarda amacına uygun ayrı listeyi kullan.",
    "source_updated_at": null,
    "source_checked_at": "2026-10-30",
    "topic_ids": [
      "finance",
      "sponsor"
    ]
  },
  {
    "id": "5e4bdfb8-0ebb-54c9-9be8-e6bc93dec43e",
    "country_id": "belgium",
    "title": "Çalışan, şirket sahibi, emekli veya çiftçi belgeleri",
    "body": "Çalışansan görevini, işe giriş tarihini, izin süreni ve işveren iletişim bilgilerini içeren yazı ile SGK işe giriş bildirgesi ve okunabilir QR kodlu hizmet dökümü hazırla. Şirket sahibiysen oda/ticaret sicili, vergi ve faaliyet belgelerini; çiftçiysen ziraat odası belgesini; emekliysen emeklilik ve gelir kanıtını ekle. Yalnız durumuna uygun belgeler gerekir.",
    "category": "Turistik vize",
    "source_url": "https://visa.vfsglobal.com/one-pager/belgium/turkey/english/pdf/tourism_visa_c.pdf",
    "visa_type": "tourism_c",
    "sort_order": 8,
    "requirement": "conditional",
    "source_name": "Belçika Başkonsolosluğu – Turistik C vizesi kontrol listesi",
    "source_document": "Konsolosluğun VFS üzerinde yayımlanan turistik vize belge listesi",
    "source_type": "official",
    "source_scope": "Belçika’ya kısa süreli turistik Schengen (C) başvuruları içindir. Türkiye’den başvurular VFS Global üzerinden alınır ve İstanbul’daki Belçika Başkonsolosluğu tarafından değerlendirilir. Aile ziyareti, çalışma ve 90 günden uzun kalışlarda amacına uygun ayrı listeyi kullan.",
    "source_updated_at": null,
    "source_checked_at": "2026-10-30",
    "topic_ids": [
      "employment"
    ]
  },
  {
    "id": "3d03d7de-0965-5ba5-95ed-a430d6c1b64f",
    "country_id": "belgium",
    "title": "Öğrenci belgesi",
    "body": "Öğrenciysen okul veya üniversite kayıt ve tatil/izin durumunu gösteren belge sun. Türkiye’de yükseköğretim öğrencileri için YÖK’ün düzenlediği okunabilir QR kodlu öğrenci belgesi, diğer öğrenciler için okul belgesi konsolosluğun listesinde yer alır.",
    "category": "Turistik vize",
    "source_url": "https://visa.vfsglobal.com/one-pager/belgium/turkey/english/pdf/tourism_visa_c.pdf",
    "visa_type": "tourism_c",
    "sort_order": 9,
    "requirement": "conditional",
    "source_name": "Belçika Başkonsolosluğu – Turistik C vizesi kontrol listesi",
    "source_document": "Konsolosluğun VFS üzerinde yayımlanan turistik vize belge listesi",
    "source_type": "official",
    "source_scope": "Belçika’ya kısa süreli turistik Schengen (C) başvuruları içindir. Türkiye’den başvurular VFS Global üzerinden alınır ve İstanbul’daki Belçika Başkonsolosluğu tarafından değerlendirilir. Aile ziyareti, çalışma ve 90 günden uzun kalışlarda amacına uygun ayrı listeyi kullan.",
    "source_updated_at": null,
    "source_checked_at": "2026-10-30",
    "topic_ids": [
      "student"
    ]
  },
  {
    "id": "c65dbd42-95ae-515a-adb8-4fb678c87b38",
    "country_id": "belgium",
    "title": "Kimlik ve tam tekmil vukuatlı nüfus kayıt örneği",
    "body": "Kimlik kartının kopyasını ve Türkiye’den başvurularda tam tekmil vukuatlı nüfus kayıt örneğini hazırla. Aile bağlarını ve Türkiye’ye dönüşünü destekleyen belgeleri durumuna uygun biçimde dosyaya ekle; her belge için kontrol listesindeki kopya ve sıralama talimatını izle.",
    "category": "Turistik vize",
    "source_url": "https://visa.vfsglobal.com/one-pager/belgium/turkey/english/pdf/tourism_visa_c.pdf",
    "visa_type": "tourism_c",
    "sort_order": 10,
    "requirement": "required",
    "source_name": "Belçika Başkonsolosluğu – Turistik C vizesi kontrol listesi",
    "source_document": "Konsolosluğun VFS üzerinde yayımlanan turistik vize belge listesi",
    "source_type": "official",
    "source_scope": "Belçika’ya kısa süreli turistik Schengen (C) başvuruları içindir. Türkiye’den başvurular VFS Global üzerinden alınır ve İstanbul’daki Belçika Başkonsolosluğu tarafından değerlendirilir. Aile ziyareti, çalışma ve 90 günden uzun kalışlarda amacına uygun ayrı listeyi kullan.",
    "source_updated_at": null,
    "source_checked_at": "2026-10-30",
    "topic_ids": []
  },
  {
    "id": "85235384-063b-5e73-9d5f-baafd3171704",
    "country_id": "belgium",
    "title": "Sponsor ve masraf karşılama belgeleri",
    "body": "Belçika’daki bir garantör masraflarını üstlenecekse belediyeden alınan resmî Annex 3bis taahhütnamesinin aslını, garantörün maaş bordrosu/vergi beyanı veya başka gelir kanıtlarını ve kimlik ya da oturum belgesi kopyasını sun. Konaklama yazısı tek başına bu mali garanti belgelerinin yerine geçmez.",
    "category": "Turistik vize",
    "source_url": "https://visa.vfsglobal.com/one-pager/belgium/turkey/english/pdf/tourism_visa_c.pdf",
    "visa_type": "tourism_c",
    "sort_order": 11,
    "requirement": "conditional",
    "source_name": "Belçika Başkonsolosluğu – Turistik C vizesi kontrol listesi",
    "source_document": "Konsolosluğun VFS üzerinde yayımlanan turistik vize belge listesi",
    "source_type": "official",
    "source_scope": "Belçika’ya kısa süreli turistik Schengen (C) başvuruları içindir. Türkiye’den başvurular VFS Global üzerinden alınır ve İstanbul’daki Belçika Başkonsolosluğu tarafından değerlendirilir. Aile ziyareti, çalışma ve 90 günden uzun kalışlarda amacına uygun ayrı listeyi kullan.",
    "source_updated_at": null,
    "source_checked_at": "2026-10-30",
    "topic_ids": [
      "sponsor"
    ]
  },
  {
    "id": "b0c46695-1d30-5888-bb3f-4a07e7dbee2d",
    "country_id": "belgium",
    "title": "18 yaş altı başvuruları",
    "body": "18 yaşından küçük kişi yalnız, tek ebeveynle veya yalnız yasal vasiyle seyahat ediyorsa seyahat etmeyen ebeveyn/vasinin noter onaylı yazılı iznini sun. Tek velayet söz konusuysa bunu gösteren noter onaylı belgeyi hazırla. Durumuna uyan istisna ve belge koşullarını başvuru merkezinden kontrol et.",
    "category": "Turistik vize",
    "source_url": "https://visa.vfsglobal.com/one-pager/belgium/turkey/english/pdf/tourism_visa_c.pdf",
    "visa_type": "tourism_c",
    "sort_order": 12,
    "requirement": "conditional",
    "source_name": "Belçika Başkonsolosluğu – Turistik C vizesi kontrol listesi",
    "source_document": "Konsolosluğun VFS üzerinde yayımlanan turistik vize belge listesi",
    "source_type": "official",
    "source_scope": "Belçika’ya kısa süreli turistik Schengen (C) başvuruları içindir. Türkiye’den başvurular VFS Global üzerinden alınır ve İstanbul’daki Belçika Başkonsolosluğu tarafından değerlendirilir. Aile ziyareti, çalışma ve 90 günden uzun kalışlarda amacına uygun ayrı listeyi kullan.",
    "source_updated_at": null,
    "source_checked_at": "2026-10-30",
    "topic_ids": []
  },
  {
    "id": "a43cf17c-d48c-5348-b077-2251e2c435ff",
    "country_id": "belgium",
    "title": "Türkiye’de yasal ikamet belgesi",
    "body": "Türkiye’de yaşayan üçüncü ülke vatandaşıysan, Schengen ülkelerinden planlanan ayrılışından en az 3 ay sonrasına kadar geçerli Türkiye ikamet belgeni hazırla. Başvuru yetkisini ve vatandaşlığına bağlı diğer koşulları temsilciliğin resmî yönlendirmesinden kontrol et.",
    "category": "Turistik vize",
    "source_url": "https://visa.vfsglobal.com/one-pager/belgium/turkey/english/pdf/tourism_visa_c.pdf",
    "visa_type": "tourism_c",
    "sort_order": 13,
    "requirement": "conditional",
    "source_name": "Belçika Başkonsolosluğu – Turistik C vizesi kontrol listesi",
    "source_document": "Konsolosluğun VFS üzerinde yayımlanan turistik vize belge listesi",
    "source_type": "official",
    "source_scope": "Belçika’ya kısa süreli turistik Schengen (C) başvuruları içindir. Türkiye’den başvurular VFS Global üzerinden alınır ve İstanbul’daki Belçika Başkonsolosluğu tarafından değerlendirilir. Aile ziyareti, çalışma ve 90 günden uzun kalışlarda amacına uygun ayrı listeyi kullan.",
    "source_updated_at": null,
    "source_checked_at": "2026-10-30",
    "topic_ids": []
  }
]
$documents$::jsonb) as d(id uuid,country_id text,title text,body text,category text,source_url text,visa_type text,sort_order integer,requirement text,source_name text,source_document text,source_type text,source_scope text,source_updated_at date,source_checked_at date,topic_ids text[])
on conflict(id) do nothing;
