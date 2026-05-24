import re
import asyncio
import httpx
from config import get_settings

settings = get_settings()


def _prices_from_texts(texts: list[str]) -> list[float]:
    prices = []
    for text in texts:
        for match in re.finditer(r"\$\s*([\d,]+(?:\.\d+)?)\s*([KkMm])?", text):
            try:
                value = float(match.group(1).replace(",", ""))
                suffix = (match.group(2) or "").lower()
                if suffix == "k":
                    value *= 1_000
                elif suffix == "m":
                    value *= 1_000_000
                if 80_000 < value < 10_000_000:
                    prices.append(value)
            except (ValueError, TypeError):
                pass
    return prices


def _price_range(texts: list[str]) -> str:
    prices = sorted(_prices_from_texts(texts))
    if not prices:
        return ""
    lo = prices[max(0, len(prices) // 4)]
    hi = prices[min(len(prices) - 1, len(prices) * 3 // 4)]

    def fmt(p: float) -> str:
        if p >= 1_000_000:
            return f"${p / 1_000_000:.1f}M"
        return f"${int(p / 1_000)}K"

    if abs(lo - hi) < 25_000:
        return fmt(lo)
    return f"{fmt(lo)} – {fmt(hi)}"


def _property_types(texts: list[str]) -> str:
    combined = " ".join(texts).lower()
    found = []
    if re.search(r"\bsingle[- ]family\b", combined):
        found.append("Single Family")
    if re.search(r"\bcondo\b|\bcondominium\b", combined):
        found.append("Condo")
    if re.search(r"\btownhouse\b|\btownhome\b", combined):
        found.append("Townhouse")
    if re.search(r"\bmulti[- ]family\b", combined):
        found.append("Multi-Family")
    return " / ".join(found[:2]) if found else "Single Family"


_SCHOOL_SKIP = re.compile(
    r"\b(?:school district|school board|school year|school system|school bus|school day|school age|public school system|private school options)\b",
    re.IGNORECASE,
)

_SCHOOL_PATTERNS = [
    # "Jefferson Elementary School" / "Lincoln Middle School"
    re.compile(
        r"\b([A-Z][a-zA-Z'-]+(?:\s+[A-Z]?[a-zA-Z'-]+){0,5})\s+"
        r"(?:Elementary|Middle|High|Primary|K-8|K-12)\s+School\b"
    ),
    # "Washington High" / "Riverside Elementary" (no "School" suffix)
    re.compile(
        r"\b([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+){0,4})\s+"
        r"(?:Elementary|Middle|High|Primary|K-8)\b(?!\s+School)"
    ),
    # "Lakeside Academy" / "STEM Magnet" / "IB Charter School"
    re.compile(
        r"\b([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+){1,5})\s+"
        r"(?:Academy|Magnet|Charter|Preparatory|Prep|IB|STEM)(?:\s+School)?\b"
    ),
    # Generic "Xxx Yyy School" catch-all
    re.compile(
        r"\b([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+){1,4})\s+School\b"
    ),
]


def _schools(texts: list[str]) -> list[str]:
    combined = " ".join(texts)
    seen: set[str] = set()
    results: list[str] = []

    for pattern in _SCHOOL_PATTERNS:
        for match in pattern.finditer(combined):
            full = re.sub(r"\s+", " ", match.group(0)).strip()
            # skip obvious false positives
            if _SCHOOL_SKIP.search(full):
                continue
            # normalise key to avoid near-duplicates
            key = full.lower()
            if key not in seen:
                seen.add(key)
                results.append(full)
            if len(results) == 6:
                break
        if len(results) == 6:
            break

    return results


def _agent_notes(texts: list[str], schools: list[str]) -> str:
    combined = " ".join(texts).lower()
    parts = []

    if re.search(r"\bseller.s market\b", combined):
        parts.append("Currently a seller's market.")
    elif re.search(r"\bbuyer.s market\b", combined):
        parts.append("Currently a buyer's market.")

    dom = re.search(r"(\d+)\s+days?\s+on\s+(?:the\s+)?market", combined)
    if dom:
        parts.append(f"Average ~{dom.group(1)} days on market.")

    if schools:
        parts.append(f"Schools in area include: {', '.join(schools)}.")

    if re.search(r"\bwalk(?:able|ability|score)\b", combined):
        parts.append("Area noted for walkability.")
    if re.search(r"\bpark\b", combined):
        parts.append("Parks and green space nearby.")
    if re.search(r"\brestaurant|\bshopping|\bdining\b", combined):
        parts.append("Close to dining and shopping.")

    return " ".join(parts)


async def _tavily_search(
    client: httpx.AsyncClient,
    query: str,
    max_results: int = 5,
    include_answer: bool = False,
    search_depth: str = "basic",
) -> list[str]:
    try:
        resp = await client.post(
            "https://api.tavily.com/search",
            json={
                "api_key": settings.tavily_api_key,
                "query": query,
                "search_depth": search_depth,
                "max_results": max_results,
                "include_answer": include_answer,
                "include_raw_content": False,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        texts = []
        if include_answer and data.get("answer"):
            texts.append(data["answer"])
        for r in data.get("results", []):
            text = ((r.get("title") or "") + " " + (r.get("content") or "")).strip()
            if text:
                texts.append(text)
        return texts
    except Exception:
        return []


async def research_neighborhood(
    address: str = "",
    neighborhood: str = "",
    location: str = "",
) -> dict:
    if not settings.tavily_api_key:
        return {
            "neighborhood": neighborhood,
            "location": location,
            "property_type": "",
            "price_range": "",
            "agent_notes": "",
            "message": "Set TAVILY_API_KEY in api/.env to enable online research.",
        }

    area = neighborhood or location or address
    city_state = location or ", ".join(p.strip() for p in address.split(",")[-2:] if p.strip()) or area

    market_queries = [
        f"{area} median home sale price 2024 2025 real estate market",
        f"{city_state} housing market single family condo average days on market",
    ]
    school_query = f"elementary middle high schools near {city_state} school names list"

    all_texts: list[str] = []
    async with httpx.AsyncClient(timeout=30.0) as client:
        tasks = [
            _tavily_search(client, market_queries[0]),
            _tavily_search(client, market_queries[1]),
            _tavily_search(
                client,
                school_query,
                max_results=7,
                include_answer=True,
                search_depth="advanced",
            )
        ]
        results = await asyncio.gather(*tasks)
        for r in results:
            all_texts.extend(r)

    if not all_texts:
        return {
            "neighborhood": neighborhood,
            "location": location,
            "property_type": "",
            "price_range": "",
            "agent_notes": "",
            "message": "Search provider unreachable. Fill in details manually.",
        }

    price_range = _price_range(all_texts)
    property_type = _property_types(all_texts)
    schools = _schools(all_texts)
    notes = _agent_notes(all_texts, schools)

    parts = []
    if price_range:
        parts.append("price data")
    if schools:
        parts.append(f"{len(schools)} school(s)")
    summary = "Research complete" + (f" — found {' and '.join(parts)}." if parts else ".")

    return {
        "neighborhood": neighborhood or area,
        "location": location or city_state,
        "property_type": property_type,
        "price_range": price_range,
        "agent_notes": notes,
        "message": summary,
    }
