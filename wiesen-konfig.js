// Feld-Verdrahtung für die Wiesen-Base; final verdrahtet anhand des
// Screenshots vom 2026-11-23. Alles lässt sich per Env überschreiben.

export const KONFIG = {
  baseId: process.env.AIRTABLE_BASE_ID || "app7UYhpyvrvITemh",
  tabelle: process.env.AIRTABLE_TABLE || "tblkW2wLpNV8o3lU9",
  sortierFeld: process.env.AIRTABLE_SORT_FIELD || "Datum",
  standardAnzahl: Number(process.env.LETZTE_N || 3),
  maxAnzahl: 10,
  zeitzone: process.env.ZEITZONE || "Europe/Berlin",
};

// Spezialfelder mit eigener Behandlung in der Sprech-Logik.
export const SPEZIAL = {
  datum: "Datum",
  steckling: "Steckling",
  stresslevel: "Stresslevel",
  summary: "Summary",
};

// Messfelder: [Feldname in Airtable, Beschriftung, Einheit]
export const FELDER = [
  ["env_u_temp", "Temperatur", "°C"],
  ["env_u_hum", "Luftfeuchte", "%"],
  ["env_u_pres", "Luftdruck", "hPa"],
  ["akku", "Akkustand", "%"],
];
