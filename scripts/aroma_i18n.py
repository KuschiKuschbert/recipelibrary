#!/usr/bin/env python3
"""German→English glossary and post-processing for aroma_data/*.json (no PyMuPDF)."""
from __future__ import annotations

import re

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
Bockshornkleekraut|Fenugreek Leaves
Fenchelkraut|Fennel Fronds
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
Paranuss|Brazil Nut
Parmesan|Parmesan
Pekannüsse|Pecans
Pekannuss|Pecan
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
Maniok|Cassava
Maniokwurzel|Cassava
Maniokwur-|Cassava
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
Zucker|Sugar
Morchel|Morel
Karamell|Caramel
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
Mitteleuropa|Central Europe
arabisches|Arabic
Arabisches|Arabic
Indisches|Indian
Indische|Indian
Indische Masalas|Indian spice mixes
Kartoffelgerichte|potato dishes
deftige Kartoffelgerichte|hearty potato dishes
deftige|hearty
Kartoffelsalat|potato salad
neuen Kartoffeln|new potatoes
zitrusartig|citrus-like
leicht|lightly
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
    (r"Kräuterig warme", "Warm herbal"),
    (r"Kräuterig,", "Herbal,"),
    (r"Kräuterig-", "Herbal-"),
    (r"Kräuterig", "Herbal"),
    (r"kräuteriger", "more herbal"),
    (r"kräuterig-", "herbal-"),
    (r"kräuterig", "herbal"),
    (r"Würzig-rauchige", "Spicy-smoky"),
    (r"Würzig-", "Spicy-"),
    (r"würzige", "spicy"),
    (r"würzigen", "spicy"),
    (r"wärmend balsamisch", "warming balsamic"),
    (r"wärmend", "warming"),
    (r"Schärfe wird", "Heat"),
    (r"Schärfe", "heat"),
    (r"süßlich-bitter", "sweet-bitter"),
    (r"süßlich-minzige", "sweet-minty"),
    (r"süßlich", "sweet"),
    (r"säuerlich-fruchtig", "tangy-fruity"),
    (r"säuerlich", "tangy"),
    (r"Fruchtig-süß-säuerlich", "Fruity-sweet-tangy"),
    (r"Fruchtig", "Fruity"),
    (r"mandelig", "almond-like"),
    (r"marzipanartig", "marzipan-like"),
    (r"bittermandelig", "bitter-almond-like"),
    (r"Abgeschwächt", "Muted"),
    (r"abgeschwächter", "muted"),
    (r"abgeschwächt", "muted"),
    (r"Betonung der typischen", "Emphasis on typical"),
    (r"Betonung", "Emphasis on"),
    (r"Kaffeeröst", "coffee roast"),
    (r"Kakaonoten", "cocoa notes"),
    (r"Schokoladennote", "chocolate note"),
    (r"Röstnoten", "roast notes"),
    (r"Röstno-\s*ten", "roast notes"),
    (r"Röststoffe", "roast compounds"),
    (r"Röstnöten", "roast notes"),
    (r"Deutlich nussige", "Clearly nutty"),
    (r"Deutlich", "Clearly"),
    (r"nussige", "nutty"),
    (r"Warme Röstnoten", "Warm roast notes"),
    (r"Warme", "Warm"),
    (r"Stärkeres wermutartiges", "Stronger wormwood-like"),
    (r"Stärkeres", "Stronger"),
    (r"wermutartiges", "wormwood-like"),
    (r"wachsig", "waxy"),
    (r"ungeröstet", "unroasted"),
    (r"fettig", "fatty"),
    (r"kampferig", "camphorous"),
    (r"Florale Röstnoten", "Floral roast notes"),
    (r"Florale", "Floral"),
    (r"mitunter Florale", "sometimes floral"),
    (r"Harzig", "resinous"),
    (r"harzig", "resinous"),
    (r"Balsamische,", "Balsamic,"),
    (r"balsamisch", "balsamic"),
    (r"betäubend", "numbing"),
    (r"Volles Aroma", "Full aroma"),
    (r"Feiner,", "Finer,"),
    (r"mitunter zitrusartiger", "sometimes citrus-like"),
    (r"zitrusartiger", "citrus-like"),
    (r"Fresh,\s*leicht zitrusartig", "Fresh, lightly citrus-like"),
    (r"Fresh,\s*leicht zitrusartiger", "Fresh, lightly citrus-like"),
    (r"leicht zitrusartig", "lightly citrus-like"),
    (r",\s*leicht zitrusartig", ", lightly citrus-like"),
    (r"Roher Pilzduft", "Raw mushroom aroma"),
    (r"Rohpilzduft", "raw mushroom aroma"),
    (r"schwefliger Rohpilzduft", "sulfurous raw mushroom aroma"),
    (r"schwefliger", "sulfurous"),
    (r"Fresh,\s*leicht aromatic", "Fresh, lightly aromatic"),
    (r"Fresh,\s*leicht tangy", "Fresh, lightly tangy"),
    (r"leicht muf-\s*fig", "lightly mushroom-like"),
    (r"Fresh,\s*leicht scharf", "Fresh, lightly hot"),
    (r"leicht scharf", "lightly hot"),
    (r"leicht fatty", "lightly fatty"),
    (r"Rather waxy,\s*leicht fatty", "Rather waxy, lightly fatty"),
    (r"Fresh,\s*zitrusartig\b", "Fresh, citrus-like"),
    (r"Floral,\s*zitrusartig", "Floral, citrus-like"),
    (r"Fresh,\s*zitrusartig,\s*Floral", "Fresh, citrus-like, Floral"),
    (r"Floral-zitrusartig", "Floral-citrus-like"),
    (r"Floral-waxy-zitrusartig", "Floral-waxy-citrus-like"),
    (r"Fast zitrusartiges Anisaroma", "Almost citrus-like anise aroma"),
    (r"zitrusartiges Anisaroma", "citrus-like anise aroma"),
    (r"Fresh zitrus-pinienartige Pfeffernoten", "Fresh citrus-pine-like pepper notes"),
    (r"Pfeffernoten", "pepper notes"),
    (r"pinienartige\b", "pine-like"),
    (r"resinouss aroma", "resinous aroma"),
    (r"Butterig-Earthys,\s*leicht tangy-bitteres", "Buttery-earthy, lightly tangy-bitter"),
    (r"Butterig-Earthys", "Buttery-earthy"),
    (r"tangy-bitteres", "tangy-bitter"),
    (r"Earthys\b", "Earthy"),
    (r"Kümmel-", "caraway "),
    (r"Zusätzlich aromatice", "Additionally aromatic"),
    (r"Zusätzlich", "Additionally"),
    (r"Zunahme der bitterkeit", "Increase in bitterness"),
    (r"Zunahme der", "Increase in"),
    (r"bitterkeit", "bitterness"),
    (r"Abschwächung der pungenten", "Softening of pungent"),
    (r"Abschwächung der", "Softening of"),
    (r"Typisches Koriandergrün", "Typical cilantro"),
    (r"Koriandergrün", "cilantro"),
    (r"Süßlich-warme,", "Sweet-warm,"),
    (r"optimale Kerbelnote", "optimal chervil note"),
    (r"Kerbelnote", "chervil note"),
    (r"Leichte, mitunter", "Light, sometimes"),
    (r"Earthyr", "Earthy"),
    (r"kräuterig-Earthy", "herbal-earthy"),
    (r"pilzartig-chloriger", "mushroom-chlorine-like"),
    (r"aromatice,", "aromatic,"),
    (r"aromatice", "aromatic"),
    (r"ölig-nussige", "oily-nutty"),
    (r"Hervorheben kräuteriger", "Highlighting herbal"),
    (r"Hervorheben", "Highlighting"),
    (r"schwefelig-lauchiger", "sulfur-garlic-like"),
    (r"Beifügen von Röstnöten", "Addition of roast notes"),
    (r"Beifügen von", "Addition of"),
    (r"Das ätherische Öl der Bergamotte hat einen charakteristischen,", "Characteristic"),
    (r"hat einen charakteristischen", "characteristic"),
    (r"Eher Flat", "Rather flat"),
    (r"Eher", "Rather"),
    (r"Hauptaroma der Eberraute definiert sich über den eukalyptus-", "Main southernwood aroma: eucalyptus-"),
    (r"151 Das Hauptaroma der Eberraute definiert sich über den eukalyptus- und", "Eucalyptus- and"),
    (r"151 Das Hauptaroma", ""),
    (r"definiert sich über den", "from"),
    (r"Charakteristischer Fresher", "Characteristic fresh"),
    (r"Charakteristischer", "Characteristic"),
    (r"Ein Eindeutiges Schlüsselaroma Gibt Es Trotz Des Charakteristischen Geruchs", ""),
    (r"Das Schlüsselaroma Des Gewürzes Ist Durch Das Aromatisch-Kräuterig Duf-", ""),
    (r"Aromen,", "aromas,"),
    (r"\bAromen\b", "aromas"),
    (r"Earthy Aromen", "Earthy aromas"),
    (r"Wachsige,", "Waxy,"),
    (r"dezent betäubende", "lightly numbing"),
    (r"BENZALDEHYD", "benzaldehyde"),
    (r"\s+l\s+Wasser\s+", " in water "),
    (r"Fresh-süß", "Fresh-sweet"),
    (r"süß-tangy", "sweet-tangy"),
    (r"Fruity-süß-tangy", "Fruity-sweet-tangy"),
    (r"aromatic-süß bis", "aromatic-sweet to"),
    (r"Fresh, grüner,", "Fresh, green,"),
    (r"mushroom-chlorine-like Duft", "mushroom-chlorine-like aroma"),
    (r"ölig-nutty Note", "oily-nutty note"),
    (r"roast notes stärker im Vordergrund", "roast notes more prominent"),
    (r"bitter-\s*süß", "bitter-sweet"),
    (r"Mild resinouse Töne", "Mild resinous tones"),
    (r"resinouse", "resinous"),
    (r"Typisch Floral grüne", "Typical floral green"),
    (r"röstiger", "more roasted"),
    (r"anise-like-würzig", "anise-like spicy"),
    (r"Sehr würzig,", "Very spicy,"),
    (r"Würzig, muskatartig", "Spicy, nutmeg-like"),
    (r"muskatartig", "nutmeg-like"),
    (r"Würzig, erdig", "Spicy, earthy"),
    (r"erdig", "earthy"),
    (r"Schwefelig-pungent", "Sulfurous-pungent"),
    (r"Schwefelig", "Sulfurous"),
    (r"würzig", "spicy"),
    (r"Würzig", "Spicy"),
    (r"Dominant floral-herbal, „grüner“ Ein", "Dominant floral-herbal green note"),
    (r"Fresh grüne Säure", "Fresh green acidity"),
    (r"waxyes,", "waxy,"),
    (r"waxyes", "waxy"),
    (r"grünes,", "green,"),
    (r"leicht resinouses", "lightly resinous"),
    (r"Aro-\s*ma", "aroma"),
    (r"Bildung von roast notes Die Kerne müssen geschält werden und sind dann sowohl geröstet als", "Roast notes form; kernels must be shelled and can be toasted or"),
    (r"geröstet", "toasted"),
    (r"leicht Earthy Säure", "light earthy acidity"),
    (r"Fresh-Fruity-grünlich", "Fresh-fruity-greenish"),
    (r"Schwerere, sweete, schokoladig-tabakähnliche Noten", "Heavier, sweet, chocolate-tobacco-like notes"),
    (r"schokoladig-tabakähnliche", "chocolate-tobacco-like"),
    (r"Feine nutty Töne", "Fine nutty tones"),
    (r"Additionallye Röstaromen", "Additional roast aromas"),
    (r"Additionallye", "Additional"),
    (r"Feine süß-bittere, heuartige Noten\s*\d*", "Fine sweet-bitter, hay-like notes"),
    (r"heuartige", "hay-like"),
    (r"Fresh Säure, waxye Anklänge", "Fresh acidity, waxy hints"),
    (r"waxye", "waxy"),
    (r"Anklänge", "hints"),
    (r"Feine Spicy-Floral Zimttöne", "Fine spicy-floral cinnamon notes"),
    (r"Zimttöne", "cinnamon notes"),
    (r"Fresh, grünlich, zitronig-herbal", "Fresh, greenish, lemon-herbal"),
    (r"zitronig-", "lemon-"),
    (r"grünlich", "greenish"),
    (r"Rein süß", "Purely sweet"),
    (r"\bSäure\b", "acidity"),
    (r"\bsüß\b", "sweet"),
    (r"\bsüße\b", "sweet"),
    (r"\bsweete\b", "sweet"),
    (r"Holzartig,", "Woody,"),
    (r"Holzartig", "Woody"),
    (r"Optimale Aromenentfaltung beim Kochen", "Optimal aroma when cooking"),
    (r"Aromenentfaltung beim Kochen", "aroma development when cooking"),
    (r"Fresh Herbaler Duft", "Fresh herbal aroma"),
    (r"Herbaler Duft", "herbal aroma"),
    (r"Lightly bitter mit dark", "Lightly bitter with dark"),
    (r"\bmit dark\b", "with dark"),
    (r"woody-aromatic Noten", "woody-aromatic notes"),
    (r"bitteralmond-like in water benzaldehydeee", "bitter-almond-like in water (benzaldehyde)"),
    (r"benzaldehydeee", "benzaldehyde"),
    (r"Typischer Champignonduft, herzhaft", "Typical mushroom aroma, savory"),
    (r"Champignonduft", "mushroom aroma"),
    (r"Kampferartig bis bitter", "Camphorous to bitter"),
    (r"Fresh, pinienartiger Duft", "Fresh, pine-like aroma"),
    (r"pinienartiger Duft", "pine-like aroma"),
    (r"Characteristic Fresh Duft", "Characteristic fresh aroma"),
    (r"typischer Duft", "typical aroma"),
    (r"Rather flat, aber aromatic", "Rather flat, but aromatic"),
    (r"\baber aromatic\b", "but aromatic"),
    (r"151 Das Main southernwood aroma: eucalyptus- und", "eucalyptus- and"),
    (r"Main southernwood aroma: eucalyptus- und", "eucalyptus- and"),
    (r"Fresh, typischer Duft", "Fresh, typical aroma"),
    (r"Feine waxy, fattye Noten", "Fine waxy, fatty notes"),
    (r"fattye Noten", "fatty notes"),
    (r"Fresh Duft", "Fresh aroma"),
    (r"Floral Noten", "Floral notes"),
    (r"Rather Floral Noten \(etwa beim Einlegen\)", "Rather floral notes (especially when pickling)"),
    (r"etwa beim Einlegen", "especially when pickling"),
    (r"Typischer Morchelduft und -geschmack", "Typical morel aroma and flavor"),
    (r"Morchelduft und -geschmack", "morel aroma and flavor"),
    (r"resinous Noten be", "resinous note"),
    (r"tangyes Olivenaroma, leichte bitter", "tangy olive aroma, lightly bitter"),
    (r"Olivenaroma", "olive aroma"),
    (r"Floralr Duft", "Floral aroma"),
    (r"ingwerartige heat", "ginger-like heat"),
    (r"woodye Noten", "woody notes"),
    (r"dezente heat", "subtle heat"),
    (r"Dominan-\s*te roast notes zwischen Karamell und Kaffee", "Dominant roast notes between caramel and coffee"),
    (r"zwischen Karamell und Kaffee", "between caramel and coffee"),
    (r"Herbal-spicy Noten", "Herbal-spicy notes"),
    (r"Floral-bittere, spicy Noten", "Floral-bitter, spicy notes"),
    (r"Balsamic, spicy Noten", "Balsamic, spicy notes"),
    (r"Earthy, woody-aromatic Noten", "Earthy, woody-aromatic notes"),
    (r"RAceto Balsamico, da dessen hoher Anteil am karamellig-sweeten Aroma", "Balsamic vinegar, caramel-sweet note"),
    (r"karamellig-sweeten Aroma", "caramel-sweet aroma"),
    (r"ANBAU Man bekommt mittlerweile in den meisten", ""),
    (r"Freisetzung der Aro-\s*men aus der Saat beim Anbraten", "Aromas released from the seed when searing"),
    (r"Emphasis on der woodyen Duftanteile", "Emphasis on woody aroma components"),
    (r"woodyen Duftanteile", "woody aroma components"),
    (r"Emphasis on der\b", "Emphasis on the"),
    (r"Highlighting der bitternoten", "Highlighting bitter notes"),
    (r"bitternoten", "bitter notes"),
    (r"Intensivierung der aromati", "Intensification of aromatic notes"),
    (r"Finer, floral-tangyer Duft und Geschmack", "Finer, floral-tangy aroma and flavor"),
    (r"Duft und Geschmack", "aroma and flavor"),
    (r"Sehr intensiver Duft, herber Geschmack", "Very intense aroma, tart flavor"),
    (r"herber Geschmack", "tart flavor"),
    (r"Cremige, sweet-Floral, aromatic Noten", "Creamy, sweet-floral, aromatic notes"),
    (r"aromatic Noten im Nussaroma", "aromatic notes in the nut aroma"),
    (r"Bildung karamelliger Noten", "Formation of caramel notes"),
    (r"karamelliger Noten", "caramel notes"),
    (r"Bildung vieler roast notes aus Zwiebel", "Formation of many roast notes from onion"),
    (r"Bildung von\b", "Formation of"),
    (r"Rauchig, wenig bitter", "Smoky, lightly bitter"),
    (r"schokoladig", "chocolate-like"),
    (r"Balsamic, Mild Noten", "Balsamic, mild notes"),
    (r"earthy-Sulfurouse Noten", "earthy sulfurous notes"),
    (r"Sulfurouse Noten", "sulfurous notes"),
]


def _heat_token_scrub(t: str) -> str:
    """Replace common German tokens left in heat strings (ASCII, no umlauts)."""
    t = re.sub(r"\bNoten\b", "notes", t, flags=re.I)
    t = re.sub(r"\bDuft\b", "aroma", t, flags=re.I)
    t = re.sub(r"\bGeschmack\b", "flavor", t, flags=re.I)
    t = re.sub(r"\bTypischer\b", "Typical", t, flags=re.I)
    t = re.sub(r"\bTypisch\b", "Typical", t, flags=re.I)
    t = re.sub(r"\bmit\b", "with", t, flags=re.I)
    t = re.sub(r"\bund\b", "and", t, flags=re.I)
    t = re.sub(r"\baber\b", "but", t, flags=re.I)
    t = re.sub(r"\bzwischen\b", "between", t, flags=re.I)
    t = re.sub(r"\bbeim\b", "when", t, flags=re.I)
    t = re.sub(r"\bKochen\b", "cooking", t, flags=re.I)
    t = re.sub(r"\bvon\b", "from", t, flags=re.I)
    t = re.sub(r"\bvieler\b", "many", t, flags=re.I)
    t = re.sub(r"\baus\b", "from", t, flags=re.I)
    t = re.sub(r"\bherzhaft\b", "savory", t, flags=re.I)
    t = re.sub(r"\bleichte\b", "light", t, flags=re.I)
    t = re.sub(r"\bleicht\b", "lightly", t, flags=re.I)
    t = re.sub(r"\bzitrusartiges\b", "citrus-like", t, flags=re.I)
    t = re.sub(r"\bzitrusartig\b", "citrus-like", t, flags=re.I)
    t = re.sub(r"\bPfeffernoten\b", "pepper notes", t, flags=re.I)
    t = re.sub(r"\bpinienartige\b", "pine-like", t, flags=re.I)
    t = re.sub(r"\bpinienartiger\b", "pine-like", t, flags=re.I)
    t = re.sub(r"\bRoher\b", "Raw", t, flags=re.I)
    t = re.sub(r"\bPilzduft\b", "mushroom aroma", t, flags=re.I)
    t = re.sub(r"\bRohpilzduft\b", "raw mushroom aroma", t, flags=re.I)
    t = re.sub(r"\bschwefliger\b", "sulfurous", t, flags=re.I)
    t = re.sub(r"muf-\s*fig", "mushroom-like", t, flags=re.I)
    t = re.sub(r"resinouss\b", "resinous", t, flags=re.I)
    t = re.sub(r"\bwenig\b", "little", t, flags=re.I)
    t = re.sub(r"\bZwiebel\b", "onion", t, flags=re.I)
    t = re.sub(r"\bSaat\b", "seed", t, flags=re.I)
    t = re.sub(r"\bAnbraten\b", "searing", t, flags=re.I)
    t = re.sub(r"\bKaramell\b", "caramel", t, flags=re.I)
    t = re.sub(r"\bKaffee\b", "coffee", t, flags=re.I)
    t = re.sub(r"\bder\b", "the", t, flags=re.I)
    t = re.sub(r"\bdie\b", "the", t, flags=re.I)
    t = re.sub(r"\bdas\b", "the", t, flags=re.I)
    t = re.sub(r"\bdes\b", "of the", t, flags=re.I)
    t = re.sub(r"\bden\b", "the", t, flags=re.I)
    t = re.sub(r"\bdem\b", "the", t, flags=re.I)
    return t


def _english_heat(s: str) -> str:
    t = s.strip()
    if re.search(r"\d{2,3}\s+K\s+R\s+Ä\s+U\s+T\s+E\s+R", t, re.I):
        m = re.search(r"\bFresh\b", t, re.I)
        if m:
            t = t[m.start() :]
    t = re.sub(r"\bFresher\b", "Fresh", t, flags=re.I)
    t = re.sub(r"\bFreshe\b", "Fresh", t, flags=re.I)
    for de, en in _HEAT_PHRASES:
        t = re.sub(de, en, t, flags=re.I)
    t = re.split(r"\s+l\s+Alkohol", t, flags=re.I)[0]
    t = re.split(r"[αβ][\-−]", t)[0]
    t = re.sub(r"\s+", " ", t).strip()
    t = _heat_token_scrub(t)
    t = re.sub(r"\s+", " ", t).strip()
    t = re.sub(r"^[,\.\s\-–]+", "", t)
    t = re.sub(r"[,\.\s\-–]+$", "", t).strip()
    if len(t) < 5 or re.match(r"^[\s\-–,]+$", t):
        return ""
    if _looks_untranslated_german(t):
        return ""
    if len(t) > 160:
        t = t[:157] + "…"
    return t


_GERMAN_HINT = re.compile(
    r"(?i)\b(und|der|die|das|mit|von|zu|für|auch|wie|aus|bei|"
    r"eine|einen|wurden|schon|vor|Jahren|kultiviert|bisschen|nicht|noch|"
    r"nach|über|vom|zum|beim|einem|einer|allen|helles|Fleisch|Duft|Geschmack|"
    r"Noten|Typischer|Typisch|Saat|Anbraten|Morchel|Freisetzung|Intensivierung|"
    r"Bildung|bekommt|mittlerweile|meisten|herber|Champignon|karamellig|dessen|"
    r"Anteil|Ingwer|schokoladig|Rauchig|Kampfer|pinienartiger|Aromenentfaltung|"
    r"Kochen|Herbaler|Einlegen|ingwerartige|dezente|karamelliger|vieler|zwischen|"
    r"Karamell|Kaffee|Zwiebel|Sehr|intensiver|woodyen|Duftanteile|aromati|"
    r"ANBAU|etwa|hoher|zur|bens|dafür|dazu|daran|darin|"
    r"leicht|zitrusartig|zitrus|Deutschland|Mitteleuropa|arabisch|indisch|"
    r"Roher|Pilzduft|Pfeffernoten|Indisches|Indische|arabisches|Kartoffel)\b"
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


def _scrub_hyphen_ocr_fragment(s: str) -> str:
    """Fix split tokens and drop trailing OCR hyphen stubs on cuisines/blends."""
    s = re.sub(r"(?i)Baha-\s*rat", "Baharat", s)
    s = re.sub(r"(?i)muf-\s*fig", "mushroom-like", s)
    for stub in (
        "Blumen-",
        "Apfel-",
        "ein-",
        "Wildra-",
        "Rin-",
        "Speku-",
        "Sauer-",
    ):
        s = re.sub(rf"(?i),\s*{re.escape(stub)}\s*$", "", s)
        s = re.sub(rf"(?i),\s*{re.escape(stub)}\s*,", ",", s)
    s = re.sub(r",\s*[A-Za-zÀ-ÖØ-öø-ÿ]{2,22}-\s*$", "", s)
    s = re.sub(r",\s*[A-Za-zÀ-ÖØ-öø-ÿ]{2,22}-\s*,", ",", s)
    return re.sub(r"\s+", " ", s).strip()


def _rewrite_cuisine_line(s: str) -> str:
    """Translate `Country: dish, dish` segments; comma-separated multi-country lines."""
    s = s.strip()
    if not s:
        return ""
    s = _scrub_hyphen_ocr_fragment(s)
    parts_out: list[str] = []
    for seg in re.split(r",\s*", s):
        seg = seg.strip()
        if not seg:
            continue
        if ":" in seg:
            pre, _, post = seg.partition(":")
            pre_t = translate(pre.strip())
            dishes = [translate(d.strip()) for d in re.split(r",\s*", post) if d.strip()]
            dishes = [d for d in dishes if d]
            if dishes:
                parts_out.append(f"{pre_t}: {', '.join(dishes)}")
            else:
                parts_out.append(pre_t)
        else:
            parts_out.append(translate(seg))
    return ", ".join(parts_out)


def _translate_word_sequence(s: str) -> str:
    s = s.strip()
    if not s:
        return ""
    return " ".join(translate(w) for w in s.split())


def _clean_display_phrase(raw: str) -> str | None:
    """Keep English-facing lines; drop obvious OCR/German leftovers."""
    s = re.sub(r"\s+", " ", raw.replace("\n", " ")).strip()
    s = _scrub_hyphen_ocr_fragment(s)
    s = re.sub(r"(?i)Sala-\s*ten", "salads", s)
    s = re.sub(r"(?i)Schmorgerich-\s*ten", "braised dishes", s)
    s = re.sub(r"(?i)Blumenkohl", "cauliflower", s)
    s = re.sub(r"(?i)allen\s+Fleisch-", "all meats", s)
    s = re.sub(r"(?i)\bfast allen\b", "almost everything", s)
    s = re.sub(r"(?i)\bhelles\s+Fleisch\b", "light meat", s)
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
    by_id = {ing["id"]: ing for ing in ingredients}
    valid_ids = set(by_id)
    for ing in ingredients:
        seen_h: set[str] = set()
        nh: list[dict] = []
        for h in ing.get("harmonizes_with", []):
            hid = h.get("id")
            if not hid or hid not in valid_ids or hid in seen_h:
                continue
            if hid in _BAD_HARMONY_IDS:
                continue
            seen_h.add(hid)
            nh.append({"id": hid, "name": by_id[hid]["name"]})
        ing["harmonizes_with"] = nh
        ing["aroma_groups"] = infer_aroma_groups(ing["name"])
        if ing.get("heat_behavior"):
            for k in list(ing["heat_behavior"].keys()):
                v = _english_heat(ing["heat_behavior"][k])
                if v:
                    ing["heat_behavior"][k] = v
                else:
                    del ing["heat_behavior"][k]
            if not ing["heat_behavior"]:
                del ing["heat_behavior"]
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
                c0 = c.replace("\n", " ")
                c2 = _rewrite_cuisine_line(c0)
                cc = _clean_display_phrase(c2)
                if cc:
                    cuisines2.append(cc)
            ing["cuisines"] = _dedupe_ci(cuisines2)
        if ing.get("spice_blends"):
            blends = []
            for b in ing["spice_blends"]:
                b0 = b.replace("\n", " ")
                b0 = _scrub_hyphen_ocr_fragment(b0)
                b2 = _translate_word_sequence(b0)
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
