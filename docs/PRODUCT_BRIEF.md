# PROJECT: Türkiye'den Schengen Başvuruları İçin Sosyal Mobil Uygulama

Türkiye'den Schengen vizesine başvuran kişiler için production-ready bir mobil uygulama geliştir.

Bu uygulama bir blog, haber sitesi, makale arşivi veya klasik forum görünümünde OLMAMALI.

EN ÖNEMLİ TASARIM PRENSİBİ:

Kullanıcı uygulamada gazete/makale okur gibi değil;

- Instagram'da keşfeder gibi,
- Facebook feed'inde dolaşır gibi,
- Reddit'te deneyim ve yorum okur gibi,
- sosyal medyada içeriklere dokunup etkileşime girer gibi

hareket etmeli.

Uygulamanın ana deneyimi:

**scroll → keşfet → dokun → yorum oku → filtrele → kaydet → soru sor → deneyim paylaş**

olmalı.

Uzun blog yazıları, büyük metin blokları ve haber sitesi görünümü ana deneyimi kesinlikle domine etmemeli.

---

# 1. TEKNOLOJİ

Yeni bir proje oluşturuluyorsa:

- Expo
- React Native
- TypeScript
- Expo Router
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Realtime yalnızca gerçekten gerekli yerlerde
- Supabase Edge Functions gerektiğinde
- React Query / TanStack Query
- Zod
- React Hook Form

kullan.

UI tarafında mümkün olduğunca native hissi koru.

Uygulama hem iOS hem Android üzerinde düzgün çalışmalı.

Eğer mevcut repository farklı ama uygun bir mobil stack kullanıyorsa mevcut mimariyi gereksiz yere değiştirme.

Ancak yeni proje ise Expo + React Native + TypeScript tercih et.

Kod:

- modüler,
- okunabilir,
- component tabanlı,
- type-safe,
- production'a uygun

olsun.

Mock uygulama yapma.

Önemli fonksiyonlar gerçekten Supabase'e bağlı çalışsın.

---

# 2. UYGULAMANIN TEMEL FİKRİ

Uygulama, Türkiye'den Schengen başvurusu yapan insanların:

- gerçek deneyimlerini paylaşabildiği,
- başkalarının deneyimlerini görebildiği,
- ülke bazlı kritik noktaları öğrenebildiği,
- soru sorabildiği,
- yorum yapabildiği,
- ülke takip edebildiği,
- içerikleri kaydedebildiği,
- faydalı içeriklere tepki verebildiği,
- kendi başvurusuna benzeyen başvuruları filtreleyebildiği

sosyal bir topluluk uygulaması olmalı.

Resmî konsolosluk uygulaması gibi görünmemeli.

Ama güven vermeli.

---

# 3. KESİNLİKLE BLOG GİBİ GÖRÜNMEYECEK

Aşağıdakilerden KAÇIN:

- klasik blog ana sayfası
- makale grid'i
- büyük hero banner
- “son yazılar”
- uzun kart başlıkları
- uzun açıklama paragrafları
- kategori → makale → başka makale yapısı
- haber sitesi görünümü
- Wikipedia benzeri bilgi sayfaları
- dev metin blokları
- sürekli “devamını oku” butonları
- WordPress hissi
- kurumsal landing page hissi

Ana ekran hiçbir şekilde:

“Estonya Vizesi Hakkında Bilmeniz Gereken 10 Şey”

tarzı makalelerden oluşmamalı.

Bunun yerine:

“İlk Schengen'im Estonya'dan geldi”

“İstanbul'dan başvurdum · 7 günde sonuçlandı”

“⚠️ Estonya başvurusunda bu belgeyi unutma”

“Fransa için banka bakiyesi konusunda ne yaptınız?”

gibi yaşayan topluluk içerikleri bulunmalı.

---

# 4. TASARIM DİLİ

Modern ve mobil native hisli tasarım oluştur.

Görsel dil:

- temiz
- enerjik
- güvenilir
- sosyal
- hızlı
- premium ama samimi

olsun.

Ana renklerde:

- koyu lacivert
- beyaz / kırık beyaz
- canlı mavi
- gerektiğinde başarı için yeşil
- uyarılar için amber/turuncu
- ret sonucu için kontrollü kırmızı

kullan.

Bayraklar kullanılabilir fakat tasarımı bayraklarla doldurma.

Bol miktarda:

- avatar
- küçük badge
- pill/chip
- ikon
- reaction
- bottom sheet
- horizontal carousel
- küçük durum etiketleri
- interaktif kart

kullan.

Minimum border.

Yumuşak gölgeler.

Yuvarlak köşeler.

Mobil dokunma alanları rahat olsun.

---

# 5. BOTTOM NAVIGATION

Ana bottom navigation:

### 1. Akış

Home icon.

Ana sosyal feed.

### 2. Keşfet

Search/discover icon.

Ülke, deneyim, soru, kritik nokta keşfi.

### 3. +

Ortada belirgin create action.

Floating / emphasized button.

Dokununca bottom sheet aç:

“Ne paylaşmak istiyorsun?”

- Vize deneyimi paylaş
- Soru sor
- Kritik bilgi paylaş

### 4. Bildirimler

Notification icon.

Unread badge göster.

### 5. Profil

Avatar veya profile icon.

---

# 6. ANA SAYFA — “AKIŞ”

Uygulamanın en önemli ekranıdır.

Instagram/Facebook feed mantığında çalışmalı.

Üst header:

logo

yanında küçük:

“Schengen”

ve sağda:

search
notification/avatar gerekirse

Header büyük yer kaplamasın.

---

# 7. COUNTRY STORIES

Feed'in en üstünde horizontal scroll alanı oluştur.

Instagram Stories mantığına benzesin fakat birebir kopyalama.

Başlık:

“Ülkeler”

Yuvarlak veya rounded country items:

🇩🇪 Almanya
🇪🇪 Estonya
🇵🇱 Polonya
🇫🇷 Fransa
🇪🇸 İspanya
🇮🇹 İtalya
🇬🇷 Yunanistan
🇭🇺 Macaristan
🇳🇱 Hollanda

Takip edilen ülkeler öncelikli gösterilebilir.

Yeni önemli bilgi bulunan ülkede küçük indicator göster.

Bir ülkeye dokunulduğunda klasik bilgi sitesi açma.

O ülkenin yaşayan sosyal akışına geç.

---

# 8. FEED FILTER CHIPS

Country stories altında horizontal chips:

“Sana Özel”
“Yeni”
“Deneyimler”
“Sorular”
“Kritik”
“Onaylananlar”
“Retler”

Selected chip görsel olarak belirgin olsun.

Chip değişince feed dinamik değişsin.

---

# 9. FEED İÇERİK TİPLERİ

Feed tek tip kartlardan oluşmamalı.

Farklı içerik tipleri görsel olarak birbirinden ayrılmalı.

Feed aşağıdaki içerikleri karıştırabilir:

1. VisaExperienceCard
2. QuestionCard
3. CriticalTipCard
4. PollCard
5. CountryUpdateCard
6. CommunityHighlightCard

Feed monoton görünmemeli.

Ancak tasarım dili tutarlı olmalı.

---

# 10. VISA EXPERIENCE CARD

Uygulamanın en önemli içerik tipi.

Örnek:

--------------------------------

🇪🇪 ESTONYA

👤 mertkaya · Güvenilir Üye
İstanbul · İlk Schengen

✅ ONAYLANDI

7 günde sonuçlandı

Çalışan
Turistik
Kendisi finanse etti

İstenen: 5 gün
Verilen: 12 gün · Tek giriş

“İlk Schengen başvurumdu. Banka hesabında özellikle son 3 aylık hareketlere dikkat ettim...”

♡ 42 Faydalı

💬 18 yorum

🔖 Kaydet

--------------------------------

Kart üzerindeki kritik bilgiler ilk bakışta anlaşılmalı.

Kullanıcının metnini 3-5 satır preview göster.

Uzun metni feed'de tamamen açma.

Ancak “makaleyi oku” deme.

Daha sosyal bir aksiyon kullan:

“Deneyimin tamamını gör →”

veya karta dokunma.

Kartın herhangi uygun alanına dokunulduğunda Experience Detail açılabilir.

---

# 11. QUESTION CARD

Örnek:

🇫🇷 Fransa

SORU

“Banka hesabına başvurudan 2 hafta önce yüksek miktarda para gelmesi problem olur mu?”

👤 selin34 · Aktif Üye

💬 23 yanıt

👍 17 faydalı

“Sen ne düşünüyorsun?”

Buton:

“Yanıtla”

Kart soru-cevap hissi vermeli.

Blog gibi görünmemeli.

---

# 12. CRITICAL TIP CARD

Bu içerik görsel olarak daha dikkat çekici olsun.

Örnek:

⚡ KRİTİK NOKTA

🇪🇪 Estonya

“Banka dökümündeki yalnızca son bakiye değil, son aylardaki hesap hareketleri de değerlendirmede önemli olabilir.”

Altında:

Editör Notu

veya

Topluluk Tarafından Doğrulandı

Son kontrol:
14 Eylül 2026

Butonlar:

👍 Faydalı

🔖 Kaydet

💬 Tartış

Bu kartlar feed içinde farklı renkte veya border/accent ile dikkat çekebilir.

Ama reklam banner'ı gibi görünmemeli.

---

# 13. COUNTRY UPDATE CARD

Örnek:

🇩🇪 Almanya

YENİ GÜNCELLEME

“Almanya öğrenci başvuruları için belge listesinde güncelleme var.”

Kaynak etiketi:

Resmî Kaynak

“Detayı gör”

Ancak tam ekran açıldığında bile uzun blog makalesi tasarımı kullanma.

Bilgiyi:

- kısa bloklar
- checklist
- cards
- önemli notlar

şeklinde göster.

---

# 14. ÜLKE SAYFASI

Örnek route:

/country/estonia

Ülke ekranı sosyal profil sayfasına benzesin.

Üst alan:

🇪🇪

Estonya

“Takip Et”

42 deneyim
18 aktif soru
6 kritik bilgi

Horizontal navigation:

Akış
Deneyimler
Sorular
Kritik
Belgeler

“Akış” default olsun.

Burada o ülkeye ait:

- deneyimler
- sorular
- kritik bilgiler
- güncellemeler

karışık sosyal feed olarak gösterilsin.

---

# 15. COUNTRY QUICK INFO

Ülke ekranında üst kısımda birkaç küçük interactive info card göster:

Örneğin:

⏱ Topluluğa göre
8 gün

📊 42 deneyim

📍 En çok
İstanbul

🔥 Son 7 gün
12 yeni paylaşım

Bunların altından feed devam etsin.

Bu ekran kesinlikle Wikipedia / blog sayfasına dönüşmesin.

---

# 16. “BELGELER” ALANI

Belgeler bölümü klasik uzun liste olmasın.

Checklist UX kullan.

Örnek:

### Temel Belgeler

☑ Pasaport

☑ Başvuru formu

☑ Seyahat sağlık sigortası

☑ Uçuş rezervasyonu

☑ Konaklama belgesi

### Finansal Belgeler

☑ Banka hesap dökümü

ⓘ Kritik detay

☑ Maaş bordrosu

Her belgeye dokunulduğunda bottom sheet veya detay card aç.

Örneğin:

BANKA HESAP DÖKÜMÜ

Toplulukta sık konuşulanlar:

• Son 3 aylık hareketlerin görünmesi
• Ani para girişlerinin açıklanabilmesi
• Hesap bakiyesi ile seyahat planının uyumu

[Bu belge hakkındaki deneyimleri gör]

[Bu belge hakkında soru sor]

Böylece bilgi sosyal içeriğe bağlanmalı.

---

# 17. KEŞFET EKRANI

Keşfet ekranı güçlü olmalı.

Üst:

Search field

Placeholder:

“Ülke, belge, deneyim veya soru ara”

Altında trending search chips:

“İlk Schengen”
“Banka hesabı”
“Ret”
“Öğrenci”
“Davet mektubu”
“İstanbul”
“VFS”
“iDATA”

Sonra:

### Gündemde

Popüler sorular.

### Son Deneyimler

Horizontal experience cards.

### En Aktif Ülkeler

Country cards.

### Kritik Noktalar

Horizontal veya vertical interactive cards.

Bu ekran Pinterest/Instagram Explore benzeri bir keşif hissi verebilir.

Ancak düzensiz ve karmaşık masonry layout yapmak zorunda değilsin.

---

# 18. ARAMA

Global search:

- ülkeler
- kullanıcılar
- deneyimler
- sorular
- kritik noktalar
- belge başlıkları

üzerinde çalışmalı.

Sonuç ekranı filter tabs:

Tümü
Deneyimler
Sorular
Ülkeler
Kritik

Recent searches göster.

Arama geçmişini kullanıcı isterse temizleyebilsin.

---

# 19. DENEYİM PAYLAŞMA

Central + butonuna basıldığında:

Bottom sheet:

“Ne paylaşmak istiyorsun?”

### Vize deneyimi

### Soru

### Kritik bilgi

“Vize deneyimi” seçilirse mümkün olduğunca kolay, adım adım form kullan.

Dev tek form kullanma.

Progress göstergesi:

1 / 4

---

# 20. EXPERIENCE FORM

### ADIM 1 — Başvuru

Ülke

Başvuru şehri

Başvuru merkezi

Vize türü

Seyahat amacı

---

### ADIM 2 — Senin durumun

İlk Schengen mi?

Çalışma durumu:

Çalışan
Öğrenci
Serbest çalışan
Şirket sahibi
İşsiz
Emekli
Diğer

Finansman:

Kendim
Sponsor
Karışık

Davetiye:

Var
Yok

---

### ADIM 3 — Sonuç

Başvuru tarihi

Randevu tarihi

Pasaport teslim tarihi

Sonuç tarihi

Sonuç:

✅ Onaylandı

❌ Reddedildi

⏳ Bekliyorum

İstenen seyahat süresi

Verilen vize süresi

Giriş sayısı:

Tek
Çift
Multi

---

### ADIM 4 — Deneyimini anlat

Prompt:

“Başvuru sürecinde neler yaşadın?”

İkinci alan:

“Başvuracak birine özellikle ne söylersin?”

Character counter göster.

Üstünde privacy warning:

“Pasaport numarası, T.C. kimlik numarası, açık adres, telefon, banka hesap numarası veya başka hassas kişisel bilgilerini paylaşma.”

Submit:

“Deneyimi gönder”

Gönderilince:

animated success state

“Deneyimin incelemeye gönderildi 🎉”

“Onaylandığında toplulukta yayınlanacak ve +8 katkı puanı kazanacaksın.”

---

# 21. EXPERIENCE DETAIL

Detay ekranı sosyal post detail gibi görünmeli.

Üstte:

back
country
more menu

Sonra kullanıcı:

avatar
username
badge
follow gerekirse

Ana sonuç kartı:

✅ ONAYLANDI

🇪🇪 Estonya

7 günde sonuçlandı

Sonra compact information chips:

İlk Schengen

Çalışan

Kendisi finanse etti

İstanbul

Turistik

Ardından:

### Süreç

timeline:

Randevu
↓
Başvuru
↓
Karar
↓
Pasaport

Ardından kullanıcının deneyim metni.

Metni okunabilir göster ancak blog layout kullanma.

Sonra action bar:

Faydalı
Yorum
Kaydet
Paylaş

Ardından yorumlar.

---

# 22. YORUMLAR

Comments ekranın doğal parçası olsun.

Instagram/Reddit benzeri hızlı interaction.

Her comment:

avatar

username

membership badge

text

time

Faydalı

Yanıtla

Bildir

Replies hafif indentation ile gösterilebilir.

İlk versiyonda maksimum 2 nesting level tercih et.

Comment input ekran altında sticky olabilir:

“Bir şey söyle…”

Yeni yorumlar moderation'dan geçsin.

Kullanıcı kendi pending yorumunu:

“Onay bekliyor”

etiketiyle görebilsin.

---

# 23. SORU SOR

Soru oluşturmak hızlı olmalı.

Alanlar:

Ülke

Kategori

Başlık

Detay

Kategori:

Belgeler
Randevu
Finansal Durum
Davet Mektubu
Öğrenci
Çalışan
Sponsor
Ret
Pasaport
Diğer

Submit:

“Soruyu gönder”

---

# 24. CRITICAL INFORMATION SYSTEM

“Kritik bilgi” uygulamanın önemli farklılaştırıcılarından biri.

Ancak “gizli konsolosluk bilgisi” gibi göstermeyin.

Content source types:

### Resmî Kaynak

### Editör Notu

### Topluluk Tarafından Doğrulandı

Etiket olarak kullanılmalı.

Kullanıcı gönderirse direkt yayınlanmasın.

Moderation şart.

Admin/moderator kritik bilgi haline getirebilsin.

---

# 25. PROFİL

Profil sosyal medya profili gibi görünmeli.

Avatar

Display name

@username

Membership badge

Katkı puanı

Join date

Stats:

23 katkı
148 faydalı
3 ülke

Badge carousel:

🏅 İlk Deneyim

🔥 10 Onaylı Yorum

🇪🇪 Estonya Katkıcısı

Tab navigation:

Paylaşımlar
Deneyimler
Yorumlar
Kaydedilenler

---

# 26. ÜYELİK SİSTEMİ

Authentication:

Register

Login

Forgot password

Reset password

Email verification.

Architecture later supports:

Apple Sign In
Google Sign In

Registration:

display name

username

email

password

terms checkbox

privacy checkbox

Username unique olmalı.

Email asla public profile'da gösterilmemeli.

---

# 27. REPUTATION / KATKI PUANI

Puan sistemi backend kontrollü olsun.

Kullanıcı browser/app request manipulation ile puan değiştirememeli.

Initial rules:

Approved comment:
+2

Approved question/thread:
+5

Approved detailed visa experience:
+8

Admin exceptional contribution:
custom bonus

Spam / malicious misinformation:
admin controlled deduction

Rejected normal content automatically eksi puan vermesin.

---

# 28. MEMBERSHIP LEVELS

0–19

Yeni Üye

20–59

Aktif Üye

60–149

Katkıcı

150–399

Güvenilir Üye

400+

Topluluk Uzmanı

Membership level reputation'dan server-side/database-side hesaplanmalı.

Frontend level belirleyememeli.

---

# 29. BADGES

Badge sistemi level'dan ayrı olsun.

Başlangıç badge'leri:

İlk Deneyim

10 Onaylı Yorum

50 Onaylı Yorum

100 Onaylı Yorum

Estonya Katkıcısı

Almanya Katkıcısı

Fransa Katkıcısı

Topluluk Uzmanı

Database-driven olsun.

Sonradan admin yeni badge ekleyebilsin.

---

# 30. FAYDALI REACTION

Like yerine ana reaction:

“Faydalı”

kullan.

Icon:

thumb / heart benzeri sade ikon.

User:

bir içeriği yalnız bir kez faydalı işaretleyebilir.

Kendi içeriğine faydalı veremez.

Tekrar basınca kaldırabilir.

Helpful count content ranking'de kullanılabilir.

Ancak helpful vote doğrudan sınırsız reputation üretmesin.

---

# 31. SAVE

Kullanıcı:

deneyim

soru

kritik bilgi

belge detayı

kaydedebilsin.

Bookmark interaction anında response versin.

Profile → Kaydedilenler altında göster.

---

# 32. FOLLOW

Kullanıcı ülke takip edebilsin.

Örnek:

🇪🇪 Estonya

“Takip Ediliyor”

Takip edilen ülkeler:

- ana feed sıralamasında ağırlık kazanabilir
- önemli güncellemelerde notification üretebilir

İlk versiyonda kullanıcı takibi zorunlu değil.

Architecture ileride user-to-user follow destekleyebilir.

---

# 33. BİLDİRİMLER

Notifications screen.

Types:

Deneyimin onaylandı

Sorun onaylandı

Yorumun onaylandı

Birisi soruna yanıt verdi

Birisi yorumuna yanıt verdi

Takip ettiğin ülkede kritik güncelleme var

Moderasyon revizyon istedi

Badge kazandın

Membership level yükseldi

Notification card:

icon
short message
time
unread indicator

Unread badge bottom navigation üzerinde göster.

---

# 34. MODERATION

Her yeni:

question

comment

experience

user-submitted critical tip

ilk olarak:

pending

status ile oluşsun.

Statuses:

pending

approved

rejected

needs_revision

User kendi profilinde status görebilsin.

---

# 35. MOBILE MODERATOR PANEL

Moderator/admin rolündeki kullanıcılar için normal kullanıcılara görünmeyen:

Moderasyon

screen oluştur.

Ana moderation queue:

Bekleyenler

Tabs:

Deneyimler
Sorular
Yorumlar
Kritik

Card swipe veya butonlar:

Onayla

Revizyon

Reddet

Detay

Yanlışlıkla swipe ile direkt karar vermek zorunda değil.

Önemli moderasyon aksiyonlarında confirmation göster.

---

# 36. MODERATION APPROVAL

İçerik approve edildiğinde transaction-safe / trusted logic kullan.

Örneğin experience approve:

status = approved

approved_by = moderator

approved_at = now

reputation event = +8

notification create

Bu operasyon tekrar çalıştırıldığında reputation ikinci kez verilmemeli.

Idempotent olmalı.

Unique reference:

experience_approval:{experience_id}

question_approval:{thread_id}

comment_approval:{comment_id}

---

# 37. ROLES

Roles:

user

moderator

admin

Frontend'de role saklamak yeterli DEĞİL.

Supabase RLS/backend authorization uygula.

User:

kendi içeriğini oluşturur.

Moderator:

content moderate eder.

Admin:

role dahil yönetim işlemleri yapabilir.

Normal user network request değiştirerek kendisini admin yapamamalı.

---

# 38. İLK ÜLKELER

Database seed:

Germany
Almanya
DE

Estonia
Estonya
EE

Poland
Polonya
PL

France
Fransa
FR

Spain
İspanya
ES

Italy
İtalya
IT

Greece
Yunanistan
GR

Hungary
Macaristan
HU

Netherlands
Hollanda
NL

Ülkeleri frontend içine hardcode etme.

Database-driven oluştur.

Admin sonradan ülke ekleyebilmeli.

---

# 39. DATABASE MODEL

En az aşağıdaki tabloları oluştur:

profiles

countries

forum_categories

threads

comments

visa_experiences

critical_tips

helpful_votes

saved_items

followed_countries

reports

notifications

reputation_events

badges

user_badges

moderation_actions

country_documents

app_settings

---

# 40. PROFILES

Örnek fields:

id UUID PK → auth.users

username unique

display_name

avatar_url

bio

role

reputation

membership_level

created_at

updated_at

Private email profiles tablosunda public query ile dönmemeli.

---

# 41. VISA EXPERIENCES

Structured data kullan.

Fields roughly:

id

user_id

country_id

application_city

application_center

visa_type

travel_purpose

application_date

appointment_date

passport_submission_date

decision_date

result

first_schengen

employment_status

funding_type

has_invitation

requested_trip_days

granted_visa_days

entry_type

story

critical_advice

status

approved_by

approved_at

created_at

updated_at

Structured alanları yalnız text içine gömme.

Bunlar filtrelenebilir olmalı.

---

# 42. THREADS

Fields:

id

user_id

country_id

category_id

title

body

status

approved_by

approved_at

helpful_count cached if necessary

comment_count cached if necessary

created_at

updated_at

---

# 43. COMMENTS

Fields:

id

thread_id OR experience_id

user_id

parent_comment_id nullable

body

status

approved_by

approved_at

created_at

updated_at

İleride polymorphic comments gerekiyorsa güvenli ve temiz bir yapı tasarla.

---

# 44. CRITICAL TIPS

Fields:

id

country_id

title

body

source_type

source_url nullable

last_verified_at

created_by

status

approved_by

approved_at

created_at

updated_at

source_type:

official

editorial

community_verified

---

# 45. ROW LEVEL SECURITY

Bütün ilgili Supabase tablolarında RLS aktif olsun.

Kurallar:

Public kullanıcı yalnız approved content okuyabilir.

Authenticated user kendi pending içeriklerini görebilir.

User içerik yalnız kendi user_id'si ile oluşturabilir.

Frontend'den başka user_id göndererek impersonation yapılamaz.

User:

role

reputation

membership_level

approved_by

approved_at

status

alanlarını keyfi değiştiremez.

Normal kullanıcı başka user notification'larını okuyamaz.

Internal moderation notes public olamaz.

Moderator uygun içerikleri moderate edebilir.

Admin role ve platform configuration yönetebilir.

Service role key mobil app bundle içine ASLA koyma.

---

# 46. SECURITY

Özellikle kontrol et:

Users cannot:

change their own reputation

change membership level

make themselves moderator

approve their own posts

see another user's private notifications

see internal moderation notes

vote themselves

create duplicate helpful votes

create duplicate saves

create duplicate follows

submit content under another user ID

Never trust:

user_id

role

reputation

approval state

from the mobile client.

Authenticated user ID'yi backend/session üzerinden derive et.

---

# 47. REPORT SYSTEM

Her approved:

experience

question

comment

critical tip

üzerinde three-dot menu olsun.

“Bildir”

Reasons:

Yanlış bilgi

Kişisel bilgi

Spam

Hakaret / taciz

Reklam

Konu dışı

Diğer

Reports moderation queue'ya gitsin.

---

# 48. PRIVACY

İnsanların özellikle finansal ve pasaport belgeleri paylaşacağı hassas bir domain olduğundan privacy UX önemli.

Kullanıcıdan PUBLIC olarak asla isteme:

T.C. kimlik numarası

pasaport numarası

telefon

açık adres

banka hesap numarası

kart bilgileri

tam banka ekstresi

kimlik fotoğrafı

pasaport fotoğrafı

Her free-text submission alanında gerektiğinde warning göster.

---

# 49. APP FEED ALGORITHM — V1

Machine learning gerekmez.

Basit ranking oluştur.

Feed score factors:

recency

followed country bonus

helpful count

comment activity

content diversity

new user discovery

Feed 10 tane aynı ülkeyi art arda göstermemeli.

Feed 10 tane yalnız deneyim kartı da göstermemeli.

Content type diversity uygula.

Örnek:

experience

question

experience

critical tip

question

country update

experience

gibi.

---

# 50. EMPTY STATES

Generic boş ekran bırakma.

Örneğin Estonya soruları boş ise:

“Estonya hakkında ilk soruyu sen sor 👀”

Button:

“Soru Sor”

Saved boş:

“Henüz bir şey kaydetmedin.”

“Akışa göz at”

Pending empty:

“İncelenmeyi bekleyen paylaşımın yok.”

---

# 51. SKELETON / LOADING

Feed açılırken activity spinner yerine mümkün olduğunca skeleton card kullan.

Pull to refresh.

Infinite pagination.

Optimistic UI yalnız güvenli interactionlarda:

save

follow

helpful vote

kullanılabilir.

Moderation approval gibi kritik işlemlerde backend sonucunu bekle.

---

# 52. MICRO INTERACTIONS

Uygulama “canlı” hissettirmeli.

Abartısız:

- button press animation
- save bounce
- helpful micro animation
- follow state transition
- skeleton loading
- pull-to-refresh
- success haptics
- bottom sheets
- smooth screen transitions

kullan.

Ama TikTok benzeri aşırı animasyon yapma.

Performance öncelikli.

---

# 53. HAPTICS

Uygun yerlerde Expo Haptics kullan:

Helpful

Save

Follow

Successful submission

Badge earned

Ama her tıklamada haptic verme.

---

# 54. MOBILE SHARE

Native share sheet desteği ekle.

Deneyim veya soru:

“Paylaş”

basılınca native sharing açılmalı.

İleride deep link architecture desteklesin.

---

# 55. DEEP LINKS

Architecture şu route'ları desteklesin:

/country/estonia

/experience/{id}

/question/{id}

/tip/{id}

/profile/{username}

Notification'a dokunulduğunda doğru content açılabilsin.

---

# 56. PUSH NOTIFICATION READY

İlk sürümde push tamamen kurulmasa bile architecture Expo Notifications entegrasyonuna hazır olsun.

Notification preferences model oluştur.

Örneğin:

Replies

Approvals

Followed country updates

Badge notifications

---

# 57. ONBOARDING

İlk app open'da maksimum 3 basit screen.

Screen 1:

“Gerçek deneyimleri keşfet.”

Screen 2:

“Kendi durumuna benzeyen başvuruları bul.”

Screen 3:

“Sor, paylaş, topluluğa katkı sağla.”

Sonra:

“İlgilendiğin ülkeleri seç”

Germany
Estonia
Poland
France
Spain
Italy
Greece
Hungary
Netherlands

En az 1 seçmek opsiyonel olabilir.

Button:

“Akışıma Git”

Onboarding uzun olmasın.

---

# 58. AUTH WALL STRATEGY

App'i tamamen login arkasına koyma.

Guest users:

feed okuyabilir

country gezebilir

experience okuyabilir

question okuyabilir

search yapabilir

Login required:

comment

helpful

save

follow

question create

experience create

Guest bir interaction yapmak istediğinde modern auth bottom sheet göster:

“Bunu yapmak için topluluğa katıl.”

Google / Apple daha sonra.

Email:

“Üye Ol”

“Giriş Yap”

---

# 59. DESIGN COMPONENTS

Reusable components oluştur:

AppHeader

BottomNavigation

CountryStory

CountryChip

FilterChip

ExperienceCard

QuestionCard

CriticalTipCard

CountryUpdateCard

UserAvatar

UserBadge

MembershipBadge

ResultBadge

HelpfulButton

SaveButton

FollowButton

CommentItem

CommentComposer

SearchInput

EmptyState

SkeletonExperienceCard

ReportBottomSheet

CreateBottomSheet

CountryPicker

ModerationStatusBadge

StatChip

InfoPill

Timeline

---

# 60. ADMIN CONTENT MANAGEMENT

Mobile app içinde admin için minimum content management yeterli.

Admin:

Critical tip oluşturabilir

Critical tip düzenleyebilir

Country documents düzenleyebilir

Moderation queue yönetebilir

User rolünü gerektiğinde değiştirebilir

Reputation adjustment yapabilir

Ancak kompleks admin analytics için daha sonra ayrı web dashboard yapılabilecek şekilde backend tasarla.

Mobil uygulamayı admin paneline dönüştürme.

---

# 61. TURKISH UX

Tüm kullanıcı-facing text Türkçe olsun.

Natural Turkish kullan.

Kurumsal ve robotik dil kullanma.

Örnek:

BAD:

“İçerik gönderim işleminiz başarıyla gerçekleştirilmiştir.”

GOOD:

“Gönderin incelemeye alındı 🎉”

BAD:

“Kullanıcı tarafından oluşturulan deneyimleri görüntüle”

GOOD:

“Deneyimlere göz at”

---

# 62. DATE / LOCATION

Türkçe locale:

tr-TR

Date examples:

14 Eyl 2026

2 saat önce

Dün

12 dk

Türkiye başvuru şehirleri database/extensible yapı ile desteklenebilir.

Örneğin:

İstanbul

Ankara

İzmir

Antalya

diğerleri.

---

# 63. DISCLAIMER

Profile/settings veya appropriate info area içinde:

“Bu uygulama resmî bir konsolosluk, büyükelçilik veya vize başvuru merkezi değildir. Kullanıcı deneyimleri kişisel tecrübelere dayanır. Başvuru koşulları değişebileceğinden resmî kaynakları kontrol etmeni öneririz.”

Her ekrana dev disclaimer koyma.

UX'i bozmadan gerekli yerlerde göster.

---

# 64. “INSIDER” BİLGİ

Kod veya UI içinde “gizli konsolosluk bilgisi” iddiası kullanma.

Bunun yerine:

⚡ Kritik Nokta

💡 Topluluk İpucu

✍️ Editör Notu

✅ Topluluk Tarafından Doğrulandı

🏛 Resmî Kaynak

terminolojisini kullan.

---

# 65. PERFORMANCE

Feed pagination kullan.

Tüm database'i tek seferde çekme.

Images lazy load.

Avatar/image caching kullan.

Optimized FlatList / FlashList kullan.

Long lists için ScrollView içinde dev map render etme.

Memoization gerektiğinde kullan.

Unnecessary realtime subscription oluşturma.

Database index ekle:

status

country_id

created_at

user_id

category_id

thread_id

result

first_schengen

employment_status

---

# 66. ACCESSIBILITY

Touchable areas yeterli büyüklükte olsun.

Screen reader labels.

Color contrast.

Text scaling mümkün olduğunca bozulmasın.

Form alanlarının gerçek labels'ı olsun.

Sadece renkle anlam verme.

Örneğin approved:

yeşil +

“Onaylandı”

text birlikte olsun.

---

# 67. ERROR HANDLING

Raw Supabase error kullanıcıya gösterme.

Turkish friendly messages:

“Bir şey ters gitti. Tekrar deneyebilir misin?”

“Bu içerik artık mevcut değil.”

“İnternet bağlantını kontrol et.”

“Yorumun gönderilemedi. Tekrar dene.”

---

# 68. OFFLINE / BAD CONNECTION

Full offline-first architecture zorunlu değil.

Ama:

son feed cache

previously loaded country data

optimistic save/follow

network error retry

iyi çalışsın.

Türkiye'deki mobil bağlantı koşullarını göz önünde bulundur.

---

# 69. ANALYTICS READY

Architecture ileride analytics event tracking desteklesin.

Events examples:

feed_item_open

experience_open

country_follow

helpful_click

save_click

question_created

experience_created

search

filter_applied

signup_completed

Ancak kullanıcı privacy'sini ihlal eden data toplama.

---

# 70. SEED CONTENT

İlk ülkeleri seed et.

Development sırasında birkaç SAMPLE content oluşturabilirsin.

Ancak gerçek kullanıcı deneyimi gibi göstermeyin.

Seed content:

is_sample = true

ve development environment'da açıkça:

“Örnek İçerik”

etiketi taşısın.

Production'da gerçekmiş gibi sahte kullanıcı deneyimleri yayınlama.

---

# 71. IMPLEMENTATION PRIORITY

Her şeyi aynı anda yüzeysel yapma.

Aşağıdaki sırayla ilerle:

PHASE 1

Project architecture

Navigation

Supabase

Auth

Database migrations

RLS

Profiles

Countries

PHASE 2

Social feed

Country stories

Experience cards

Question cards

Critical cards

Country feeds

PHASE 3

Experience creation

Question creation

Comments

Helpful

Save

Follow

PHASE 4

Moderation

Reputation

Membership levels

Badges

Notifications

Reports

PHASE 5

Search

Filters

Discover

Deep links

Polish

Animations

Performance

---

# 72. DEVELOPMENT METHOD

Before coding:

1. Inspect the repository.
2. Understand current project structure.
3. Do not rewrite working architecture without need.
4. Create a short implementation plan.
5. Implement actual working code.
6. Run lint/typecheck/tests where available.
7. Fix errors before declaring work complete.

Do not stop after creating UI placeholders.

If a button is visible, it should work.

Avoid TODO buttons unless explicitly marked future functionality.

---

# 73. DATABASE MIGRATIONS

All Supabase schema changes should exist as migration files.

Do not tell me only:

“Create this table manually in Supabase.”

Provide migrations.

Include:

tables

foreign keys

unique constraints

indexes

RLS enable

RLS policies

required database functions/triggers

seed countries

---

# 74. TEST CRITICAL FLOWS

At minimum verify:

Guest can open feed.

Guest cannot submit comment.

User can register.

User can log in.

User can select/follow country.

User can create visa experience.

New experience becomes pending.

Other normal users cannot see pending experience.

Author can see own pending experience.

Moderator can approve experience.

Experience becomes public.

Reputation is awarded exactly once.

Notification is created.

User can comment.

Comment becomes pending.

Approved comment becomes public.

User can mark content helpful.

User cannot helpful own content.

Duplicate helpful vote cannot exist.

User can save content.

Duplicate save cannot exist.

User cannot modify own reputation.

User cannot change role.

User cannot access moderator functions.

---

# 75. MAIN VISUAL ACCEPTANCE TEST

When I open the finished app I should NOT think:

“This is a visa information website converted to mobile.”

I should think:

“This is a social app specifically built around Schengen visa applications.”

The first 5 seconds should communicate:

real people

real experiences

active discussions

countries

results

critical information

interaction

not articles.

---

# 76. HOME SCREEN ACCEPTANCE TEST

Above the fold should approximately contain:

Header

Country Stories

Feed filter chips

First social content card

NOT:

large logo

large hero title

paragraph

“learn more”

three marketing cards

blog article grid

---

# 77. CARD ACCEPTANCE TEST

Every feed card should answer at least one quick question without opening it.

Experience:

Which country?

Approved/rejected?

How long?

What user profile?

Question:

What is being asked?

Which country?

How many answers?

Critical:

What is the important information?

Which country?

How trustworthy/source type?

---

# 78. SOCIAL FEEL

Prioritize:

faces/avatars

usernames

badges

short content

comments

counts

reactions

save

follow

notifications

freshness

country identity

status

over:

long editorial text

marketing language

big banners

articles

traditional menu hierarchy

---

# 79. CONTENT DETAILS

Example home feed:

[Countries horizontal]

Sana Özel | Yeni | Deneyimler | Sorular | Kritik

--------------------------------

🇪🇪 ESTONYA

✅ ONAYLANDI

mertkaya · Güvenilir Üye

İlk Schengen · Çalışan · İstanbul

7 günde sonuçlandı

“İlk başvurum olduğu için özellikle banka dökümü konusunda endişeliydim...”

👍 42 Faydalı    💬 18    🔖

--------------------------------

⚡ KRİTİK NOKTA

🇩🇪 Almanya

“Çalışan başvurularında SGK belgelerinin tarihlerini kontrol et.”

✍️ Editör Notu

👍 Faydalı   🔖 Kaydet   💬 Tartış

--------------------------------

🇫🇷 Fransa

SORU

“Yeni işe başladım. 1 aylık bordroyla başvuran oldu mu?”

selinn · Aktif Üye

💬 27 yanıt

[Yanıtla]

--------------------------------

🇮🇹 İtalya

❌ RED

emre91

Öğrenci · Sponsorlu · İlk Schengen

“Ret gerekçem 10. maddeydi. Yeniden başvururken şunları değiştirdim...”

💬 31

--------------------------------

Bu hissi koru.

---

# 80. FIRST RELEASE SCOPE

İlk production release'in amacı:

Kullanıcının uygulamayı indirip 30 saniye içinde:

1. Türkiye'den başvuran gerçek insanların deneyimlerini görmesi,
2. ilgilendiği ülkeyi seçmesi,
3. kendi durumuna benzer deneyimlere ulaşması,
4. yorumları okuyabilmesi,
5. soru sorabilmesi,
6. deneyimini paylaşabilmesi

olmalı.

Diğer özellikler bu core experience'ı desteklemeli.

---

# 81. DO NOT OVERENGINEER

İlk sürümde:

direct messaging

video stories

live streaming

complex gamification

AI chatbot

marketplace

paid subscription

gibi özellikler ekleme.

Data model ileride genişletilebilir olsun ancak öncelik core social experience.

---

# 82. FINAL DELIVERABLE

Çalışan production-ready mobile application oluştur.

Deliver:

Expo / React Native codebase

TypeScript types

navigation

screens

reusable components

Supabase integration

database migrations

RLS policies

authentication

social feed

country pages

experience system

questions

comments

moderation

reputation

badges

helpful votes

save

follow

notifications

search architecture

error/loading/empty states

real mobile interaction patterns

README with setup instructions

.env.example

migration instructions

Run and verify:

typecheck

lint

tests where present

Finally summarize:

- architecture used
- implemented screens
- database structure
- security/RLS decisions
- remaining environment variables or manual setup
- commands required to run the application

Most importantly:

**DO NOT BUILD A BLOG.**

Build a **living Schengen social community app**.

The user should scroll because there are new people, new experiences, new questions and useful discoveries — not because there are more articles to read.
