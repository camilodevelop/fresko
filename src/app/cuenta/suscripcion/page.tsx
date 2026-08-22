export default function SuscripcionPage() {
  return (
    <section>
      <h1 className="font-display text-3xl font-bold text-[#1F4D36]">
        Mi suscripción
      </h1>
      <p className="mt-2 text-sm text-[#1B1B1B]/60">
        Plan activo, pausas y cambios de menú.
      </p>
      <div className="mt-6 rounded-3xl border-2 border-[#8BC34A] bg-white p-6">
        <p className="text-xs font-bold uppercase tracking-wider text-[#8BC34A]">
          Plan Smart · Ensaladas
        </p>
        <p className="mt-2 font-display text-2xl font-bold text-[#1F4D36]">
          20 ensaladas / mes
        </p>
        <p className="mt-1 text-sm text-[#1B1B1B]/55">Próximo cobro: 1 de septiembre</p>
        <ul className="mt-4 space-y-2 text-sm text-[#1B1B1B]/70">
          <li>Pausar plan</li>
          <li>Cambiar a bowls</li>
          <li>Subir a Plan Full</li>
        </ul>
      </div>
    </section>
  );
}
