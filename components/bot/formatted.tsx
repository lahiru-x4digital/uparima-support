/** Renders WhatsApp's *bold* so previews match what people see. */
export function Formatted({ text }: { text: string }) {
  const parts = text.split(/(\*[^*\n]+\*)/g);
  return (
    <>
      {parts.map((p, i) => (p.length > 2 && p.startsWith("*") && p.endsWith("*") ? <strong key={i}>{p.slice(1, -1)}</strong> : <span key={i}>{p}</span>))}
    </>
  );
}
