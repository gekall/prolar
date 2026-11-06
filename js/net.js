/* ===================== PROLAR SUNUCU BAĞLANTISI =====================
   Peengo ile aynı Supabase projesini kullanır, ama tablolar ve fonksiyonlar ayrıdır (prolar_ ile başlar).
   Hesaplar: kullanıcı adı + şifre. Şifreler sunucuda bcrypt ile geri çevrilemez biçimde saklanır.
   Online lobi: Supabase Realtime kanalları (broadcast + presence). Veritabanına yazmaz. */
'use strict';
const NET = (() => {
  const SUPABASE_URL = 'https://klaeugeeyltdgjexfhfk.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsYWV1Z2VleWx0ZGdqZXhmaGZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3Mjg3NDEsImV4cCI6MjEwOTMwNDc0MX0.7dWRtD9BC2w7eu2iV2g5KZWsBm3b_tXZwLh1V_HKJHY';
  let sb = null;
  function client(){
    if (sb) return sb;
    if (!window.supabase || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
    try { sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {auth:{persistSession:false}, realtime:{params:{eventsPerSecond:40}}}); }
    catch (_) { sb = null; }
    return sb;
  }
  async function rpc(fn, args){
    const c = client();
    if (!c) throw new Error('Sunucuya bağlanılamıyor.');
    const {data, error} = await c.rpc(fn, args);
    if (error) throw new Error(error.message || 'Sunucu hatası');
    return data;
  }
  return {
    available: () => !!client(),
    register: (name, pass) => rpc('prolar_register', {p_name:name, p_pass:pass}),
    login: (name, pass) => rpc('prolar_login', {p_name:name, p_pass:pass}),
    me: token => rpc('prolar_me', {p_token:token}),
    save: (token, save) => rpc('prolar_save', {p_token:token, p_save:save}),
    logout: token => rpc('prolar_logout', {p_token:token}),
    changePass: (token, oldPass, newPass) => rpc('prolar_change_password', {p_token:token, p_old:oldPass, p_new:newPass}),
    channel: (name, opts) => { const c = client(); return c ? c.channel(name, opts) : null; },
    removeChannel: ch => { const c = client(); if (c && ch) c.removeChannel(ch); }
  };
})();
