import re

import httpx

from config import get_settings

settings = get_settings()


def _money(text: str) -> str:
    match = re.search(r"\$[\d,]+(?:\.\d+)?\s*(?:[KkMm])?", text)
    return match.group(0) if match else ""


def _beds_baths(text: str) -> str:
    beds = re.search(r"(\d+(?:\.\d+)?)\s*(?:bd|bed|beds|bedroom)", text, re.I)
    baths = re.search(r"(\d+(?:\.\d+)?)\s*(?:ba|bath|baths|bathroom)", text, re.I)
    parts = []
    if beds:
        parts.append(f"{beds.group(1)} bd")
    if baths:
        parts.append(f"{baths.group(1)} ba")
    return " / ".join(parts)


def _sqft(text: str) -> str:
    match = re.search(r"([\d,]+)\s*(?:sq\.?\s*ft\.?|sqft|square feet)", text, re.I)
    return match.group(1).replace(",", "") if match else ""


_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

def _fmt_date(raw: str) -> str:
    """Normalise a raw date string to MM/DD/YY. Returns raw on failure."""
    raw = raw.strip().rstrip(",")
    # MM/DD/YYYY or MM/DD/YY
    slash = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{2,4})$", raw)
    if slash:
        m, d, y = int(slash.group(1)), int(slash.group(2)), int(slash.group(3))
        y2 = y % 100
        return f"{m:02d}/{d:02d}/{y2:02d}"
    # Month DD, YYYY  or  Month DD YYYY
    named = re.match(
        r"^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})$", raw
    )
    if named:
        mon_key = named.group(1)[:3].lower()
        m = _MONTHS.get(mon_key)
        d = int(named.group(2))
        y2 = int(named.group(3)) % 100
        if m:
            return f"{m:02d}/{d:02d}/{y2:02d}"
    return raw


def _sale_date(text: str) -> str:
    sold_match = re.search(
        r"\b(?:sold|closed)\s+(?:on\s+)?([A-Z][a-z]{2,8}\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}/\d{1,2}/\d{2,4})",
        text,
        re.I,
    )
    if sold_match:
        return _fmt_date(sold_match.group(1))
    date_match = re.search(r"\b([A-Z][a-z]{2,8}\.?\s+\d{1,2},?\s+\d{4})\b", text)
    return _fmt_date(date_match.group(1)) if date_match else ""


def _dom(text: str) -> str:
    match = re.search(r"(\d+)\s*(?:days?\s+on\s+market|DOM)", text, re.I)
    return match.group(1) if match else ""


def _address_from_text(text: str) -> str:
    patterns = [
        r"\b\d{1,6}\s+[A-Za-z0-9 .'-]+?\s+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Ct|Court|Cir|Circle|Blvd|Boulevard|Way|Pl|Place|Ter|Terrace|Trail|Trl|Pkwy|Parkway)\.?,?\s+[A-Za-z .'-]+,?\s+[A-Z]{2}\s+\d{5}(?:-\d{4})?\b",
        r"\b\d{1,6}\s+[A-Za-z0-9 .'-]+?\s+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Ct|Court|Cir|Circle|Blvd|Boulevard|Way|Pl|Place|Ter|Terrace|Trail|Trl|Pkwy|Parkway)\.?\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return re.sub(r"\s+", " ", match.group(0)).strip(" ,")
    return ""


def _clean_address(title: str, content: str) -> str:
    """Return a structured address only if it contains a street number; otherwise empty string."""
    return _address_from_text(f"{title} {content}")


def _has_street_number(address: str) -> bool:
    """Address must begin with a house/unit number to be a real comp."""
    return bool(re.match(r"^\d{1,6}\s+\w", address.strip()))


# Abbreviation tables used to normalise addresses before comparison
_STREET_DIREC = {
    "sw": "southwest", "nw": "northwest", "ne": "northeast", "se": "southeast",
    "n": "north", "s": "south", "e": "east", "w": "west",
}
_STREET_SUFFIX = {
    "st": "street", "ave": "avenue", "rd": "road", "dr": "drive", "ln": "lane",
    "ct": "court", "blvd": "boulevard", "pl": "place", "ter": "terrace",
    "terr": "terrace", "pkwy": "parkway", "hwy": "highway", "cir": "circle",
    "trl": "trail", "way": "way", "fwy": "freeway", "expy": "expressway",
}


def _expand_addr_abbrevs(s: str) -> str:
    """Expand common directional and street-type abbreviations token by token."""
    out = []
    for token in s.split():
        clean = re.sub(r"[^a-z0-9]", "", token)
        if clean in _STREET_DIREC:
            out.append(_STREET_DIREC[clean])
        elif clean in _STREET_SUFFIX:
            out.append(_STREET_SUFFIX[clean])
        else:
            out.append(clean)
    return " ".join(out)


def _normalize_addr(address: str) -> str:
    """Lowercase, expand abbreviations, collapse punctuation/whitespace."""
    s = address.lower()
    s = re.sub(r"[,#.\-]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    s = _expand_addr_abbrevs(s)
    return s


def _addr_key(address: str) -> str:
    """Return just the house-number + first 3 street tokens for robust matching.

    e.g. '12164 southwest 51st court cooper city ...' → '12164 southwest 51st court'
    This strips city/county/state/country noise so both long and short forms match.
    """
    tokens = _normalize_addr(address).split()
    # Grab the numeric prefix + up to 3 following tokens (directional, name, type)
    if not tokens or not tokens[0].isdigit():
        return _normalize_addr(address)
    return " ".join(tokens[:4])


def _is_subject_property(candidate_addr: str, subject_addr: str) -> bool:
    """Return True if the candidate address matches the subject property."""
    c = _addr_key(candidate_addr)
    s = _addr_key(subject_addr)
    if not c or not s:
        return False
    return c == s


def build_research_queries(subject_property: str, subject_details: str = "") -> list[str]:
    full_address = subject_property.strip()
    # Extract city/state portion for neighbourhood-level searches
    city_match = re.search(r",\s*([A-Za-z ]+),?\s*[A-Z]{2}\s*\d{5}", full_address)
    location = city_match.group(0).strip(", ") if city_match else full_address
    return [
        f"recently sold comparable homes near {full_address} sale price sqft bedrooms",
        f"Zillow sold listings {location} sold price 2024 2025 bedrooms sqft",
        f"Redfin recently sold homes {location} sale price comparable",
        f"Realtor.com sold homes near {full_address} sale price",
    ]


def _confidence(candidate: dict) -> int:
    fields = ["address", "sqft", "beds_baths", "sale_price", "sale_date", "dom"]
    return sum(1 for field in fields if candidate.get(field))


async def _search_query(client: httpx.AsyncClient, query: str, max_results: int) -> list[dict]:
    payload = {
        "api_key": settings.tavily_api_key,
        "query": query,
        "search_depth": "advanced",
        "max_results": max_results,
        "include_answer": False,
        "include_raw_content": False,
    }
    response = await client.post("https://api.tavily.com/search", json=payload)
    response.raise_for_status()
    return response.json().get("results", [])


async def research_comparables(
    subject_property: str,
    subject_details: str = "",
    max_results: int = 8,
) -> dict:
    queries = build_research_queries(subject_property, subject_details)

    if not settings.tavily_api_key:
        return {
            "candidates": [],
            "queries": queries,
            "message": "Set TAVILY_API_KEY in api/.env to enable automated comparable research.",
        }

    raw_results = []
    async with httpx.AsyncClient(timeout=45.0) as client:
        for query in queries:
            raw_results.extend(await _search_query(client, query, max_results))

    candidates = []
    seen_urls = set()
    seen_addresses = set()

    for item in raw_results:
        url = item.get("url") or ""
        if not url or url in seen_urls:
            continue
        seen_urls.add(url)

        title = item.get("title") or ""
        content = item.get("content") or ""
        combined = f"{title} {content}"

        address = _clean_address(title, content)

        # Discard results with no recognisable street address (e.g. blog posts, map pages)
        if not _has_street_number(address):
            continue

        # Discard if this is the subject property itself
        if _is_subject_property(address, subject_property):
            continue

        # Discard if no sale price can be extracted — not a useful comp
        sale_price = _money(combined)
        if not sale_price:
            continue

        address_key = _addr_key(address)
        if address_key in seen_addresses:
            continue
        seen_addresses.add(address_key)

        candidates.append({
            "address": address,
            "sqft": _sqft(combined),
            "beds_baths": _beds_baths(combined),
            "sale_price": sale_price,
            "sale_date": _sale_date(combined),
            "dom": _dom(combined),
            "source_title": title,
            "source_url": url,
            "evidence": content[:500],
            "selected": True,
        })

    candidates.sort(key=_confidence, reverse=True)
    candidates = candidates[:max_results]

    total = len(candidates)
    if total == 0:
        message = "No comparable sales with confirmed addresses and prices were found. Try adding comps manually."
    else:
        message = f"Found {total} comparable sale{'' if total == 1 else 's'}. Review and edit details before generating."

    return {
        "candidates": candidates,
        "queries": queries,
        "message": message,
        "market_notes": _generate_market_summary(candidates),
    }


def _generate_market_summary(candidates: list[dict]) -> str:
    """Build a brief market trend summary from the extracted comp data."""
    prices = []
    for c in candidates:
        raw = re.sub(r"[^0-9.]", "", c.get("sale_price", ""))
        try:
            val = float(raw)
            if val > 10_000:
                prices.append(val)
        except ValueError:
            pass

    doms = []
    for c in candidates:
        d = c.get("dom", "")
        if d and str(d).isdigit():
            doms.append(int(d))

    parts = []
    if prices:
        avg_p = sum(prices) / len(prices)
        lo_p, hi_p = min(prices), max(prices)
        parts.append(
            f"Comparable sales in the area range from ${lo_p:,.0f} to ${hi_p:,.0f}, "
            f"with an average sold price of ${avg_p:,.0f}."
        )
    if doms:
        avg_dom = sum(doms) / len(doms)
        parts.append(f"Properties are averaging {avg_dom:.0f} days on market.")
    if candidates:
        parts.append(
            f"{len(candidates)} recent sold comparable{'' if len(candidates) == 1 else 's'} "
            "were identified in the surrounding area."
        )

    return " ".join(parts)
