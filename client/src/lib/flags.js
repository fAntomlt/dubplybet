const MAP = {
  "Belgija":"🇧🇪","Bosnija ir Hercegovina":"🇧🇦","Kipras":"🇨🇾","Čekija":"🇨🇿",
  "Estija":"🇪🇪","Suomija":"🇫🇮","Prancūzija":"🇫🇷","Sakartvelas":"🇬🇪",
  "Vokietija":"🇩🇪","Didžioji Britanija":"🇬🇧","Graikija":"🇬🇷","Islandija":"🇮🇸",
  "Izraelis":"🇮🇱","Italija":"🇮🇹","Latvija":"🇱🇻","Lietuva":"🇱🇹",
  "Juodkalnija":"🇲🇪","Lenkija":"🇵🇱","Portugalija":"🇵🇹","Serbija":"🇷🇸",
  "Slovėnija":"🇸🇮","Ispanija":"🇪🇸","Švedija":"🇸🇪","Turkija":"🇹🇷",
};
export function flagForTeam(name){ return MAP[name?.trim()] || "🏀"; }
export function stageLabel(stage){ return stage === "playoff" ? "Atkrintamųjų Etapas" : "Grupių Etapas"; }
export function bandFromDiff(d){ return d>5?"> 5":(d===5?"= 5":"< 5"); }