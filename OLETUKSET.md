# Oletukset

## Liiketoimintalogiikka

**Varausten päivitys ja päällekkäisyydet**
- Oletan, että jos sama henkilö tekee päällekkäisen varauksen kyse on varauksen päivityksestä. Päivitetyt varaukset säilyttävät saman id:n.

**Käyttöoikeudet**
- Oletan, ettei ole soveliasta, että käyttäjät voivat perua toistensa varauksia.

**Kansainvälinen käyttö ja keskiyön ylittävät varaukset**
- Kokoushuoneet ovat kansainvälisessä yrityksessä, joten ihmiset haluavat välillä kokoontua kummallisiin aikoihin, kuten esimerkiksi keskellä yötä aikaerojen vuoksi. Sovelluksen toimintalogiikka olettaa, että jos käyttäjä antaa aiemman lopetusajan kuin aloitusaika puhutaan seuraavan päivän tunneista. Jos seuraavan päivän tunnit ovat kauempana aloitusajasta kuin 12 tuntia varausta ei voi tehdä, koska se on liian pitkä. Sovelluksen logiikassa ei anneta lopetuspäivää vaan se lasketaan aloituspäivästä päätösajan avulla.

**Frontend-integraatio**
- Oletan, että mahdollinen frontend näyttää käyttäjälle virheilmoituksen, jos varaus ei mene läpi, ja että tarkoituksena on ohjata käyttäjä saamaan varaus tehtyä, mikäli haluttu aika ei ole vapaana.

## Tekninen toteutus

**Iteratiivinen kehitys**
- Varaukset olivat alkuperäisessä AI-generoidussa koodissa tunnittaisia, koska ajattelin, että se olisi helpompi toteuttaa aluksi. Myöhemmin muutin tämän toiminnallisuuden toimimaan minuutin tarkkuudella ja hyväksymään myös kaiken pituiset varaukset 30min ja 12h välillä.

**Autentikointi**
- Oletin, että user authentication on tarpeellinen, sillä tehtävänannon mukaan kyse on ammattimaisesta sovelluksesta.

**Testidata ja scope-rajaus**
- Oletan, että projekti vaatii testidataa: käyttäjiä, huoneita ja varauksia.
- Oletan, että on okei laittaa käyttäjien testidata mukaan koodiin, sillä käyttäjätunnusten luonti tuntuisi nostavan scopea aika paljon tämän sovelluksen osalta. Tämä ei tietty oikeassa sovelluksessa kävisi tietoturvasyistä, mutta otan tämän vapauden, jotta API:n testaus on tarpeeksi helppoa. Ajattelen tätä sovellusta demona API:n toiminnasta. Tämä demo on jo hieman vaivalloinen testata käyttäjien kirjautumistokenien vuoksi rest Clientilla. En halunnut tehdä siitä vielä vaivalloisempaa.

**Koodin laatu ja skaalautuvuus**
- Päätin ottaa huomioon Vincitin asiakkaat ja siksi otin lähtökohdaksi, että koodin pitää olla mahdollisimman helposti ymmärrettävää, selkeää ja skaalattavaa yritystasolla.

## Dokumentaatio ja työkalut

**AI-promptaus englanniksi**
- Oletin, että AI:n promptauksen voi tehdä englanniksi, sillä se on luonnollisempaa kielen sujuvuuden kannalta. Ohjelmointikielet ovat englanniksi, joten promptaus tuntuu vahvemmalta tehdä samalla kielellä. Myöskään Clauden suomen kielen taito ei ole yhtä vahva kuin englannin, joten näin pyrin välttämään myös mahdollista kielimuuria.

**Esikeskustelut ja suunnitteluprosessi**
- Käytin Claudea apuna ensimmäisen promptin kirjoitukseen ja siksi oletin, että haluatte myös kyseisen keskustelun, jossa iteroin projektin rakennetta ja yksityiskohtia ennen koodausta Claude.codella ja ensimmäistä promptia. Opin myöhemmin, että claude.codessa on myös plan mode.

**Viittausten käsittely**
- Päätin korvata keskustelusta viittaukset ohjelmaan *-merkillä, sillä ohje pdf:n mukaan viittauksia ei haluta.

**Oletuksien dokumentointi omaan dokumenttiinsa**
- Tehtävänannossa mainittiin, että oletukset tulee dokumentoida, mutta tarkalleen miten ja minne, ei oltu määritelty. Täten otin vapauden luoda tämän .md dokumentin.
