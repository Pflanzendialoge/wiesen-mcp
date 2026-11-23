// Datenzugriff auf Airtable plus Aufbereitung für den Sprachagenten.
import { KONFIG, FELDER, SPEZIAL } from "./wiesen-konfig.js";

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
