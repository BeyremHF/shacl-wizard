from __future__ import annotations

import os
from dataclasses import dataclass

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional convenience dependency
    load_dotenv = None

if load_dotenv:
    load_dotenv()


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str
    base_uri: str
    cors_origins: list[str]
    llm_provider: str
    openai_api_key: str | None
    openai_model: str

    @property
    def should_try_openai(self) -> bool:
        provider = self.llm_provider.lower()
        return provider in {"auto", "openai"} and bool(self.openai_api_key)

    @property
    def requires_openai(self) -> bool:
        return self.llm_provider.lower() == "openai"


def get_settings() -> Settings:
    return Settings(
        app_name=os.getenv("APP_NAME", "SHACL Wizard Backend"),
        base_uri=os.getenv("BASE_URI", "http://example.org/"),
        cors_origins=_split_csv(
            os.getenv(
                "BACKEND_CORS_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173",
            )
        ),
        llm_provider=os.getenv("LLM_PROVIDER", "auto"),
        openai_api_key=os.getenv("OPENAI_API_KEY"),
        openai_model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
    )
