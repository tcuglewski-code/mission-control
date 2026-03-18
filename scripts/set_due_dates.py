#!/usr/bin/env python3
"""
set_due_dates.py
Sets dueDate for all App-Tasks (projectId: cmmv4rsoi000481sk2jynvo68)
based on their sprint label.
"""

import json
import urllib.request
import urllib.error
import time

API_BASE = "https://mission-control-tawny-omega.vercel.app"
PROJECT_ID = "cmmv4rsoi000481sk2jynvo68"
BYPASS_TOKEN = "rpFNEmGS7CB0FunapN20rLGDCG0foMzx"

SPRINT_DUE_DATES = {
    "sprint-0.1": "2026-04-07",
    "sprint-0.2": "2026-04-14",
    "sprint-0.3": "2026-04-21",
    "sprint-1.1": "2026-04-28",
    "sprint-1.2": "2026-05-05",
    "sprint-1.3": "2026-05-12",
    "sprint-1.4": "2026-05-19",
    "sprint-1.5": "2026-05-26",
    "sprint-2.1": "2026-06-09",
    "sprint-2.2": "2026-06-16",
    "sprint-2.3": "2026-06-23",
    "sprint-2.4": "2026-06-30",
    "sprint-2.5": "2026-07-07",
    "sprint-3.1": "2026-07-21",
    "sprint-3.2": "2026-07-28",
    "sprint-3.3": "2026-08-04",
    "sprint-3.4": "2026-08-11",
    "sprint-3.5": "2026-08-18",
    "sprint-4.1": "2026-09-01",
    "sprint-4.2": "2026-09-08",
    "sprint-4.3": "2026-09-15",
    "sprint-4.4": "2026-09-22",
}

HEADERS = {
    "Content-Type": "application/json",
    "x-vercel-bypass-automation-protection": BYPASS_TOKEN,
}


def api_request(method, path, data=None):
    url = f"{API_BASE}{path}"
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"  HTTP {e.code}: {body[:200]}")
        return None
    except Exception as e:
        print(f"  Error: {e}")
        return None


def get_sprint_label(task):
    labels = task.get("labels") or ""
    for part in labels.split(","):
        part = part.strip()
        if part.startswith("sprint-"):
            return part
    return None


def main():
    print(f"Fetching tasks for project {PROJECT_ID}...")
    tasks = api_request("GET", f"/api/tasks?projectId={PROJECT_ID}")

    if not tasks:
        print("No tasks found or error fetching tasks.")
        return

    print(f"Found {len(tasks)} tasks.")
    updated = 0
    skipped = 0

    for task in tasks:
        sprint = get_sprint_label(task)
        if not sprint:
            skipped += 1
            continue

        due_date = SPRINT_DUE_DATES.get(sprint)
        if not due_date:
            print(f"  No due date mapping for {sprint} — skipping task '{task['title']}'")
            skipped += 1
            continue

        task_id = task["id"]
        current_due = task.get("dueDate")

        # Skip if already set to correct date
        if current_due and current_due.startswith(due_date):
            print(f"  ✓ Already set: {task['title']} ({sprint} → {due_date})")
            skipped += 1
            continue

        print(f"  → Updating: {task['title']} ({sprint} → {due_date})")
        result = api_request("PUT", f"/api/tasks/{task_id}", {"dueDate": due_date})

        if result:
            updated += 1
        else:
            print(f"    ✗ Failed to update task {task_id}")

        # Small delay to avoid rate limiting
        time.sleep(0.1)

    print(f"\nDone! Updated: {updated}, Skipped: {skipped}")


if __name__ == "__main__":
    main()
