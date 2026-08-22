export default function DireccionesPage() {
  return (
    <section>
      <h1 className="font-display text-3xl font-bold text-[#1F4D36]">
        Direcciones
      </h1>
      <p className="mt-2 text-sm text-[#1B1B1B]/60">
        Puntos de entrega dentro de la zona de cobertura.
      </p>
      <div className="mt-6 rounded-2xl border border-[#1F4D36]/8 bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-[#8BC34A]">
          Principal
        </p>
        <p className="mt-2 font-semibold text-[#1F4D36]">Calle 127 # 91, Suba</p>
        <p className="text-sm text-[#1B1B1B]/55">Bogotá · En cobertura</p>
      </div>
    </section>
  );
}
