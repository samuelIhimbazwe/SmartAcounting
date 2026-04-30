import json
import os
import sys
from datetime import datetime


def read_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def metric(data, key, default="n/a"):
    return data.get("metrics", {}).get(key, {}).get("values", {}).get("p(95)", default)


def fail_rate(data):
    return data.get("metrics", {}).get("http_req_failed", {}).get("values", {}).get("rate", "n/a")


def checks_rate(data):
    return data.get("metrics", {}).get("checks", {}).get("values", {}).get("rate", "n/a")


def status_for(p95, target_ms):
    try:
        return "PASS" if float(p95) < float(target_ms) else "FAIL"
    except Exception:
        return "UNKNOWN"


def main():
    if len(sys.argv) != 4:
        print("Usage: python generate_summary.py <dashboard_json> <copilot_json> <output_md>")
        sys.exit(1)

    dashboard_json, copilot_json, output_md = sys.argv[1], sys.argv[2], sys.argv[3]
    d = read_json(dashboard_json)
    c = read_json(copilot_json)

    d_p95 = metric(d, "http_req_duration")
    c_p95 = metric(c, "http_req_duration")
    d_fail = fail_rate(d)
    c_fail = fail_rate(c)
    d_checks = checks_rate(d)
    c_checks = checks_rate(c)

    lines = [
        "# SmartChain Performance Smoke Report",
        "",
        f"Generated: {datetime.utcnow().isoformat()}Z",
        "",
        "| Scenario | p95 Duration (ms) | Target | Error Rate | Check Pass Rate | Status |",
        "|---|---:|---:|---:|---:|---|",
        f"| Dashboard KPI | {d_p95} | < 500 | {d_fail} | {d_checks} | {status_for(d_p95, 500)} |",
        f"| Copilot Query | {c_p95} | < 1500 | {c_fail} | {c_checks} | {status_for(c_p95, 1500)} |",
        "",
        "## Notes",
        "- Thresholds align with SmartChain v3.0 backend smoke targets.",
        "- Full concurrency/SLO validation should also be executed in staging/prod-like environments.",
    ]

    os.makedirs(os.path.dirname(output_md), exist_ok=True)
    with open(output_md, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"Wrote {output_md}")


if __name__ == "__main__":
    main()
