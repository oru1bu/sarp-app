# BUILD_SPEC.md

## Ziel

Baue eine kleine Next.js-App namens `sarp-app`, die als Chat-Oberflaeche fuer zwei KI-Modelle dient.

Der Nutzer schreibt **eine** Nachricht in die Chat-Maske.
Die App fragt daraufhin **parallel** zwei Modelle ab:

1. Gemini als Default-Modell
2. Claude als zweites Modell

Danach zeigt die App **immer zwei Antworten** in der Chat-Maske an:

1. Eine Antwort von Gemini
2. Eine Antwort von Claude

Wenn eines der beiden Modelle fehlschlaegt, soll die Antwort des anderen Modells trotzdem angezeigt werden. Fuer das ausgefallene Modell soll ein klarer Fehlerhinweis im Chat erscheinen.

## Produktidee

Die App ist ein einfacher Dual-Model-Chatbot fuer Vergleich und Bewertung von KI-Antworten.

Business-Zweck:

1. Ein Nutzer kann dieselbe Frage gleichzeitig an zwei Modelle senden.
2. Die Antworten koennen direkt nebeneinander bzw. direkt hintereinander im selben Chat verglichen werden.
3. Die App soll bewusst klein, leicht verstaendlich und schnell erweiterbar bleiben.

## Technischer Rahmen

Verwende diese Basis:

1. Next.js 16.2.10
2. React 19.2.4
3. JavaScript, kein TypeScript
4. App Router
5. Server-API ueber `app/api/chat/route.js`

Die bestehende App hat bereits:

1. eine Chat-Maske in `app/page.js`
2. eine Server-Route in `app/api/chat/route.js`
3. eine bestehende Gemini-Integration

Diese bestehende Struktur soll **weiterverwendet und erweitert**, nicht komplett neu erfunden werden.

## Bestehender Stand, der erhalten bleiben soll

Die App-Version bleibt:

`0.1.0`

Der aktuelle Stand soll inhaltlich als stabile Basis betrachtet werden. Die Erweiterung wird auf diesem Stand aufgebaut.

## Umsetzungsziel

Erweitere die App so, dass pro User-Request zwei Modellantworten erzeugt werden.

### Muss-Verhalten

1. Der User gibt eine Nachricht ein.
2. Die Nachricht wird an `/api/chat` geschickt.
3. Die API-Route ruft Gemini und Claude **parallel** auf.
4. Beide Antworten werden an den Client zurueckgegeben.
5. Der Client zeigt beide Antworten als getrennte Assistant-Nachrichten an.
6. Die Antworten muessen klar gelabelt sein:
   - `GEMINI`
   - `CLAUDE`
7. Wenn ein Modell fehlschlaegt, wird die andere erfolgreiche Antwort trotzdem angezeigt.
8. Fuer das fehlgeschlagene Modell wird im Chat eine Fehlernachricht dargestellt.

## Claude-Integration

Claude soll **direkt ueber Anthropic** integriert werden.

Verwende dafuer das offizielle SDK:

`@anthropic-ai/sdk`

Nutze einen festen Versionsstand und keine lose Range.

## Abhaengigkeiten

Passe `package.json` so an, dass Runtime-Abhaengigkeiten konsistent und moeglichst fixiert sind.

Zielbild:

```json
{
  "name": "sarp-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "next": "16.2.10",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "undici": "8.7.0",
    "@anthropic-ai/sdk": "0.30.0"
  },
  "devDependencies": {
    "eslint": "9.0.0",
    "eslint-config-next": "16.2.10"
  }
}
```

Wenn einzelne Dev-Dependency-Versionen aus Gruenden des aktuellen Projekts exakt leicht abweichen muessen, dann so wenig wie moeglich aendern. Der Grundsatz bleibt: keine offenen Caret-Ranges fuer diese Erweiterung.

## Benoetigte Environment-Variablen

Die App soll mit diesen Variablen arbeiten:

```bash
GEMINI_API_KEY=
CLAUDE_API_KEY=
ENABLE_CLAUDE=true
CLAUDE_MODEL=claude-3-5-sonnet-20241022
HTTP_PROXY=
HTTPS_PROXY=
```

### Bedeutung

1. `GEMINI_API_KEY`: API-Key fuer Gemini
2. `CLAUDE_API_KEY`: API-Key fuer Anthropic Claude
3. `ENABLE_CLAUDE`: Feature-Flag, um Claude bei Bedarf abschalten zu koennen
4. `CLAUDE_MODEL`: Modellname fuer Claude
5. `HTTP_PROXY` und `HTTPS_PROXY`: optional fuer Unternehmensnetzwerke

## API-Design

Die bestehende Route ist:

`app/api/chat/route.js`

Sie soll weiter genutzt werden.

### Request-Format

Der Client sendet:

```json
{
  "messages": [
    { "role": "user", "text": "Hallo" }
  ]
}
```

### Response-Format

Die API soll ein strukturiertes Ergebnis liefern:

```json
{
  "geminiReply": "...",
  "claudeReply": "...",
  "errors": {
    "gemini": null,
    "claude": null
  }
}
```

Bei Teilfehlern soll die Struktur trotzdem gleich bleiben, zum Beispiel:

```json
{
  "geminiReply": "Das ist eine Antwort von Gemini.",
  "claudeReply": null,
  "errors": {
    "gemini": null,
    "claude": "CLAUDE_API_KEY not set"
  }
}
```

## Serverlogik

In `app/api/chat/route.js` soll folgende Logik umgesetzt werden:

1. Request lesen und validieren
2. Vorhandene `messages` in das Format fuer Gemini umwandeln
3. Dieselben `messages` in das Format fuer Claude umwandeln
4. Gemini und Claude **parallel** ausfuehren
5. Dafuer `Promise.allSettled(...)` verwenden, nicht sequenziell arbeiten
6. Erfolgreiche Antworten extrahieren
7. Fehler pro Modell separat erfassen
8. JSON-Antwort im vereinbarten Format zurueckgeben

### Wichtige Anforderungen an die Serverlogik

1. API-Keys duerfen nur serverseitig verwendet werden
2. Fehler eines Modells duerfen das andere Modell nicht blockieren
3. Bestehende Proxy-Unterstuetzung soll erhalten bleiben
4. Der Code soll klar lesbar und in kleine Hilfsfunktionen getrennt sein

### Empfohlene Hilfsfunktionen

Nutze in `route.js` kleine Funktionen wie:

1. `createProxyDispatcher()`
2. `fetchGeminiReply(...)`
3. `createClaudeClient()`
4. `fetchClaudeReply(...)`

## Clientlogik

Die Haupt-UI bleibt in:

`app/page.js`

### Ziel fuer den Client

1. Bestehende Chat-UI beibehalten
2. User-Nachricht sofort lokal anzeigen
3. Danach `/api/chat` aufrufen
4. Aus der API-Antwort beide Modellantworten lesen
5. Zwei getrennte Assistant-Nachrichten erzeugen
6. Jede Assistant-Nachricht bekommt ein zusaetzliches Label/Feld fuer das Modell

### Nachrichtenmodell im Client

Das bestehende einfache Modell darf erweitert werden auf:

```javascript
{
  role: "assistant" | "user",
  text: "...",
  model: "gemini" | "claude" | undefined
}
```

Das Feld `model` ist nur fuer Assistant-Antworten wichtig.

## UI-Verhalten

Die Chat-Maske soll zwei getrennte Antwort-Bubbles rendern.

### Gewuenschte Darstellung

1. User-Nachrichten bleiben rechts oder klar als Nutzer erkennbar
2. Assistant-Nachrichten bleiben links oder klar als System erkennbar
3. Gemini-Antwort traegt sichtbar das Label `GEMINI`
4. Claude-Antwort traegt sichtbar das Label `CLAUDE`

### Beispiel

1. User: "Was ist KI?"
2. Assistant Bubble 1: `[GEMINI] ...`
3. Assistant Bubble 2: `[CLAUDE] ...`

### Ladezustand

Waehrend der Request laeuft, soll ein klarer Hinweis sichtbar sein, zum Beispiel:

`Beide Modelle denken...`

Der Senden-Button darf waehrenddessen deaktiviert sein.

## Styling

Das Styling bleibt in:

`app/page.module.css`

### Ziel des Stylings

1. Bestehendes Layout nicht zerstoeren
2. Gemini und Claude visuell leicht unterscheidbar machen
3. Keine komplizierte Design-Ueberarbeitung
4. Mobile und Desktop sollen weiter funktionieren

### Empfehlung

1. Ein gemeinsamer Basisstil fuer Assistant-Bubbles
2. Zusatzeigenschaften fuer `.gemini` und `.claude`
3. Zum Beispiel unterschiedliche linke Randfarbe oder Label-Farbe

## Dateien, die angepasst werden sollen

Claude Code soll primaer diese Dateien anfassen:

1. `package.json`
2. `app/page.js`
3. `app/page.module.css`
4. `app/api/chat/route.js`
5. `README.md`

Wenn sinnvoll, darf Claude Code ausserdem ein Lockfile erzeugen.

## README-Anpassung

`README.md` soll von der Standard-Next.js-Vorlage auf ein projektspezifisches README umgestellt werden.

Das README soll danach mindestens enthalten:

1. Kurze Projektbeschreibung
2. Setup-Schritte
3. benoetigte Environment-Variablen
4. Start der App lokal
5. Beschreibung, dass pro Prompt zwei Modellantworten angezeigt werden

## Nicht-Ziele

Diese Themen sollen **nicht** Teil dieser Umsetzung sein:

1. Benutzer-Authentifizierung
2. Datenbank
3. persistente Chat-Historie
4. Streaming-Antworten
5. Multi-User-System
6. Rollen oder Berechtigungen
7. grosses Redesign der Oberflaeche

## Qualitaetsanforderungen

Claude Code soll bei der Umsetzung darauf achten:

1. Vorhandene Struktur beibehalten
2. Keine unnnoetige Komplexitaet einfuehren
3. Fehler klar behandeln
4. Code klein und lesbar halten
5. Bestehende Funktion fuer Gemini nicht kaputt machen

## Akzeptanzkriterien

Die Umsetzung ist fertig, wenn alle Punkte erfuellt sind:

1. `npm install` oder `npm ci` funktioniert
2. `npm run lint` laeuft ohne relevante neue Fehler
3. `npm run build` funktioniert
4. Die App startet lokal
5. Ein User kann eine Nachricht senden
6. Gemini und Claude werden parallel abgefragt
7. Bei Erfolg erscheinen zwei Antworten im Chat
8. Die Antworten sind sichtbar mit `GEMINI` und `CLAUDE` gekennzeichnet
9. Wenn nur ein Modell fehlschlaegt, bleibt die andere Antwort sichtbar
10. `README.md` beschreibt das Projekt sinnvoll

## Konkreter Arbeitsauftrag an Claude Code

Setze die bestehende Next.js-App `sarp-app` auf Basis der vorhandenen Dateien um.

Wichtig:

1. Arbeite inkrementell auf dem vorhandenen Code auf
2. Bewahre die bestehende Chat-Logik, wo sie sinnvoll ist
3. Erweitere die Serverroute von Single-Model auf Dual-Model
4. Integriere Claude direkt ueber Anthropic
5. Gib pro Nutzerfrage zwei Antworten im Chat zurueck
6. Aktualisiere `README.md`
7. Halte den Stand inhaltlich kompatibel zur Version `0.1.0`

## Erwartetes Ergebnis

Am Ende soll ein kleines, funktionierendes Repo vorliegen, in dem:

1. die Chat-UI laeuft
2. Gemini antwortet
3. Claude antwortet
4. beide Antworten pro Prompt sichtbar sind
5. Fehlerfaelle sauber behandelt werden
