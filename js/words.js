const forbiddenWords = ["eivät", "kuin", "kasvattajaseura", "syksymmäksi","paskapää",
, "aakkosittain", "aalloittain", "aamuisin", "aamupäivisin", "aamusella", "aamutuimaan", "aamuvarhain"
, "aasimaisesti", "aavemaisesti", "abi", "abo"
, "absoluuttisesti", "abstraktisti", "absurdisti", "adekvaatisti", "adjektiivisesti", "adverbiaalisesti", "adverbisesti", "adversatiivisesti", "aerodynaamisesti",
"abortoida", "abortointi", "abortti", "aborttipilleri", "aborttitabletti",
, "affektiivisesti", "affektisesti", "aggressiivisesti", "agnostisesti", "ahdashenkisesti", "ahdasmielisesti", "ahdasnäköisesti", "ahdasrajaisesti", "ahdistuneesti",
"aggressio", "ahdinko", "ahdinkotila", "ahdistaa", "ahdistaja", "ahdistelija", "ahdistella", "ahdistelu", "ahdistua", "ahdistuneisuus",
, "ahdistunut", "ahkeraan", "ahkerasti", "ahnaasti", "ahneesti", "ahtaalla", "ahtaalle", "ahtaasti", "aiemmin", "aiheetottomasti", "aijai",
"ahdistuneisuushäiriö", "ahdistus", "ahdistusneuroosi", "ahdistustila", "ahmimishäiriö", "ahteri", "AIDS", "AIDS-potilas",
, "aikaisemmin", "aikaisin", "aikaisintaan", "aikanaan", "aikansa", "aikoinaan", "aikojaan", "aina", "ainaiseksi",
"aikamiina", "aikapommi",
"ainakaan", "ainakin", "ainiaaksi", "ainiaan", "ainiaksi", "ainian", "ainoastaan", "aistikkaasti", "aistillisesti",
"aistiharha", "aistivammainen"
, "aivan", "ajallaan", "ajallisesti", "ajan mittaan", "ajanmukaisesti",
"aitosyöpä", "aivohalvaus", "aivoinvalidi", "aivojenpesu", "aivokalvontulehdus", "aivokasvain", "aivokuolema", "aivokuollut", "aivokuume", "aivoleikkaus", "aivopestä", "aivopesu", "aivosairaus", "aivotärähdys", "aivovamma", "aivovammainen", "aivovaurio", "aivovauriolapsi", "aivoverenvuoto", "aivoveritulppa", , "ajassa", "ajassaan", "ajattelemattomasti", "ajattomasti", "ajatuksellisesti", "ajatuksettomasti", "ajetuksissa", "ajoissa", "ajoittain",
"ajatusharha", "ajojahti"
, "akateemisesti", "akkamaisesti",
"ajomiina", "akka", "akkamainen", "akkamaisuus", "akkavalta",
"akselivallat", "akseptata", "akseptaus", "aktiivat", "ala-arvoinen", "ala-arvoisesti", "ala-arvoisuus",
"alakanttiin", "alakautta", "alakkain", "alakynnessä", "alakynteen", "alallaan", "alalleen", "alamaihin", "alamaissa", "alapää", "alas", "alaspäin", "alassuin", "alasti", "alastonkuva", "alastonmalli", "alateitse", "alati", "alatusten", "alatuuleen", "alatuulessa", "alaviistoon", "alaviistossa"
,"albiino", "alekkain", "alemma", "alemmaksi", "alemmas", "alempaa", "alempana", "aletusten", "alhaalla", "alhaalle", "alhaalta", "ali"
, "alimma", "alimmaksi", "alimmas", "alimpana", "alinomaa", "alipalkattu", "aliravittu", "alistua", "alitse", "alituiseen", "alituisesti", "alitusten", "alkaen", "alkeet"
, "alkeistiedot", "alkoholihumala", "alkoholimyrkytys", "alkoholiongelma", "alkoholiongelmainen", "alkoholiriippuvuus", "alkoholismi", "alkoholisoitua", "alkoholisti", "alkuaan", "alkuasukas", "alkuasukasheimo", "alkuisin", "alkujaan", "alkuopinnot",
"alkupää", "alkuvaikeudet", "alkuun", "alkuunkaan", "alla", "alla mainittu", "alla oleva", "allapäin", "alle", "allekirjoittanut", "allekkain", "alletusten",
"aloillaan", "aloilleen", "aloittain", "alta", "altapäin", "alueittain",
"aluksi", "alulla", "alullaan", "alumpana", "alun", "alun alkaen", "alun perin", "alun pitäen", "alussa mainittu", "alusta", "alusvaatteisillaan", "alusvaatteisilleen", "alvariinsa",
"amfetamiini", "ammateittain", "ammattihaureus", "ammattiopinnot",
"ammattirikollinen", "ammattitappaja", "ammis", "ammoin", "ammolla", "ammollaan", "ammolle", "ammolleen", "ammu", "amokjuoksija", "amokjuoksu", "ampu",
, "anaalinen", "anakronistisesti", "analfabeetti", "analgeettisesti", "analogisesti", "analyyttisesti", "anamnestinen", "anarkistisesti", "anatomisesti", "androgeeninen", "androgyyninen", "andrologisesti", "aneemisesti", "anestesiologisesti", "anglikaaninen"
, "anglosaksinen", "ankarasti", "ankeasti", "annoksittain", "anomaalisesti",
, "ansaitusti", "ansiokkaasti", "ansiottomasti", "antaumuksellisesti", "anteeksiantamattomasti", "antidepressiivi", "antikristus", "antisemiitti", "antisemiittinen",
, "antisemiittisesti", "antisemitismi", "antisosiaalinen", "antoisasti", "antropologisesti", "apaattisesti", "apartheid", "apartheidpolitiikka", "apeasti", "apeissaan", "apokryfisesti", "apposen", "apposet"
, "apriorisesti", "apukoulu", "arasti"
, "aristokraattisesti", "arjalainen", "arkaistisesti", "arkeittain", "arkeologisesti", "arkipäivisin", "arkisesti", "arkisin", "arkittain", "arkkitehtonisesti",
, "armeliaasti", "armollisesti", "armomurha", "armottomasti", "arrogantisti"
, "arvaamattomasti", "arvatenkaan", "arvatenkin", "arvattavasti", "arvelevasti", "arveluttavasti", "arviolta", "arvoituksellisesti", "arvokkaasti"
, "arvostelevasti", "arvostelukyvyttömästi", "arvottomasti", "arvovaltaisesti", "arvoväritteisesti", "asbesti", "asbestikangas", "asbestikuitu", "asbestilevy", "asbestoosi", "aseistakieltäytyjä", "asemasta", "asemesta"
, "asenteellisesti", "aseptisesti",
"asianmukaisesti", "asiantuntevasti", "asiattomasti", "askeettisesti", "asosiaalisesti", "askelittain", "askelmittain", "askele",
"aspi", "astahtaa", "asuin-",
"asuma", "asutustilallinen",
"atk-kirjoittaja", "atk-pohjainen", "atropia", "atto-", "aukea", "auki",
"auktoritatiivisesti", "auliisti", "aurinkoisesti", "aussi", "autella"
,"automaattisesti", "autoritaarisesti", "autoritäärisesti"
,"auttamattomasti", "auttavasti", "autuaallisesti", "autuaasti"
,"avoimesti", "avojaloin", "avokatseisesti", "avokäsin", "avokätisesti"
, "avionrikkoja", "aviorikos",
, "bakkanaali", "banaanivaltio", "bandiitti", "barbaari", "barbaarimainen", "barbaarimaisesti", "barbaarimaisuus", "barbaarinen", "barbaarisesti", "barbaarisuus", "bastardi", "besserwisser"
, "bigaaminen", "bigamia", "bikinialushousut", "bikinihousut", "bikinit", "bi-mies", "bi-nainen", "bioase",
, "biataisteluaine", "biseksuaalinen", "biseksuaalisesti", "biseksuaalisuus", "body stocking", "bolsevikki", "bolševikki", "bolsevikkivallankumous", "bolševikkivallankumous", "bolsevismi", "bolševismi", "bolsevistinen", "bolševistinen", "blondi", "blondiini", "bluffata", "bluffaus", "bluffi"
, "bordelli", "botuliini", "botulismi", "brenkku", "brežneviläinen", "brežneviläisesti", "brežneviläisyys", "broileripoliitikko", "brutaali", "brutaalius"
, "bryssä", "bulevardilehdistö", "bulevardilehti", "buliimikko", "bulimia", "bulvaani", "burnout", "busmanni", "bušmanni", "buuata", "buuaus", "byrokraatti", "byrokraattinen", "byrokraattisesti", "byrokraattistaa", "byrokraattistua", "byrokraattisuus", "byrokratia", "byrokratisoida", "byrokratisointi", "byrokratisoitua", "bänet", "bänks", "casanova"
, "contrasissi", "crack"
, "debiili", "deekikselle", "deekiksellä", "deeku", "degeneraatio", "degeneroitua", "dekadenssi", "dekadentti", "delata", "demagogi", "demagogia", "demagoginen", "demari", "dementikko", "dementti"
, "demoni", "demoninen", "demonisesti", "demonisuus", "demoralisoida", "demoralisointi", "demoralisoitua", "depis", "depressiivinen", "depressiivisesti", "depressiivisyys", "depressio", "depressiokausi", "depressiolääke", "depressiotila", "desantti", "despootti", "despoottinen", "despoottisesti", "despoottisuus", "despotia", "despotismi"
, "diabeetikko", "diabetes", "diatsepaami"
, "diileri", "diiva", "diivailla", "diivailu", "diivata", "diktaattori", "diktatorinen", "diktatorisesti", "diktatorisuus", "diktatuuri", "diktatuurivaltio", "diletantismi", "diletantti", "dioksiini", "disinformaatio", "diskata", "diskaus", "diskriminaatio", "diskriminoida", "diskriminointi", "diskvalifioida", "diskvalifiointi", "dissidentti"
, "dokata", "dokaus", "doku", "dorka", "dorkasti", "doupata"
, "dumdumluoti", "dumpata", "dumppaus", "dödö", "dösä", "edelle", "edelleen", "edellisen kaltainen", "edellä", "edellä esitetty", "edellä mainittu", "edeltä", "edeltäkäsin", "edeltäpäin", "edemmä", "edemmäksi", "edemmäs", "edempänä", "edempää", "edes", "edespäin", "edessä", "edessäpäin", "edestakaisin", "edestä", "edestäpäin"
, "editse", "edus", "edusta", "edusteilla", "eespäin"
, "ehdyksiin", "ehdyksissä", "ehei", "ehken", "ei-kenenkään-maa"
, "ejakulaatio", "eioo", "ekshibitionismi", "ekshibitionisti", "ekshibitionistinen", "ekstaasi"
, "eksykki", "eksyksiin", "eksyksissä", "eksyksistä"
, "elinkautistuomio", "elinkautisvanki", "elintasopakolainen", "ellottaa", "ellotus"
, "elohopeamyrkytys", "eloon", "elossa", "elostelija", "elostella", "elostelu", "elukka", "elähtänyt", "eläimellinen", "eläimellisyys", "eläinkoe"
, "eläinrääkkäys", "eläköön", "elämänkielteinen", "elämänkielteisesti", "elämänkielteisyys", "elämänpelko"
, "elämöidä", "elämöinti", "elätti", "elättivaris", "elävältä", "emakko"
, "empiä", "emä", "emäksisesti", "emäs", "emätin", "emätinhuuhtelu", "emätinpuikko", "emätintulehdus", "emävalhe", "endeemisesti", "endokrinologisesti", "enemmälti", "enemmän", "enempi", "enempää", "enenevästi"
, "enetä", "engelsmanni", "englannintaa", "enimmin", "enimmiten", "enimmäistää", "enimmäkseen", "enimmälti", "enimmältään", "enimmän", "enin", "enintään", "eniten", "ennakkoon", "ennakoida"
, "ennakolta", "ennallaan", "ennalleen", "ennalta", "ennemmin", "ennen", "ennestään", "ennustajaeukko", "ennättää", "ensi", "ensiksi", "ensimmältä", "ensin", "ensinkään", "ensinnä", "ensisijaisesti"
,"ensi sijassa", "enteillä", "entiselleen", "entisellään", "entisensä", "entisestään", "entistää", "entisöidä", "entrata", "entuudestaan", "entä", "entäpä", "entäpäs", "entäs", "entää", "enää", "epeli", "epileptikko", "e-pilleri", "epuuttaa"
,"epähuomiossa", "epäilemättä", "epäilevästi", "epäillä", "epäilyttävästi", "epäilyttää", "epäkunnossa", "epäkuntoon", "epäkäs"
, "epämiellyttävästi", "epämukavasti", "epämuodostua", "epämääräisesti", "epämääräistyä", "epänormaalisti", "epäoikeudenmukaisesti", "epäolennaisesti", "epäonnistua", "epäpätevästi", "epärealistisesti", "epärehellisesti", "epäreilusti", "epäröidä", "epäselvästi", "epäsiististi", "epäsikiö",
"epäsopuisesti", "epäsosiaalisesti", "epäsovinnaisesti", "epäsuhtaisesti", "epäsuomalaisesti", "epäsuopeasti", "epäsuorasti", "epäsuosiollisesti", "epäsuotuisasti", "epäsymmetrisesti", "epäsäännöllisesti", "epätaiteellisesti", "epätaloudellisesti", "epätarkasti", "epätarkoituksenmukaisesti", "epätasaisesti", "epätavallisesti", "epäterveellisesti", "epäterveesti", "epätieteellisesti", "epätodennäköisesti", "epätoivoisesti", "epätoivoissaan", "epätyydyttävästi", "epätäsmällisesti", "epätäydellisesti", "epäurheilijamaisesti",
"epäuskoisesti", "epäuskottavasti", "epävakaasti", "epävakaisesti", "epävarmasti", "epäviihtyisästi", "epäviisaasti", "epävirallisesti", "epävireeseen", "epävireessä", "epävireisesti", "epäyhtenäisesti", "epäys", "epäystävällisesti", "epäämättömästi", "erakoitua", "erehdyttää", "erehtyä", "erektio", "ergonomisesti", "erheellisesti", "eri", "eriaikaisesti", "eriarvoistaa", "eriarvoistua", "eriasteisesti", "erikoisesti", "erikoishoikka", "erikoislaatuisesti"
, "erikoistaa", "erikoistua", "erikseen", "erilaistaa", "erilaistua", "erilleen", "erimuotoisesti", "erinomaisesti", "eripuraisesti", "eriskummallisesti", "erillään"
, "eristyä", "eristäytyä", "eristää", "erisuuntaisesti", "eritasoisesti", "eritellä", "eritoten", "erittyä", "erittäin", "erittäinkin", "erittää", "erityisesti", "erityyppisesti", "eritä", "eriyttää", "eriytyä", "erkaantua", "erkanee", "erkautua", "eroon", "eroottisesti", "eroottistaa", "eroottistua", "erossa", "erota", "erotella", "erotisoida", "erotisointi", "erotisoitua"
, "erotomaani", "erotomania", "esiaviollinen"
, "esileikki", "esinahka", "esipuberteetti"
, "eskimo", "eskimokajakki", "eskimokoira", "eskimopyörähdys"
, "etelävaltalainen", "etelävaltio"
, "eturauhanen"
, "etäpesäke", "eunukki", "eutanasia", "evakko"
, "fakki-idiootti", "fallinen", "fallos", "fallossymboli"
, "fasismi", "fasisti", "fasistinen", "fasistipuolue", "femakko", "fennomaani"
, "fetisismi", "fetisisti", "fetisistinen", "fetissi", "fiasko"
, "fissiopommi",
"foneettisesti", "foniatrisesti", "fonologisesti", "formaalisesti", "formalistisesti", "fotoni"
, "frigidi", "frigiditeetti", "frigidiys", "friikki", "fritsu", "fudut", "fundamentalistinen", "fundamentalistisesti",
"fuusiopommi", "gangsteri", "gangsterielokuva", "gangsteriliiga", "gangsterismi",
"gay", "genitaalinen", "genitaalit", "gerillasota", "getto", "gettoistua", "gettoutua", "ghetto", "ghettoutua",
"gigolo", "giljotiini", "gladiattori", "go-go-tyttö", "gonokokki", "gonorrea", "gorilla"
, "granaatti", "gravidi", "graviditeetti", "groteski", "guerillasota", "gynekologi", "gynekologia", "gynekologinen", "gängi", "haaksirikko", "haaksirikkoinen", "haaksirikkoutua"
, "haamuasiakas", "haamupotilas", "haaremi", "haaska", "haaskaeläin", "haaskalintu", "haaskata", "haaskaus", "haaskautua", "haastaa", "haastaja", "haaste", "haastehakemus", "haastemies",
"haava", "haavainen", "haavakko", "haavakuume", "haavamuodostuma", "haavatartunta", "haavatulehdus", "haavauma", "haavautua", "haavautuma", "haaveri", "haavoittaa", "haavoittua", "haavoittuva", "haavoittuvuus", "hahattaa", "haihattelija", "haihattelu", "haimaneste", "haimasyöpä", "haimatulehdus", "hairahdus", "hairahtaa", "hairahtua", "hairahtuvainen", "haiskahtaa", "haista",
"haistatella", "haistattaa", "haistattelu", "haisuliini", "haitallinen", "haitallisesti", "haitallisuus", "haitanteko", "haitta", "haitta-aste", "haittapuoli", "haittatekijä", "haittavaikutus", "hajaannus", "hajaannustila", "hajaannuttaa",
"hajupommi", "hajuvirhe", "hakaristi", "hakaristilippu", "hakata", "hakkelus", "hakkeri", "hakkeroida", "hakkerointi", "hakkuukielto", "hakoteille", "hakoteillä", "haksahdus", "haksahtaa", "hakuammunta", "hakusaarto",
, "halikkain", "hallintoalamainen"
, "hallitustenvälinen", "hallitusti", "hallussa", "hallusta", "halpa-arvoinen", "halpa-arvoisuus", "halpahintainen", "halpakorkoinen", "halpamainen", "halpamaisesti", "halpamaisuus", "haltioihinsa", "haltioissaan", "haltuun", "halukas", "halukkaasti", "halukkuus", "halullinen", "haluton"
, "haluttomasti", "haluttomuus", "halvattu", "halveerata", "halveksia", "halveksinta", "halveksua", "halveksunta", "halvennus", "halventaa", "halventavasti", "hamevalta", "hameväki"
, "hampaaton", "hampaattomasti", "hampaattomuus", "hamppari", "hampparoida", "hampuusi", "hamstraaja", "hamstrata", "hanakasti", "hanakka", "hanakkuus", "handicap", "handu", "hangoitella", "hankala", "hankalakulkuinen", "hankalakäyttöinen", "hankalatöinen", "hankaloittaa", "hankaloitua", "hankaluus"
, "hanslankari", "hantlankari", "hanttapuli", "hantti", "hanttihomma", "hanttiin", "hanttikortti", "hanttimies", "hanttityö", "hanuri", "hapannaama", "happamasti", "happamesti", "happoveikko", "happy hour"
, "harakanvarvas", "harakiri", "haralla", "harallaan", "haralle", "haralleen", "harha-aistimus", "harhaan", "harhaanjohtava", "harhaannuttaa", "harhaantua", "harhaanvievä", "harha-askel", "harhahavainto", "harhaheitto", "harhailla", "harhailu", "harhainen", "harhaisku", "harhakuva", "harhakuvitelma", "harhakäsitys", "harhalaukaus", "harhaluoti", "harhaluulo", "harhamielisyys", "harhanäky", "harhaoppi", "harhaoppinen", "harhapolku", "harhapäätelmä", "harharetki", "harhasoitto", "harhassa", "harhasyöttö", "harhateille", "harhateillä", "harhateiltä", "harhauma", "harhauttaa", "harhautua", "harhautuma", "harhautus", "harilla", "harillaan", "harille", "harilleen", "harjaantumaton", "harjaantumiskoulu"
, "harkinnanvarainen", "harkitsematon", "harkitsemattomasti", "harkitsemattomuus", "harkitseva", "harkitsevainen", "harkitsevaisuus", "harkitsevuus", "harkittu", "harkitusti", "harmaahapsinen", "harmaahiuksinen", "harmaapartainen", "harmaapäinen", "harmaasilmäinen", "harmaatukkainen", "harmillinen"
, "harmissaan", "harmistuksissaan", "harmiton", "harrastelijamainen", "hartaasti"
, "harvaan", "harvahampainen", "harvainvalta", "harvainvaltainen", "harvakseen", "harvakseltaan", "harvalukuinen", "harvapuheinen", "harvasanainen", "harvassa", "harvemmin", "harvempaan", "harventamaton", "harvoin", "hasardi", "hasis", "hassahtanut", "hassahtava", "hassata", "hassu", "hassunkurinen", "hassusti", "hassutella", "hassuttaa", "hassuttelu", "hassutus", "hatara", "hatarasti", "hataruus", "hatkat", "hattupäinen", "hattureuhka", "hatunreuhka", "hatuttaa", "haudanhiljainen", "haudanhiljaisuus", "haudanhäpäisy", "haudankaivaja", "haudanryöstö", "haudantakainen", "haudanvakava", "haudanvakavasti", "haudanvakavuus"
, "haukkua", "haukkumakirje", "haukkumanimi", "haukkumasana", "haureellinen", "haureellisuus", "haureus", "hauskannäköinen", "hauskasti", "hauva"
, "he", "hedelmöidä", "hedelmöittyä", "hedelmöittää", "hedelmöityä"
, "heijari", "heikkolahjainen", "heikkolahjaisuus", "heikkomielinen", "heikkomielisyys", "heikkopäinen", "heilaus"
, "heinähattu", "heitteille", "heitteillä", "heitteiltä", "heittiö", "heittopussi"
, "helibor", "heliborkorko", "helkatti", "helkkarinmoinen", "helkkaristi", "helkkari", "helkutti", "hellapoliisi"
, "hellitä", "helppoheikki"
, "helskutti", "helvetillinen", "helvetinkone", "helvetinmoinen", "helvetisti", "helvetti", "hemmetinmoinen", "hemmetisti", "hemmetti", "hempukka", "hengissä"
, "henkihieveriin", "henkihieverissä", "henkiin", "henkilöidä"
, "henkipatto", "henkiriepu", "henkitoreihin", "henkitoreihinsa", "henkitoreisiin", "henkitoreisiinsa", "henkitoreissa", "henkitoreissaan", "hepsankeikka", "hepuli", "hereille", "hereillä"
, "herja", "herjaaja", "herjakirjoitus", "herjasana", "herjata", "herjaus", "herkkyys", "herkkä", "herkkähipiäinen", "herkkänahkaisuus", "hermoheikko", "hermoraunio", "hermostuksissaan"
, "heroiini", "heroinisti", "herrajesta", "herrajestas", "herrakansa", "herranen", "herranjesta", "herranjestas", "herranterttu", "herraviha", "herraus"
, "herättää", "herätä", "hetkahtaa", "hetkauttaa", "hetkua", "hetkutella", "hetkuttaa", "hetkutus", "hevostella"
, "hidastaa", "hidastella", "hidastua", "hidastuttaa", "hiekka-aavikko", "hiekkapestä", "hiekkapuhaltaa", "hiekoittaa", "hienohelma"
, "hienontaa", "hienontua", "hienosahata", "hienostella", "hienostua", "hienosäätää", "hienota", "hieraista", "hieroa", "hieromasauva", "hieroskella", "hierottaa", "hieroutua", "hiertyä", "hiertää", "hiestyä", "hiestää", "hievahtaa", "hievauttaa", "hiffata", "hihhuli", "hihhuloida", "hihitellä", "hihittää"
, "hihkaista", "hihkua", "hihnoittaa", "hiihdellä", "hiihtää", "hiilettyä", "hiilettää"
, "hiillostaa", "hiillostua", "hiillyttää", "hiiltyä", "hiiltää", "hiipata", "hiipiä", "hiippailla", "hiippari", "hiipua", "hiiskahtaa", "hiiskua", "hiitata", "hiivata", "hiivatinmoinen", "hiivatisti", "hiivatti", "hiiviskellä", "hikeentyä", "hikeytyä", "hikipinko", "hikipäissä", "hikipäissään", "hikoilla", "hikoiluttaa", "hilata", "hilautua", "hilavitkutin", "hiljakkoin", "hiljakseen", "hiljalleen", "hiljan"
, "hiljentyä", "hiljentää", "hiljetä", "hilkulla", "hilleri", "hillitä", "hillota", "hilloutua", "hillua", "hilpaista", "hilsehtiä", "hilseillä", "hilsettyä", "himmennyttää", "himmentyä", "himmentää", "himmetä", "himoita", "himomurha", "himomurhaaja", "himota", "himottaa", "himpun", "hinata", "hinauttaa", "hinautua", "hinkata", "hinkki", "hinkua", "hinnoitella"
, "hinnoittaa", "hinttari", "hintti", "hinttiys", "hioa", "hiostaa", "hiostua", "hiostuttaa", "hiota", "hiottaa", "hioutua", "hipaista", "hipat", "hipelöidä", "hipoa", "hippasilla", "hippasille", "hippulat", "hiprakka", "hipsiä", "hipsutella", "hipsuttaa"
, "hirmustua", "hirmuteko", "hirmutyö", "hirmuvalta", "hirnahdella", "hirnahtaa", "hirnua", "hirsipuu", "hirttyä", "hirttäytyä", "hirttää", "hirtättää", "hirvestää", "hirvetä", "hirvitellä", "hirvittää", "hirvitä", "hisahtaa", "hissata"
, "hissukka", "hissukseen", "hissuksiin", "hissun kissun", "hissutella", "hissuttaa", "historioida", "hitonmoinen", "hitosti", "hitsaantua", "hitsata", "hitsautua", "hitto", "hittolainen", "hiuduttaa", "hiukaista", "hiukoa", "hiuksenhalkominen"
, "hiustenhalkaisu", "hiustenhalkoja", "hiustenhalkominen", "hiutua", "hivauttaa", "hivellä", "hiveltää", "hivuttaa", "hivuttautua", "hohdella", "hohhoijaa", "hohkata", "hohkua", "hohoi", "hohottaa", "hohtaa", "hoidattaa", "hoidella", "hoikentaa", "hoikentua"
, "hoitajatar", "holhokki", "holhotti"
, "holokausti", "holtittomasti", "homekorva", "homo", "homoeroottinen", "homofiili", "homofiilinen", "homofiilisuus", "homofiilius", "homofobia", "homoliitto", "homopari", "homoseksuaali", "homoseksuaalinen", "homoseksuaalisuus", "homoseksualismi", "homoseksualisti", "homous"
, "horisko", "horkka", "horna", "hornankattila", "horre"
, "horteessa", "hoteisiin", "hoteissa", "hoteista", "hotellipoika", "hottentotti", "houkka", "houkkamainen", "houkkio", "hourula", "hourupäinen", "housusillaan", "housusilleen"
, "huikeasti", "huikentelevaisesti", "huikentelevasti", "huimapäisesti", "huimasti"
, "huithapeli", "huitukka", "hujakoilla", "hujan hajan", "hujoppi", "hukassa", "hukkaan", "hukkateille", "hukkateillä", "hukuksiin", "hukuksissa", "huligaani", "hulivilipoika", "hulivilityttö", "hullujenhuone"
, "hullunkurisesti", "hullusti", "hulttio", "hulttiomainen", "humalapäissä", "humalapäissään", "humoristisesti", "humpuuki", "hunajaisesti", "hunajapupu", "hunni"
, "hunningolla", "hunningolle", "hunsvotti", "huolehtivaisesti", "huolellisesti", "huoleti", "huoletta", "huolettomasti", "huolimatta", "huolimattomasti", "huolissaan"
, "huomaamattomasti", "huomaan", "huomaavaisesti", "huomassa", "huomattavasti", "huomenissa", "huomenna", "huomionkipeä", "huomioon ottaen", "huonomaineinen", "huono-oppinen"
, "huonosti", "huonotapainen", "huora", "huorahtava", "huorata", "huorin", "huorintekijä", "huorinteko", "huoripukki", "huoruus", "huostaan", "huostassa", "huostasta", "huovikas", "hupaisasti", "hupakko", "hupiveikko", "huppeli", "hupsia", "hupsis", "hupsista", "hupsusti", "hurjasti"
, "hurme", "hurmeinen", "hurmosliike", "hurri", "huru-ukko", "hutsu", "hutu"
,"huumausaine", "huume", "huumejengi", "huumekasvi", "huumekauppa", "huumekauppias", "huumeklinikka", "huumekoira", "huumekuriiri", "huumenuori", "huumepoliisi", "huumepotilas", "huumeriippuvuus", "huumerikollisuus", "huumerikos", "huumetesti", "huuri", "huusi", "huussi", "huut", "huuti", "huutolainen", "huutolaispoika",
, "huvitutti", "hyeena", "hyh", "hyi", "hylkiö", "hylkyauto", "hymen"
, "hynä", "hyperventilaatio", "hypnoosi", "hypnotisoida", "hypotermia", "hys", "hysteerikko", "hysteerinen"
,"hysteria", "hyväksikäyttö", "hyväkäs"
, "hyypiö", "hyysätä", "hyödyksikäyttö", "hyödykäs", "hyökkäys", "hyökkäysase", "hyökkäyssota", "hyökkäysuhka", "hyökkäysvaunu", "hyökkääjä", "hyökkäävä", "hyökkäävästi", "hyökätä", "hyönteismyrkky"
, "hyötöreaktori", "hä", "hädissään", "hädänalainen", "häh", "hähättää", "häijy", "häijynilkinen", "häijysti", "häijyys", "häikkä", "häikäilemättä", "häikäilemättömyys", "häikäilemättömästi", "häikäilemätön", "häippäistä", "häiriintynyt", "häiriintyä", "häirikkö", "häiriköidä", "häirintä", "häirintätuli", "häiritsijä", "häiritä", "häiriö", "häiriötila", "häiskä", "häjy", "häkäkaasu", "häkämyrkytys"
, "hämärämies", "hämäräperäinen", "hännystelijä", "hännystellä", "hännystely", "häntyri", "häpeissään", "häpeä", "häpeällinen", "häpeällisesti", "häpeämerkki", "häpeämättömyys", "häpeämättömästi", "häpeämätön", "häpeäpaalu", "häpeäpenkki", "häpeäpilkku", "häpeärangaistus", "häpeätahra"
, "häppä", "häpy", "häpyhuuli", "häpykannus", "häpykarvat", "häpykarvoitus", "häpykieli", "häpykukkula", "häpyluu", "häpäistä", "häpäisy", "härkäpäinen", "härski", "hässiä", "hässäkkä", "hätähousu", "hätäinen"
, "hätäpäissään", "hätäteurastaa", "hätäteurastus", "hätätila", "hätävalhe", "hätäännyksissä", "hätäännyksissään", "hätäännys", "hävittäjä", "hävittäjäalus", "hävittäjäkone", "hävittäjälaivue", "hävittäjälentokone", "hävittäjälentäjä", "hävittäjäpommittaja", "hävittää", "hävitys", "hävyttömyys", "hävyttömästi", "hävytön", "häväistys", "häväistysjuttu", "häväistyskirjoitus", "häväistä", "häätää", "häätö", "häätömääräys"
, "häävuode", "höhlä", "hökkeli", "hökkelikaupunki", "hökkelikylä", "hökötys", "hölinä", "hölmö", "hölmöläinen", "hölynpöly", "hölö", "hölösuinen", "hölösuu", "hömppä", "hömppäsivu", "hömpsy", "hömpsötys", "hömpötys", "höntti", "hönö", "höperö", "höpinä", "höppänä", "höpsähtänyt", "höpsähtävä", "höpsö", "höpö", "höpöpuhe", "höpötys", "hörhelö", "hörhö", "hörppy", "hörtsö", "hörähdys", "hörökorva", "hörönauru",
, "höröttää", "hörötys", "höskä", "hösseli", "hössäkkä", "hössötys", "hötkyily", "höttö", "höttösissään", "hötäkkä", "hötö", "höyde", "höyhensaaret", "höykky", "höykänen", "höynä", "höyrypäinen", "höyrypää"
, "höyrähtää", "höösätä", "höösäys", "icing", "identiteettikriisi", "idiootti", "idioottimainen", "idioottimaisuus", "idioottivarma", "idis", "idoli", "ientulehdus",
, "ihmiskilpi", "ihmismetsästys",
"ihmispeto", "ihmisraunio", "ihmisryöstö", "ihmissyöjä", "ihmissyönti", "ihmistäi", "ihmisuhri", "ihmisviha", "ihmisvihaaja", "ihmokasvain", "ihomato", "ihosyöpä", "ihra", "ihramaha", "ihramahainen", "iilimato", "iiri", "iiriläinen", "iirin kieli", "iiris", "iirishimmennin", "iirispainanta", "iirispainatus", "iivana",
"ikenet", "iki-ihastunut", "ihanne-", "ihme-", "ikäkausikilpailut", "ikäkulu"
,"ikäloppu", "ikäneito", "ikäsyrjintä", "ikävissään", "ikävystynyt", "iljettävyys", "iljettävä", "iljettää", "iljetys", "ilkeillä", "ilkeily", "ilkeys", "ilkeä", "ilkeäluonteinen", "ilkeämielinen", "ilkeämielisyys", "ilkeännäköinen", "ilkialasti", "ilkialaston", "ilkikurinen", "ilkimys", "ilkityö", "ilkivalta", "ilkivaltainen", "ilkivaltaisuus", "ilkiö", "ilkkua", "ilkosillaan", "ilkosilleen"
, "ilma-ase", "ilmaherruus", "ilmahyökkäys", "ilmahälytys", "ilmais-", "ilmaisku", "ilmajuoppo", "ilmakivääri", "ilmakuoppa",
, "ilmansaaste", "ilmapistooli", "ilmapistooliammunta", "ilmarinta", "ilmarosvo", "ilmarosvous", "ilmasodankäynti", "ilmasota", "ilmataistelu", "ilmatorjunta", "ilmatorjunta-ase", "ilmatorjuntajoukot", "ilmatorjuntaohjus", "ilmatorjuntapatteri", "ilmatorjuntapatteristo", "ilmatorjuntatuli", "ilmatorjuntatykistö", "ilmatorjuntatykki", "ilmavaara", "ilmavaivat"
, "ilmavoimat", "ilmavoitto", "ilmeettömästi", "ilmeillä", "ilmeily", "ilmiantaa", "ilmiantaja", "ilmianto", "ilmiantovelvollisuus", "ilmielävästi", "ilmiriita", "ilmiselvästi", "ilmisota", "ilmiömäisesti", "ilmoitse", "iloisesti", "iloissaan", "ilokaasu", "iloliemi", "ilolintu", "ilonpilaaja"
, "ilotalo", "ilottomasti", "ilotyttö", "iltaisin", "iltasella"
, "imbesilli", "imelästi", "immenkalvo", "immuunistaa", "immuunistua", "impata", "implisiittisesti", "impotenssi", "impotentti", "imppaus"
, "impulsiivisesti", "individualistisesti", "indusoida", "indusoitua"
, "informaatiosota", "inhimillisesti", "inhottavasti", "inkkari", "inkontinenssi", "innoissaan", "innokkaasti", "innostuksissaan", "innostuneesti"
, "innottomasti", "insesti", "intensiivisesti", "interaktiivisesti", "intertekstuaalisesti"
, "intiimisti", "intohimoisesti", "intohimottomasti", "intomielisesti", "intrigoida", "intrigointi", "inttää", "intuitiivisesti", "invalidi", "invalidisoida", "invalidisoitua", "invalidoida", "invalidoitua", "irkata"
, "ironisesti", "irrallaan", "irralleen", "irrallisesti", "irrationaalisesti", "irstaasti", "irstailija", "irstailla", "irstailu", "irstainen", "irstas", "irstaus", "irti", "irtolainen", "irtonaisesti", "irveen", "irvessä", "irviin"
, "irvissä", "irvokkaasti", "iskevästi", "isi", "iskä"
, "isomahainen", "isosti", "isosuinen", "istualla", "istuallaan", "istualle", "istualleen", "istualta", "istualtaan", "istumalla", "istumalta"
, "istuvilla", "istuvillaan", "istuville", "istuvilleen", "istuvilta", "istuviltaan", "isukki", "isällisesti", "isänmaallisesti", "isäpappa", "isäukko", "italiaano", "itarasti", "itkeskellä", "itkusilmin", "itsari"
, "itsehalveksinta", "itsehalveksunta", "itseihailu", "itseinho", "itseiva", "itsekehu", "itsekeskeinen", "itsekeskeisyys", "itsekidutus", "itsekkyys", "itsekäs", "itsemurha", "itsemurhaaja", "itsemurhaisku", "itsemurhakandidaatti", "itsemurhalentäjä", "itsemurhaterrorismi", "itsemurhaterroristi", "itsemurhayritys", "itsensäpaljastaja", "itsensäpaljastaminen", "itserakas", "itserakkaus"
, "itseruoskinta", "itsesoimaus", "itsessään", "itsestään", "itsesyytös", "itsesääli", "itsetuho", "itsetuhoinen", "itsetuhokäyttäytyminen", "itsetypistys", "itsetyydytys"
, "iva", "ivahymy", "ivailla", "ivailu", "ivallinen", "ivamukaelma", "ivanauru", "ivata", "iätä"
, "jakomielinen", "jakomielisyys", "jakomielitauti", "jalan", "jalkahiki", "jalkainvalidi", "jalkapuoli", "jalkapuu", "jalkarätti", "jalkasieni", "jalkasilsa"
, "jalkavaimo", "jalkavaivainen", "jalkoväli", "jallittaa", "jallitus", "jamaan", "jamassa"
, "jannu", "japsi", "jarrutuslakko", "jarrutuspolitiikka"
, "jees-mies", "jeesustella", "jeesustelu", "jeeveli", "jengi", "jengiläinen", "jenginuori", "jenkki", "jenkkilä", "jepari", "jeppe", "jessus", "jesuiittamainen"
, "jobbari", "jobinposti", "johdonmukaistaa", "johtajantauti", "johtotroikka"
, "jokapaikanhöylä", "jolppi", "jonne", "jonninjoutava"
, "jonne", "jorina", "jorista", "joro", "jorottaa", "jorotus", "jorpakko", "jortsut", "joukkio", "joukkohauta", "joukkohautaus", "joukkohysteria", "joukkomurha", "joukkomurhaaja", "joukkopsykoosi"
, "joukkotuho", "joukkotuhoase", "joukkotuhonta", "joukoittain", "jouluinen", "joulukuinen", "joulunpunainen"
, "journalistinen", "jousittaa", "joustaa", "joustamaton", "joustava", "joustavasti", "joustavoida", "joustavoittaa", "joustokankainen", "joutaa", "joutava", "joutavanpäiväinen", "jouten", "joutenolo", "joutessa", "joutessaan", "joutilaisuus", "joutilas", "joutua", "joutuin", "joutuisa", "joutuisasti", "joviaali", "joystick", "judata", "jugendtyylinen"
, "jugoslavialainen", "juhla-asuinen", "juhlaliputettu", "juhlallinen", "juhlallisesti", "juhlamielinen", "juhlapukuinen", "juhlava", "juhlavalaistu", "juhlavasti", "juhlia", "juhlistaa", "juippi", "jujuttaa", "jukeboksi", "jukebox", "jukolaut", "jukolauta", "jukoliste", "jukra", "juksata", "juku", "jukuripäinen", "juliaaninen", "julistaa", "julistaja", "julistautua"
, "juljeta", "julkaisematon", "julkaista", "julkea", "julkeasti", "julkilausua", "julkimo", "julkinen", "julkipanna", "julkipuhunta", "julkishallinnollinen", "julkisoikeudellinen", "julkistaa", "julkituoda", "julkkis", "julkku", "julli", "jullikka", "julma", "julmasti", "julmettu", "julmetusti", "julmistella", "julmistua", "julmuri", "jumalaapelkäävä", "jumalainen", "jumalaisesti", "jumalakeskeinen", "jumalallinen", "jumalankieltäjä", "jumalankieltäminen", "jumalanpilkka", "jumalaton", "jumalattomasti", "jumalaut", "jumalauta", "jumalinen", "jumalisesti", "jumaliste", "jumaloida"
, "jumaluusopillinen", "jumiintua", "jumittaa", "jumittua", "jumiuttaa", "jumiutua", "jumpata", "jumputtaa", "junailla", "junk food", "junkkari", "junnata", "junnu", "juntata", "juntta", "junttapulla", "junttaus", "juntti", "juoda", "juohea", "juoheasti", "juoheus", "juoheva", "juohevasti", "juohevuus", "juohtua", "juoksennella", "juoksettaa", "juoksettua", "juokseva", "juoksevasti", "juoksuhauta", "juoksujalkainen", "juoksupoika", "juoksuttaa", "juolahtaa", "juolua", "juomahimo", "juomakausi", "juomakierre", "juomari", "juomingit", "juomuinen", "juomukondomi", "juonellinen", "juonellisesti", "juonia", "juonikas", "juonikkaasti", "juonitella", "juonittelija", "juontaa", "juonteikas", "juontua", "juoponnapissa", "juoponnappiin", "juopotella", "juoppo", "juoppohullu", "juoppohulluus", "juoppojuna", "juoppolalli", "juopporatti", "juopporenttu", "juopua", "juopunut", "juoruakka", "juoruilla", "juorukello", "juoruta", "juoruämmä", "juosta", "juotava", "juottaa"
, "juottola", "juovainen", "juovikas", "juovittaa", "juovukkeeseen", "juovukkeessa", "juovuksiin", "juovuksissa", "juovuspäissä", "juovuspäissään", "juovuttaa", "jupista", "juppiutua", "juridinen", "juridisesti", "jurnuttaa", "juroa", "jurosti", "jurottaa", "juroutua", "jurppia", "jurrata", "jurri", "jurrikka", "justeerata", "jutaa", "jutella", "jutku", "jutsku", "jutustaa", "jutustella", "jututtaa", "juudas", "juukeli", "juupeli", "juurakkoinen", "juurehtia", "juurekas", "juureton", "juureva", "juurihoitaa", "juuria"
, "juurittaa", "juurrettava", "juurruttaa", "juurtaa", "juurtua", "juustottua", "juustouttaa", "juustoutua", "juutalaisvaino", "juutalaisvastainen", "juutalaisvastaisuus", "juutalaisviha", "juutas", "juuttua", "jydätä", "jyhkeästi", "jykertää", "jykeväleukainen", "jykevästi", "jykevätekoinen", "jylhetä", "jylhistyä", "jylhästi"
, "jylistä", "jyllätä", "jymistä", "jymistää", "jymähdellä", "jymähtää", "jymäytellä", "jymäyttää", "jynssätä", "jyristellä", "jyristä", "jyristää", "jyrisyttää", "jyrkentyä", "jyrkentää", "jyrketä", "jyrkistyä", "jyrkistää", "jyrkkäkaarteinen", "jyrkkäkattoinen", "jyrkkäluonteinen", "jyrkkänousuinen", "jyrkkäotteinen", "jyrkkäpiirteinen", "jyrkkärantainen", "jyrkkärinteinen", "jyrkkäsanainen", "jyrkkäseinäinen", "jyrkkäsävyinen", "jyrkästi", "jyrrätä", "jyrsiä", "jyrytä", "jyryyttää", "jyrähdellä", "jyrähtely", "jyrähtää", "jyrätä", "jyräyttää", "jyskiä", "jyskytellä", "jyskyttää", "jyskyä", "jyskähtää", "jyskää", "jysähdellä", "jysähtää", "jysäyttää", "jytistä", "jytistää", "jytkyttää", "jytkähtää", "jytyyttää", "jytää", "jyvittää"
, "jyväjemmari", "jyystää", "jähmettyä", "jähmettää", "jähmetä", "jähmeästi", "jäitse", "jäkälöityä", "jäkättää", "jäljekkäin", "jäljelle", "jäljellä", "jäljemmä", "jäljemmäksi", "jäljemmäs", "jäljempänä", "jäljempää", "jäljentyä", "jäljentää", "jäljessä", "jäljestä", "jäljestäpäin", "jäljestää", "jäljetysten", "jäljetön", "jäljille", "jäljillä", "jäljiltä", "jäljitellä", "jäljittää", "jälkeen", "jälkeenjääneisyys", "jälkeenjäänyt", "jälkeenpäin", "jälki-ilmoittautua", "jälki-istunta", "jälki-istunto", "jälkikypsyttää", "jälkikypsyä"
, "jälkikäteis-", "jälkkäri"
, "jänishousu", "jänisrutto", "jännitys-"
, "järjestöjyrä", "järjettömyys", "järjetön", "järkky"
, "jästipää", "jätkä", "jätski"
, "jätti-", "jättiläis-", "jätös", "jäykkäniska", "jäykkäniskainen"
, "jääkaappi-pakastin", "jäärä", "jääräpäinen", "jääräpäisyys", "jääräpää"
, "jää-viileäkaappi", "jörrikkä", "jörö", "jöröjukka", "jössikkä", "jötikkä", "jöö", "kaahaaja", "kaahailija", "kaahari", "kaakki"
, "kaappijuoppo", "kaara"
, "kaasukammio", "kaasukuolio", "kaasus", "kaatokänni", "kaatumatauti"
, "kadotus", "kahareisin", "kahden kesken"
, "kahdessadas", "kahdestaan", "kahdesti", "kaheli", "kahjo", "kahju", "kahta", "kahtaalla", "kahtaalle", "kahtaalta", "kahtaanne", "kahtapuolin", "kahtia", "kahvipapu"
, "kai", "kaikaa", "kaiken kaikkiaan", "kaiketi", "kaikin", "kaikista", "kaikitenkin", "kaikkein", "kaikkiaan", "kaikkialla", "kaikkialle", "kaikkialta", "kaikkianne", "kaikusuhteet", "kainalokarvat"
, "kaistapäinen", "kaistapää", "kait", "kaiunta", "kaivu"
, "kajeontelo", "kajetto", "kakara", "kakaramainen", "kakata", "kakattaa", "kakka", "kakkahätä", "kakkainen", "kakkia", "kakkulat", "kakru", "kaks", "kaksari"
, "kaksikymppinen", "kaksimielinen", "kaksimielisyys", "kaksin", "kaksinaamainen", "kaksinaamaisuus", "kaksinaismoraali", "kaksineuvoinen", "kaksineuvoisuus", "kaksinkertaisesti", "kaksistaan", "kaksisukupuolinen", "kaksisukupuolisuus", "kaksittain"
, "kaksois-", "kaksosparikki", "kalahdella", "kalahdus", "kalahtaa"
, "kalanperkeet", "kalansilmäinen", "kalatäi", "kalauttaa", "kaleeriorja", "kaleerivanki"
, "kaliumsyanidi", "kaljabasso", "kaljamaha", "kaljoitella", "kalju", "kaljupäinen", "kaljupää", "kalkkaa", "kalkkis", "kallellaan", "kallelleen"
, "kallonkutistaja", "kalmanhaju", "kalmankalpea", "kalmo", "kalmukki", "kalpaten", "kalpeanaama", "kalppia", "kalsa", "kalsareisillaan", "kalsareisilleen", "kalsarisillaan", "kalsarisilleen", "kalsarit"
, "kalsongit", "kalterit", "kaltoin", "kalu", "kalukukkaro", "kalvia", "kalvin", "kalvinpora", "kalvinta", "kama", "kamala", "kamaluus"
, "kamikazelentäjä", "kammoa", "kammottava", "kammottavasti", "kanalja", "kanamainen", "kanamaisesti", "kanankakka", "kananlanta"
, "kananpää", "kanervakäärme", "kangaskäärme", "kangastaa", "kangastella", "kangastua", "kanittaa",
"kankku", "kankkunen", "kannabis", "kannalla", "kannalle", "kannalta", "kannassa", "kannasta", "kannibaali", "kannibaalinen", "kannibalismi", "kannoilla", "kannoille", "kannoilta"
, "kansalaissota", "kansalliskiihko", "kansalliskiihkoilija", "kansalliskiihkoinen", "kansallismielinen", "kansallismielisyys", "kansallissosialismi", "kansallissosialisti", "kansallissosialistinen"
, "kansankiihottaja", "kansankiihotus", "kansanmurha"
, "kansanvihollinen", "kansanvillitsijä", "kanssa", "kantaan", "kanta-astuja"
, "kantelupukki", "kanttura", "kanttuvei", "kapakka"
, "kapi", "kapiainen", "kapinahenkinen", "kapinaliike", "kapinalippu", "kapinallinen", "kapinallisuus", "kapinamieli", "kapinayritys", "kapinen", "kapinoida", "kapinoija", "kapinointi", "kapinoitsija", "kapitalisti", "kapitalistinen", "kapitulantti", "kappas", "kaput"
, "kardinaalimunaus", "kardinaalivirhe", "karhuaja", "karhuamiskirje"
, "karhukirje", "karhunkoppi", "karhuta", "karjahdella", "karjahdus", "karjahtaa", "karjaista", "karjaisu"
];

const forbiddenSet = new Set(forbiddenWords.filter(Boolean).map(w => w.toLowerCase()));

//seuraava alaken 2100
let allWords = [];
let commonWords = [];
let usedWordsInThisGame = [];

const parseWords = (text) => {
    const seen = new Set();
    return text
        .split(/[,\n]/)
        .map(w => w.trim())
        .filter(w => w.length >= 3)
        .map(w => ({ original: w, normalized: w.toLowerCase() }))
        .filter(item => !forbiddenSet.has(item.normalized))
        .filter(item => {
            if (seen.has(item.normalized)) return false;
            seen.add(item.normalized);
            return true;
        })
        .map(item => item.original);
};

fetch('words/kaikkisanat.txt').then(res => res.text()).then(d => allWords = parseWords(d)).catch(e => console.log("kaikkisanat.txt failed:", e));
fetch('words/yleisetsanat.txt').then(res => res.text()).then(d => commonWords = parseWords(d)).catch(e => console.log("yleisetsanat.txt failed:", e));

