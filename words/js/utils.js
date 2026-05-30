//Tänne sijoitetaan yleiskäyttöiset pikkufunktiot, jotka eivät riipu pelin tilasta.
const capitalize = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

const checkThemesIncompatible = (c1, c2) => {
    // 1. Тема не может сочетаться сама с собой
    if (c1 === e2) return true;
    
    // 2. Пантомима и Рисование не могут сочетаться друг с другом в одном раунде (нельзя одновременно и рисовать, и показывать жестами)
    if ((c1 === "pantomiimi" && c2 === "piirtäminen") || (c1 === "piirtäminen" && c2 === "pantomiimi")) return true;
    
    // 3. Нельзя запретить одновременно и глаголы, и существительные (иначе невозможно объяснить)
    if ((c1 === "ilman verbejä" && c2 === "ilman substantiiveja") || (c1 === "ilman substantiiveja" && c2 === "ilman verbejä")) return true;
    
    // 4. Испанский язык сложно сочетать с жесткими грамматическими запретами
    if (c1 === "espanja" && (c2 === "ilman verbejä" || c2 === "ilman substantiiveja")) return true;
    if (c2 === "espanja" && (c1 === "ilman verbejä" || c1 === "ilman substantiiveja")) return true;
    
    // Во всех остальных случаях темы прекрасно совместимы!
    return false;
};