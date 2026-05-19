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
, "asenteellisesti", "aseptisesti"

//2999




];
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
        .filter(item => !forbiddenWords.includes(item.normalized))
        .filter(item => {
            if (seen.has(item.normalized)) {
                return false;
            }
            seen.add(item.normalized);
            return true;
        })
        .map(item => item.original);
};

fetch('words/kaikkisanat.txt').then(res => res.text()).then(d => allWords = parseWords(d)).catch(e => console.log("kaikkisanat.txt failed:", e));
fetch('words/yleisetsanat.txt').then(res => res.text()).then(d => commonWords = parseWords(d)).catch(e => console.log("yleisetsanat.txt failed:", e));

