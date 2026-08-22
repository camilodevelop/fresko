export default function PedidosPage() {
  return (
    <section>
      <h1 className="font-display text-3xl font-bold text-[#1F4D36]">
        Mis pedidos
      </h1>
      <p className="mt-2 text-sm text-[#1B1B1B]/60">
        Aquí verás el historial y el estado de cada pedido.
      </p>
      <div className="mt-6 space-y-3">
        {[
          { id: "FR-1042", status: "Programado", detail: "Ensalada Clásico · jueves 10:00–12:00" },
          { id: "FR-1038", status: "Entregado", detail: "Bowl Pollo · lunes" },
        ].map((order) => (
          <article
            key={order.id}
            className="rounded-2xl border border-[#1F4D36]/8 bg-white p-4"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-[#8BC34A]">
              {order.status}
            </p>
            <p className="mt-1 font-semibold text-[#1F4D36]">{order.id}</p>
            <p className="text-sm text-[#1B1B1B]/55">{order.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
