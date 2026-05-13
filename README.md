# shacl-wizard
Guided wizard that maps plain-English validation rules to SHACL Core constraints and outputs valid shapes graphs (Turtle / JSON-LD...).


# For you to run this code do the following:

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

The frontend proxies `/api` requests to the backend on port `8000`.
