# Prolar

Arkadaşlarla online oynanan 2D platform hack and slash oyunu. 10 bölüm, her birinde 50 alt bölüm. Her 25. alt bölümde mini boss, 50.'de boss var.

**Site:** https://gekall.github.io/prolar/

- Kullanıcı adı ve şifreyle telefondan ve bilgisayardan aynı hesaba girilir. Şifreler sunucuda bcrypt ile saklanır.
- Herkes boş envanterle ve çıplak başlar. Eşyalar düşmanlardan, bölüm sandıklarından, bosslardan ve marketten gelir. Herkes kendi class'ına uyanları tutar, gerisini satar.
- Test hesabı: `admin` kullanıcı adıyla açılan hesapta bütün bölümler ve eşyalar açıktır. Bu hesap başka hesaplara erişemez.
- Envanter sınırsızdır, aynı eşyadan birden fazla tutulabilir. Satılan eşya altın olarak hesaba geçer.
- Market her saat başı kendiliğinden yenilenir, altınla da yenilenebilir.
- Online lobi: biri lobi kurar, diğeri 5 haneli kodla katılır. Lobi hiçbir yere kaydedilmez, herkes çıkınca kapanır. En fazla 2 kişi. Bölümü lobi sahibi seçer.

## Ganimet oranları

| Kaynak | İhtimal |
|---|---|
| Tank düşman | %5 (elitte ×2,5) |
| Menzilli düşman | %4 (elitte ×2,5) |
| Koşucu düşman | %3 (elitte ×2,5) |
| Bölüm sandığı | ilk temizlemede %60, sonra %20 (1-1'in ilk temizlemesi kesin silah) |
| Mini boss | kesin 1 eşya, %30 bir tane daha |
| Boss | kesin 1 eşya, %50 bir tane daha, ilk zaferde class'ına uygun silah |
| Nadir eşya | her bölümün belli bir düşmanından %2 (elitte %5), markette yok |

Düşen eşyaların yarısı kuşandığın class'tan ya da takı olur.

## Kurulum

Veriler Peengo ile aynı Supabase projesinde, `prolar_` ile başlayan ayrı tablolarda tutulur.
Supabase > SQL Editor > New query: `supabase-prolar.sql` dosyasının tamamını yapıştır ve Run'a bas. Tekrar çalıştırmak güvenlidir.

Online lobi Supabase Realtime kanallarını kullanır, ayrıca tablo gerekmez.
