# Prolar

Arkadaşlarla online oynanan 2D platform hack and slash oyunu. 10 bölüm, her birinde 50 alt bölüm. Her 25. alt bölümde mini boss, 50.'de boss var.

**Site:** https://gekall.github.io/prolar/

- Kullanıcı adı ve şifreyle telefondan ve bilgisayardan aynı hesaba girilir. Şifreler sunucuda bcrypt ile saklanır.
- Herkes boş envanterle ve çıplak başlar. Eşyalar düşmanlardan, bölüm sandıklarından, bosslardan ve marketten gelir. Herkes kendi class'ına uyanları tutar, gerisini satar.
- Test hesabı: `admin` kullanıcı adıyla açılan hesapta bütün bölümler ve eşyalar açıktır. Bu hesap başka hesaplara erişemez.
- Envanter sınırsızdır, aynı eşyadan birden fazla tutulabilir. Satılan eşya altın olarak hesaba geçer.
- Market her saat başı kendiliğinden yenilenir, altınla da yenilenebilir.
- Online lobi: biri lobi kurar, diğerleri 5 haneli kodla katılır. Lobi hiçbir yere kaydedilmez, herkes çıkınca kapanır. En fazla 4 kişi. Bölümü lobi sahibi seçer.
- Lobide biri düşerse 5 saniye sonra yeniden doğar. Takımda ayakta kimse kalmazsa bölüm kaybedilir. Tek başına oynarken ölünce bölüm biter.

## Ganimet oranları

| Kaynak | İhtimal |
|---|---|
| Tank, yeraltı solucanı | %5 |
| Şifacı, hücumcu | %6 |
| Bombacı | %4,5 |
| Menzilli | %4 |
| Uçan, zıplayan | %3,5 |
| Koşucu | %3 |
| Kamikaze | %2,5 (kendini patlatırsa hiçbir şey düşmez) |
| Elit düşman | yukarıdakilerin 2,5 katı |
| Bölüm sandığı | ilk temizlemede %60, sonra %20 (1-1'in ilk temizlemesi kesin silah) |
| Mini boss | kesin 1 eşya, %30 bir tane daha |
| Boss | kesin 1 eşya, %50 bir tane daha, ilk zaferde class'ına uygun silah |
| Nadir eşya | her bölümün belli bir düşmanından %2 (elitte %5), markette yok |

Düşen eşyaların yarısı kuşandığın class'tan ya da takı olur.

## Düşman türleri

Her bölümün kendi yaratıkları var (iskelet, golem, böcek, solucan, yarasa, drone, yengeç, mumya…). Davranışları 10 türden gelir:

| Tür | Ne yapar | Nasıl kaçılır |
|---|---|---|
| Tank | Önden vuruşları bloklar, kalkanla vurur | Arkasına geç, kalkan vuruşundan sonra açıkta kalır |
| Koşucu | Çömelip ileri atılır | Gözleri parlayınca dodge |
| Menzilli | Platformdan nişan alıp atar | Nişan çizgisi kilitlenince dodge |
| Uçan | Havada süzülür, çizgi boyunca dalar | Çizgiden çık, dalıştan sonra yerde kısa süre vurulabilir |
| Yeraltı | Toprak altında izler, vurulamaz | Zemin çatlayınca kaç, fırladıktan sonra vur |
| Kamikaze | Yanına gelip patlar | Turuncu halkadan çık ya da fitil yanarken öldür |
| Şifacı | Arkadan çevresini iyileştirir | Önce onu indir, vurunca büyüsü bozulur |
| Zıplayan | İniş yerini işaretleyip üstüne atlar | İşaretten çık |
| Hücumcu | Ayak sürter, duvara kadar koşar | Üstünden zıpla ya da sıra değiştir, duvara çarpınca sersemler ve ×1,5 hasar alır |
| Bombacı | Bomba fırlatır, düştüğü yer işaretlenir | Kırmızı halkadan çık |

İlk 3 tür her bölümde baştan var. Diğerleri bölüm ilerledikçe sırayla eklenir: 1. bölümde uçanlar 1-4'te, şifacılar 1-18'de gelir. İleri bölümlerde hepsi erkenden çıkar ve özel türlerin oranı alt bölüm numarasıyla artar.

## Fiyatlar

| Eşya | 1. bölüm | Sonraki her bölüm |
|---|---|---|
| Zırh | 210 | ×1,45 |
| Takı | 250 | ×1,45 |
| Silah | 300 | ×1,45 |
| Nadir eşya | 3 katı | |

Satış fiyatı alış fiyatının %30'u. Marketi altınla yenilemek 1. bölümde 40 altın.

## Kurulum

Veriler Peengo ile aynı Supabase projesinde, `prolar_` ile başlayan ayrı tablolarda tutulur.
Supabase > SQL Editor > New query: `supabase-prolar.sql` dosyasının tamamını yapıştır ve Run'a bas. Tekrar çalıştırmak güvenlidir.

Online lobi Supabase Realtime kanallarını kullanır, ayrıca tablo gerekmez.
