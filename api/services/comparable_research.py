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


def _sale_date(text: str) -> str:
    sold_match = re.search(
        r"\b(?:sold|closed)\s+(?:on\s+)?([A-Z][a-z]{2,8}\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}/\d{1,2}/\d{2,4})",
        text,
        re.I,
    )
    if sold_match:
        return sold_match.group(1)
    date_match = re.search(r"\b([A-Z][a-z]{2,8}\.?\s+\d{1,2},?\s+\d{4})\b", text)
    return date_match.group(1) if date_match else ""


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
    address = _address_from_text(f"{title} {content}")
    if address:
        return address
    title = re.sub(r"\s*[-|].*$", "", title).strip()
    title = re.sub(r"\b(?:for sale|sold|recently sold|real estate|property record)\b", "", title, flags=re.I)
    return title.strip(" ,-")


def build_research_queries(subject_property: str, subject_details: str = "") -> list[str]:
    full_address = subject_property.strip()
    details = subject_details.strip()
    return [
        f"recently sold comparable homes near \"{full_address}\" {details}",
        f"Redfin recently sold homes near \"{full_address}\"",
        f"Realtor.com recently sold homes near \"{full_address}\"",
        f"Zillow recently sold homes near \"{full_address}\"",
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
    async with httpx.AsyncClient(timeout=30.0) as client:
        for query in queries:
            raw_results.extend(await _search_query(client, query, max(3, max_results // 2)))

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
        candidate = {
            "address": _clean_address(title, content),
            "sqft": _sqft(combined),
            "beds_baths": _beds_baths(combined),
            "sale_price": _money(combined),
            "sale_date": _sale_date(combined),
            "dom": _dom(combined),
            "source_title": title,
            "source_url": url,
            "evidence": content[:500],
            "selected": True,
        }
        address_key = candidate["address"].lower()
        if address_key and address_key in seen_addresses:
            continue
        if address_key:
            seen_addresses.add(address_key)
        candidates.append(candidate)

    candidates.sort(key=_confidence, reverse=True)
    candidates = candidates[:max_results]

    return {
        "candidates": candidates,
        "queries": queries,
        "message": "Review each candidate and edit any missing fields before generating the CMA.",
    }
