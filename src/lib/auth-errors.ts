export function authErrorMessage(error: unknown) {
  const e = error as { code?: string; status?: number };
  switch (e?.code) {
    case "invalid_credentials":
      return "E-posta veya şifreni kontrol et.";
    case "email_not_confirmed":
      return "Giriş yapmadan önce e-postandaki doğrulama bağlantısını aç.";
    case "user_already_exists":
      return "Bu e-posta ile hesabın olabilir. Giriş yapmayı deneyebilirsin.";
    case "over_email_send_rate_limit":
      return "Çok sık e-posta istendi. Biraz bekleyip yeniden dene.";
    case "email_address_invalid":
      return "Geçerli bir e-posta adresi yaz.";
    case "weak_password":
      return "En az 12 karakterden oluşan daha güçlü bir şifre seç.";
    case "signup_disabled":
      return "Yeni üyelikler şu anda kapalı.";
    case "unexpected_failure":
      return "Hesap oluşturulamadı. Kullanıcı adın kullanımda olabilir; farklı bir adla yeniden dene.";
    default:
      return e?.status === 429
        ? "Çok fazla deneme yapıldı. Biraz sonra tekrar dene."
        : "İşlem tamamlanamadı. Bağlantını kontrol edip yeniden dene.";
  }
}
