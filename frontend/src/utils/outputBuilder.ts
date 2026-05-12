/**
 * Client-side shapes graph generator.
 *
 * This produces a preview Turtle / JSON-LD string from the wizard state
 * without hitting the backend.  It's used for instant output on Step 5.
 *
 * Later, when the backend is wired up, the real call goes to POST /api/generate
 * which uses RDFLib for a byte-perfect output.  The client-side version is
 * kept for offline / instant preview purposes.
 */

import type { WizardState, PropertyShape, PropertyConstraints } from '@/types'

// ─── Turtle ───────────────────────────────────────────────────────────────────

export function buildTurtle(state: WizardState): string {
  const lines: string[] = [
    '@prefix sh:  <http://www.w3.org/ns/shacl#> .',
    '@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .',
    '@prefix ex:  <http://example.org/> .',
    '',
    `ex:${state.shapeName}`,
    '    a sh:NodeShape ;',
  ]

  // Target declaration
  const targetLine = buildTargetLine(state)
  if (targetLine) lines.push(targetLine)

  // Property shapes
  state.properties.forEach((prop, idx) => {
    const isLast = idx === state.properties.length - 1
    lines.push('    sh:property [')
    lines.push('        a sh:PropertyShape ;')
    lines.push(`        sh:path ex:${prop.path} ;`)
    lines.push(...buildConstraintLines(prop.constraints))
    lines.push(`    ]${isLast ? ' .' : ' ;'}`)
  })

  // If no properties were added, close the shape
  if (state.properties.length === 0) {
    const last = lines.length - 1
    lines[last] = lines[last].replace(' ;', ' .')
  }

  return lines.join('\n')
}

function buildTargetLine(state: WizardState): string {
  if (!state.targetValue) return ''
  const map: Record<string, string> = {
    class:      'sh:targetClass',
    node:       'sh:targetNode',
    subjectsOf: 'sh:targetSubjectsOf',
    objectsOf:  'sh:targetObjectsOf',
  }
  const predicate = map[state.targetType] ?? 'sh:targetClass'
  return `    ${predicate} ex:${state.targetValue} ;`
}

function buildConstraintLines(c: PropertyConstraints): string[] {
  const lines: string[] = []
  if (c.minCount)     lines.push(`        sh:minCount ${c.minCount} ;`)
  if (c.maxCount)     lines.push(`        sh:maxCount ${c.maxCount} ;`)
  if (c.datatype)     lines.push(`        sh:datatype ${c.datatype} ;`)
  if (c.nodeKind)     lines.push(`        sh:nodeKind ${c.nodeKind} ;`)
  if (c.pattern)      lines.push(`        sh:pattern "${c.pattern}" ;`)
  if (c.minInclusive) lines.push(`        sh:minInclusive ${c.minInclusive} ;`)
  if (c.maxInclusive) lines.push(`        sh:maxInclusive ${c.maxInclusive} ;`)
  if (c.minExclusive) lines.push(`        sh:minExclusive ${c.minExclusive} ;`)
  if (c.maxExclusive) lines.push(`        sh:maxExclusive ${c.maxExclusive} ;`)
  if (c.minLength)    lines.push(`        sh:minLength ${c.minLength} ;`)
  if (c.maxLength)    lines.push(`        sh:maxLength ${c.maxLength} ;`)
  if (c.class)        lines.push(`        sh:class ex:${c.class} ;`)
  if (c.in) {
    const values = c.in.split(',').map(v => `"${v.trim()}"`).join(' ')
    lines.push(`        sh:in ( ${values} ) ;`)
  }
  if (c.languageIn) {
    const tags = c.languageIn.split(',').map(t => `"${t.trim()}"`).join(' ')
    lines.push(`        sh:languageIn ( ${tags} ) ;`)
  }
  return lines
}

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

export function buildJsonLd(state: WizardState): string {
  const targetPredicateMap: Record<string, string> = {
    class:      'sh:targetClass',
    node:       'sh:targetNode',
    subjectsOf: 'sh:targetSubjectsOf',
    objectsOf:  'sh:targetObjectsOf',
  }

  const doc: Record<string, unknown> = {
    '@context': {
      sh:  'http://www.w3.org/ns/shacl#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
      ex:  'http://example.org/',
    },
    '@id':   `ex:${state.shapeName}`,
    '@type': 'sh:NodeShape',
  }

  if (state.targetValue) {
    const pred = targetPredicateMap[state.targetType] ?? 'sh:targetClass'
    doc[pred] = { '@id': `ex:${state.targetValue}` }
  }

  doc['sh:property'] = state.properties.map(prop => buildJsonLdProperty(prop))

  return JSON.stringify(doc, null, 2)
}

function buildJsonLdProperty(prop: PropertyShape): Record<string, unknown> {
  const c = prop.constraints
  const obj: Record<string, unknown> = {
    '@type':   'sh:PropertyShape',
    'sh:path': { '@id': `ex:${prop.path}` },
  }

  const intProps = ['minCount', 'maxCount', 'minLength', 'maxLength'] as const
  for (const key of intProps) {
    if (c[key]) obj[`sh:${key}`] = { '@value': c[key], '@type': 'xsd:integer' }
  }

  const numProps = ['minInclusive', 'maxInclusive', 'minExclusive', 'maxExclusive'] as const
  for (const key of numProps) {
    if (c[key]) obj[`sh:${key}`] = { '@value': c[key], '@type': 'xsd:decimal' }
  }

  if (c.datatype) obj['sh:datatype'] = { '@id': c.datatype }
  if (c.nodeKind) obj['sh:nodeKind'] = { '@id': c.nodeKind }
  if (c.class)    obj['sh:class']    = { '@id': `ex:${c.class}` }
  if (c.pattern)  obj['sh:pattern']  = c.pattern

  if (c.in) {
    obj['sh:in'] = { '@list': c.in.split(',').map(v => v.trim()) }
  }
  if (c.languageIn) {
    obj['sh:languageIn'] = { '@list': c.languageIn.split(',').map(t => t.trim()) }
  }

  return obj
}

// ─── RDF/XML ──────────────────────────────────────────────────────────────────

export function buildRdfXml(state: WizardState): string {
  const targetPredicateMap: Record<string, string> = {
    class:      'sh:targetClass',
    node:       'sh:targetNode',
    subjectsOf: 'sh:targetSubjectsOf',
    objectsOf:  'sh:targetObjectsOf',
  }

  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rdf:RDF',
    '  xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"',
    '  xmlns:sh="http://www.w3.org/ns/shacl#"',
    '  xmlns:xsd="http://www.w3.org/2001/XMLSchema#"',
    '  xmlns:ex="http://example.org/">',
    '',
    `  <sh:NodeShape rdf:about="http://example.org/${state.shapeName}">`,
  ]

  if (state.targetValue) {
    const pred = targetPredicateMap[state.targetType] ?? 'sh:targetClass'
    lines.push(`    <${pred} rdf:resource="http://example.org/${state.targetValue}"/>`)
  }

  for (const prop of state.properties) {
    lines.push('    <sh:property>')
    lines.push('      <sh:PropertyShape>')
    lines.push(`        <sh:path rdf:resource="http://example.org/${prop.path}"/>`)
    const c = prop.constraints
    if (c.minCount)     lines.push(`        <sh:minCount rdf:datatype="xsd:integer">${c.minCount}</sh:minCount>`)
    if (c.maxCount)     lines.push(`        <sh:maxCount rdf:datatype="xsd:integer">${c.maxCount}</sh:maxCount>`)
    if (c.datatype)     lines.push(`        <sh:datatype rdf:resource="http://www.w3.org/2001/XMLSchema#${c.datatype.replace('xsd:', '')}"/>`)
    if (c.nodeKind)     lines.push(`        <sh:nodeKind rdf:resource="http://www.w3.org/ns/shacl#${c.nodeKind.replace('sh:', '')}"/>`)
    if (c.pattern)      lines.push(`        <sh:pattern>${c.pattern}</sh:pattern>`)
    if (c.minInclusive) lines.push(`        <sh:minInclusive>${c.minInclusive}</sh:minInclusive>`)
    if (c.maxInclusive) lines.push(`        <sh:maxInclusive>${c.maxInclusive}</sh:maxInclusive>`)
    if (c.minLength)    lines.push(`        <sh:minLength rdf:datatype="xsd:integer">${c.minLength}</sh:minLength>`)
    if (c.maxLength)    lines.push(`        <sh:maxLength rdf:datatype="xsd:integer">${c.maxLength}</sh:maxLength>`)
    lines.push('      </sh:PropertyShape>')
    lines.push('    </sh:property>')
  }

  lines.push(`  </sh:NodeShape>`)
  lines.push('</rdf:RDF>')
  return lines.join('\n')
}

// ─── TriG ─────────────────────────────────────────────────────────────────────
// TriG is Turtle wrapped inside a named graph block.

export function buildTrig(state: WizardState): string {
  const turtle = buildTurtle(state)
  const innerIndented = turtle
    .split('\n')
    .map(line => '  ' + line)
    .join('\n')

  return [
    '@prefix sh:  <http://www.w3.org/ns/shacl#> .',
    '@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .',
    '@prefix ex:  <http://example.org/> .',
    '',
    'ex:ShapesGraph {',
    innerIndented,
    '}',
  ].join('\n')
}