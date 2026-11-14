# PRD — "Seyir Defteri: Son 30 Sol" (FİNAL · Jüri Sürümü)

> Takım: **Seyir Defteri (Logbook)** · NASA Space Apps 2026 · Antalya · Challenge: **Build a Junior Astronaut Mission Trainer**
> Bu belge oyunun **ne** olduğunu anlatır. **Nasıl** kurulacağını `GAME_BOOTSTRAP.md` anlatır.
> Agent: Bu belgedeki tüm sayılar **başlangıç değeridir**. Hepsi `src/config/balance.ts` içine girer, bot ile ayarlanır. Tasarımı (hikâye, kurallar, ekranlar) değiştirme; değiştirmen gerekirse `docs/decisions.md`'ye yaz ve insana sor.

---

## 0. Bu sürümde öncekine göre ne değişti (ve neden)

| Değişiklik | Neden (kaynak) |
|---|---|
| Göstergeler **3 gruba** indi: ⚡ Güç · ❤️ Yaşam (💨 hava + 🥫 yemek) · ☢️ Radyasyon | Challenge: "2–3 ana kaynak (yaşam desteği, güç, kalkan) genelde 5–6'dan daha etkili" |
| **Sağlık** göstergesi kalktı, yerine **☢️ Radyasyon dozu** (düşük = iyi) geldi | Gerçek RAD ölçümüyle birebir bağlanabiliyor; "kalkan kararı → gerçek uzay havası" bağı jüri için "öne çıkma" maddesi |
| Üs **Gale Krateri'nin yanına** iniyor; **Curiosity** komşumuz | Curiosity'nin radyasyon dedektörü (RAD) tam orada ölçüm yapıyor → oyundaki doz gerçek veriye dayanıyor |
| Radyasyon fırtınası = **gerçek 20 Mayıs 2024 olayının eğrisi** | RadLab'da ölçüm var: sakin gün ≈5 μGy/sa → tepe ≈304 μGy/sa, ~1,5 günde söner |
| Kalkan artık "puan" değil, **sığınakta geçirilen saat** | Gerçek ödünleşim: güvende kal ↔ üssü çalıştır. "Bedava güvenli seçim olmasın" kuralı |
| Her oyun = **Güneş'in gerçek bir ayı** (DONKI kayıtlarından) | "Tekrar oynanabilirlik" + "gerçek veri" maddeleri aynı anda |
| Gemi/atölye/parça/keşif **kesildi** ("Yakında") | Tek kişi, ~30 saat. Challenge: "çocukları çok sistemle boğma" |
| "Dünü tekrar oyna" + "Ne olurdu?" **kaldı** | Saf sim sayesinde ucuz; "cezalandırmadan başarısızlıktan öğrenme" maddesi |

---

## 1. Amaç

7–12 yaş çocukların, Mars'ta bir üssü 30 sol boyunca ayakta tutarken **gerçek görev ödünleşimlerini** oynayarak öğrendiği, tarayıcıda çalışan 3D bir oyun: güç bütçesi, yaşam desteği, radyasyondan korunma, yemek üretimi, iletişim gecikmesi.

**Tek cümlelik öğrenme hedefi:** Çocuk oyunu bitirdiğinde şunu söyleyebilmeli: *"Mars'ta güç sınırlı; hava, yemek ve korunma için güç ve zaman harcamak zorundasın; Güneş fırtınası gelince güvende beklemek iş kaybettirir, Dünya'ya sormak ise dakikalar sürer."*

**Temel ilke:** Hiçbir seçim bedava değil. Her eylem **süre** (gün ışığı saati) ve/veya **güç** harcar.

---

## 2. Challenge ile eşleşme (jüri kontrol listesi)

| Challenge maddesi | Oyundaki karşılığı |
|---|---|
| Life support | 💨 Hava (MOXIE), gece ısıtma |
| Radiation shielding | ☢️ Doz + sığınak seviyesi + sığınakta bekleme |
| Power budgeting | ⚡ Güç: panel geliri (toz/fırtına) ↔ MOXIE, sera, ısıtma, anten |
| Food production | 🥫 Yemek: sera bakımı (Sol 3'ten itibaren) |
| Communication delay | Anten: gerçek tarihe göre hesaplanan Dünya–Mars gecikmesi (3–22 dk), cevap ertesi sabah |
| Real NASA data | DONKI (güneş olayları), RadLab/MSL-RAD (Mars yüzeyi dozu), MOXIE ve iletişim gerçek bilgi kartları |
| Data attribution in-tool | Her gerçek veri kartında kaynak etiketi + "Bilgi & Kaynaklar" ekranı |
| Don't present static as live | "CANLI" / "KAYITLI" rozeti; canlı değilse asla canlı denmez |
| No free safe choice | Sığınak = güvenli ama iş saati kaybı; bot ile "baskın strateji yok" testi (§13) |
| Replayability | Her oyun farklı gerçek Güneş ayı + rastgele toz/arıza |
| Plain language, explain terms | Sol, radyasyon, doz, MOXIE ilk geçtiği yerde tek cümle |
| Browser, no download/account | GitHub Pages, hesap yok |

---

## 3. Hedef kitle, platform, dil

- 7–12 yaş; aileler ve sınıflar. Ebeveyn/öğretmen de anlayabilsin (gerçek veri kartları).
- Tarayıcı (bilgisayar + tablet ≈1024 px). İndirme yok, hesap yok.
- Dil: **TR + EN**. Varsayılan: tarayıcı dili `tr` ise TR, değilse **EN** (küresel jüri). Ayarlardan değişir. Tüm metinler `src/i18n/{tr,en}.json`.
- Sade dil. Ölüm, kan, korku yok.

---

## 4. Hikâye

- **"Umut"** aracı Mars'a inerken toz fırtınasına yakalanır, **Gale Krateri** yakınına sert iniş yapar. **Kimse ölmez.**
- Gemi yapay zekâsı **PUSULA**: "Enerji yalnızca bir kişiyi uyanık tutmaya yetiyor." Diğerleri uyku kapsüllerinde güvende.
- Oyuncu **Ada** olarak uyanır. PUSULA **bilek saatinden** konuşur, dışarıda **küçük mavi robot** gövdesiyle eşlik eder.
- "Kurtarma ekibi **30 sol** sonra gelecek. Üssü ayakta tutmalı ve onlara iniş yerini bildirmeliyiz."
- **Komşumuz Curiosity:** "2012'den beri burada çalışan bir robot gezgin. Her gün radyasyonu ölçüyor. Onun ölçümleri bizi koruyacak."
- Başarısızlık = **Erken Tahliye** ("Görev yarım kaldı. Neler öğrendik?").

**Tutarlılık kuralları:** Anten malzeme getirmez, sadece **bilgi** (uyarı, tavsiye, kurtarma koordinatı). Dünya'dan gelen hiçbir şey aynı gün gelmez.

---

## 5. Çekirdek döngü (her sol)

1. **Sabah raporu:** PUSULA göstergeleri, hava durumunu, günün 1–3 görevini söyler. Ekranda gerçek tarih rozeti: *"Bu sol, Dünya'da 14 Mayıs 2024."*
2. **Gündüz (10 saat):** İstasyona tıkla → Ada yürür (0,5–1 sa) → işlem menüsü → iş süre ve güç harcar. Uçan sayılar (−15⚡ +20💨).
3. **Olay** (bazı sollarda): toz fırtınası, güneş patlaması/radyasyon, arıza, Dünya'dan mesaj.
4. **Günü bitir** (tehlikeli durumda onay ister: "Gece ısıtma için güç yetmeyecek. Yine de bitirilsin mi?").
5. **Gece özeti:** otomatik tüketim + "neden" açıklaması + (varsa) "Ne olurdu?" kutusu.
6. Sabah otomatik kayıt → sonraki sol.

---

## 6. Göstergeler (başlangıç değerleri → `balance.ts`)

HUD 3 grup gösterir: **⚡ Güç | ❤️ Yaşam (💨 + 🥫) | ☢️ Radyasyon**. ⭐ Bilim köşede skor olarak durur.

| Gösterge | Başlangıç | Maks/Sınır | Sol başına | Açılış |
|---|---|---|---|---|
| ⚡ Güç (batarya) | 50 | 100 | Gündüz gelir: 30 × panel verimi (fırtınada ×0,4). Gece ısıtma −15 | Sol 1 |
| 💨 Hava | 70 | 100 | −10 | Sol 1 |
| 🥫 Yemek | 8 | 20 | −1 | Sol 3 (öncesinde gemi erzakı, gösterilmez) |
| ☢️ Doz | 0 | **100 = görev doz bütçesi** | Sakin sol: +1 × (1 − habitat koruması) | Sol 1 (Sol 4'te açıklanır) |
| ⭐ Bilim | 0 | — | — | Sol 4 |
| 🧹 Panel verimi | %100 | %100 | −%10 (fırtınada −%25) | Sol 1 |

**Gece kuralları:**
- Güç ısıtmaya yetmezse: 💨 −15 ekstra ve PUSULA sabah nedenini + çözümünü anlatır ("Panelleri temizleseydik…").
- 🥫 0'da bir sol: uyarı. İki sol üst üste 0 → Erken Tahliye.

**Kaybetme:** 💨 = 0 **veya** ☢️ ≥ 100 **veya** 🥫 iki sol 0 → Erken Tahliye.
**Kazanma:** 30. solun sonu.

### 6.1 Radyasyon modeli (gerçek veriye dayalı)

- **Birim:** "doz puanı". **1 puan = Mars yüzeyinde sakin bir solda korumasız alınan doz** (RAD ≈5 μGy/sa × 24,6 sa ≈ 125 μGy).
- **20 Mayıs 2024 olayı:** NASA'ya göre Curiosity yanında duran bir astronot ≈**8.100 μGy** alırdı → **≈64 puan** (korumasız). Yani tek başına bütçenin üçte ikisi. Ölümcül değil; NASA da "ölümcül değil ama ölçülen en büyük artış" diyor. Oyunda "görev doz bütçesi" olarak sunulur, korku dili yok.
- **Olay eğrisi:** RadLab'daki MSL-RAD-Surface ölçümünden saatlik profil çıkarılır (tepe ilk ~1 saat, ~30 saatte söner). Profil `src/data/rad-2024-05-20.json` içinde, toplamı 64 puana normalize edilir. Daha küçük olaylar aynı profili ölçekleyerek kullanır.
- **Koruma:**
  - Habitat içi/dışı iş: koruma %30 (`habitatShield`).
  - Sığınak seviyesi 0–3 (her seviye = 3 sa regolit yığma): sığınakta geçirilen saatlerde koruma **%50 / %70 / %85 / %95**.
  - Olay saatlerinde dışarıda iş yapılırsa o saatin dozu habitat korumasıyla alınır.
- **Asıl ödünleşim:** "Sığınakta bekle" eylemi saat yer (1 sa birimleri). Güvende beklersen o saatlerde panel/MOXIE/sera işi yapılmaz.
- **Gerçek bilgi kartı (olay sonrası):** "Bu fırtına gerçek: 20 Mayıs 2024'te Curiosity ölçtü. Uçurum dipleri ve lav tüpleri ek koruma sağlar." + grafik (gerçek eğri, senin aldığın doz üstünde).

---

## 7. Zaman

- Her sol **10 saat** gün ışığı. Yürüme 0,5–1 sa (uzaklığa göre).
- Saat bitince gün otomatik biter.
- Tek astronot. (Veri modeli 7 kişiye kadar hazır: her eylem `crewId` taşır.)

---

## 8. İstasyonlar ve eylemler

| İstasyon | Eylem | Süre | Etki | Açılış |
|---|---|---|---|---|
| ☀️ Güneş panelleri | Temizle | 2 sa | Verim %100. **Zaten ≥%90 ise devre dışı** ("Paneller temiz") | Sol 1 |
| 💨 Oksijen makinesi (MOXIE) | Çalıştır | 1 sa | −15⚡ +20💨. Hava ≥95 ise devre dışı | Sol 1 |
| 🌱 Sera | Bakım | 2 sa | −5⚡ +3🥫. 2 sol bakılmazsa verim yarıya iner (biriken görev, solan bitki görseli) | Sol 3 |
| 🛡️ Sığınak | Regolit yığ | 3 sa | Seviye +1 (maks 3) | Sol 4 |
| 🛡️ Sığınak | İçeride bekle | 1 sa adım | Bu saatlerde sığınak koruması. Olay yokken PUSULA "Şu an gerek yok" der | Sol 4 |
| 📡 Anten | Tamir et (1 kez) | 3 sa | Uyarı süresi 1 sol → 3 sol önceden. Dünya'ya mesaj açılır | Sol 4 |
| 📡 Anten | Dünya'ya mesaj | 1 sa, −5⚡ | Cevap **ertesi sabah**: tavsiye / önümüzdeki fırtına bilgisi / kurtarma adımı. Ekranda **gerçek gecikme**: "Mesajın 17 dk 12 sn'de ulaşacak" | Sol 4 |
| 🤖 Curiosity noktası | Ölçümü oku | 2 sa | +2⭐; o tarihin **gerçek RAD değeri** gösterilir ("Curiosity bugün 5,1 μGy/sa ölçtü") | Sol 4 |
| 🔬 Bilim noktası | Kaya tara | 2 sa | +1⭐ + kısa gerçek bilgi | Sol 4 |
| 🏠 Yaşam modülü | Günü bitir | — | Gece hesabı | Sol 1 |
| 🛏️ Kapsüller | (Yakında) | — | Tıklanınca "Ekip modu yakında" | — |
| 🚀 Gemi | (Yakında) | — | Görsel olarak sahnede, pasif | — |

**Boş iş yasağı:** Etkisi olmayacak eylem devre dışı ve nedeni yazılı (dolu depo, temiz panel, gereksiz sığınak).

---

## 9. Olaylar

İçerik: `src/content/events.json`. Her olayın yanında çocuk diliyle **tek cümlelik gerçek bilgi** (TR/EN) ve varsa **kaynak etiketi**.

| Olay | Kaynak | Etki | Uyarı |
|---|---|---|---|
| ☢️ Güneş parçacık fırtınası (SEP) | **DONKI** (gerçek tarih) | §6.1 doz eğrisi. Büyüklük: bağlı patlama sınıfı X → 20 puan, M → 8 puan; 20 Mayıs 2024 → 64 puan (gerçek Mars ölçümü) | Anten yok: 1 sol önce. Anten var: 3 sol önce |
| 🌞 Güneş patlaması (FLR, CME) | **DONKI** | Doğrudan etki yok; PUSULA "Güneş'te büyük patlama oldu, takipteyiz" (gerilim + öğretim) | — |
| 🌪️ Toz fırtınası | Rastgele (tohumlu) | 2–3 sol: panel geliri ×0,4, verim −%25/sol. 3D'de toz | 1 sol önce (anten varsa 2) |
| 🔧 Arıza | Rastgele | Bir istasyon tamir edilene kadar çalışmaz (2 sa) | Yok |
| 📨 Dünya'dan mesaj | Anten | Bilgi/tavsiye; kurtarma zinciri | — |

**Olay baskısı kuralları (denemeden ders):** Zorluk ihtiyaç sayılarından değil, **aynı güne denk gelen iki acil iş**ten gelsin (ör. fırtına uyarısı + düşük hava). En az 3 solda "ikisinden birini seç" durumu oluşmalı (bot raporunda ölçülür).

**Etiket dürüstlüğü:** DONKI olayları Dünya çevresinde ölçülür. Kart: "Bu patlama Güneş'te gerçekten oldu (tarih). Mars'a etkisi oyun için basitleştirildi." İstisna: 20 Mayıs 2024 → "Mars'ta gerçekten ölçüldü".

---

## 10. Gerçek Güneş Takvimi (her oyun = gerçek bir ay)

- Oyun başında tohuma göre bir **pencere** seçilir: 30 gerçek gün → 30 sol (1 sol = 1 Dünya günü varsayımı; kart bunu belirtir).
- Pencereler `src/data/donki-windows.json` içinde (kayıtlı snapshot, kaynak URL + çekim tarihi).
- **Başlangıç pencereleri** (Cumartesi sabahı DONKI'den doğrulanıp çekilecek):
  1. **"Büyük Fırtına" — 3 Mayıs → 1 Haziran 2024.** 20 Mayıs olayı **Sol 18**'e düşer. (Mayıs 2024'te Mars'ta 11–20 Mayıs arasında art arda patlama, CME ve SEP görüldü.)
  2. **"Ekim 2024"** — Güneş maksimumu döneminden aktif bir ay (DONKI'de doğrula).
  3. **"Sakin Ay"** — DONKI'de az olaylı bir 30 gün (çekerken seç).
- İlk oyun (öğretici) her zaman pencere 1 ile başlar: en güçlü hikâye ve en iyi demo.
- Olay en erken **Sol 6**'da gelir (öğretici bitmeden radyasyon yok). Pencere içi olaylar Sol 1–5'e düşerse Sol 6'ya kaydırılır ve kartta gerçek tarih yine yazar.

### 10.1 Canlı veri: "Bugün Güneş'te neler oluyor?"
- Ana menüde küçük kart: `api.nasa.gov/DONKI/notifications` (son 7 gün). **Test edildi: tarayıcıdan CORS ile çalışıyor.**
- Rozet: **CANLI** (başarılı) / **KAYITLI · {tarih}** (zaman aşımı 6 sn veya hata → snapshot).
- Anahtar: kendi ücretsiz anahtarımız `src/config/env.ts`'de, "public" işaretli. **DEMO_KEY kullanma**: test sırasında ortak kotası dolmuştu (429).

---

## 11. Rehberlik (denemenin en büyük dersi)

1. **Öğretici (Sol 1–3):** Hedef istasyonun üstünde zıplayan ok; PUSULA adım adım. Sol 1: paneli temizle → MOXIE → günü bitir. Sol 2: güç ve hava dengesi. Sol 3: sera.
2. **Günlük görevler:** Her sabah PUSULA duruma göre 1–3 görev verir (bilek saatinde liste; dokununca Ada oraya yürür). Görevler kurala göre üretilir (`src/content/missions.json` + öncelik kuralları), rastgele değil.
3. **PUSULA robotu:** Sıradaki görevin istasyonuna gider; başında baloncuk; tehlikede kırmızı ışık; tıklanınca görev + günün ipucu kartı.
4. **Göstergeye dokununca bilgi kartı:** Bu ne / ne tüketir / nasıl artırırım / gerçek bilgi (+ kaynak).
5. **Kademeli açılış:** Sol 1–2: güç, hava, panel, MOXIE · Sol 3: sera, yemek · Sol 4: anten, sığınak, Curiosity, bilim, doz açıklaması. Her açılışta PUSULA tek cümle tanıtım.
6. **Kurtarma zinciri (amaç hissi):** Anteni tamir et → Dünya'ya konum gönder → (ertesi sabah) iniş koordinatı gelir → iniş işaretini kur (2 sa, −10⚡, Sol 15'ten sonra). Bilek saatinde 3 adımlı ilerleme.
7. **Faydayı göster:** Fırtınadan sonra: "Erken uyarı sayesinde sığınaktaydık. Dışarıda olsaydık doz 38 olurdu, 9 aldık."

---

## 12. Hata yapıp öğrenme

- **Küçük, düzeltilebilir hatalar:** üşüme, sera solması; sabah PUSULA nedeni ve çözümü söyler.
- **"Dünü tekrar oyna":** Oyun başına **3 hak**. Bir önceki sabahın durumuna döner (saf sim: sabah durumu saklanır). Tohum aynı → olaylar aynı, sadece kararlar farklı.
- **"Ne olurdu?" kutusu:** Radyasyon olayının gecesinde, sim alternatif kararla yeniden koşturulur ("Sığınakta 4 saat bekleseydin doz 9 olurdu, sen 31 aldın"). Sadece radyasyon günü (kapsam).
- **Sonuç ekranı:** Ne oldu, neden, hangi karar fark yarattı + "Neler öğrendik" 2–3 madde + "Senin oyunundaki gerçek veriler" kartı (pencere tarihi, gerçek olaylar, Curiosity eğrisi).

**Sonuçlar:**
- **Efsane Komutan:** kazandı + ☢️ < 50 + ⭐ ≥ 8 + kurtarma zinciri tamam
- **Görev Başarılı:** kazandı + kurtarma zinciri tamam
- **Zor Kurtarma:** kazandı, zincir eksik ("Kurtarıcılar bizi bulmakta zorlandı")
- **Erken Tahliye:** kaybetti

---

## 13. Denge hedefleri (bot)

`tools/bot/` stratejileri, her biri **tüm pencerelerde** 200'er oyun:

| Strateji | Tanım | Hedef |
|---|---|---|
| `random` | Rastgele geçerli eylem | Kazanma ≤ %20 |
| `greedy` | Her zaman en düşük göstergeyi düzelt, plan yok | %30–60 |
| `balanced` | Basit öncelik + uyarıda sığınak | ≥ %70; Efsane %25–50 |
| `pusula` | Sadece PUSULA'nın günlük görevlerini yapar | ≥ %80 |
| `never-shelter` | Hiç sığınağa girmez / yığmaz | Pencere 1'de kazanma ≤ %30 |
| `always-shelter` | Uyarı varsa tüm günü sığınakta geçirir, regolit hep maks | Efsane ≤ %10 (güç/hava/⭐ kaybı) |
| `no-antenna` | Anteni hiç tamir etmez | Efsane %0 (zincir yok), kazanma `balanced`'dan ≥15 puan düşük |

Bot raporu ek olarak yazdırır: ortalama hayatta kalınan sol, ilk 3 kayıp nedeni, oyun başına "zor seçim günü" sayısı (hedef ≥ 3).
**Kural:** Denge değişiklikleri sadece `balance.ts`'de; her değişiklikten sonra bot.

---

## 14. Ekranlar

1. **Ana menü:** Yeni Görev / Devam Et / Ayarlar / Bilgi & Kaynaklar. "Bugün Güneş'te" kartı (CANLI/KAYITLI). Kilitli butonlar: 🌙 Ay Görevi "Yakında", 👩‍🚀 Ekip Modu "Yakında".
2. **Açılış:** 4 kare çizgi-roman anlatım (atlanabilir) → kapsülden uyanma (basit kamera hareketi).
3. **Oyun:** 3D vadi + üstte 3 gösterge grubu + sağ altta bilek saati (PUSULA, görevler, kurtarma zinciri) + tarih rozeti + dişli.
4. **Olay kartı:** büyük görsel, tek cümle, gerçek bilgi, kaynak etiketi.
5. **Gece özeti:** tüketim satırları + neden + "Ne olurdu?".
6. **Duraklatma (Esc / dişli):** Devam et, Ayarlar (dil, ses), Kaydet ve çık, Kaydetmeden çık (onaylı).
7. **Sonuç ekranı** (§12).
8. **Bilgi & Kaynaklar:** `docs/data-sources.md` + `docs/asset-sources.md`'den üretilir + **SI (yapay zekâ) kullanım notu**.

**Kayıt:** tek yuva + sabah otomatik kayıt, sürümlü şema (`saveVersion`). (3 yuva kesildi.)

---

## 15. Kontroller ve görsel

- **Tıkla-git** (fare/dokunmatik). Klavye zorunlu değil. Esc = duraklat.
- Kamera: hafif yukarıdan, sınırlı döndürme/yakınlaştırma.
- **Low-poly, Astroneer tadı.** Mars renkleri: pas turuncu zemin, pembemsi gökyüzü, gün batımında mavi.
- Kasklı astronot: beyaz kask, altın vizör, renkli şerit (yöntem `hackathon-assets/README.md`).
- Modeller: KayKit Space Base Bits (CC0), Quaternius Ultimate Space Kit (CC0), NASA Perseverance/Curiosity GLB (DRACOLoader; **tabanca parçası gizlenir**).
- **Önce primitif şekiller**, model değişimi mekanik çalıştıktan sonra.
- Ses: Web Audio ile kodda üretilen efektler + rüzgâr ambiyansı.
- Fırtına günü: Curiosity'nin navigasyon kamerasındaki gerçek "kar" efektinden ilhamla ekranda beyaz çizgi/benek parçacıkları (kartta açıklanır).

---

## 16. Veri kaynakları (hepsi `docs/data-sources.md` ve oyun içi Kaynaklar ekranında)

| Veri | Kullanım | Erişim | Canlı mı? |
|---|---|---|---|
| **DONKI** (FLR, CME, SEP, GST, notifications) | Gerçek Güneş Takvimi pencereleri; "Bugün Güneş'te" kartı | `api.nasa.gov/DONKI/*` (kendi anahtar). Not: test sırasında `FLR` ucu 404 döndü, `notifications` çalıştı; CCMC `kauai` ucu tarayıcıdan zaman aşımı | Kart: canlı + yedek. Pencereler: kayıtlı |
| **RadLab / MSL-RAD-Surface** (OSDR) | 20 Mayıs 2024 doz eğrisi; Curiosity noktasında günlük gerçek doz hızı | `visualization.osdr.nasa.gov/radlab/api/` (CSV/JSON). Tarayıcıdan CORS yok → **Mac'te script ile snapshot** | Kayıtlı |
| **NASA/JPL 20 Mayıs 2024 haberi** | 8.100 μGy, "30 göğüs röntgeni", lav tüpü/uçurum bilgisi | Bilgi kartı metni (kendi cümlelerimizle) | — |
| **MOXIE** (NASA/JPL, MIT) | Bilgi kartı: Mars havasından oksijen; saatte en çok 12 g; 10 g ≈ bir astronotun 20 dk nefesi; toplam 122 g | Bilgi kartı | — |
| **NASA iletişim gecikmesi** | Anten: tarih bazlı gecikme hesabı; bilgi kartı "tek yön 4–24 dk" | Basit yörünge yaklaşımıyla hesap (kod) | — |
| **CSA – Food production on the Moon** | Sera bilgi kartları | Bilgi kartı | — |
| Mars Trek (opsiyonel) | Arazi ilhamı | Kullanılırsa listelenir | — |

**Kural:** Snapshot dosyaları `src/data/` içinde; her dosyada `source`, `url`, `fetchedAt` alanları. Hiçbir uydurma sayı "NASA verisi" diye gösterilmez; oyun basitleştirmeleri kartta "oyun için basitleştirildi" der.

---

## 17. Space Apps kuralları (teslimde zorunlu)

- **Yapay zekâ (SI) beyanı:** README'de ve Kaynaklar ekranında: "Kod, Anthropic'in Claude modeli yardımıyla yazıldı; fikir, tasarım ve kararlar takıma aittir." Kod dosyalarında üst bilgi yorumu veya `docs/` notu (kural: "kod ve veri için açıklama metni ve metadata").
- **Yapay zekâ ile görsel/video/ses üretme.** Üretirsek görünür filigran zorunlu; en basiti hiç üretmemek.
- **NASA logosu, bayrağı, görev amblemi yok** (oyunda, videoda, slaytta).
- **Demo videoda/slaytta 18 yaş altı kimsenin görüntüsü/sesi olmaz.** (Bir çocuğu oynarken çekmek yasak.)
- Demo **İngilizce**: ≤30 sn video (TR konuşulursa İngilizce altyazı) veya ≤7 slayt. Sınırı aşan demo küresel değerlendirmeye girmez.
- Proje sayfası tamamen İngilizce. Global ödül için en az bir NASA verisi (DONKI + RadLab ✔).
- Lisans **MIT**, public repo, ilk commit Cumartesi 09:00'dan sonra.
- Halka açık metinlerde ticari/girişim planı yok.
- Opsiyonel: GitHub Pages adresi için FortiGuard web filtre sınıflandırması istemek (jüri erişimi).

---

## 18. Kapsam

**Var (jüri sürümü):** tek astronot, 6 aktif istasyon, 3 gösterge grubu, gerçek Güneş Takvimi (≥2 pencere), 20 Mayıs 2024 olayı, canlı DONKI kartı + yedek, öğretici, günlük görevler, PUSULA robotu, kurtarma zinciri, Dünü tekrar oyna, Ne olurdu, sonuç ekranı, TR/EN, duraklatma + otomatik kayıt, Kaynaklar ekranı, ses, bot, `?debug`.

**"Yakında" (görünür, oynanmaz):** Ekip modu (2–4 astronot, kapsül uyandırma), Ay görevi, çok oyunculu.

**Yok:** Gemi/atölye/parça/keşif, 3 kayıt yuvası, OSDR sağlık mekaniği, Mars Trek arazisi (zaman kalırsa).

**Zaman kalırsa öncelik sırası:** 3D açılış sahnesi → 3. pencere → Mars Trek'ten gerçek arazi rengi/yükseltisi → Ay için "Yakında" önizleme ekranı (CRaTER ay yörüngesi doz verisiyle).

---

## 19. Kabul kriterleri

- [ ] Oyun baştan sona (30 sol veya tahliye) konsol hatası olmadan oynanıyor.
- [ ] Her eylem süre ve/veya güç harcıyor; etkisiz eylemler devre dışı ve nedeni yazılı.
- [ ] Pencere 1'de Sol 18'de 20 Mayıs 2024 olayı geliyor; doz eğrisi gerçek RAD profilinden; sığınakta geçirilen saatler dozu düşürüyor.
- [ ] Olay kartlarında gerçek tarih ve kaynak etiketi var; basitleştirmeler etiketli.
- [ ] Canlı kart: ağ kapalıyken (DevTools offline) **KAYITLI** rozeti ve snapshot gösteriyor, asla "CANLI" demiyor.
- [ ] Anten mesajında o tarihe göre hesaplanan gecikme (dk/sn) gösteriliyor; cevap ertesi sabah geliyor.
- [ ] Öğretici: hiç deneyimi olmayan biri ilk 3 solu ok ve PUSULA ile takılmadan bitiriyor.
- [ ] Dünü tekrar oyna 3 kez çalışıyor; aynı tohumla aynı olaylar.
- [ ] Bot hedef bantları (§13) tutuyor; `npm run bot` raporu README'ye eklenmiş.
- [ ] TR/EN değişince tüm metinler değişiyor; kodda gömülü metin yok.
- [ ] ≈1024 px tablet genişliğinde arayüz taşmıyor; orta dizüstünde ~60 fps.
- [ ] Kaynaklar ekranında tüm veri/model kaynakları ve SI beyanı var.
- [ ] GitHub Pages'te yayında; gizli pencerede açılıyor.

---

## 20. Faz planı (Cumartesi–Pazar)

| Zaman | Faz | Bitti sayılır | Model |
|---|---|---|---|
| Cmt 09:00–09:40 | **F0** Boş repo, kit, bu PRD → `docs/prd.md`, iskelet, ilk commit, **boş sayfa GitHub Pages'e** | Pages linki açılıyor | Fable |
| 09:40–11:30 | **F1** Saf sim (göstergeler, eylemler, gece, olay sistemi, radyasyon modeli) + bot + `?debug` | Bot ilk raporu, testler yeşil | Fable |
| 09:40 paralel | **Veri** Mac'te script: DONKI pencereleri + RadLab eğrisi + günlük RAD değerleri → `src/data/` | Snapshot dosyaları kaynaklı | Fable |
| 11:30–14:00 | **F2** 3D vadi (primitif), tıkla-git, HUD, bilek saati (eğitim sırasında arka planda) | Sol 1 elle oynanıyor | Fable |
| 14:00 | Mentorluk: oynanır sürümü göster; DONKI ve jüri beklentisini sor | — | – |
| 14:30–20:00 | **F3** Öğretici, görevler, PUSULA robotu, kademeli açılış, olay kartları, gece özeti, TR/EN | Baştan sona oynanıyor | Fable → Fable reset |
| 20:00 | Sunum eğitimi (notlar) | — | – |
| 21:00–02:00 | **F4** Canlı DONKI kartı, kurtarma zinciri, Dünü tekrar oyna, Ne olurdu, sonuç ekranı, kayıt, ses, gerçek modeller, **yayın** | Pages'te tam oyun | Opus |
| Paz 09:00–12:00 | **F5** Bot dengesi, hata düzeltme, cila, Kaynaklar ekranı, SI beyanı | Kabul kriterleri | Opus / Full reset |
| **Paz 12:00** | **ÖZELLİK DONDURMA** | — | – |
| 12:00–15:00 | Demo (≤30 sn EN altyazılı video **veya** 7 EN slayt), proje sayfası (EN), README, kaynakça | — | Sonnet |
| **Paz 15:30** | **Space Apps'e gönder** ("Submit for Judging") | Onay bandı göründü | – |
| Paz 17:00 | Jüri | — | – |

Her fazdan sonra: `npm run build` + `npm test` + `npm run bot` + **`?debug` olmadan** ekran görüntüsü + commit. Her faz yeni Claude Code sohbeti. Önizleme eski sürüm gösterebilir: Cmd+Shift+R, "Yeni Görev" ile test.

---

## 21. Riskler

| Risk | Önlem |
|---|---|
| DONKI/CCMC yavaş veya kapalı | Pencereler snapshot; canlı sadece menü kartı; 6 sn zaman aşımı |
| DEMO_KEY kotası | Kendi anahtarı (bu gece al) |
| RadLab tarayıcıdan CORS | Mac'te script ile snapshot (çalışma anında değil, derleme öncesi) |
| Kapsam şişmesi | §18 "Yok" listesi kesin; Pazar 12:00 dondurma |
| Oyun çok kolay (denemede %99) | §13 baskın strateji botları; zorluk olay baskısından |
| Jüri linke erişemez | Pazar sabahı gizli pencere + telefon testi; FortiGuard sınıflandırma |

---

## 22. Demo hikâyesi (30 sn taslak, EN)

0–3 sn: "Seyir Defteri, solo team, Antalya." · 3–8 sn: "Kids rarely see the real trade-offs of a Mars mission." · 8–22 sn: oynanış: panel temizleme, MOXIE, uyarı, sığınak, gerçek RAD eğrisi kartı: "This storm is real: Curiosity measured it on May 20, 2024." · 22–30 sn: "Every game is a real month of our Sun, from NASA DONKI. Learn by surviving."
