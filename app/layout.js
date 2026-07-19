import "./globals.css";

export const metadata = {
  title: "Mein KI-Chatbot",
  description: "Ein kleiner Chatbot mit KI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
