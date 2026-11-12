/** Se muestra al instante al navegar en el panel mientras llegan los datos de la página. */
export default function AdminLoading() {
  const bar = "animate-pulse rounded-full bg-[#1F4D36]/[0.07]";
  return (
    <div aria-busy="true" aria-label="Cargando" className="space-y-6">
      <div className="space-y-3">
        <div className={`${bar} h-3 w-24`} />
        <div className={`${bar} h-8 w-64`} />
        <div className={`${bar} h-3 w-full max-w-xl`} />
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-3xl bg-white ring-1 ring-[#1F4D36]/[0.05]" />
        ))}
      </div>
      <div className="space-y-3 rounded-3xl bg-white p-6 ring-1 ring-[#1F4D36]/[0.05]">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={`${bar} h-4`} style={{ width: `${90 - i * 12}%` }} />
        ))}
      </div>
    </div>
  );
}
