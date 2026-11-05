"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { deleteCategory, saveCategory, type CategoryInput } from "@/app/admin/catalogo/actions";
import { Panel, StatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFormValidation } from "@/hooks/use-form-validation";
import { first, rules } from "@/lib/validation";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { notify, toast } from "@/lib/notify";
import { cn } from "@/lib/utils";

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  image_url: string | null;
  sort: number;
  active: boolean;
  products: number;
};

const EMPTY: CategoryInput = { name: "", description: "", imageUrl: null, sort: 0, active: true };

async function toWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("imagen"))), "image/webp", 0.88));
}

export function CategoriesManager({ categories }: { categories: CategoryRow[] }) {
  const [form, setForm] = useState<CategoryInput | null>(null);
  const [pending, start] = useTransition();
  const [uploading, startUpload] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const editing = categories.find((c) => c.id === form?.id);

  const v = useFormValidation(
    () => {
      const f = form ?? EMPTY;
      const duplicate = categories.some((c) => c.id !== f.id && c.name.trim().toLowerCase() === f.name.trim().toLowerCase());
      return {
        name: first(
          rules.required(f.name, "Escribe el nombre de la categoría."),
          rules.minLength(f.name, 3, "Usa al menos 3 caracteres."),
          duplicate ? "Ya existe una categoría con ese nombre." : null
        ),
        description: f.description.length > 200 ? "Usa máximo 200 caracteres." : null,
      };
    },
    () => form ?? EMPTY,
    "category"
  );

  const openForm = (input: CategoryInput) => {
    v.reset();
    setForm(input);
  };

  const toInput = (c: CategoryRow): CategoryInput => ({
    id: c.id,
    name: c.name,
    description: c.description,
    imageUrl: c.image_url,
    sort: c.sort,
    active: c.active,
  });

  const run = (fn: () => Promise<{ ok?: string; error?: string }>, close = true) =>
    start(async () => {
      const r = await fn();
      notify(r);
      if (r.ok && close) setForm(null);
    });

  const move = (c: CategoryRow, dir: -1 | 1) => {
    const index = categories.findIndex((x) => x.id === c.id);
    const other = categories[index + dir];
    if (!other) return;
    run(async () => {
      // Intercambia el orden con la vecina (normaliza si estaban empatadas).
      const a = { ...toInput(c), sort: other.sort === c.sort ? c.sort + dir : other.sort };
      const b = { ...toInput(other), sort: c.sort };
      const r1 = await saveCategory(a);
      if (r1.error) return r1;
      const r2 = await saveCategory(b);
      return r2.error ? r2 : { ok: "Orden actualizado." };
    }, false);
  };

  const upload = (file?: File) => {
    if (!file || !form) return;
    startUpload(async () => {
      try {
        const blob = await toWebp(file);
        const path = `categorias/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
        const supabase = createClient();
        const { error } = await supabase.storage.from("products").upload(path, blob, { contentType: "image/webp" });
        if (error) throw error;
        setForm((f) => (f ? { ...f, imageUrl: supabase.storage.from("products").getPublicUrl(path).data.publicUrl } : f));
      } catch {
        toast.error("No se pudo subir la imagen.");
      }
    });
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel
        bodyClassName="p-0"
        title={`${categories.length} categorías`}
        description="Agrupan el menú: pestañas, sección de la landing y filtros del panel."
      >
        <ul className="mt-5 divide-y divide-[#1F4D36]/[0.05] border-t border-[#1F4D36]/[0.06]">
          {categories.map((c, i) => (
            <li key={c.id} className={cn("flex items-center gap-4 px-6 py-4", !c.active && "opacity-55", form?.id === c.id && "bg-[#F4F8F2]")}>
              <div className="flex flex-col">
                <button type="button" aria-label="Subir" disabled={i === 0 || pending} onClick={() => move(c, -1)} className="rounded p-0.5 text-[#1B1B1B]/35 hover:text-[#1F4D36] disabled:opacity-30">
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" aria-label="Bajar" disabled={i === categories.length - 1 || pending} onClick={() => move(c, 1)} className="rounded p-0.5 text-[#1B1B1B]/35 hover:text-[#1F4D36] disabled:opacity-30">
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[#F4F8F2]">
                <Image src={c.image_url || "/images/bowl.png"} alt="" fill sizes="56px" className="object-cover" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-display font-bold text-[#1F4D36]">
                  {c.name}
                  {!c.active && <StatusBadge tone="gray" dot={false}>Inactiva</StatusBadge>}
                </p>
                <p className="truncate text-xs text-[#1B1B1B]/50">{c.description || "Sin descripción"}</p>
                <p className="mt-0.5 text-[11px] text-[#1B1B1B]/35">/menu?categoria={c.slug}</p>
              </div>
              <div className="hidden w-20 text-right sm:block">
                <p className="text-sm font-semibold text-[#1F4D36]">{c.products}</p>
                <p className="text-[11px] text-[#1B1B1B]/40">productos</p>
              </div>
              <button
                type="button"
                onClick={() => openForm(toInput(c))}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#1F4D36]/70 hover:bg-[#F4F8F2] hover:text-[#1F4D36]"
              >
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="xl:sticky xl:top-24">
        {form ? (
          <Panel
            title={form.id ? "Editar categoría" : "Nueva categoría"}
            actions={
              <button type="button" aria-label="Cerrar" onClick={() => setForm(null)} className="rounded-lg p-1 text-[#1B1B1B]/40 hover:bg-[#F4F8F2]">
                <X className="h-4 w-4" />
              </button>
            }
          >
            <form {...v.formProps(() => run(() => saveCategory(form)))} className="space-y-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#1F4D36]/15 bg-[#F8F7F2] hover:border-[#8BC34A]"
                >
                  {form.imageUrl ? (
                    <Image src={form.imageUrl} alt="" fill sizes="80px" className="object-cover" />
                  ) : (
                    <ImagePlus className="h-5 w-5 text-[#1B1B1B]/35" />
                  )}
                  {uploading && (
                    <span className="absolute inset-0 flex items-center justify-center bg-white/70">
                      <Loader2 className="h-5 w-5 animate-spin text-[#1F4D36]" />
                    </span>
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    upload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <p className="text-xs text-[#1B1B1B]/45">Imagen de la tarjeta en la landing. Si no subes una, se usa la imagen del bowl.</p>
              </div>
              <Field label="Nombre" name={v.idFor("name")} error={v.error("name")}>
                <Input {...v.field("name")} className="h-11" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Wraps, Jugos, Postres…" />
              </Field>
              <Field
                label="Descripción"
                optional
                name={v.idFor("description")}
                error={v.error("description")}
                hint={`${form.description.length}/200 · se muestra en la landing.`}
              >
                <textarea
                  {...v.field("description")}
                  className="min-h-20 w-full rounded-2xl border border-[#1F4D36]/15 bg-white px-4 py-3 text-sm text-[#1B1B1B] outline-none focus:ring-2 focus:ring-[#8BC34A]/50"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </Field>
              <label className="flex items-center gap-2.5 text-sm font-medium text-[#1B1B1B]/70">
                <Switch size="sm" label="Activa" checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />
                Activa (visible en el menú)
              </label>
              {editing && <p className="text-xs text-[#1B1B1B]/40">Dirección: /menu?categoria={editing.slug} (no cambia al renombrar).</p>}
              <Button className="w-full" type="submit" disabled={pending || uploading}>
                {pending ? "Guardando…" : "Guardar"}
              </Button>
              {editing && editing.products === 0 && (
                <Button
                  className="w-full text-red-700 hover:bg-red-50"
                  variant="ghost"
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => deleteCategory(editing.id))}
                >
                  <Trash2 className="h-4 w-4" /> Eliminar categoría
                </Button>
              )}
            </form>
          </Panel>
        ) : (
          <Panel title="Categorías" description="Crea una categoría nueva y luego asígnala a sus productos.">
            <Button
              className="w-full"
              type="button"
              onClick={() => openForm({ ...EMPTY, sort: (categories.at(-1)?.sort ?? 0) + 1 })}
            >
              <Plus className="h-4 w-4" /> Nueva categoría
            </Button>
            <p className="mt-3 text-xs text-[#1B1B1B]/45">
              Una categoría solo aparece en el sitio cuando está activa y tiene al menos un producto visible.
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}
