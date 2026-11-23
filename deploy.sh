#!/bin/bash
# Deploy des wiesen-mcp Servers zu Fly.io
export PATH="$HOME/.fly/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "$(dirname "$0")"
echo "Starte Deploy aus: $(pwd)"
fly deploy --remote-only
echo
echo "Fertig. Prüfe danach in ElevenLabs: https://wiesen-mcp.fly.dev/mcp?key={{wiesen-mcp-secret}}"
