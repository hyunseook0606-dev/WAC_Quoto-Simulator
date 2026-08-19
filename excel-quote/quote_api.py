# -*- coding: utf-8 -*-
"""Cloud API — Excel Master-backed air desk quotation engine."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from quote_engine import DEFAULT_XLSX, Master, calc_quote, load_master

ROOT = Path(__file__).resolve().parent
app = FastAPI(
    title="WAC Air Quotation Engine",
    description="Master_DB xlsx + Python calc (no Excel app on server)",
    version="1.0.0",
)


class QuoteRequest(BaseModel):
    route: str = Field(..., examples=["HKG-ICN"])
    length: float = Field(..., gt=0)
    width: float = Field(..., gt=0)
    height: float = Field(..., gt=0)
    qty: int = Field(1, ge=1)
    gross: float = Field(..., gt=0)
    bl_count: int = Field(1, ge=1)
    fx: float = Field(1.0, gt=0, description="HKD already → 1.0")
    exceptions: dict[str, float | None] = Field(
        default_factory=dict,
        description="Override lines: handling, doc, trucking, pickup, palletizing, …",
    )


@lru_cache(maxsize=1)
def get_master() -> Master:
    if not DEFAULT_XLSX.is_file():
        raise FileNotFoundError(f"Missing {DEFAULT_XLSX}")
    return load_master(DEFAULT_XLSX)


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "master_file": DEFAULT_XLSX.name,
        "master_exists": DEFAULT_XLSX.is_file(),
    }


@app.get("/master/routes")
def list_routes() -> dict[str, Any]:
    try:
        master = get_master()
    except FileNotFoundError as e:
        raise HTTPException(503, str(e)) from e
    return {
        "source": master.source,
        "routes": [
            {
                "route": a.route,
                "currency": a.currency,
                "min": a.min_amt,
                "fsc": a.fsc,
                "ssc": a.ssc,
            }
            for a in master.air
        ],
    }


@app.post("/quote")
def post_quote(body: QuoteRequest) -> dict[str, Any]:
    try:
        master = get_master()
    except FileNotFoundError as e:
        raise HTTPException(503, str(e)) from e
    try:
        result = calc_quote(
            route=body.route,
            length=body.length,
            width=body.width,
            height=body.height,
            qty=body.qty,
            gross=body.gross,
            bl_count=body.bl_count,
            fx=body.fx,
            exceptions=body.exceptions,
            master=master,
        )
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    return result.to_dict()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("quote_api:app", host="0.0.0.0", port=8000, reload=False)
