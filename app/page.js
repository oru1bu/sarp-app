"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";

export default function Home() {
  // Alle Nachrichten im Chat (jede hat: von wem + Text)
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hallo! Ich bin dein KI-Chatbot. Was moechtest du wissen?" },
  ]);
  const [input, setInput] = useState(""); // Text im Eingabefeld
  const [loading, setLoading] = useState(false); // Wartet die KI gerade?
  const endRef = useRef(null); // Zum Runterscrollen

  // Immer ans Ende scrollen, wenn neue Nachrichten kommen
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Wird aufgerufen, wenn man auf "Senden" klickt
  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    // Eigene Nachricht anzeigen und Eingabefeld leeren
    const newMessages = [...messages, { role: "user", text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // Schickt die Nachrichten an unsere eigene Server-Adresse /api/chat
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Etwas ist schiefgelaufen.");
      }

      // Antwort der KI anzeigen
      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Fehler: " + err.message },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <main className={styles.chat}>
        <h1 className={styles.title}>🤖 Mein KI-Chatbot</h1>

        <div className={styles.messages}>
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user" ? styles.userMsg : styles.assistantMsg
              }
            >
              {m.text}
            </div>
          ))}
          {loading && (
            <div className={styles.assistantMsg}>Schreibt gerade …</div>
          )}
          <div ref={endRef} />
        </div>

        <form className={styles.form} onSubmit={sendMessage}>
          <input
            className={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Schreib etwas …"
          />
          <button className={styles.button} type="submit" disabled={loading}>
            Senden
          </button>
        </form>
      </main>
    </div>
  );
}
