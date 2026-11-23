// Datenzugriff auf Airtable plus Aufbereitung für den Sprachagenten.
import { KONFIG, FELDER, SPEZIAL, WISSEN_FELDER } from "./wiesen-konfig.js";

const MOCK = process.env.MOCK_WIESEN === "true";

const MOCK_DATEN = [
  {
    Datum: "2026-11-23T09:12:00.000Z",
    Steckling: "Brunhilde",
    akku: 87,
    env_u_temp: 7.4,
    env_u_hum: 81,
    env_u_pres: 1012,
    Stresslevel: "entspannt",
    Summary: "Der Steckling steht mollig bei 7 Grad und hoher Luftfeuchte; alles im grünen Bereich.",
  },
  {
    Datum: "2026-11-23T08:42:00.000Z",
    Steckling: "Brunhilde",
    akku: 88,
    env_u_temp: 7.1,
    env_u_hum: 83,
    env_u_pres: 1012,
    Stresslevel: "entspannt",
    Summary: "Ruhige halbe Stunde auf der Wiese; keine Auffälligkeiten.",
  },
];

export async function holeLetzteWiesenMesswerte(anzahl = KONFIG.standardAnzahl) {
  const n = Math.min(Math.max(1, anzahl || KONFIG.standardAnzahl), KONFIG.maxAnzahl);

  if (MOCK || !process.env.AIRTABLE_TOKEN) {
    console.warn("[wiesen-mcp] MOCK-Modus aktiv; es werden Beispieldaten geliefert.");
    return MOCK_DATEN.slice(0, n);
  }

  const url = new URL(
    `https://api.airtable.com/v0/${KONFIG.baseId}/${encodeURIComponent(KONFIG.tabelle)}`
  );
  url.searchParams.set("maxRecords", String(n));
  url.searchParams.set("sort[0][field]", KONFIG.sortierFeld);
  url.searchParams.set("sort[0][direction]", "desc");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable-Fehler ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.records.map((r) => r.fields);
}

function formatZweistellig(wert, einheit) {
  return `${String(wert).replace(".", ",")} ${einheit}`.trim();
}

// Wissenssuche über Frage und Antwort; Airtable-Formel mit FIND und Groß-/Kleinschreibung egal.
const MOCK_WISSEN = [
  {
    [WISSEN_FELDER.frage]: "Warum mäht man die Wiese nicht jede Woche?",
    [WISSEN_FELDER.antwort]:
      "Weil Wiesenblumen erst blühen und Samen bilden müssen. Eine Magerwiese wird meist nur ein- bis zweimal im Jahr gemäht, und das Schnittgut kommt weg, damit der Boden mager bleibt.",
    [WISSEN_FELDER.thema]: "Pflege und Mahd",
  },
  {
    [WISSEN_FELDER.frage]: "Wie überleben die Insekten im Winter?",
    [WISSEN_FELDER.antwort]:
      "Viele Insekten suchen sich ein Versteck in hohlen Stängeln, unter Blättern oder im Boden und fallen in Winterstarre.",
    [WISSEN_FELDER.thema]: "Tiere",
  },
];

function saubererSuchbegriff(begriff) {
  return String(begriff || "").replace(/["\\]/g, "").trim().toLowerCase();
}

export async function sucheWiesenWissen(suchbegriff) {
  const term = saubererSuchbegriff(suchbegriff);
  if (!term) return [];

  if (MOCK || !process.env.AIRTABLE_TOKEN) {
    console.warn("[wiesen-mcp] MOCK-Modus aktiv; Wissenssuche liefert Beispieldaten.");
    return MOCK_WISSEN.filter(
      (e) =>
        e[WISSEN_FELDER.frage].toLowerCase().includes(term) ||
        e[WISSEN_FELDER.antwort].toLowerCase().includes(term)
    ).slice(0, KONFIG.maxWissenTreffer);
  }

  const formel = `OR(FIND("${term}", LOWER({${WISSEN_FELDER.frage}})) > 0, FIND("${term}", LOWER({${WISSEN_FELDER.antwort}})) > 0)`;

  const url = new URL(
    `https://api.airtable.com/v0/${KONFIG.baseId}/${encodeURIComponent(KONFIG.tabelleWissen)}`
  );
  url.searchParams.set("maxRecords", String(KONFIG.maxWissenTreffer));
  url.searchParams.set("filterByFormula", formel);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable-Fehler ${res.status}: ${text}`);
  }

  const data = await res.json();
  const treffer = data.records.map((r) => r.fields);
  // Einträge mit beantworteter Frage zuerst.
  treffer.sort((a, b) => (b[WISSEN_FELDER.antwort] ? 1 : 0) - (a[WISSEN_FELDER.antwort] ? 1 : 0));
  return treffer;
}

export function wissenAlsSprechbarenText(treffer) {
  if (!treffer.length) {
    return "Dazu weiß die Wiese noch nichts; diese Frage ist noch offen und wird im Buch der Fragen gesammelt.";
  }
  const teile = treffer.map((t) => {
    const antwort = t[WISSEN_FELDER.antwort];
    if (antwort) return `Auf die Frage "${t[WISSEN_FELDER.frage]}" antwortet die Wiese: ${antwort}`;
    return `Die Frage "${t[WISSEN_FELDER.frage]}" kennt die Wiese schon, aber eine geprüfte Antwort steht noch aus.`;
  });
  return teile.join(" Außerdem: ");
}

// Kurzer deutscher Text, aus dem die Stimme direkt vorformulieren kann;
// die Rohwerte kommen zusätzlich als structuredContent mit.
export function alsSprechbarenText(records) {
  if (!records.length) {
    return "Aktuell liegen keine Messwerte vor.";
  }

  const neueste = records[0];

  const datum = new Date(neueste[SPEZIAL.datum]);
  const zeit = isNaN(datum)
    ? ""
    : `zuletzt gemessen am ${datum.toLocaleDateString("de-DE", { timeZone: KONFIG.zeitzone })} um ${datum.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: KONFIG.zeitzone })} Uhr`;

  const wer = neueste[SPEZIAL.steckling]
    ? `Steckling ${neueste[SPEZIAL.steckling]}`
    : "Der Sensor";

  const werte = FELDER.filter(([feld]) => neueste[feld] !== undefined && neueste[feld] !== null)
    .map(([feld, beschriftung, einheit]) => `${beschriftung} ${formatZweistellig(neueste[feld], einheit)}`)
    .join("; ");

  const stress = neueste[SPEZIAL.stresslevel]
    ? `Stresslevel: ${neueste[SPEZIAL.stresslevel]}.`
    : "";

  const summary = neueste[SPEZIAL.summary] ? String(neueste[SPEZIAL.summary]) : "";

  return [`${wer}, ${zeit}: ${werte}.`, stress, summary]
    .filter(Boolean)
    .join(" ")
    .trim();
}
