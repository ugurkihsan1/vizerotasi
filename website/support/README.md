# Vizesel destek sayfası

Statik, mobil uyumlu destek ve iletişim sitesi. JavaScript, analiz aracı, çerez, hesap girişi veya form yoktur. E-posta düğmesi kullanıcının e-posta uygulamasını açar. Açık/karanlık tema cihaz tercihinden gelir.

## Ücretsiz Cloudflare Pages yayını

1. https://dash.cloudflare.com/ adresinden hesabına giriş yap.
2. Workers & Pages → Create application → Pages → Upload assets / Direct Upload yolunu aç.
3. Proje adı olarak `vizesel` seç; doluysa `vizesel-destek` gibi başka bir ad kullan.
4. İndirilebilir destek sitesi ZIP'ini veya bu klasörün içeriğini yükleyip Deploy site düğmesine bas. ZIP kökünde `index.html`, `assets/`, `destek/` ve `_headers` bulunmalı.
5. Cloudflare'in verdiği gerçek `https://PROJE-ADI.pages.dev/destek/` adresini aç. E-posta düğmesini ve soruları kontrol et.
6. Bu adresi App Store Connect → Support URL alanına yaz.

Subdomain ancak Cloudflare proje oluşturulurken ayrılır; `vizesel.pages.dev` müsaitliği veya mevcut sahipliği varsayılmaz. Alan adı satın almak gerekmez. GitHub bağlantısı kurmak gerekmez.

Bu site yalnızca destek sayfasıdır; uygulamayı veya Supabase veritabanını taşımaz. Canlı yayın için Cloudflare hesabında son yükleme gerekir.

Yerelde incelemek için `python3 -m http.server 8092 --directory website/support` çalıştır.
