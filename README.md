# wiesen-mcp

MCP-Server, der ElevenLabs Sprachagent:innen die letzten Wiesen-Messwerte aus Airtable serviert; deployt auf Fly.io.

Der Server stellt zwei Tools bereit:

- `letzteWiesenMesswerte(anzahl?)`: liest die neuesten Einträge der Tabelle `tblkW2wLpNV8o3lU9` aus der Base `app7UYhpyvrvITemh` und liefert einen sprechbaren deutschen Satz plus strukturierte Rohwerte.
- `wiesenWissen(suchbegriff)`: durchsucht die Tabelle `Wiesenwissen` (kuratierte Fragen und Antworten in Sprechsprache) per Stichwort in Frage und Antwort; liefert bis zu drei Treffer als sprechbare Sätze. Unbeantwortete Fragen werden ehrlich als offen gemeldet.

## Aufbau

```
server.js         MCP-Endpunkt /mcp (Streamable HTTP, stateless) plus Auth
wiesen.js         Airtable-Zugriff und Sprech-Formatierung
wiesen-konfig.js  Feld-Verdrahtung (Datum, Steckling, akku, env_u_temp, env_u_hum, env_u_pres, Stresslevel, Summary)
fly.toml          Fly.io-Konfiguration (Region fra, Port 8080)
Dockerfile        node:22-slim
```

## Lokal testen (ohne Airtable)

```bash
npm install
npm run dev        # startet mit MOCK_WIESEN=true auf Port 8080
```

Testaufruf:

```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"letzteWiesenMesswerte","arguments":{"anzahl":2}}}'
```

## Airtable-Token besorgen

1. Auf https://airtable.com/create/tokens einen Personal Access Token erstellen.
2. Scope: `data.records:read` (mehr braucht es nicht).
3. Zugriff: die Wiesen-Base auswählen (app7UYhpyvrvITemh).

## Deploy auf Fly.io

```bash
fly auth login
fly launch --no-deploy        # übernimmt fly.toml; falls der Name wiesen-mcp vergeben ist, in fly.toml einen eigenen app-Namen eintragen
fly secrets set AIRTABLE_TOKEN=patXXX MCP_SECRET=langes-zufaelliges-passwort
fly deploy
```

Danach läuft der Server unter `https://<app-name>.fly.dev`; der MCP-Endpunkt ist `https://<app-name>.fly.dev/mcp`.

## Verkabelung in ElevenLabs

1. MCP einmalig für den Workspace freischalten; die Funktion ist standardmäßig deaktiviert (Workspace-Einstellungen; nicht verfügbar bei Zero Retention Mode oder HIPAA).
2. Im Agent: Tools → MCP Server hinzufügen.
   - Name: `Wiesen MCP`
   - Servertyp: `Streambares HTTP`
   - Server URL: `https://<app-name>.fly.dev/mcp?key={{wiesen-mcp-secret}}`
   - Hinweis: Das ElevenLabs-Formular hat kein freies Feld für einen statischen Authorization-Header. Lege den Wert von `MCP_SECRET` daher als Workspace-Geheimnis `wiesen-mcp-secret` an und verweise in der URL über die `{{ }}`-Syntax darauf. Der Server akzeptiert das Secret sowohl als `Authorization`-Header als auch als `?key=`-Parameter.
3. "Verbindung testen" ausführen; erst nach grünem Test wird "Server hinzufügen" aktiv. Danach Tool-Approval auf feingranular stellen; `letzteWiesenMesswerte` darf ohne Rückfrage laufen, es liest ja nur.
4. Testgespräch: "Wie geht es dem Steckling?" → der Agent ruft das Tool und spricht aus der Zusammenfassung.

## Umgebungsvariablen

| Variable | Pflicht | Wirkung |
| --- | --- | --- |
| `AIRTABLE_TOKEN` | ja (sonst MOCK) | Personal Access Token mit `data.records:read` |
| `MCP_SECRET` | dringend empfohlen | Authorization-Header, den ElevenLabs mitschickt |
| `AIRTABLE_BASE_ID` | nein | Standard: app7UYhpyvrvITemh |
| `AIRTABLE_TABLE` | nein | Standard: tblkW2wLpNV8o3lU9 |
| `AIRTABLE_TABLE_WISSEN` | nein | Standard: Wiesenwissen |
| `LETZTE_N` | nein | Standardanzahl Messungen; Vorgabe 3 |
| `MOCK_WIESEN` | nein | `true` liefert Beispieldaten ohne Airtable |
| `PORT` | nein | Standard 8080 |

## Hinweise

- Der Server ist stateless; jede Anfrage baut eine frische Verbindung auf. Das passt zu Flys Auto-Stop; die erste Anfrage nach einer Ruhepause dauert durch den Maschinenstart ein paar Sekunden. Wer konstant niedrige Latenz im Gespräch will, setzt in fly.toml `min_machines_running = 1`.
- Der Server liest ausschließlich; Schreib-Tools sind bewusst nicht gebaut, damit niemand per Sprache die Base verändert.
