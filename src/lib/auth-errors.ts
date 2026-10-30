export function authErrorMessage(error: unknown) {
  const e = error as {
    code?: string;
    status?: number;
    message?: string;
    name?: string;
  };
  if (
    e?.code === "username_taken" ||
    (e?.code === "23505" && e.message?.includes("profiles_username_key"))
  )
    return "Bu kullanıcı adı alınmış. Başka bir kullanıcı adı seç.";
  switch (e?.code) {
    case "unsafe_auth_redirect":
      return "Güvenli olmayan giriş bağlantısı engellendi. Lütfen yeniden dene.";
    case "google_native_not_configured":
      return "Google ile giriş ayarları henüz tamamlanmadı. E-posta veya Apple ile devam edebilirsin.";
    case "provider_disabled":
    case "oauth_provider_not_supported":
      return "Bu giriş seçeneği henüz kullanıma açılmadı. E-posta ile devam edebilirsin.";
    case "validation_failed":
      return /provider|oauth/i.test(e?.message ?? "")
        ? "Bu giriş seçeneği henüz kullanıma açılmadı. E-posta ile devam edebilirsin."
        : "Girdiğin bilgileri kontrol edip yeniden dene.";
    case "social_auth_failed":
    case "bad_oauth_callback":
    case "bad_oauth_state":
    case "invalid_nonce":
    case "invalid_id_token":
      return "Giriş tamamlanamadı. Apple veya Google hesabınla yeniden dene.";
    case "access_denied":
      return "Giriş izni verilmedi. Dilersen yeniden deneyebilirsin.";
    case "username_check_failed":
      return "Kullanıcı adı kontrol edilemedi. Biraz sonra yeniden dene.";
    case "invalid_credentials":
      return "E-posta veya şifreni kontrol et.";
    case "email_not_confirmed":
      return "Giriş yapmadan önce e-postandaki doğrulama bağlantısını aç.";
    case "email_exists":
    case "user_already_exists":
      return "Bu e-posta ile hesabın olabilir. Giriş yapmayı veya şifreni yenilemeyi dene.";
    case "over_email_send_rate_limit":
      return "Çok sık e-posta istendi. Biraz bekleyip yeniden dene.";
    case "over_request_rate_limit":
      return "Çok fazla deneme yapıldı. Biraz sonra tekrar dene.";
    case "email_address_invalid":
      return "Geçerli bir e-posta adresi yaz.";
    case "weak_password":
      return "En az 8 karakterden oluşan daha güçlü bir şifre seç.";
    case "same_password":
      return "Yeni şifren önceki şifrenden farklı olmalı.";
    case "signup_disabled":
      return "Yeni üyelikler şu anda kapalı.";
    case "otp_expired":
    case "otp_disabled":
    case "flow_state_expired":
    case "flow_state_not_found":
      return "Bağlantı geçersiz veya süresi dolmuş. Yeni bir bağlantı iste.";
    case "unexpected_failure":
    case "database_error":
      return "Hesap işlemi şu anda tamamlanamıyor. Biraz sonra yeniden dene.";
    default:
      if (e?.status === 429)
        return "Çok fazla deneme yapıldı. Biraz sonra tekrar dene.";
      if (e?.status && e.status >= 500)
        return "Hizmet şu anda yanıt veremiyor. Biraz sonra yeniden dene.";
      if (
        e?.status === 0 ||
        e?.name === "AuthRetryableFetchError" ||
        /failed to fetch|network request failed|networkerror/i.test(
          e?.message ?? "",
        )
      )
        return "Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip yeniden dene.";
      return "İşlem tamamlanamadı. Lütfen yeniden dene.";
  }
}
