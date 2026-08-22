export default function EntregasPage() {
  return (
    <section>
      <h1 className="font-display text-3xl font-bold text-[#1F4D36]">
        Entregas programadas
      </h1>
      <p className="mt-2 text-sm text-[#1B1B1B]/60">
        Elige el día y la franja horaria. Recibes fresco en esa ventana.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {["Lunes 10:00–12:00", "Miércoles 10:00–12:00", "Viernes 16:00–18:00"].map(
          (slot) => (
            <div
              key={slot}
              className="rounded-2xl border border-[#1F4D36]/8 bg-white p-4 text-sm font-medium text-[#1F4D36]"
            >
              {slot}
            </div>
          )
        )}
      </div>
    </section>
  );
}
