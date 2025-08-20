import os
import requests
from datetime import datetime
from typing import Optional, Dict, Any, List

FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations"

class FredFetchError(Exception):
    pass

def fetch_fred_series(series_id: str, api_key: Optional[str] = None, start: Optional[str] = None, end: Optional[str] = None) -> Dict[str, Any]:
    """Fetch observations for a FRED series.

    Args:
        series_id: FRED series identifier (e.g., CPIAUCSL)
        api_key: explicit API key (falls back to env FRED_API_KEY)
        start: optional start date YYYY-MM-DD
        end: optional end date YYYY-MM-DD
    Returns:
        dict: { series_id, observations: [ {date, value} ] }
    Raises:
        FredFetchError: on missing key or HTTP errors
    """
    key = api_key or os.getenv("FRED_API_KEY")
    print(f"Fetching FRED series {series_id} with key {key}")
    if not key:
        raise FredFetchError("Missing FRED_API_KEY environment variable")
    params = {
        "series_id": series_id,
        "api_key": key,
        "file_type": "json"
    }
    if start:
        params["observation_start"] = start
    if end:
        params["observation_end"] = end
    try:
        resp = requests.get(FRED_BASE_URL, params=params, timeout=20)
    except requests.RequestException as e:
        raise FredFetchError(f"Network error contacting FRED: {e}") from e
    if resp.status_code != 200:
        raise FredFetchError(f"FRED request failed: {resp.status_code} {resp.text[:180]}")
    data = resp.json()
    observations: List[Dict[str, Any]] = []
    for obs in data.get("observations", []):
        date = obs.get("date")
        raw_value = obs.get("value")
        try:
            value = float(raw_value)
        except (TypeError, ValueError):
            continue  # skip invalid / missing values
        if not date:
            continue
        observations.append({"date": date, "value": value})
    return {"series_id": series_id, "observations": observations}

