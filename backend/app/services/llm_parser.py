from __future__ import annotations

import json
import re
from typing import Any

from app.config import Settings
from app.models import (
    ParseNLRequest,
    ParseNLResponse,
    PropertyConstraints,
    PropertyShape,
)


LLM_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "properties": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "path": {"type": "string"},
                    "constraints": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "minCount": {"type": "string"},
                            "maxCount": {"type": "string"},
                            "datatype": {"type": "string"},
                            "nodeKind": {"type": "string"},
                            "pattern": {"type": "string"},
                            "minInclusive": {"type": "string"},
                            "maxInclusive": {"type": "string"},
                            "minExclusive": {"type": "string"},
                            "maxExclusive": {"type": "string"},
                            "minLength": {"type": "string"},
                            "maxLength": {"type": "string"},
                            "in": {"type": "string"},
                            "class": {"type": "string"},
                            "languageIn": {"type": "string"},
                        },
                    },
                },
                "required": ["path", "constraints"],
            },
        },
        "summary": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["properties", "summary"],
}


SYSTEM_INSTRUCTIONS = """
You convert natural-language validation requirements into SHACL Core property
shapes for a beginner-friendly wizard.

Return JSON matching the schema exactly. Use local property names only, without
the ex: prefix. Constraint values must be strings because the frontend stores
wizard input as strings. Only use these constraint fields:
minCount, maxCount, datatype, nodeKind, pattern, minInclusive, maxInclusive,
minExclusive, maxExclusive, minLength, maxLength, in, class, languageIn.

Prefer common SHACL/XSD CURIEs such as xsd:string, xsd:integer, xsd:decimal,
xsd:date, xsd:boolean, xsd:anyURI, sh:IRI, sh:Literal, and sh:BlankNode.
""".strip()


def parse_natural_language(request: ParseNLRequest, settings: Settings) -> ParseNLResponse:
    if settings.requires_openai and not settings.openai_api_key:
        heuristic = parse_with_heuristics(request)
        heuristic.warnings.append("LLM_PROVIDER=openai is set, but OPENAI_API_KEY is missing.")
        return heuristic

    if not settings.should_try_openai:
        return parse_with_heuristics(request)

    try:
        return parse_with_openai(request, settings)
    except Exception as exc:  # pragma: no cover - depends on external provider
        heuristic = parse_with_heuristics(request)
        heuristic.warnings.append(f"OpenAI parser failed; heuristic parser used instead: {exc}")
        return heuristic


def parse_with_openai(request: ParseNLRequest, settings: Settings) -> ParseNLResponse:
    try:
        from openai import OpenAI
    except ImportError as exc:  # pragma: no cover - optional dependency
        raise RuntimeError("openai package is not installed") from exc

    client = OpenAI(api_key=settings.openai_api_key)
    response = client.responses.create(
        model=settings.openai_model,
        instructions=SYSTEM_INSTRUCTIONS,
        input=_build_prompt(request),
        text={
            "format": {
                "type": "json_schema",
                "name": "shacl_wizard_parse_nl",
                "schema": LLM_SCHEMA,
                "strict": False,
            }
        },
    )

    raw_text = _extract_response_text(response)
    payload = json.loads(raw_text)
    properties = [
        PropertyShape(path=item["path"], constraints=PropertyConstraints(**item.get("constraints", {})))
        for item in payload.get("properties", [])
        if item.get("path")
    ]
    if not properties:
        raise ValueError("LLM returned no properties")

    return ParseNLResponse(
        properties=properties,
        summary=payload.get("summary", []),
        source="openai",
    )


def _build_prompt(request: ParseNLRequest) -> str:
    context = {
        "description": request.description,
        "targetType": request.target_type,
        "targetValue": request.target_value,
        "shapeName": request.shape_name,
    }
    return (
        "Parse this wizard request into SHACL property constraints. "
        "Return JSON only.\n\n"
        f"{json.dumps(context, ensure_ascii=True, indent=2)}"
    )


def _extract_response_text(response: Any) -> str:
    output_text = getattr(response, "output_text", None)
    if output_text:
        return output_text

    chunks: list[str] = []
    for item in getattr(response, "output", []) or []:
        for content in getattr(item, "content", []) or []:
            text = getattr(content, "text", None)
            if text:
                chunks.append(text)
    if chunks:
        return "".join(chunks)

    raise ValueError("LLM response did not contain output text")


def parse_with_heuristics(request: ParseNLRequest) -> ParseNLResponse:
    text = _fold_text(request.description)
    properties: list[PropertyShape] = []

    for rule in _candidate_rules():
        if any(keyword in text for keyword in rule["keywords"]):
            constraints = PropertyConstraints(**rule["constraints"])
            _apply_cardinality(text, rule["keywords"], constraints)
            _apply_numeric_range(text, rule["keywords"], constraints)
            properties.append(PropertyShape(path=rule["path"], constraints=constraints))

    if not properties:
        properties.append(
            PropertyShape(
                path="label",
                constraints=PropertyConstraints(minCount="1", datatype="xsd:string"),
            )
        )

    return ParseNLResponse(
        properties=_dedupe_properties(properties),
        summary=[f"Suggested {len(properties)} propert{'y' if len(properties) == 1 else 'ies'} from the description."],
        source="heuristic",
    )


def _candidate_rules() -> list[dict[str, Any]]:
    return [
        {
            "path": "name",
            "keywords": ["name", "full name", "vollname"],
            "constraints": {"minCount": "1", "maxCount": "1", "datatype": "xsd:string"},
        },
        {
            "path": "email",
            "keywords": ["email", "e-mail", "mail address", "mailadresse"],
            "constraints": {
                "minCount": "1",
                "datatype": "xsd:string",
                "pattern": r"^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$",
            },
        },
        {
            "path": "age",
            "keywords": ["age", "alter"],
            "constraints": {"datatype": "xsd:integer", "minInclusive": "0", "maxInclusive": "150"},
        },
        {
            "path": "birthDate",
            "keywords": ["birth date", "birthdate", "born", "geburtsdatum", "geboren"],
            "constraints": {"datatype": "xsd:date"},
        },
        {
            "path": "homepage",
            "keywords": ["url", "website", "homepage", "webseite"],
            "constraints": {"datatype": "xsd:anyURI", "nodeKind": "sh:IRI"},
        },
        {
            "path": "price",
            "keywords": ["price", "preis", "cost", "kosten"],
            "constraints": {"datatype": "xsd:decimal", "minInclusive": "0"},
        },
        {
            "path": "description",
            "keywords": ["description", "beschreibung"],
            "constraints": {"datatype": "xsd:string"},
        },
        {
            "path": "sku",
            "keywords": ["sku", "article number", "artikelnummer"],
            "constraints": {"datatype": "xsd:string", "minCount": "1", "maxCount": "1"},
        },
        {
            "path": "phone",
            "keywords": ["phone", "telephone", "telefon"],
            "constraints": {"datatype": "xsd:string", "pattern": r"^\+?[0-9\s().-]{6,}$"},
        },
    ]


def _apply_cardinality(text: str, keywords: list[str], constraints: PropertyConstraints) -> None:
    snippet = _nearby_text(text, keywords)
    if re.search(r"\b(exactly one|genau ein(?:e|en)?|one and only one)\b", snippet):
        constraints.min_count = "1"
        constraints.max_count = "1"
    elif re.search(r"\b(at least one|required|mandatory|must have|mindestens ein(?:e|en)?|pflicht)\b", snippet):
        constraints.min_count = constraints.min_count or "1"
    elif re.search(r"\b(at most one|max(?:imum)? one|hoechstens ein(?:e|en)?)\b", snippet):
        constraints.max_count = constraints.max_count or "1"

    if re.search(r"\b(optional|freiwillig|kann)\b", snippet):
        constraints.min_count = None


def _apply_numeric_range(text: str, keywords: list[str], constraints: PropertyConstraints) -> None:
    snippet = _nearby_text(text, keywords)
    match = re.search(r"\bbetween\s+(-?\d+(?:\.\d+)?)\s+(?:and|to)\s+(-?\d+(?:\.\d+)?)\b", snippet)
    if not match:
        match = re.search(r"\bzwischen\s+(-?\d+(?:\.\d+)?)\s+und\s+(-?\d+(?:\.\d+)?)\b", snippet)
    if match:
        constraints.min_inclusive = match.group(1)
        constraints.max_inclusive = match.group(2)


def _nearby_text(text: str, keywords: list[str], radius: int = 80) -> str:
    spans: list[str] = []
    for keyword in keywords:
        idx = text.find(keyword)
        if idx >= 0:
            spans.append(text[max(0, idx - radius) : idx + len(keyword) + radius])
    return " ".join(spans) if spans else text


def _fold_text(text: str) -> str:
    return (
        text.lower()
        .replace("\u00e4", "ae")
        .replace("\u00f6", "oe")
        .replace("\u00fc", "ue")
        .replace("\u00df", "ss")
    )


def _dedupe_properties(properties: list[PropertyShape]) -> list[PropertyShape]:
    seen: set[str] = set()
    deduped: list[PropertyShape] = []
    for prop in properties:
        key = prop.path.lower()
        if key not in seen:
            seen.add(key)
            deduped.append(prop)
    return deduped
