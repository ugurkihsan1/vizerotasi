# Ücretsiz web önizlemesi: GitHub Pages

Önizleme adresi: https://ugurkihsan1.github.io/vizerotasi/

Mevcut depo herkese açıktır; GitHub Free üzerinde bu depo için Pages kullanılabilir. Ücretli abonelik veya yeni Netlify hesabı gerekmez. GitHub'ın Pages kullanım ve bant genişliği sınırları geçerlidir; sınırsız barındırma taahhüdü değildir. Bu, mobil uygulamanın web önizlemesidir.

## Bir defalık etkinleştirme

https://github.com/ugurkihsan1/vizerotasi/settings/pages sayfasında:

1. Build and deployment → Source: **Deploy from a branch**.
2. Branch: **gh-pages**, klasör: **/ (root)**.
3. **Save**. GitHub yayını tamamlayınca yukarıdaki adrese gir.

Kod bağlantısının GitHub Pages yönetim izni yoktur (API HTTP 403); bu ayar hesap sahibi tarafından yapılmalıdır. Kaynak koddan ayrı olan `gh-pages` dalı hazırlanmış web dosyalarını barındırır. `main` uygulamanın kaynak kodudur. Kaynak depo gizlilik durumu değiştirilmedi.

## Supabase e-posta dönüş adresi

Supabase → Authentication → URL Configuration:

- Site URL: `https://ugurkihsan1.github.io/vizerotasi/`
- Redirect URLs: `https://ugurkihsan1.github.io/vizerotasi/auth` ve `https://ugurkihsan1.github.io/vizerotasi/auth?recovery=1`

Mevcut izinli adresleri gerekiyorsa koru. Üyelik doğrulama ve şifre sıfırlama e-postalarının yeni adrese dönmesi için bu ayar gerekir. Bu çalışma uzak Supabase Auth ayarlarını otomatik değiştirmez. Yeni alan adında bir kez yeniden giriş yapılır; hesaplar, paylaşımlar ve belgeler aynı Supabase projesindedir.

## Sonraki yayınlar

```sh
npm ci
npm run deploy:pages
```

Komut web sürümünü `/vizerotasi` alt diziniyle üretir ve `gh-pages` dalına normal bir git push yapar. Kaynak çalışma ağacına dokunmaz, geçmişi zorlamaz. GitHub'a dal yazma yetkisi gerekir. `main` dalına tek başına push yapılması Pages dosyalarını yenilemez; bu komut yeniden çalıştırılmalıdır.

`npm run export:pages` yalnızca yerel `dist-pages` çıktısını üretir. Build, istemci için zaten mevcut olan publishable Supabase anahtarını kullanır; service-role anahtarı eklenmez. `.nojekyll` Expo'nun `_expo` dosyalarını korur. `404.html` doğrudan ülke/profil/auth bağlantılarında SPA'yı açar; bu doğrudan isteklerin HTTP durum kodu Pages'in kısıtı nedeniyle 404 olabilir fakat uygulama URL, sorgu ve fragmenti koruyarak açılır.

Netlify'deki eski site ve hesap silinmedi. App Store için GitHub Pages veya Netlify zorunlu değildir.
