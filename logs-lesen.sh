#!/bin/bash
# Zeigt die letzten ca. 15 Sekunden der Fly-Logs für wiesen-mcp
export PATH="$HOME/.fly/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "$(dirname "$0")"
fly logs 2>&1 &
PID=$!
sleep 15
kill $PID 2>/dev/null
exit 0
