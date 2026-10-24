#!/usr/bin/env python3
"""iNaturalist Automated Mass Fauna Importer for Zoodex.

Fetches research-grade wild animal observations from the public iNaturalist API
partitioned by continent (Europe, Africa, Asia, Americas, Oceania, Antarctica).
Enriches the Pokédex database (continental_fauna.json, pokedex_species.json, and dex_catalog.py)
with verified high-resolution photography, Italian common names, taxonomy, and BioCLIP keys.
"""

import argparse
import io
import json
import logging
import re
import shutil
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Dict, Any, List, Optional, Set, Tuple

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("zoodex.importer")

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "app" / "data"
CONTINENTAL_FAUNA_JSON = DATA_DIR / "continental_fauna.json"
POKEDEX_SPECIES_JSON = DATA_DIR / "pokedex_species.json"
DEX_CATALOG_PY = DATA_DIR / "dex_catalog.py"

# Continents configuration for iNaturalist queries
CONTINENTS_CONFIG = [
    {
        "id": "europa",
        "name": "Europa",
        "color": "#3B82F6",
        "description": "Dalle foreste temperate dei Balcani ai fiordi scandinavi e alle coste mediterranee.",
        "place_ids": [97391],
        "bbox": None,
    },
    {
        "id": "africa",
        "name": "Africa",
        "color": "#EAB308",
        "description": "La culla della megafauna terrestre: savane sterminate, giungle equatoriali e grandi deserti.",
        "place_ids": [97392],
        "bbox": None,
    },
    {
        "id": "asia",
        "name": "Asia",
        "color": "#EF4444",
        "description": "Il continente più vasto, dalle vette dell'Himalaya alle fitte foreste pluviali del sudest.",
        "place_ids": [97395],
        "bbox": None,
    },
    {
        "id": "americhe",
        "name": "Americhe",
        "color": "#10B981",
        "description": "Dalle pianure ghiacciate del nord alle grandi foreste amazzoniche e alla cordigliera delle Ande.",
        "place_ids": [97394, 97389],  # North & South America
        "bbox": None,
    },
    {
        "id": "oceania",
        "name": "Oceania",
        "color": "#8B5CF6",
        "description": "Un ecosistema unico al mondo, patria dei marsupiali e di specie evolute in totale isolamento.",
        "place_ids": [97393],
        "bbox": None,
    },
    {
        "id": "antartide",
        "name": "Antartide",
        "color": "#06B6D4",
        "description": "Il continente dei ghiacci perenni, habitat estremo di pinguini, foche e maestosi cetacei.",
        "place_ids": [],
        "bbox": {"nelat": -60.0, "nelng": 180.0, "swlat": -90.0, "swlng": -180.0},
    },
]

TAXA_GROUPS = ["Mammalia", "Aves", "Reptilia"]


def clean_slug(text: str) -> str:
    """Creates a clean filesystem/database slug from string."""
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s-]+", "_", s)
    return s


def fetch_species_from_inaturalist(
    place_ids: List[int],
    bbox: Optional[Dict[str, float]],
    target_count: int = 25,
    user_agent: str = "ZoodexFaunaImporter/1.0",
) -> List[Dict[str, Any]]:
    """Fetches high-quality wildlife species for a continent from iNaturalist."""
    results: List[Dict[str, Any]] = []
    seen_taxa_ids: Set[int] = set()

    # Distribute target count across taxa groups
    per_group = max(5, target_count // len(TAXA_GROUPS) + 2)

    for taxon_group in TAXA_GROUPS:
        if len(results) >= target_count:
            break

        queries = []
        if bbox:
            queries.append({"bbox": bbox})
        else:
            for pid in place_ids:
                queries.append({"place_id": pid})

        for q in queries:
            if len(results) >= target_count:
                break

            params = {
                "iconic_taxa": taxon_group,
                "quality_grade": "research",
                "per_page": min(100, per_group * 2),
                "locale": "it",
            }
            if "place_id" in q:
                params["place_id"] = q["place_id"]
            elif "bbox" in q:
                params.update(q["bbox"])

            url = f"https://api.inaturalist.org/v1/observations/species_counts?{urllib.parse.urlencode(params)}"
            req = urllib.request.Request(url, headers={"User-Agent": user_agent})

            try:
                time.sleep(0.3)  # Gentle rate limiting
                with urllib.request.urlopen(req, timeout=12) as response:
                    payload = json.load(response)
                    items = payload.get("results", [])

                    for item in items:
                        count = item.get("count", 0)
                        taxon = item.get("taxon", {})
                        tid = taxon.get("id")
                        sci_name = taxon.get("name")
                        photo = taxon.get("default_photo")

                        # Require valid binomial species and available photo
                        if (
                            not tid
                            or not sci_name
                            or tid in seen_taxa_ids
                            or " " not in sci_name  # Ensure species rank (genus + specific epithet)
                            or not photo
                            or not photo.get("medium_url")
                        ):
                            continue

                        seen_taxa_ids.add(tid)
                        results.append(
                            {
                                "inat_id": tid,
                                "scientific_name": sci_name,
                                "common_name_it": taxon.get("preferred_common_name"),
                                "english_name": taxon.get("english_common_name"),
                                "iconic_taxon": taxon.get("iconic_taxon_name", taxon_group),
                                "photo_url": photo.get("medium_url"),
                                "attribution": photo.get("attribution", ""),
                                "observations_count": count,
                            }
                        )
                        if len(results) >= target_count:
                            break

            except Exception as e:
                logger.warning("Errore query iNaturalist (%s): %s", url, e)

    return results[:target_count]


def map_category(iconic_taxon: str, sci_name: str, common_name: str) -> str:
    """Generates an Italian naturalistic category for the species."""
    name_lower = (common_name or "").lower()
    t_lower = iconic_taxon.lower()

    if "mammalia" in t_lower:
        if any(w in name_lower for w in ["volpe", "lupo", "cane", "sciacallo", "coyote"]):
            return "Mammifero Canide"
        if any(w in name_lower for w in ["gatto", "leone", "tigre", "leopardo", "ghepardo", "lince"]):
            return "Mammifero Felide"
        if any(w in name_lower for w in ["cervo", "capriolo", "alce", "daino"]):
            return "Mammifero Cervide"
        if any(w in name_lower for w in ["foca", "leone marino", "tricheco"]):
            return "Mammifero Pinnipede"
        if any(w in name_lower for w in ["balena", "delfino", "orca", "capodoglio"]):
            return "Mammifero Cetaceo"
        return "Mammifero Terrestre"

    if "aves" in t_lower:
        if any(w in name_lower for w in ["aquila", "falco", "poiana", "nibbio", "sparviero"]):
            return "Rapace Diurno"
        if any(w in name_lower for w in ["gufo", "civetta", "barbagianni", "allocco"]):
            return "Rapace Notturno"
        if any(w in name_lower for w in ["pinguino"]):
            return "Uccello Marino Non Volatore"
        if any(w in name_lower for w in ["anatra", "oca", "cigno", "germano"]):
            return "Uccello Acquatico"
        return "Uccello Selvatico"

    if "reptilia" in t_lower:
        if any(w in name_lower for w in ["vipera", "serpente", "cobra", "pitone", "biscia"]):
            return "Rettile Ofide"
        if any(w in name_lower for w in ["coccodrillo", "alligatore", "caimano"]):
            return "Rettile Crocodilide"
        if any(w in name_lower for w in ["tartaruga", "testuggine"]):
            return "Rettile Chelone"
        return "Rettile Sauro"

    if "amphibia" in t_lower:
        return "Anfibio Selvatico"

    return "Fauna Selvatica"


def assign_rarity(index: int, total: int) -> str:
    """Calculates game rarity level based on natural observation frequency."""
    pct = index / max(1, total)
    if pct <= 0.35:
        return "Comune"
    if pct <= 0.70:
        return "Non comune"
    if pct <= 0.90:
        return "Raro"
    if pct <= 0.97:
        return "Epico"
    return "Leggendario"


def load_existing_curated() -> Tuple[List[Dict[str, Any]], Set[str]]:
    """Loads existing hand-curated species so they remain untouched."""
    existing_animals = []
    seen_sci_names = set()

    if CONTINENTAL_FAUNA_JSON.exists():
        try:
            with open(CONTINENTAL_FAUNA_JSON, "r", encoding="utf-8") as f:
                data = json.load(f)
                existing_animals = data.get("animals", [])
                for a in existing_animals:
                    sci = a.get("scientific_name", "").lower().strip()
                    if sci:
                        seen_sci_names.add(sci)
        except Exception as e:
            logger.error("Errore lettura continental_fauna.json: %s", e)

    return existing_animals, seen_sci_names


def populate_database(
    target_per_continent: int = 25,
    dry_run: bool = False,
    backup: bool = True,
):
    """Main routine to populate Pokédex database from iNaturalist."""
    logger.info("Avvio importazione faunistica da iNaturalist (target: ~%d specie/continente)...", target_per_continent)

    existing_animals, seen_sci = load_existing_curated()
    logger.info("Mantenute %d specie storiche preesistenti nel database.", len(existing_animals))

    new_animals: List[Dict[str, Any]] = list(existing_animals)
    pokedex_species_dict: Dict[str, Dict[str, Any]] = {}

    # Register existing animals in BioCLIP mapping first
    for a in existing_animals:
        sci = a["scientific_name"]
        it_name = a["name"]
        key = f"{sci} ({it_name})"
        pokedex_species_dict[key] = {
            "nome_it": it_name,
            "continente": a.get("continent_name", "Europa"),
            "continent_id": a.get("continent"),
            "dex_number": a.get("dex_number"),
            "scientific_name": sci,
        }

    # Fetch and add new species per continent
    current_dex_num = max([int(a["dex_number"]) for a in existing_animals if a.get("dex_number", "").isdigit()] or [0]) + 1

    for continent in CONTINENTS_CONFIG:
        cid = continent["id"]
        cname = continent["name"]
        logger.info(">>> Interrogazione fauna per continente: %s...", cname)

        existing_in_continent = sum(1 for a in existing_animals if a.get("continent") == cid)
        needed = max(0, target_per_continent - existing_in_continent)
        if needed == 0:
            logger.info("Continente %s già completo (%d specie presenti).", cname, existing_in_continent)
            continue

        raw_species = fetch_species_from_inaturalist(
            place_ids=continent["place_ids"],
            bbox=continent["bbox"],
            target_count=needed,
        )
        logger.info("Scaricati %d candidati iNaturalist per %s.", len(raw_species), cname)

        for idx, sp in enumerate(raw_species):
            sci = sp["scientific_name"]
            sci_clean = sci.lower().strip()
            if sci_clean in seen_sci:
                continue
            seen_sci.add(sci_clean)

            it_name = sp["common_name_it"] or sp["english_name"] or sci
            it_name = it_name.replace("_", " ").title()
            eng_name = sp["english_name"] or it_name

            dex_str = f"{current_dex_num:03d}"
            current_dex_num += 1

            rarity = assign_rarity(idx, len(raw_species))
            category = map_category(sp["iconic_taxon"], sci, it_name)
            slug = clean_slug(f"{it_name}_{sci}")

            entry = {
                "id": slug,
                "dex_number": dex_str,
                "name": it_name,
                "scientific_name": sci,
                "continent": cid,
                "continent_name": cname,
                "category": category,
                "is_animal": True,
                "rarity": rarity,
                "height": "Variabile",
                "weight": "Variabile",
                "habitat": f"Habitat naturale e riserve faunistiche ({cname})",
                "description": f"Specie selvatica documentata su iNaturalist con {sp['observations_count']} osservazioni confermate.",
                "image_url": sp["photo_url"],
                "aliases": [
                    it_name.lower(),
                    sci.lower(),
                    eng_name.lower(),
                ],
                "unlocked_default": False,
            }
            new_animals.append(entry)

            # BioCLIP target key
            bio_key = f"{sci} ({eng_name})"
            pokedex_species_dict[bio_key] = {
                "nome_it": it_name,
                "continente": cname,
                "continent_id": cid,
                "dex_number": dex_str,
                "scientific_name": sci,
            }

    logger.info("Totale specie finali catalogate: %d (aggiunte %d nuove specie).", len(new_animals), len(new_animals) - len(existing_animals))

    if dry_run:
        logger.info("Modalità Dry-Run: nessun file modificato sul disco.")
        return

    # Backup existing files
    if backup:
        for p in [CONTINENTAL_FAUNA_JSON, POKEDEX_SPECIES_JSON, DEX_CATALOG_PY]:
            if p.exists():
                bak = p.with_suffix(p.suffix + ".bak")
                shutil.copyfile(p, bak)
                logger.info("Backup creato: %s", bak.name)

    # 1. Update continental_fauna.json
    fauna_data = {
        "continents": CONTINENTS_CONFIG,
        "animals": new_animals,
    }
    with open(CONTINENTAL_FAUNA_JSON, "w", encoding="utf-8") as f:
        json.dump(fauna_data, f, indent=2, ensure_ascii=False)
    logger.info("Aggiornato con successo: %s", CONTINENTAL_FAUNA_JSON)

    # 2. Update pokedex_species.json
    with open(POKEDEX_SPECIES_JSON, "w", encoding="utf-8") as f:
        json.dump(pokedex_species_dict, f, indent=2, ensure_ascii=False)
    logger.info("Aggiornato con successo: %s", POKEDEX_SPECIES_JSON)

    # 3. Update dex_catalog.py
    _update_dex_catalog_py(new_animals)
    logger.info("Aggiornato con successo: %s", DEX_CATALOG_PY)
    logger.info("Importazione completata con successo! Riavvia o riesegui il test per confermare.")


def _update_dex_catalog_py(animals: List[Dict[str, Any]]):
    """Regenerates the MASTER_ANIMALS table in dex_catalog.py."""
    animals_code_lines = ["MASTER_ANIMALS: List[Dict[str, Any]] = ["]
    for a in animals:
        animals_code_lines.append("    {")
        animals_code_lines.append(f'        "id": {json.dumps(a["id"], ensure_ascii=False)},')
        animals_code_lines.append(f'        "dex_number": {json.dumps(a["dex_number"])},')
        animals_code_lines.append(f'        "name": {json.dumps(a["name"], ensure_ascii=False)},')
        animals_code_lines.append(f'        "scientific_name": {json.dumps(a["scientific_name"], ensure_ascii=False)},')
        animals_code_lines.append(f'        "continent": {json.dumps(a["continent"])},')
        animals_code_lines.append(f'        "continent_name": {json.dumps(a["continent_name"], ensure_ascii=False)},')
        animals_code_lines.append(f'        "category": {json.dumps(a["category"], ensure_ascii=False)},')
        animals_code_lines.append(f'        "is_animal": {a.get("is_animal", True)},')
        animals_code_lines.append(f'        "rarity": {json.dumps(a["rarity"], ensure_ascii=False)},')
        animals_code_lines.append(f'        "height": {json.dumps(a["height"], ensure_ascii=False)},')
        animals_code_lines.append(f'        "weight": {json.dumps(a["weight"], ensure_ascii=False)},')
        animals_code_lines.append(f'        "habitat": {json.dumps(a["habitat"], ensure_ascii=False)},')
        animals_code_lines.append(f'        "description": {json.dumps(a["description"], ensure_ascii=False)},')
        animals_code_lines.append(f'        "image_url": {json.dumps(a.get("image_url", ""))},')
        animals_code_lines.append(f'        "aliases": {json.dumps(a.get("aliases", []), ensure_ascii=False)},')
        animals_code_lines.append(f'        "unlocked_default": {a.get("unlocked_default", False)},')
        animals_code_lines.append("    },")
    animals_code_lines.append("]")
    master_animals_block = "\n".join(animals_code_lines)

    current_content = DEX_CATALOG_PY.read_text(encoding="utf-8")
    marker_start = "MASTER_ANIMALS: List[Dict[str, Any]] = ["
    marker_end = "\n# Quick alias lookup index"

    start_idx = current_content.find(marker_start)
    end_idx = current_content.find(marker_end)

    if start_idx != -1 and end_idx != -1:
        updated = current_content[:start_idx] + master_animals_block + current_content[end_idx:]
        DEX_CATALOG_PY.write_text(updated, encoding="utf-8")
    else:
        logger.warning("Marcatori MASTER_ANIMALS non trovati in dex_catalog.py")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Popola il database Zoodex con fauna reale da iNaturalist.")
    parser.add_argument("--per-continent", type=int, default=25, help="Numero di specie per continente (default: 25)")
    parser.add_argument("--dry-run", action="store_true", help="Esegue simulazione senza salvare file")
    parser.add_argument("--no-backup", action="store_true", help="Non crea file di backup .bak")

    args = parser.parse_args()
    populate_database(
        target_per_continent=args.per_continent,
        dry_run=args.dry_run,
        backup=not args.no_backup,
    )
