# SHACL Wizard Backend

FastAPI backend for the SHACL Wizard frontend.

It provides:

- `POST /api/parse-nl` for AI-assisted natural-language rule parsing.
- `POST /api/generate` for RDFLib-based SHACL graph generation.
- `POST /api/parse-rdf` for extracting classes/properties from uploaded RDF data.
- `POST /api/validate` for pySHACL validation.
- `GET /api/health` for local checks.

## Run Locally

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

The existing Vite config proxies `/api` to `http://localhost:8000`.

## Optional LLM Setup

The natural-language parser works without an external API by using a deterministic
heuristic parser. To use OpenAI instead, put these values in `.env`:

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
```

When `LLM_PROVIDER=auto`, the backend uses OpenAI only if `OPENAI_API_KEY` is set.
If the call fails, it falls back to the heuristic parser and returns a warning.

## Frontend Call Shapes

### Parse Natural Language

```ts
await fetch('/api/parse-nl', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    description: state.nlDescription,
    targetType: state.targetType,
    targetValue: state.targetValue,
    shapeName: state.shapeName,
  }),
})
```

### Generate Shapes Graph

```ts
await fetch('/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(state),
})
```

### Validate With pySHACL

```ts
const formData = new FormData()
formData.append('data_file', file)
formData.append('shapes_graph', builds.turtle)
formData.append('shapes_format', 'turtle')

await fetch('/api/validate', {
  method: 'POST',
  body: formData,
})
```
