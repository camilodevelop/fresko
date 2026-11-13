"""Prepara las imágenes del bowl realista (Arma tu bowl).

Uso:  python3 scripts/process_bowl_images.py "/ruta/a/fresko-imagenes"

Entrada: PNG con transparencia (1536×1024) del bowl vacío, cada ingrediente y cada salsa.
Salida:  public/images/bowl/<nombre>.webp
  · Limpia el halo semitransparente que traen alrededor (si no, tiñe a los ingredientes vecinos).
  · Recorta al contenido y reduce el peso (WebP con transparencia).
  · Del bowl genera dos capas: el bowl completo y su borde delantero, que va encima de la comida.
"""

import os
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "images", "bowl")

# Archivo de origen → nombre de salida (las opciones del armador usan estos nombres).
FILES = {
    "Tazón redondo blanco con base verde salvia (1).png": "bowl",
    "Porción de lechuga verde crujiente-2.png": "lechuga",
    "Porción de espinaca baby fresca-1.png": "espinaca",
    "Cubos de tomate rojo fresco-1.png": "tomate",
    "Rodajas de pepino frescas-6.png": "pepino",
    "Zanahoria fresca en juliana-3.png": "zanahoria",
    "Aguacate en abanico fresco-5.png": "aguacate",
    "Porción de maíz dulce dorado-2.png": "maiz",
    "Repollo morado desmenuzado-4.png": "repollo",
    "Cubos de pollo a la parrilla-7.png": "pollo",
    "Cubos de atún fresco para sushi-4.png": "atun",
    "Cubos frescos de salmón-2.png": "salmon",
    "Montoncito de camarones cocidos-1.png": "camarones",
    "Cubos de tofu dorados y cremosos-3.png": "tofu",
    "Mitades de huevo duro perfecto-6.png": "huevo",
    "Montoncito de queso rallado-1.png": "queso",
    "Frutos secos tostados picados-9.png": "nueces",
    "Mezcla de semillas naturales-2.png": "semillas",
    "Crutones dorados y crujientes-10.png": "croutons",
    "Zigzag de aderezo de limón-8.png": "salsa-limon",
    "Zigzag dorado de vinagreta-5.png": "salsa-vinagreta",
    "Zigzag de yogur cremoso-7.png": "salsa-yogurt",
}

# Boca del bowl en la imagen original (1536×1024): elipse del borde interior.
RIM = {"cx": 757, "cy": 380, "rx": 646, "ry": 334}


def clean_alpha(im: Image.Image, low: int, high: int = 245) -> Image.Image:
    """Quita el halo: lo que tenga alfa < low desaparece y lo demás queda opaco con borde suave."""
    r, g, b, a = im.split()
    a = a.point(lambda v: 0 if v <= low else 255 if v >= high else int((v - low) * 255 / (high - low)))
    a = a.filter(ImageFilter.GaussianBlur(0.8))
    return Image.merge("RGBA", (r, g, b, a))


def crop(im: Image.Image, margin: int = 8) -> Image.Image:
    box = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    if not box:
        return im
    l, t, r, b = box
    return im.crop((max(0, l - margin), max(0, t - margin), min(im.width, r + margin), min(im.height, b + margin)))


def save(im: Image.Image, name: str, width: int) -> None:
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    path = os.path.join(OUT, f"{name}.webp")
    im.save(path, "WEBP", quality=82, method=6)
    print(f"{name:16} {im.width}×{im.height}  {os.path.getsize(path) // 1024} KB")


def bowl_layers(im: Image.Image) -> None:
    """Bowl completo (sin recortar, para que las coordenadas coincidan) y su borde delantero."""
    im = clean_alpha(im, 60)
    save(im, "bowl", 1200)
    # Borde delantero: lo que queda por debajo del arco inferior de la boca (pared exterior y labio).
    mask = Image.new("L", im.size, 255)
    d = ImageDraw.Draw(mask)
    c = RIM
    d.ellipse((c["cx"] - c["rx"], c["cy"] - c["ry"], c["cx"] + c["rx"], c["cy"] + c["ry"]), fill=0)
    mask = mask.filter(ImageFilter.GaussianBlur(1.2))
    # La mitad de arriba no tapa nada (la comida asoma por detrás del borde trasero): se desvanece
    # de forma gradual para que no quede una marca donde empieza la capa.
    fade = Image.new("L", im.size, 0)
    fd = ImageDraw.Draw(fade)
    top, bottom = c["cy"] - 60, c["cy"] + 60
    for y in range(im.height):
        v = 0 if y < top else 255 if y > bottom else int((y - top) * 255 / (bottom - top))
        fd.line([(0, y), (im.width, y)], fill=v)
    mask = ImageChops.multiply(mask, fade)
    front = im.copy()
    front.putalpha(ImageChops.multiply(im.getchannel("A"), mask))
    save(front, "bowl-front", 1200)


def mix_base(lechuga: Image.Image, espinaca: Image.Image, repollo: Image.Image) -> Image.Image:
    """Mix FRESKO: lechuga con espinaca y un poco de repollo encima."""
    base = lechuga.copy()
    w, h = base.size
    esp = espinaca.resize((int(w * 0.62), int(espinaca.height * w * 0.62 / espinaca.width)), Image.LANCZOS)
    base.alpha_composite(esp, (int(w * 0.34), int(h * 0.12)))
    rep = repollo.resize((int(w * 0.42), int(repollo.height * w * 0.42 / repollo.width)), Image.LANCZOS)
    base.alpha_composite(rep, (int(w * 0.08), int(h * 0.30)))
    return base


def main() -> None:
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/Desktop/fresko-imagenes")
    os.makedirs(OUT, exist_ok=True)
    loaded: dict[str, Image.Image] = {}
    for file, name in FILES.items():
        path = os.path.join(src, file)
        if not os.path.exists(path):
            print(f"(falta {file})")
            continue
        im = Image.open(path).convert("RGBA")
        if name == "bowl":
            bowl_layers(im)
            continue
        im = crop(clean_alpha(im, 110 if name.startswith("salsa") else 90))
        loaded[name] = im
        save(im, name, 900 if name in ("lechuga", "espinaca") else 640)
    save(crop(mix_base(loaded["lechuga"], loaded["espinaca"], loaded["repollo"])), "mix", 900)


if __name__ == "__main__":
    main()
