#!/usr/bin/env python3
"""
Extract structured aroma data from Aroma Bible PDFs → aroma_data/*.json (English).

Env overrides (optional):
  ARAMA_BIBLE_PART1, ARAMA_BIBLE_PART2, ARAMA_BIBLE_PART3, ARAMA_BIBLE_PART4 — absolute paths to PDFs
"""
from __future__ import annotations

import json
import os
import re
import sys

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Install PyMuPDF: pip3 install PyMuPDF", file=sys.stderr)
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
OUTPUT_DIR = os.path.join(REPO_ROOT, "aroma_data")

_DEFAULT_BASE = os.path.expanduser(
    "~/Library/Application Support/Cursor/User/workspaceStorage/"
    "a82ee57f8a2c50fb760ec50da20bdd53/pdfs"
)


def _pdf(part: str, filename: str) -> str:
    env = os.environ.get(f"ARAMA_BIBLE_{part.upper()}")
    if env and os.path.isfile(env):
        return env
    base = os.environ.get("ARAMA_BIBLE_PDF_BASE", _DEFAULT_BASE)
    for root, _dirs, files in os.walk(base):
        if filename in files:
            return os.path.join(root, filename)
    return ""


PDF_PART1 = _pdf("part1", "Aroma Bible_Part1.pdf")
PDF_PART2 = _pdf("part2", "Aroma Bible_Part2.pdf")
PDF_PART3 = _pdf("part3", "Aroma Bible_Part3.pdf")
PDF_PART4 = _pdf("part4", "Aroma Bible_Part4.pdf")

# German → English (extend as needed from _review_untranslated.json)
DE_TO_EN: dict[str, str] = {}
_RAW = r"""
Basilikum|Basil
Bärlauch|Wild Garlic
Beifuß|Mugwort
Bohnenkraut|Savory
Borretsch|Borage
Brennnessel|Nettle
Brunnenkresse|Watercress
Currykraut|Curry Plant
Dill|Dill
Eberraute|Southernwood
Epazote|Epazote
Estragon|Tarragon
Kerbel|Chervil
Korianderkraut|Cilantro
Koriandergrün|Cilantro
Kresse|Cress
Lavendel|Lavender
Liebstöckel|Lovage
Lorbeer|Bay Leaf
Lorbeerblatt|Bay Leaf
Majoran|Marjoram
Minze|Mint
Pfefferminze|Peppermint
Oregano|Oregano
Perilla|Perilla
Petersilie|Parsley
Portulak|Purslane
Rauke|Arugula
Rosmarin|Rosemary
Salbei|Sage
Sauerampfer|Sorrel
Schnittlauch|Chives
Thymian|Thyme
Waldmeister|Sweet Woodruff
Weinraute|Rue
Wermut|Wormwood
Ysop|Hyssop
Zitronenmelisse|Lemon Balm
Zitronenverbene|Lemon Verbena
Zitronengras|Lemongrass
Ajowan|Ajwain
Anis|Anise
Annatto|Annatto
Asant|Asafoetida
Bockshornklee|Fenugreek
Bockshornkleeblätter|Fenugreek Leaves
Chili|Chili
Curryblätter|Curry Leaves
Curryblatt|Curry Leaves
Fenchel|Fennel
Fenchelsamen|Fennel Seeds
Gewürzfenchel|Fennel Seeds
Galgant|Galangal
Gewürznelke|Clove
Gewürznelken|Cloves
Ingwer|Ginger
Kaffirlimettenblätter|Kaffir Lime Leaves
Kapern|Capers
Kardamom|Cardamom
Knoblauch|Garlic
Koriander|Coriander
Koriandersamen|Coriander Seeds
Kreuzkümmel|Cumin
Kubebenpfeffer|Cubeb Pepper
Kümmel|Caraway
Kurkuma|Turmeric
Langer Pfeffer|Long Pepper
Macis|Mace
Mastix|Mastic
Meerrettich|Horseradish
Muskat|Nutmeg
Muskatnuss|Nutmeg
Nelke|Clove
Nelken|Cloves
Nigella|Nigella
Paprika|Paprika
Paradieskörner|Grains of Paradise
Parakresse|Buzz Button
Pfeffer|Pepper
Schwarzer Pfeffer|Black Pepper
Grüner Pfeffer|Green Pepper
Weißer Pfeffer|White Pepper
Rosa Beeren|Pink Peppercorn
Piment|Allspice
Safran|Saffron
Schwarzkümmel|Black Cumin
Senf|Mustard
Senfkörner|Mustard Seeds
Sesam|Sesame
Sternanis|Star Anise
Sumach|Sumac
Szechuanpfeffer|Sichuan Pepper
Tamarinde|Tamarind
Tonkabohne|Tonka Bean
Vanille|Vanilla
Wacholder|Juniper
Zimt|Cinnamon
Zwiebel|Onion
Zwiebeln|Onion
Aprikosen, getrocknet|Dried Apricots
Berberitzen|Barberries
Bergamotte|Bergamot
Bittermandel|Bitter Almond
Cashewnuss|Cashew
Champignon|Mushroom
Champignons|Mushrooms
Cranberrys|Cranberries
Dattel|Date
Datteln|Dates
Erdnuss|Peanut
Granatapfel|Pomegranate
Haselnuss|Hazelnut
Kakao|Cocoa
Kaffee|Coffee
Kokosnuss|Coconut
Kürbiskerne|Pumpkin Seeds
Limette|Lime
Macadamianuss|Macadamia
Mandel|Almond
Mandeln|Almonds
Mohn|Poppy Seed
Algen|Seaweed
Nori|Nori
Orangenschale|Orange Peel
Orangenblütenwasser|Orange Blossom Water
Paranüsse|Brazil Nuts
Parmesan|Parmesan
Pekannüsse|Pecans
Pfifferling|Chanterelle
Pinienkerne|Pine Nuts
Pistazie|Pistachio
Pistazien|Pistachios
Rosen|Rose
Rosenwasser|Rose Water
Rosenblätter|Rose Petals
Sellerie|Celery
Shiitake|Shiitake
Sonnenblumenkerne|Sunflower Seeds
Steinpilze|Porcini
Süßholz|Licorice
Trüffel|Truffle
Walnuss|Walnut
Walnüsse|Walnuts
Weinbeere|Raisin
Weinbeeren|Raisins
Yuzu|Yuzu
Zitrone|Lemon
Zitronen|Lemons
Zitronenschale|Lemon zest
Zitronensaft|Lemon Juice
Zitrusschale|Citrus Zest
Olivenöl|Olive Oil
Kürbiskernöl|Pumpkin Seed Oil
Sesamöl|Sesame Oil
Mandelöl|Almond Oil
Macadamianussöl|Macadamia Oil
Pinienkernöl|Pine Nut Oil
Mohnöl|Poppy Seed Oil
Butter|Butter
Essig|Vinegar
Cognac|Cognac
Rum|Rum
Whisky|Whisky
Angelika|Angelica
Myrte|Myrtle
Panch Phoron|Panch Phoron
Lamm|Lamb
Rind|Beef
Schwein|Pork
Huhn|Chicken
Geflügel|Poultry
Fisch|Fish
Meeresfrüchte|Seafood
Gemüse|Vegetables
Kartoffeln|Potatoes
Karotten|Carrots
Linsen|Lentils
Hülsenfrüchte|Legumes
Reis|Rice
Nudeln|Pasta
Spargel|Asparagus
Blumenkohl|Cauliflower
Kohl|Cabbage
Spinat|Spinach
Pilze|Mushrooms
Tofu|Tofu
Eier|Eggs
Käse|Cheese
Joghurt|Yogurt
Sahne|Cream
Kokosmilch|Coconut Milk
Schokolade|Chocolate
Honig|Honey
Gebäck|Pastry
Suppen|Soups
Salate|Salads
Obst|Fruit
Früchte|Fruits
Rote Linsen|Red Lentils
Gelbe Linsen|Yellow Lentils
Rote Bete|Beetroot
Schmorgerichten|Braised Dishes
klaren Fleischbrühen|Clear Meat Broths
Koriander-Zitronen -likör|Coriander-Lemon Liqueur
Eis|Ice Cream
Quark|Quark
Sauerrahm|Sour Cream
Schnäpsen|Spirits
Likören|Liqueurs
hellem Fleisch|light meat
Blattsala- ten|leaf salads
Eiern|eggs
Eintöpfen|stews
Jedem Gemüse|most vegetables
Hülsenfrüchte|legumes
fast allem|almost everything
etwa Fisch|e.g. fish
Fleisch|meat
Süßkartoffeln|sweet potatoes
Kürbis|squash
Okra|okra
Fruchtdessert|fruit dessert
Fruchteis|fruit sorbet
Leber|liver
Beifuss|Mugwort
Berberitze|Barberry
Bergkümmel|Mountain cumin
Maronen|chestnuts
Morcheln|morels
Muskat, Macis|Nutmeg and mace
Oliven|olives
Orangen|oranges
Pfifferlinge|chanterelles
Rauke, Rucola|arugula
Rose, Rosenwasser|rose and rose water
Süssholz|licorice
Tomaten, Getrocknet|dried tomatoes
Erdbeeren|strawberries
Himbeeren|raspberries
Gebäck|pastry
gebäck|pastry
süß|sweet
salzig|savory
Deutschland|Germany
Skandinavien|Scandinavia
Frankreich|France
Italien|Italy
Indien|India
Griechenland|Greece
Mexiko|Mexico
Nahost|Middle East
Nordafrika|North Africa
Fisch|fish
Geflügel|poultry
Schwein|pork
Lamm|lamb
Rind|beef
Wild|game
Meeresfrüchte|seafood
Birnen|pears
Milch|milk
dunklen|dark
Tomaten|tomatoes
Auberginen|eggplants
allen Sorten|many varieties
Kohlgerichten|cabbage dishes
Schmorgerichten|braised dishes
Bratkartoffeln|fried potatoes
Braten|roasts
Saucen|sauces
Rohem Schinken|cured ham
Granatapfelsamen|pomegranate seeds
Dunklen Saucen|dark sauces
Nüsse|nuts
Erbsen|peas
Olivenöl|olive oil
Oliven, -Öl|olives and oil
Oliven|olives
gebraten|roasted
gegrillt|grilled
Geschmortem|braised dishes
Gebratenem|roasted dishes
Gegrilltem|grilled dishes
Rotkohl|red cabbage
Mehlspeisen|pastries
Brot|bread
Gurken|cucumbers
Schweinebraten|roast pork
Sugos|sauces
Obstsalaten|fruit salads
Backwaren|baked goods
Blattsalat|leaf salad
Blattsalaten|leaf salads
Mee-Suppe|noodle soup
Pizza|pizza
Spinach|spinach
Yams|yams
Blumenkohl|cauliflower
Bohnen|beans
Kaninchen|rabbit
herzhaften|hearty
Schinken|ham
Stier|beef
Rind|beef
Ente|duck
dunklem Fleisch|dark meat
Tee|tea
Marzipan|marzipan
Frisch|fresh
Steinpilz|Porcini
Gartengurken|Garden cucumbers
Grütze|Fruit semolina pudding
Meeressalat|Sea lettuce
Haselnüsse|Hazelnuts
Arganöl|Argan oil
Walnussöl|Walnut oil
Pistazienöl|Pistachio oil
Petersilienöl|Parsley oil
Blauschimmelkäse|Blue cheese
Hartkäse|Hard cheese
Frischkäse|Cream cheese
Ziegenkäse|Goat cheese
Gewürze-Mischung|Spice blend
pilzgewürz|Mushroom spice blend
Geräucherter Myrtekäse|Smoked myrtle cheese
Kombuwürzpüree|Kombu spice puree
Olivenölwürfel|Olive oil cubes
Röstzwiebel|Roasted onion
Fenchellammrücken|Fennel lamb saddle
Bärlauchmaki|Wild garlic maki
Elastische Rosenblätter|Candied rose petals
Gefüllte runde Zucchini|Stuffed round zucchini
Geräucherter|Smoked
Katerfrühstück|Hangover breakfast
Lorbeerblättern|Bay leaves
limettenblättern|Lime leaves
Paradieskörnern|Grains of paradise
Rosmarin-Schokoplätzchen|Rosemary chocolate cookies
verschiedenen Pürees|Various purées
Kresseblüten|Cress blossoms
nüssen|nuts
blätter|leaves
grün|green
Überbacken|Baked topping
Geröstet|Toasted
Süppchen|Light soup
Trüffeln|Truffles
Macadamianüssen|Macadamia nuts
Und Paradieskörnern|And grains of paradise
Röstzwiebel Ohne Hitze|Roasted onion without heat
Rotes Kartoffelpüree|Red potato purée
Schokolade Kalt–heiß|Chocolate hot and cold
Steckrübenpüree|Rutabaga purée
Süßholzraspel Auf Fettbasis|Licorice shavings in fat
Wakame-käsescheiben|Wakame cheese slices
Waldmeistersprühsahne|Sweet woodruff spray cream
Walnusslikör|Walnut liqueur
Weinbeeren-olivenölcreme|Raisin olive oil cream
Zitronenuniversalgewürz|Lemon all-purpose seasoning
"""
for line in _RAW.strip().splitlines():
    if "|" in line:
        a, b = line.split("|", 1)
        DE_TO_EN[a.strip()] = b.strip()

DE_NORM = {k.lower(): v for k, v in DE_TO_EN.items()}


def translate(text: str) -> str:
    t = text.strip()
    if t.lower() in DE_NORM:
        return DE_NORM[t.lower()]
    base = re.sub(r"\s*\(.*?\)\s*$", "", t)
    if base.lower() in DE_NORM:
        return DE_NORM[base.lower()]
    return t


def _cap_words(s: str) -> str:
    parts = []
    for w in s.split():
        if not w:
            continue
        parts.append(w[:1].upper() + w[1:].lower() if w[1:] else w.upper())
    return " ".join(parts)


def _english_core_token(core: str) -> str:
    c = core.strip()
    if not c:
        return c
    low = c.lower()
    if low in DE_NORM:
        t = DE_NORM[low]
    else:
        t = translate(c)
        if t == c:
            t = translate(c.title())
    return _cap_words(t) if t else c


def english_appendix_food_name(raw: str) -> str:
    """German appendix dish lines → English (e.g. 'Lamm, Gebraten' → 'Roasted Lamb')."""
    s = raw.strip()
    if not s:
        return s
    ul = s.lower()
    if ul == "gebraten" or s.strip().upper() == "GEBRATEN":
        return "Roasted dishes"
    if ul == "gegrillt" or s.strip().upper() == "GEGRILLT":
        return "Grilled dishes"
    if ul.startswith("geschmort") or s.startswith("GESCHMORT"):
        return "Braised dishes"
    m = re.match(r"^(.+?),\s*Gebraten\s*$", s, re.I)
    if m:
        return "Roasted " + _english_core_token(m.group(1))
    m = re.match(r"^(.+?),\s*Gegrillt\w*\s*$", s, re.I)
    if m:
        return "Grilled " + _english_core_token(m.group(1))
    m = re.match(r"^(.+?),\s*Geschmort\w*\s*$", s, re.I)
    if m:
        return "Braised " + _english_core_token(m.group(1))
    t = translate(s)
    if t != s:
        return _cap_words(t)
    if "," in s:
        chunks = [x.strip() for x in s.split(",")]
        tr = [translate(x) for x in chunks]
        if tr != chunks:
            return ", ".join(_cap_words(x) for x in tr)
    return s


def _clean_seasoning_ocr(raw: str) -> str:
    s = raw.strip()
    s = re.sub(r"^[(\[\s,;]+", "", s)
    s = re.sub(r"[)\]\s,;]+$", "", s)
    s = re.sub(r"\)+$", "", s)
    s = s.strip()
    if s.count("(") > s.count(")"):
        s = s + ")"
    return s.strip()


def english_appendix_seasoning(raw: str) -> str:
    s = _clean_seasoning_ocr(raw)
    if not s:
        return _clean_seasoning_ocr(raw) or raw.strip()
    en = translate(s)
    if en == s and s != s.title():
        en = translate(s.title())
    en = _clean_seasoning_ocr(en)
    return _cap_words(en) if en else raw.strip()


def _finalize_pairs_food_line(s: str) -> str:
    if re.search(r",\s*Gebraten|,\s*Gegrillt|,\s*Geschmort", s, re.I):
        return english_appendix_food_name(s)
    return s


_SKIP_APPENDIX_FOOD_HEADERS = frozenset(
    {
        "GEWÜRZMISCHUNGEN",
        "GEWÜRZMISCHUNG",
        "REZEPTE",
        "REGISTER",
        "WAS PASST WOZU",
        "EINKAUF",
    }
)


def postprocess_food_pairings(rows: list[dict]) -> None:
    rows[:] = [
        r
        for r in rows
        if (r.get("_de") or r.get("name") or "").strip().upper() not in _SKIP_APPENDIX_FOOD_HEADERS
    ]
    for row in rows:
        de_food = row.get("_de") or row.get("name", "")
        row["name"] = english_appendix_food_name(de_food)
        row["id"] = to_id(row["name"])
        for sea in row.get("seasonings", []):
            de_s = sea.get("_de") or sea.get("name", "")
            sea["name"] = english_appendix_seasoning(de_s)
            sea["id"] = to_id(sea["name"])


def to_id(name: str) -> str:
    s = name.lower().strip()
    s = re.sub(r"[äÄ]", "ae", s)
    s = re.sub(r"[öÖ]", "oe", s)
    s = re.sub(r"[üÜ]", "ue", s)
    s = re.sub(r"ß", "ss", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def extract_text(path: str) -> str:
    doc = fitz.open(path)
    try:
        return "\n".join(p.get_text() for p in doc)
    finally:
        doc.close()


_SECTION_STOP = {
    "PASST GUT ZU",
    "LÄNDERKÜCHE",
    "LANDESKÜCHE",
    "AROMENENTFALTUNG",
    "EINKAUF",
    "HARMONIE",
    "GEWÜRZMISCHUNGEN",
    "GEWÜRZMISCHUNG",
    "QUALITÄTEN",
    "GESCHICHTE",
    "EXTRA",
}


def parse_harmonie(text: str) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    pat = re.compile(
        r"HARMONIE\s*\n\s*([A-ZÄÖÜ][A-ZÄÖÜ ,\-()]*?)\s*\n((?:[A-ZÄÖÜ0-9][^\n]*\n)+)",
        re.MULTILINE,
    )
    for m in pat.finditer(text):
        name = m.group(1).strip().title()
        block = m.group(2)
        parts: list[str] = []
        for line in block.split("\n"):
            raw = line.strip()
            if not raw:
                continue
            up = raw.upper().replace("ß", "SS")
            if up in _SECTION_STOP:
                break
            if len(raw) < 2:
                continue
            parts.append(raw.title())
        if name and parts:
            out[name] = parts
    return out


def _nearest_harmonie_ingredient(preceding: str) -> str | None:
    hits = list(
        re.finditer(r"HARMONIE\s*\n\s*([A-ZÄÖÜ][A-ZÄÖÜ ,\-()]*?)\s*\n", preceding)
    )
    if not hits:
        return None
    return hits[-1].group(1).strip().title()


def parse_block_after_harmonie(
    text: str, header: str, stop_re: str
) -> dict[str, str]:
    out: dict[str, str] = {}
    pat = re.compile(
        rf"{header}\s*\n(.*?)(?={stop_re})",
        re.DOTALL | re.IGNORECASE,
    )
    for m in pat.finditer(text):
        body = m.group(1).strip()
        body = re.sub(r"\s+", " ", body.replace("\n", " "))
        ing = _nearest_harmonie_ingredient(text[: m.start()])
        if ing:
            out[ing] = body
    return out


def parse_was_passt_wozu(full_text: str) -> list[dict]:
    start = full_text.find("WAS PASST WOZU")
    if start < 0:
        return []
    chunk = full_text[start:]
    end = chunk.find("REGISTER")
    if end > 0:
        chunk = chunk[:end]
    lines = chunk.split("\n")
    rows: list[dict] = []
    current_food: str | None = None
    spices: list[dict] = []

    for line in lines:
        line = line.strip()
        if not line or line.startswith("WAS PASST"):
            continue
        if re.match(r"^[A-ZÄÖÜÉ\s,\-()]+$", line) and not re.search(r"\d", line) and len(line) > 3:
            if current_food and spices:
                en = translate(current_food.title())
                rows.append(
                    {
                        "id": to_id(en),
                        "name": en,
                        "_de": current_food,
                        "seasonings": spices,
                    }
                )
            current_food = line
            spices = []
        elif current_food and re.search(r"\d{2,3}\s*$", line):
            spice = re.sub(r"\s*\d{2,3}\s*$", "", line).strip()
            if len(spice) > 1:
                en = translate(spice)
                sid = to_id(en)
                if not any(s.get("id") == sid for s in spices):
                    spices.append({"id": sid, "name": en, "_de": spice})

    if current_food and spices:
        en = translate(current_food.title())
        rows.append(
            {
                "id": to_id(en),
                "name": en,
                "_de": current_food,
                "seasonings": spices,
            }
        )
    return rows


def parse_heat(raw: str) -> dict | None:
    out: dict[str, str] = {}
    parts = re.split(r"\b([ABC])\s+", raw)
    key = None
    for p in parts:
        p = p.strip()
        if p in ("A", "B", "C"):
            key = p.lower()
        elif key and p:
            out[key] = translate(p.rstrip("."))
    return out or None


def build_ingredients(
    harmonie: dict[str, list[str]],
    passt: dict[str, str],
    laender: dict[str, str],
    aromen: dict[str, str],
    gewuerz: dict[str, str],
) -> list[dict]:
    ingredients: list[dict] = []
    seen: set[str] = set()

    for de_name, partners in sorted(harmonie.items()):
        en_name = translate(de_name)
        iid = to_id(en_name)
        if iid in seen:
            continue
        seen.add(iid)
        harmonizes = []
        for p in partners:
            pe = translate(p)
            pid = to_id(pe)
            if pid != iid:
                harmonizes.append({"id": pid, "name": pe})
        entry: dict = {
            "id": iid,
            "name": en_name,
            "_de": de_name,
            "harmonizes_with": harmonizes,
            "pairs_with_foods": [],
        }
        if de_name in passt:
            for bit in re.split(r",\s*", passt[de_name]):
                bit = bit.strip()
                if bit and len(bit) > 1:
                    entry["pairs_with_foods"].append(translate(bit))
        if de_name in laender:
            entry["cuisines"] = [c.strip() for c in re.split(r"(?=[A-ZÄÖÜ][a-zäöü]+:)", laender[de_name]) if c.strip() and ":" in c]
        if de_name in aromen:
            hb = parse_heat(aromen[de_name])
            if hb:
                entry["heat_behavior"] = hb
        if de_name in gewuerz:
            entry["spice_blends"] = [b.strip() for b in re.split(r",\s*", gewuerz[de_name]) if len(b.strip()) > 2]
        ingredients.append(entry)
    return ingredients


_BAD_HARMONY_IDS = frozenset(
    {
        "passt-gut-zu",
        "aromenentfaltung",
        "laenderkueche",
        "landeskueche",
        "einkauf",
        "gewuerzmischungen",
        "harmonie",
        "paprikapulver-schmeckt-erdig-wuerzig-je",
    }
)


def infer_aroma_groups(english_name: str) -> list[int]:
    """Heuristic 1–8 aroma groups (Vierich/Vilgis); 8 = trigeminal heat/cool."""
    n = english_name.lower()
    g: set[int] = set()
    if any(
        x in n
        for x in (
            "garlic",
            "onion",
            "leek",
            "chive",
            "mustard",
            "horseradish",
            "cress",
            "wasabi",
            "asafoetida",
            "cabbage",
        )
    ):
        g.add(1)
    if any(
        x in n
        for x in (
            "citrus",
            "lemon",
            "lime",
            "orange",
            "bergamot",
            "yuzu",
            "basil",
            "lavender",
            "rose",
            "coriander",
            "dill",
            "anise",
            "fennel",
            "apricot",
            "mint",
            "lemon balm",
            "verbena",
        )
    ):
        g.add(2)
    if any(
        x in n
        for x in (
            "rosemary",
            "thyme",
            "oregano",
            "marjoram",
            "savory",
            "eucalyptus",
            "juniper",
            "bay",
            "sage",
            "hyssop",
        )
    ):
        g.add(3)
    if any(
        x in n
        for x in (
            "pepper",
            "clove",
            "nutmeg",
            "mace",
            "allspice",
            "cubeb",
            "long pepper",
            "sichuan",
            "juniper",
        )
    ):
        g.add(4)
    if any(
        x in n
        for x in (
            "vanilla",
            "almond",
            "tonka",
            "coffee",
            "cocoa",
            "walnut",
            "hazelnut",
        )
    ):
        g.add(5)
    if any(x in n for x in ("cinnamon", "cassia", "star anise", "licorice")):
        g.add(6)
    if any(
        x in n
        for x in (
            "cumin",
            "caraway",
            "fenugreek",
            "paprika",
            "turmeric",
            "annatto",
            "sesame",
        )
    ):
        g.update({4, 7})
    if any(x in n for x in ("chili", "pepper", "ginger", "peppermint", "menthol")):
        g.add(8)
    if not g:
        g.add(2)
        g.add(3)
    return sorted(g)


_HEAT_PHRASES = [
    (r"Blumig", "Floral"),
    (r"aromatisch", "aromatic"),
    (r"anisartig", "anise-like"),
    (r"Optimale aromatische", "Optimal aromatic"),
    (r"Anisnote", "anise note"),
    (r"Leicht bitter", "Lightly bitter"),
    (r"dunklen Röstnoten", "dark roast notes"),
    (r"Erdige", "Earthy"),
    (r"holzig", "woody"),
    (r"Intensive Farbe", "Intense color"),
    (r"Deutliche Schwefelnote", "Distinct sulfur note"),
    (r"Leicht blumig", "Lightly floral"),
    (r"Milde", "Mild"),
    (r"Schwefel nicht mehr im Vordergrund", "sulfur no longer dominant"),
    (r"Hauptverwendung", "typical use"),
    (r"Frisch", "Fresh"),
    (r"stechend", "pungent"),
    (r"Mildes Aroma", "Mild aroma"),
    (r"Stumpf", "Flat"),
    (r"bitter", "bitter"),
    (r"Frisches, blumiges Aroma", "Fresh, floral aroma"),
    (r"kräuterteeartig", "herbal-tea-like"),
    (r"Volles Kressearoma", "Full cress aroma"),
    (r"Verlust an Duft", "loss of aroma"),
    (r"trigeminalen Reizen", "trigeminal bite"),
]


def _english_heat(s: str) -> str:
    t = s
    for de, en in _HEAT_PHRASES:
        t = re.sub(de, en, t, flags=re.I)
    t = re.split(r"\s+l\s+Alkohol", t, flags=re.I)[0]
    t = re.split(r"[αβ][\-−]", t)[0]
    t = re.sub(r"\s+", " ", t).strip()
    if len(t) > 160:
        t = t[:157] + "…"
    return t


_GERMAN_HINT = re.compile(
    r"(?i)\b(und|der|die|das|mit|von|zu|für|auch|wie|aus|bei|"
    r"eine|einen|wurden|schon|vor|Jahren|kultiviert|bisschen|nicht|noch|"
    r"nach|über|vom|zum|beim|einem|einer)\b"
)
_UCRX = re.compile(r"[äöüÄÖÜß]")


def _looks_untranslated_german(s: str) -> bool:
    if _UCRX.search(s):
        return True
    return bool(_GERMAN_HINT.search(s))


def _dedupe_ci(seq: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for x in seq:
        k = x.lower()
        if k in seen:
            continue
        seen.add(k)
        out.append(x)
    return out


def _clean_display_phrase(raw: str) -> str | None:
    """Keep English-facing lines; drop obvious OCR/German leftovers."""
    s = re.sub(r"\s+", " ", raw.replace("\n", " ")).strip()
    s = re.sub(r"(?i)Sala-\s*ten", "salads", s)
    s = re.sub(r"(?i)Schmorgerich-\s*ten", "braised dishes", s)
    s = re.sub(r"(?i)Blumenkohl", "cauliflower", s)
    s = re.sub(r"(?i)\bherzhaften\b", "hearty", s)
    s = re.sub(r"(?i)Blu-\s*men", "", s).strip()
    s = re.sub(r"(?i)allen\s+Fleischsorten", "all meats", s)
    s = re.sub(r"(?i)\bSalaten\b", "salads", s)
    s = re.sub(r"(?i)\bMarinaden\b", "marinades", s)
    s = re.sub(r"(?i)^Frisch:\s*", "Fresh: ", s)
    s = re.sub(r"(?i)dunklem\s+Fleisch", "dark meat", s)
    s = re.sub(r"(?i)Gegrilltem\s*\(\s*Fleisch", "grilled meat", s)
    s = re.sub(r"(?i)Fleisch\s*\(\s*gebraten,\s*grilled", "meat (roast, grilled", s)
    s = re.sub(r"(?i)Fleisch\s*\(\s*gebraten", "meat (roast", s)
    s = re.sub(r"(?i)Schmorgerichten", "braised dishes", s)
    s = re.sub(r"(?i)Back\s*-\s*$", "baking", s)
    s = re.sub(r"(?i)Steinpilz", "porcini", s)
    s = re.sub(r"(?i)\bAuberginen\b", "eggplants", s)
    s = re.sub(r"(?i)Rind\s*,\s*Stier", "beef", s)
    s = re.sub(r"(?i)\bRind\b|\bStier\b", "beef", s)
    s = re.sub(r"(?i)Zitronenschale", "lemon zest", s)
    s = re.sub(r"(?i)Zitrusschalen", "citrus zest", s)
    s = re.sub(r"\s+", " ", s).strip()
    if len(s) < 2:
        return None
    if len(s) > 120 and re.search(r"\b\d{3,}\b", s):
        return None
    if re.match(r"^[.,;:\-–—()]+$", s):
        return None
    s = re.sub(r"Gebäck\s*\(\s*sweet\s*$", "sweet pastry", s, flags=re.I)
    s = s.replace("(sweet", "sweet").replace("savory)", "savory")
    s = re.sub(r"\s+", " ", s).strip("() ")
    if _looks_untranslated_german(s):
        s2 = translate(s)
        if s2 == s or _looks_untranslated_german(s2):
            return None
        s = s2
    return s


def postprocess_ingredients(ingredients: list[dict]) -> None:
    for ing in ingredients:
        ing["harmonizes_with"] = [
            h for h in ing.get("harmonizes_with", []) if h.get("id") not in _BAD_HARMONY_IDS
        ]
        ing["aroma_groups"] = infer_aroma_groups(ing["name"])
        if ing.get("heat_behavior"):
            for k in list(ing["heat_behavior"].keys()):
                ing["heat_behavior"][k] = _english_heat(ing["heat_behavior"][k])
        foods: list[str] = []
        for p in ing.get("pairs_with_foods", []):
            p2 = translate(p.replace("\n", " "))
            for bit in re.split(r",\s*", p2):
                b = bit.strip()
                if len(b) < 2:
                    continue
                if len(b) <= 5 and b.endswith("-"):
                    continue
                b2 = translate(b)
                cleaned = _clean_display_phrase(b2)
                if cleaned:
                    foods.append(cleaned)
        foods = _dedupe_ci(foods)
        merged: list[str] = []
        i = 0
        while i < len(foods):
            if (
                i + 2 < len(foods)
                and foods[i].lower().startswith("braised dishes (beef")
                and foods[i + 1].lower() == "beef"
                and foods[i + 2].lower() == "game"
            ):
                merged.append("braised dishes (beef, game)")
                i += 3
                continue
            merged.append(_finalize_pairs_food_line(foods[i]))
            i += 1
        ing["pairs_with_foods"] = merged
        if ing.get("cuisines"):
            cuisines2 = []
            for c in ing["cuisines"]:
                c2 = translate(c.replace("\n", " "))
                cc = _clean_display_phrase(c2)
                if cc:
                    cuisines2.append(cc)
            ing["cuisines"] = _dedupe_ci(cuisines2)
        if ing.get("spice_blends"):
            blends = []
            for b in ing["spice_blends"]:
                b2 = translate(b.replace("\n", " "))
                bc = _clean_display_phrase(b2)
                if bc:
                    blends.append(bc)
            ing["spice_blends"] = _dedupe_ci(blends)


def pairing_matrix(ingredients: list[dict]) -> dict[str, list[str]]:
    """Adjacency for spices that both exist as ingredient profiles (drops orphan harmony slugs)."""
    valid = {ing["id"] for ing in ingredients}
    m: dict[str, set[str]] = {i: set() for i in valid}
    for ing in ingredients:
        iid = ing["id"]
        if iid not in valid:
            continue
        for h in ing.get("harmonizes_with", []):
            hid = h["id"]
            if hid not in valid:
                continue
            m[iid].add(hid)
            m[hid].add(iid)
    return {k: sorted(v) for k, v in sorted(m.items())}


def main() -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    if not PDF_PART3 or not os.path.isfile(PDF_PART3):
        print("ERROR: Part3 PDF not found. Set ARAMA_BIBLE_PART3 or ARAMA_BIBLE_PDF_BASE.", file=sys.stderr)
        sys.exit(2)

    print("Reading Part1…", PDF_PART1)
    t1 = extract_text(PDF_PART1) if PDF_PART1 and os.path.isfile(PDF_PART1) else ""
    print("Reading Part2…", PDF_PART2 or "(not found)")
    t2 = extract_text(PDF_PART2) if PDF_PART2 and os.path.isfile(PDF_PART2) else ""
    if not t2 and not os.environ.get("ARAMA_BIBLE_PART2"):
        print("INFO: Part2 optional — add Aroma Bible_Part2.pdf under PDF base or set ARAMA_BIBLE_PART2.")
    print("Reading Part3…", PDF_PART3)
    t3 = extract_text(PDF_PART3)
    combined = "\n".join(x for x in (t1, t2, t3) if x)

    harmonie = parse_harmonie(combined)
    stop = (
        r"\n[A-ZÄÖÜ]{4,}|\nEINKAUF|\nLÄNDERKÜCHE|\nAROMENENTFALTUNG|"
        r"\nGEWÜRZMISCHUNG|\nQUALITÄT|\nPASST GUT|\nHARMONIE|\nGESCHICHTE|\nEXTRA"
    )
    passt = parse_block_after_harmonie(combined, "PASST GUT ZU", stop)
    laender = parse_block_after_harmonie(combined, "LÄNDERKÜCHE", stop)
    aromen = parse_block_after_harmonie(combined, "AROMENENTFALTUNG", stop)
    gewuerz = parse_block_after_harmonie(combined, r"GEWÜRZMISCHUNGEN?", stop)

    ingredients = build_ingredients(harmonie, passt, laender, aromen, gewuerz)
    postprocess_ingredients(ingredients)
    matrix = pairing_matrix(ingredients)

    food_pairings: list[dict] = []
    if PDF_PART4 and os.path.isfile(PDF_PART4):
        print("Reading Part4…", PDF_PART4)
        t4 = extract_text(PDF_PART4)
        food_pairings = parse_was_passt_wozu(t4)
        postprocess_food_pairings(food_pairings)
    else:
        print("WARN: Part4 PDF missing; food_pairings.json will be empty.")

    for path, data in (
        (os.path.join(OUTPUT_DIR, "ingredients.json"), ingredients),
        (os.path.join(OUTPUT_DIR, "food_pairings.json"), food_pairings),
        (os.path.join(OUTPUT_DIR, "pairing_matrix.json"), matrix),
    ):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print("Wrote", path, f"({len(data) if isinstance(data, list) else len(data)} items)")

    untranslated: set[str] = set()
    for ing in ingredients:
        if ing["name"] == ing["_de"]:
            untranslated.add(ing["_de"])
    if untranslated:
        rev = os.path.join(OUTPUT_DIR, "_review_untranslated.json")
        with open(rev, "w", encoding="utf-8") as f:
            json.dump(sorted(untranslated), f, indent=2, ensure_ascii=False)
        print("Wrote", rev, len(untranslated), "names")


if __name__ == "__main__":
    main()
