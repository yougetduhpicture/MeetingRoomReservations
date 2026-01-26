1. Mitä tekoäly teki hyvin?

Seurasi tarkkoja ohjeita. En ole aiemmin käyttänyt Clauden maksullista Claude.codea. Päätin kokeilla sitä yleisen tämän hetkisen teknologia-alan hypen vuoksi. Olin kuullut, että tällä AI:lla hyvää jälkeä aikaiseksi. Aiemmin olin kokeillut GitHub Copilottia ja Chat GPT:tä, mutta tämä työkalu ylitti kaikki odotukseni ja toteutti visioni ottaen huomioon jokaisen yksityiskohdan nivoen ne yhteen yhdeksi kokonaisuudeksi. Se oli täysin uudella tasolla verrattuna aiemmin käyttämiini AI-työkaluihin koodauksessa.

Käytin Clauden normaalia Chattia hioessani promptia ja API:n tech stackia ja päädyin käyttämään monia teknologioita(zod ja TypeScript), joita en aiemmin ollut käyttänyt. Claude.code teki omaan silmääni hyvää työtä näiden teknologioiden yhdistämisessä. Sain mitä halusin. 

Pyysin myös sitä tuottamaan selkeää ja luettavaa koodia, joka myös onnistui hyvin. Tekoäly myös älysi itse asentaa esimerkiksi ESLint:n ja prettier:n. 

Huomautin sitä myös, että tästä tulee ensimmäinen TypeScript projektini. Olen aiemmin käyttänyt JavaScriptiä ja Reactia, mutta päätin haastaa itseni sillä TS lienee nykyään enemmän standardi tietoturvasyistä ja tarkoitukseni on ottaa se haltuun. Tekoäly päätti selittää minulle auki tiedostoissa joitakin olennaisia TS konsepteja, mikä auttoi jonkin verran. Onneksi olin katsonut joitakin videoita TypeScriptin peruskonsepteista, sillä tekoäly meinasi aluksi tehdä projektin laatimatta interfaceja. Laitoin tekoälyn kanssa interfacet kuntoon jo ensimmäiseen promptiin, joten niidenkään kanssa ei lopulta tullut ongelmaa.

Ajatusten ja ideoiden kääntäminen koodiksi sujuu kuin valssi. En nähnyt syytä kirjoittaa koodia itse. 



2. Mitä tekoäly teki huonosti?

Tekoäly ei ole paras ajattelemaan käytettävyyttä ihmisen kannalta, erityisesti sellaisen, joka ei ymmärrä tietokoneista niin paljoa. Minulla on itselläni koulutusta myös käytettävyyssuunnittelupuolelta, joten nämä yksityiskohdat paistavat omaan silmääni heti, ei välttämättä suoranaisina virheinä, mutta selkeänä parannuskohtana.

Myös tokenrajan vastaan tuleminen pääsi yllättämään. Huomaan, että vaikka jotkut netissä painottavatkin, koodin mahdollisimman nopeasti AI:lla tekemistä, pidemmillä prompteilla saa enemmän tehtyä ja säästettyä resursseja. Git commitit ja muut vastaavat perusoperaatiot kannattaa tehdä suoraan vaan perus terminaalista.

Tekoäly ei aina ymmärtänyt mikä on käytännön näkökulmasta järkevää. Esim. 1min minimivarausrajan muutin 30min rajaksi.

Jouduin jossain vaiheessa myös huomauttamaan rest client pyyntöjen päivityksestä. Kun se ei älynnyt niitä muiden tiedostojen mukana päivittää jostain syystä. Onneksi tuli kokeiltua ne manuaalisesti ennen committausta. 



3. Mitkä olivat tärkeimmät parannukset, jotka teit tekoälyn tuottamaan koodiin ja miksi?

Tuotin kaiken koodin tekoälyllä, mutta osa muokkauksista oli yksityiskohtaisempia. En näe pointtia miksi koodata ilman tekoälyä nykypäivänä, jos kyse ei ole nimenomaan koodauksen opiskelusta. Tekoäly osaa syntaksin ja minä ymmärrän mitä tahdon ohjelman tekevän. Tekoäly kääntää ideani ohjelmointikielille ja editoi muutokset, usein moniin tiedostoihin koko projektin laajuisesti. 

Ensimmäisen promptin kanssa annoin Claude.coden kirjoittaa kaikki tiedostot suoraan, mikä oli ehkä virhe. Olisi voinut olla hyödyllistä tarkastaa tiedostot läpi jo siinä vaiheessa. Sovelluksesta tuli kuitenkin toimiva kaikilta osin, ja saatoin commitata koodin heti testattuani sen Clauden suorittamien testien lisäksi manuaalisesti rest client kutsuilla.

Päätin muuttaa varaus systeemin bisnesslogiikaa, niin että se sallii varaukset 30min - 12h, jotka voivat myös mennä keskiyön yli. Tämän muutoksen tein niin, että katselmoin jokaisen tiedoston erikseen. Tämä oli hyvä sillä sain tähdennettyä joitakin yksityiskohtia, jolloin säästyi uusia promptauskertoja.