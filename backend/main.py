from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from io import BytesIO
from threading import Lock
from typing import Any, Dict, List, Optional

import boto3
import numpy as np
import pandas as pd
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="DAaaS API", version="1.0")

# CORS configuration - supports both development and production
cors_origins = os.getenv(
    "CORS_ORIGINS",
    "https://daas-frontend-static.s3.ap-southeast-1.amazonaws.com,http://localhost:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Try Docker path first (backend/data/), then parent directory path (for local dev)
DATASET_PATH_DOCKER = os.path.join(BASE_DIR, "data", "IntakebyInstitutions_processed.csv")
DATASET_PATH_LOCAL = os.path.join(os.path.dirname(BASE_DIR), "data", "IntakebyInstitutions_processed.csv")

# Use Docker path if it exists, otherwise use local path
if os.path.exists(DATASET_PATH_DOCKER):
    DATASET_PATH = DATASET_PATH_DOCKER
else:
    DATASET_PATH = DATASET_PATH_LOCAL
DATASET_ID = "intake_by_institutions"

_jobs: Dict[str, Dict[str, Any]] = {}
_jobs_lock = Lock()
_dataset_cache: Optional[pd.DataFrame] = None
_dataset_lock = Lock()


@app.get("/health")
async def health_check():
    """Health check endpoint for container orchestration"""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


class JobRequest(BaseModel):
    dataset_id: str = Field(..., alias="dataset_id")
    analysis_type: str = Field(..., alias="analysis_type")
    filters: Dict[str, Any] = Field(default_factory=dict)


class JobResponse(BaseModel):
    job_id: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    result: Optional[Dict[str, Any]]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_dataset() -> pd.DataFrame:
    global _dataset_cache
    with _dataset_lock:
        if _dataset_cache is not None:
            return _dataset_cache.copy()

        use_s3 = os.getenv("USE_S3", "False").lower() == "true"
        if use_s3:
            bucket = os.getenv("S3_BUCKET")
            if not bucket:
                raise RuntimeError("S3_BUCKET is required when USE_S3=True")
            key = "IntakebyInstitutions_processed.csv"
            client = boto3.client("s3")
            obj = client.get_object(Bucket=bucket, Key=key)
            data = obj["Body"].read()
            df = pd.read_csv(BytesIO(data))
        else:
            df = pd.read_csv(DATASET_PATH)

        _dataset_cache = df
        return df.copy()


def to_long_df(df: pd.DataFrame) -> pd.DataFrame:
    if "year" not in df.columns or "sex" not in df.columns:
        raise ValueError("Dataset must contain 'year' and 'sex' columns.")

    value_columns = [col for col in df.columns if col not in {"year", "sex"}]
    long_df = df.melt(
        id_vars=["year", "sex"],
        value_vars=value_columns,
        var_name="institution",
        value_name="intake",
    )
    long_df["intake"] = pd.to_numeric(long_df["intake"], errors="coerce").fillna(0)
    return long_df


def apply_filters(df: pd.DataFrame, filters: Dict[str, Any]) -> pd.DataFrame:
    filtered = df.copy()
    
    # Handle single sex filter
    sex = filters.get("sex")
    if sex:
        filtered = filtered[filtered["sex"] == sex]
    
    # Handle multiple sexes filter (for gender comparison)
    sexes = filters.get("sexes")
    if sexes and isinstance(sexes, list):
        filtered = filtered[filtered["sex"].isin(sexes)]

    year_from = filters.get("year_from") or filters.get("yearFrom")
    year_to = filters.get("year_to") or filters.get("yearTo")
    if year_from is not None:
        filtered = filtered[filtered["year"] >= int(year_from)]
    if year_to is not None:
        filtered = filtered[filtered["year"] <= int(year_to)]

    institutions = filters.get("institutions") or filters.get("institution")
    if institutions:
        if isinstance(institutions, str):
            institutions = [item.strip() for item in institutions.split(",") if item.strip()]
        filtered = filtered[filtered["institution"].isin(institutions)]

    return filtered


def format_table(columns: List[str], rows: List[List[Any]]) -> Dict[str, Any]:
    return {"columns": columns, "rows": rows}


def summarize_descriptive(df: pd.DataFrame) -> Dict[str, Any]:
    mean_val = float(df["intake"].mean()) if not df.empty else 0
    median_val = float(df["intake"].median()) if not df.empty else 0
    sum_val = float(df["intake"].sum()) if not df.empty else 0

    series = [
        {"name": "Metrics", "points": [
            {"x": "mean", "y": mean_val},
            {"x": "median", "y": median_val},
            {"x": "sum", "y": sum_val},
        ]}
    ]

    return {
        "summary": f"Mean: {mean_val:.2f}, Median: {median_val:.2f}, Sum: {sum_val:.0f}",
        "visualization": {
            "chartType": "bar",
            "x": "metric",
            "y": "value",
            "series": series,
        },
        "table": format_table(
            ["metric", "value"],
            [
                ["mean", mean_val],
                ["median", median_val],
                ["sum", sum_val],
            ],
        ),
    }


def summarize_group_by(df: pd.DataFrame, group_by: str) -> Dict[str, Any]:
    grouped = df.groupby(group_by, as_index=False)["intake"].sum()
    series = [
        {
            "name": "Total",
            "points": [
                {"x": str(row[group_by]), "y": float(row["intake"])}
                for _, row in grouped.iterrows()
            ],
        }
    ]
    rows = grouped.rename(columns={"intake": "total_intake"}).values.tolist()
    return {
        "summary": f"Grouped intake by {group_by}.",
        "visualization": {
            "chartType": "bar",
            "x": group_by,
            "y": "total_intake",
            "series": series,
        },
        "table": format_table([group_by, "total_intake"], rows),
    }


def summarize_time_series(df: pd.DataFrame) -> Dict[str, Any]:
    grouped = df.groupby("year", as_index=False)["intake"].sum()
    series = [
        {
            "name": "Total",
            "points": [
                {"x": int(row["year"]), "y": float(row["intake"])}
                for _, row in grouped.iterrows()
            ],
        }
    ]
    rows = grouped.rename(columns={"intake": "total_intake"}).values.tolist()
    return {
        "summary": "Time-series of total intake by year.",
        "visualization": {
            "chartType": "line",
            "x": "year",
            "y": "total_intake",
            "series": series,
        },
        "table": format_table(["year", "total_intake"], rows),
    }


def summarize_comparative(df: pd.DataFrame, institutions: List[str]) -> Dict[str, Any]:
    if len(institutions) < 1:
        institutions = df["institution"].dropna().unique().tolist()

    subset = df[df["institution"].isin(institutions)]
    grouped = subset.groupby(["year", "institution"], as_index=False)["intake"].sum()

    series: List[Dict[str, Any]] = []
    for inst in institutions:
        inst_rows = grouped[grouped["institution"] == inst]
        if not inst_rows.empty:
            series.append(
                {
                    "name": inst,
                    "points": [
                        {"x": int(row["year"]), "y": float(row["intake"])}
                        for _, row in inst_rows.iterrows()
                    ],
                }
            )

    pivot = grouped.pivot(index="year", columns="institution", values="intake").fillna(0)
    pivot.reset_index(inplace=True)
    rows = pivot.values.tolist()

    inst_names = ", ".join(institutions)
    return {
        "summary": f"Comparative trends for {inst_names}.",
        "visualization": {
            "chartType": "line",
            "x": "year",
            "y": "intake",
            "series": series,
        },
        "table": format_table(pivot.columns.tolist(), rows),
    }


def summarize_gender_comparative(df: pd.DataFrame) -> Dict[str, Any]:
    """Compare Male vs Female intake trends across selected institutions"""
    # Group by year and sex, sum across all institutions
    grouped = df.groupby(["year", "sex"], as_index=False)["intake"].sum()
    
    # Create separate series for M and F
    series: List[Dict[str, Any]] = []
    sexes = grouped["sex"].unique()
    
    for sex in ['M', 'F']:  # Ensure consistent order
        if sex in sexes:
            sex_rows = grouped[grouped["sex"] == sex].sort_values("year")
            series.append({
                "name": sex,
                "points": [
                    {"x": int(row["year"]), "y": float(row["intake"])}
                    for _, row in sex_rows.iterrows()
                ],
            })
    
    # Create table data
    pivot = grouped.pivot(index="year", columns="sex", values="intake").fillna(0)
    pivot.reset_index(inplace=True)
    rows = pivot.values.tolist()
    
    total_male = float(grouped[grouped["sex"] == "M"]["intake"].sum()) if "M" in sexes else 0
    total_female = float(grouped[grouped["sex"] == "F"]["intake"].sum()) if "F" in sexes else 0
    
    return {
        "summary": f"Gender comparison: Male={total_male:.0f}, Female={total_female:.0f}",
        "visualization": {
            "chartType": "line",
            "x": "year",
            "y": "intake",
            "series": series,
        },
        "table": format_table(pivot.columns.tolist(), rows),
    }


def summarize_projection(df: pd.DataFrame) -> Dict[str, Any]:
    grouped = df.groupby("year", as_index=False)["intake"].sum().sort_values("year")
    if len(grouped) < 3:
        return {
            "summary": "Not enough data points for projection.",
            "visualization": {
                "chartType": "line",
                "x": "year",
                "y": "projected_intake",
                "series": [],
            },
            "table": format_table(["year", "projected_intake"], []),
        }

    years = grouped["year"].astype(float).values
    values = grouped["intake"].values
    coeffs = np.polyfit(years, values, 1)
    poly = np.poly1d(coeffs)

    last_year = int(years[-1])
    future_years = np.array([last_year + 1, last_year + 2, last_year + 3], dtype=float)
    projections = poly(future_years)

    series = [
        {
            "name": "Projection",
            "points": [
                {"x": int(year), "y": float(value)}
                for year, value in zip(future_years, projections)
            ],
        }
    ]
    rows = [[int(year), float(value)] for year, value in zip(future_years, projections)]

    return {
        "summary": "Projection for the next three years based on linear trend.",
        "visualization": {
            "chartType": "line",
            "x": "year",
            "y": "projected_intake",
            "series": series,
        },
        "table": format_table(["year", "projected_intake"], rows),
    }


def normalize_analysis_type(analysis_type: str) -> str:
    aliases = {
        "trend": "time_series",
        "growth_rate": "time_series",
        "compare_institutions": "comparative",
        "topk_by_year": "group_by",
    }
    return aliases.get(analysis_type, analysis_type)


def run_analysis(job_id: str, analysis_type: str, params: Dict[str, Any]) -> None:
    with _jobs_lock:
        job = _jobs[job_id]
        job["status"] = "RUNNING"
        job["updatedAt"] = now_iso()

    try:
        df = load_dataset()
        long_df = to_long_df(df)
        filtered = apply_filters(long_df, params)

        normalized = normalize_analysis_type(analysis_type)
        if normalized == "descriptive":
            result = summarize_descriptive(filtered)
        elif normalized == "group_by":
            group_by = params.get("group_by", "institution")
            result = summarize_group_by(filtered, group_by)
        elif normalized == "time_series":
            result = summarize_time_series(filtered)
        elif normalized == "comparative":
            institutions = params.get("institutions", [])
            if isinstance(institutions, str):
                institutions = [item.strip() for item in institutions.split(",") if item.strip()]
            result = summarize_comparative(filtered, institutions)
        elif normalized == "gender_comparative":
            result = summarize_gender_comparative(filtered)
        elif normalized == "projection":
            result = summarize_projection(filtered)
        else:
            raise ValueError(f"Unknown analysis_type: {analysis_type}")

        envelope = {
            "datasetId": DATASET_ID,
            "analysisType": analysis_type,
            "params": params,
            "generatedAt": now_iso(),
            "summary": result["summary"],
            "visualization": result["visualization"],
            "table": result["table"],
            "meta": {"notes": "Generated by DAaaS backend."},
        }

        with _jobs_lock:
            job = _jobs[job_id]
            job["status"] = "SUCCEEDED"
            job["updatedAt"] = now_iso()
            job["result"] = envelope
    except Exception as exc:
        with _jobs_lock:
            job = _jobs[job_id]
            job["status"] = "FAILED"
            job["updatedAt"] = now_iso()
            job["error"] = str(exc)


def create_job(dataset_id: str, analysis_type: str, params: Dict[str, Any]) -> str:
    job_id = str(uuid.uuid4())
    now = now_iso()
    job = {
        "jobId": job_id,
        "userId": "local-user",
        "datasetId": dataset_id,
        "analysisType": analysis_type,
        "params": params,
        "status": "QUEUED",
        "createdAt": now,
        "updatedAt": now,
        "result": None,
        "error": None,
    }
    with _jobs_lock:
        _jobs[job_id] = job
    return job_id


def result_to_legacy(result: Dict[str, Any]) -> Dict[str, Any]:
    if not result:
        return {"summary": "", "chart_data": [], "table_data": []}

    series = result.get("visualization", {}).get("series", [])
    chart_data = []
    for serie in series:
        for point in serie.get("points", []):
            chart_data.append({"name": str(point["x"]), "value": point["y"]})

    table = result.get("table", {})
    columns = table.get("columns", [])
    rows = table.get("rows", [])
    table_data = [dict(zip(columns, row)) for row in rows]

    return {
        "summary": result.get("summary", ""),
        "chart_data": chart_data,
        "table_data": table_data,
    }


@app.get("/api/v1/datasets")
async def list_datasets() -> List[Dict[str, Any]]:
    return [
        {
            "datasetId": DATASET_ID,
            "name": "Intake by Institutions",
            "description": "Student intake by institution, year, and sex.",
            "timeField": "year",
            "dimensions": ["sex", "institution"],
            "metrics": ["intake"],
        }
    ]


@app.get("/api/v1/analyses")
async def list_analyses(datasetId: str) -> List[Dict[str, Any]]:
    if datasetId != DATASET_ID:
        raise HTTPException(status_code=404, detail="Unknown datasetId")

    return [
        {
            "analysisType": "descriptive",
            "name": "Descriptive statistics",
            "paramsSchema": {"sex": "string", "yearFrom": "number", "yearTo": "number"},
            "output": "Mean, median, and sum of intake.",
        },
        {
            "analysisType": "group_by",
            "name": "Group-by analysis",
            "paramsSchema": {"group_by": "string", "sex": "string"},
            "output": "Summed intake grouped by a field.",
        },
        {
            "analysisType": "time_series",
            "name": "Time-series analysis",
            "paramsSchema": {"sex": "string"},
            "output": "Trend of intake over time.",
        },
        {
            "analysisType": "comparative",
            "name": "Comparative analysis",
            "paramsSchema": {"institutions": "string[]", "sex": "string"},
            "output": "Compare two institutions across years.",
        },
        {
            "analysisType": "gender_comparative",
            "name": "Gender comparison",
            "paramsSchema": {"institutions": "string[]", "yearFrom": "number", "yearTo": "number"},
            "output": "Compare Male vs Female intake trends across selected institutions.",
        },
        {
            "analysisType": "projection",
            "name": "Projection",
            "paramsSchema": {"sex": "string"},
            "output": "Linear projection for the next three years.",
        },
    ]


@app.post("/api/v1/jobs")
async def submit_job(payload: Dict[str, Any], background_tasks: BackgroundTasks) -> Dict[str, Any]:
    dataset_id = payload.get("datasetId")
    analysis_type = payload.get("analysisType")
    params = payload.get("params", {})
    if not dataset_id or not analysis_type:
        raise HTTPException(status_code=400, detail="datasetId and analysisType are required")

    job_id = create_job(dataset_id, analysis_type, params)
    background_tasks.add_task(run_analysis, job_id, analysis_type, params)
    return {"jobId": job_id, "status": "QUEUED"}


@app.get("/api/v1/jobs")
async def get_jobs(limit: int = 1000, cursor: Optional[str] = None) -> Dict[str, Any]:
    with _jobs_lock:
        jobs_list = list(_jobs.values())

    jobs_list.sort(key=lambda item: item["createdAt"], reverse=True)
    start = int(cursor) if cursor and cursor.isdigit() else 0
    end = start + limit
    items = jobs_list[start:end]
    next_cursor = str(end) if end < len(jobs_list) else None
    return {"items": items, "nextCursor": next_cursor}


@app.get("/api/v1/jobs/{job_id}")
async def get_job(job_id: str) -> Dict[str, Any]:
    with _jobs_lock:
        job = _jobs.get(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return job


@app.get("/api/v1/jobs/{job_id}/result")
async def get_result(job_id: str) -> Dict[str, Any]:
    with _jobs_lock:
        job = _jobs.get(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] != "SUCCEEDED":
        raise HTTPException(status_code=409, detail="Result not ready")
    return job["result"]


@app.get("/api/v1/jobs/{job_id}/download")
async def get_download(job_id: str) -> Dict[str, Any]:
    with _jobs_lock:
        job = _jobs.get(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] != "SUCCEEDED":
        raise HTTPException(status_code=409, detail="Result not ready")
    return {
        "url": f"http://localhost:8000/api/v1/jobs/{job_id}/result",
        "expiresInSeconds": 3600,
    }


@app.post("/api/v1/job", response_model=JobResponse)
async def submit_job_legacy(payload: JobRequest, background_tasks: BackgroundTasks) -> JobResponse:
    job_id = create_job(payload.dataset_id, payload.analysis_type, payload.filters)
    background_tasks.add_task(run_analysis, job_id, payload.analysis_type, payload.filters)
    return JobResponse(job_id=job_id)


@app.get("/api/v1/job/{job_id}", response_model=JobStatusResponse)
async def get_job_legacy(job_id: str) -> JobStatusResponse:
    with _jobs_lock:
        job = _jobs.get(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    status = "completed" if job["status"] in {"SUCCEEDED", "FAILED"} else "pending"
    result = result_to_legacy(job.get("result")) if job.get("result") else None
    return JobStatusResponse(job_id=job_id, status=status, result=result)
