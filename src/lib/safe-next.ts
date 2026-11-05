/** Solo permite redirecciones internas (evita open redirects con ?next=). */
export function safeNext(value: string | null | undefined, fallback = "/cuenta") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
