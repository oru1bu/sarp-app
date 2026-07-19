// Diese Datei laeuft auf dem SERVER, nicht im Browser.
// Deshalb ist der geheime API-Schluessel hier sicher aufgehoben.

import { fetch as proxyFetch, ProxyAgent } from "undici";

// Modellname der Google-KI. "gemini-flash-latest" zeigt immer auf das
// aktuelle, schnelle Modell. Kannst du spaeter aendern.
const MODEL = "gemini-flash-latest";

// Falls die App hinter einem Firmen-Proxy laeuft (z. B. bei Bosch),
// muss der KI-Aufruf durch diesen Proxy gehen. Online (z. B. bei Vercel)
// ist kein Proxy gesetzt, dann wird ganz normal direkt verbunden.
const proxyDispatcher = createProxyDispatcher();

function createProxyDispatcher() {
  const proxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
  if (!proxy) return null;

  const u = new URL(proxy);
  const options = { uri: `${u.protocol}//${u.host}` };

  // Benutzername/Passwort aus der Proxy-Adresse als Login mitschicken
  if (u.username || u.password) {
    const creds = `${decodeURIComponent(u.username)}:${decodeURIComponent(u.password)}`;
    options.token = "Basic " + Buffer.from(creds).toString("base64");
  }
  return new ProxyAgent(options);
}

export async function POST(request) {
  try {
    const { messages } = await request.json();

    // Den geheimen Schluessel aus den Umgebungsvariablen lesen
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Kein API-Schluessel gesetzt. Bitte GEMINI_API_KEY eintragen." },
        { status: 500 }
      );
    }

    // Unsere Nachrichten in das Format bringen, das Gemini versteht
    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.text }],
    }));

    // Anfrage an die Google-KI schicken (bei Bedarf durch den Proxy)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
    const fetchOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    };
    if (proxyDispatcher) fetchOptions.dispatcher = proxyDispatcher;

    const res = await proxyFetch(url, fetchOptions);

    const data = await res.json();

    if (!res.ok) {
      const msg = data?.error?.message || "Fehler bei der KI-Anfrage.";
      return Response.json({ error: msg }, { status: res.status });
    }

    // Die Antwort der KI aus dem Ergebnis herausholen
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Ich habe leider keine Antwort bekommen.";

    return Response.json({ reply });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
