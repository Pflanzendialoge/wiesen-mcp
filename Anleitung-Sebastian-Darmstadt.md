# Anleitung für Sebastian: Die sprechende Wiese für die Darmstädter

Kurzfassung zum Vorführen und Nachbauen. Ziel: Ein ElevenLabs-Sprachagent beantwortet Fragen mit echten Live-Messwerten aus der Airtable-Wiesen-Base. Die Brücke dafür ist der Server `wiesen-mcp` auf Fly.io.

## Was du brauchst

- Zugang zum **gemeinsamen ElevenLabs-Workspace**; dort liegen der Agent und der MCP-Server "Wiesen MCP". Oben links im Workspace-Wähler umschalten. Jakob teilt dir beides; Geheimnisse musst du nie sehen, sie bleiben im Workspace-Tresor.
- Ein Terminal mit `fly`-CLI nur falls du selbst deployen willst; sonst läuft der Server schon.
- `AIRTABLE_TOKEN` (nur Leserechte auf der Wiesen-Base) und `MCP_SECRET` brauchst du nur für den eigenen Nachbau, nicht für die Demo.

## Demo zeigen (5 Minuten)

1. ElevenLabs öffnen, den Agenten starten, Testgespräch beginnen.
2. Fragen: "Wie geht es dem Steckling gerade?" oder "Wie warm ist es auf der Wiese?"
3. Der Agent ruft im Hintergrund das Tool `letzteWiesenMesswerte` auf und liest Temperatur, Luftfeuchte, Luftdruck, Akku, Stresslevel und die Summary aus Airtable vor.
4. Verlaufsfrage für den Wow-Moment: "Wie hat sich das heute entwickelt?" (das Tool holt dann mehrere Zeilen).

Vor-Ort-Tipp: Nicht auf Veranstaltungs-WLAN vertrauen; Hotspot vom Handy mitnehmen. Und vorab einmal kurz testen, denn der Fly-Server darf nicht eingeschlafen sein; in `fly.toml` `min_machines_running = 1` setzen, dann bleibt er warm.

## Selbst aufsetzen (15 Minuten)

```bash
cd wiesen-mcp
fly secrets set AIRTABLE_TOKEN=patXXX MCP_SECRET=<langes-passwort>
./deploy.sh
```

Dann in ElevenLabs beim Agenten unter Tools einen benutzerdefinierten MCP-Server hinzufügen:

- Servertyp: Streambares HTTP
- Server-URL: `https://wiesen-mcp.fly.dev/mcp?key={{wiesen-mcp-secret}}` (die `{{ }}`-Kapsel tippen und das Workspace-Geheimnis auswählen)
- Verbindung testen; erst wenn der Test grün ist, wird "Server hinzufügen" klickbar
- Tool-Approval: `letzteWiesenMesswerte` auf automatisch stellen

## Prompt fürs Mittelstück

In den System-Prompt des Agenten gehört der Block "Live-Messwerte mit letzteWiesenMesswerte" aus dem Projekt; Kernregeln: Tool immer ZUERST aufrufen, nie Werte erfinden, nur die gelieferte Zusammenfassung sprechen, zwei bis drei Sätze, bei Fehlschlag ehrlich sagen dass die Wiese gerade schweigt.

## Wenn etwas klemmt

| Symptom | Meistens |
| --- | --- |
| "Failed to connect to MCP server" | URL ohne `/mcp` oder Servertyp steht auf SSE statt Streambares HTTP |
| Test rot trotz richtiger URL | Secret im Geheimnis stimmt nicht mit `fly secrets` überein; neu setzen und an beiden Stellen eintragen |
| Agent fantasiert Werte | Prompt-Block fehlt oder Tool-Approval wartet auf Freigabe |
| Erste Antwort dauert ewig | Fly-Maschine war eingeschlafen; `min_machines_running = 1` |

Bei Rückfragen: Jakob, und der komplette Code samt README liegt im Ordner `wiesen-mcp`.
