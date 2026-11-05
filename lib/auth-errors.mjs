// Customer-facing wording for Supabase Auth errors. Raw provider text is logged, never shown.
const messages={
 rate:"Too many attempts right now. Please wait a few minutes, then try again.",
 invalid:"That email address can't receive mail. Please use a real email address you can open.",
 blocked:"We can't send an email to this address right now. Please try again later or contact us.",
 exists:"An account with this email already exists. Log in or reset your password.",
 weak:"Choose a stronger password: at least 10 characters, and not a common password.",
 closed:"New sign-ups are paused right now. Please contact us.",
 samePassword:"Choose a password you haven't used before.",
 captcha:"The security check didn't go through. Complete it again, then try once more.",
 unconfirmed:"Confirm your email first, then log in.",
 login:"We couldn't log you in. Check your email and password, or reset your password.",
 general:"Something went wrong. Please try again shortly."
};
const byCode={over_email_send_rate_limit:'rate',over_request_rate_limit:'rate',over_sms_send_rate_limit:'rate',email_address_invalid:'invalid',email_address_not_authorized:'blocked',user_already_exists:'exists',email_exists:'exists',weak_password:'weak',signup_disabled:'closed',email_provider_disabled:'closed',same_password:'samePassword',email_not_confirmed:'unconfirmed',invalid_credentials:'login',captcha_failed:'captcha'};
export function authErrorKind(error){
 if(!error)return null;
 if(Object.hasOwn(byCode,error.code))return byCode[error.code];
 const text=String(error.message||'').toLowerCase();
 if(text.includes('captcha'))return 'captcha';
 if(error.status===429||text.includes('rate limit')||text.includes('too many'))return 'rate';
 if(text.includes('not authorized'))return 'blocked';
 if(text.includes('already registered')||text.includes('already exists'))return 'exists';
 if(text.includes('invalid')&&text.includes('email'))return 'invalid';
 if(text.includes('password')&&(text.includes('weak')||text.includes('should')))return 'weak';
 return null;
}
export function authErrorMessage(error,mode='login'){const kind=authErrorKind(error);if(kind)return messages[kind];return mode==='login'?messages.login:messages.general;}
