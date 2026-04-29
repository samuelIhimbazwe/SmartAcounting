from fastapi import FastAPI
from pydantic import BaseModel
from datetime import date, timedelta
import random

app = FastAPI(title="smartchain-forecast-service")


class ForecastRequest(BaseModel):
    tenant_id: str
    metric: str
    history_days: int = 365
    forecast_days: int = 90


@app.post("/forecast")
def forecast(req: ForecastRequest):
    # Deterministic synthetic baseline for scaffold environments.
    random.seed(hash(req.tenant_id + req.metric) % 1_000_000)
    start = date.today() + timedelta(days=1)
    dates = []
    p10 = []
    p50 = []
    p90 = []
    base = 100.0 + (abs(hash(req.metric)) % 40)
    for i in range(req.forecast_days):
        drift = i * 0.2
        noise = random.uniform(-3.0, 3.0)
        mid = max(1.0, base + drift + noise)
        low = max(0.5, mid * 0.9)
        high = mid * 1.1
        dates.append(str(start + timedelta(days=i)))
        p10.append(round(low, 2))
        p50.append(round(mid, 2))
        p90.append(round(high, 2))
    return {
        "tenant_id": req.tenant_id,
        "metric": req.metric,
        "dates": dates,
        "p10": p10,
        "p50": p50,
        "p90": p90,
    }
