from __future__ import annotations

from pathlib import Path

from rdflib import Dataset, Graph, Literal, URIRef
from rdflib.namespace import OWL, RDF, RDFS, SH, XSD

from app.models import ParseRDFResponse

FORMAT_BY_EXTENSION = {
    ".ttl": "turtle",
    ".turtle": "turtle",
    ".jsonld": "json-ld",
    ".json": "json-ld",
    ".rdf": "xml",
    ".xml": "xml",
    ".n3": "n3",
    ".nt": "nt",
    ".trig": "trig",
}

BUILTIN_NAMESPACES = tuple(str(ns) for ns in (RDF, RDFS, OWL, XSD, SH))


def guess_rdf_format(filename: str | None, fallback: str = "turtle") -> str:
    if not filename:
        return fallback
    return FORMAT_BY_EXTENSION.get(Path(filename).suffix.lower(), fallback)


def parse_rdf_hints(graph_text: str, filename: str | None = None, rdf_format: str | None = None) -> ParseRDFResponse:
    resolved_format = rdf_format or guess_rdf_format(filename)
    graph = Dataset(default_union=True) if resolved_format == "trig" else Graph()
    graph.parse(data=graph_text, format=resolved_format)
    return extract_rdf_hints(graph)


def extract_rdf_hints(graph: Graph | Dataset) -> ParseRDFResponse:
    classes: set[str] = set()
    properties: set[str] = set()
    detected_datatypes: dict[str, str] = {}

    for _subject, _predicate, obj in graph.triples((None, RDF.type, None)):
        if isinstance(obj, URIRef) and not _is_builtin_uri(obj):
            classes.add(_local_name(obj))

    for _subject, predicate, obj in graph:
        if predicate == RDF.type or not isinstance(predicate, URIRef):
            continue

        prop_name = _local_name(predicate)
        properties.add(prop_name)

        if isinstance(obj, Literal) and obj.datatype and prop_name not in detected_datatypes:
            detected_datatypes[prop_name] = _qname_or_uri(graph, obj.datatype)

    prefixes = {
        prefix: str(namespace)
        for prefix, namespace in graph.namespace_manager.namespaces()
        if prefix
    }

    return ParseRDFResponse(
        classes=sorted(classes)[:50],
        properties=sorted(properties)[:100],
        prefixes=dict(sorted(prefixes.items())),
        detectedDatatypes=dict(sorted(detected_datatypes.items())),
    )


def _is_builtin_uri(uri: URIRef) -> bool:
    return str(uri).startswith(BUILTIN_NAMESPACES)


def _local_name(uri: URIRef) -> str:
    text = str(uri)
    if "#" in text:
        return text.rsplit("#", 1)[1]
    return text.rstrip("/").rsplit("/", 1)[-1]


def _qname_or_uri(graph: Graph, uri: URIRef) -> str:
    try:
        return graph.namespace_manager.normalizeUri(uri)
    except Exception:
        return str(uri)
