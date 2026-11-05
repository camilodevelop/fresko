"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from "lucide-react";
import {
  deleteIngredientCategory,
  saveIngredientCategory,
  type IngredientCategoryInput,
} from "@/app/admin/catalogo/actions";
import { Panel } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFormValidation } from "@/hooks/use-form-validation";
import { first, rules } from "@/lib/validation";
import { Switch } from "@/components/ui/switch";
import type { IngredientCategory } from "@/lib/pricing";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

type Row = IngredientCategory & { ingredients: number };

/** Nombre obligatorio, mínimo 2 caracteres y sin repetir. */
function nameError(value: string, taken: string[]) {
  return first(
    rules.required(value, "Escribe el nombre de la categoría."),
    rules.minLength(value, 2, "Usa al menos 2 caracteres."),
    taken.includes(value.trim().toLowerCase()) ? "Ya existe una categoría con ese nombre." : null
  );
}

function CategoryRow({
  row,
  first: isFirst,
  last,
  onMove,
  taken,
}: {
  row: Row;
  first: boolean;
  last: boolean;
  onMove: (dir: -1 | 1) => void;
  taken: string[];
}) {
  const [name, setName] = useState(row.name);
  const [active, setActive] = useState(row.active);
  const [pending, start] = useTransition();
  const dirty = name !== row.name || active !== row.active;
  const v = useFormValidation(() => ({ name: nameError(name, taken) }), () => ({ name }), `icat-${row.id}`);
  const save = () => start(async () => void notify(await saveIngredientCategory({ id: row.id, name, active, sort: row.sort })));

  return (
    <li className={cn("px-6 py-3", !active && "opacity-60", dirty && "bg-[#FFFBEB]")}>
    <form {...v.formProps(() => dirty && save())} className="flex flex-wrap items-center gap-3">
      <div className="flex flex-col">
        <button type="button" aria-label="Subir" disabled={isFirst} onClick={() => onMove(-1)} className="rounded p-0.5 text-[#1B1B1B]/35 hover:text-[#1F4D36] disabled:opacity-30">
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button type="button" aria-label="Bajar" disabled={last} onClick={() => onMove(1)} className="rounded p-0.5 text-[#1B1B1B]/35 hover:text-[#1F4D36] disabled:opacity-30">
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
      </div>
      <Input {...v.field("name")} className="h-10 max-w-xs flex-1" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nombre" />
      <span className="w-28 text-sm text-[#1B1B1B]/50">
        {row.ingredients} {row.ingredients === 1 ? "ingrediente" : "ingredientes"}
      </span>
      <label className="flex items-center gap-2 text-xs font-semibold text-[#1B1B1B]/50">
        <Switch size="sm" label="Activa" checked={active} onChange={setActive} />
        {active ? "Activa" : "Inactiva"}
      </label>
      <div className="ml-auto flex items-center gap-1">
        <Button size="sm" type="submit" variant={dirty ? "default" : "ghost"} disabled={!dirty || pending}>
          {dirty ? "Guardar" : <Check className="h-4 w-4" />}
        </Button>
        {row.ingredients === 0 && (
          <button
            type="button"
            aria-label={`Eliminar ${row.name}`}
            disabled={pending}
            onClick={() => start(async () => void notify(await deleteIngredientCategory(row.id)))}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#1F4D36]/40 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
    <FieldError name={v.idFor("name")} error={v.error("name")} className="ml-8" />
    </li>
  );
}

export function IngredientCategoriesManager({ categories }: { categories: Row[] }) {
  const [newName, setNewName] = useState("");
  const allNames = categories.map((c) => c.name.trim().toLowerCase());
  const newV = useFormValidation(() => ({ name: nameError(newName, allNames) }), () => ({ name: newName }), "icat-new");
  const [pending, start] = useTransition();

  const move = (index: number, dir: -1 | 1) => {
    const a = categories[index];
    const b = categories[index + dir];
    if (!a || !b) return;
    start(async () => {
      const toInput = (c: Row, sort: number): IngredientCategoryInput => ({ id: c.id, name: c.name, active: c.active, sort });
      const r = await saveIngredientCategory(toInput(a, b.sort === a.sort ? a.sort + dir : b.sort));
      const r2 = r.error ? r : await saveIngredientCategory(toInput(b, a.sort));
      notify(r2.error ? r2 : { ok: "Orden actualizado." });
    });
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Panel
        bodyClassName="p-0"
        title={`${categories.length} categorías de ingredientes`}
        description="Agrupan los ingredientes en las recetas, el inventario y los filtros."
      >
        <ul className="mt-5 divide-y divide-[#1F4D36]/[0.05] border-t border-[#1F4D36]/[0.06]">
          {categories.map((c, i) => (
            <CategoryRow
              key={`${c.id}-${c.sort}-${c.name}-${c.active}`}
              row={c}
              first={i === 0}
              last={i === categories.length - 1}
              onMove={(dir) => move(i, dir)}
              taken={categories.filter((x) => x.id !== c.id).map((x) => x.name.trim().toLowerCase())}
            />
          ))}
        </ul>
      </Panel>

      <div className="xl:sticky xl:top-24">
        <Panel title="Nueva categoría">
          <form
            className="space-y-3"
            {...newV.formProps(() =>
              start(async () => {
                const r = await saveIngredientCategory({ name: newName, active: true, sort: (categories.at(-1)?.sort ?? 0) + 1 });
                if (notify(r)) {
                  setNewName("");
                  newV.reset();
                }
              })
            )}
          >
            <div>
              <Input {...newV.field("name")} className="h-11" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Granos, Bebidas, Desechables…" aria-label="Nombre de la categoría" />
              <FieldError name={newV.idFor("name")} error={newV.error("name")} />
            </div>
            <Button className="w-full" type="submit" disabled={pending}>
              <Plus className="h-4 w-4" /> Crear categoría
            </Button>
            <p className="text-xs text-[#1B1B1B]/45">Solo puedes eliminar una categoría sin ingredientes; si tiene, desactívala.</p>
          </form>
        </Panel>
      </div>
    </div>
  );
}
