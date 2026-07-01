#!/usr/bin/env python3
import subprocess
import json
import sys
import argparse
from datetime import datetime
from zoneinfo import ZoneInfo

APP_NAME = "israeli-whist-backend"
TIMEZONE = "Asia/Jerusalem"

def run_command(args):
    result = subprocess.run(args, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error running command {' '.join(args)}: {result.stderr}", file=sys.stderr)
        return None
    return result.stdout

def main():
    parser = argparse.ArgumentParser(description="Manage Fly.io machine schedules for Israeli Whist.")
    parser.add_argument("action", nargs="?", choices=["start", "stop", "auto"], default="auto",
                        help="Action to perform: 'start' (force start all), 'stop' (force stop all), or 'auto' (schedule-based, default)")
    args = parser.parse_args()

    # 1. Get current Israel Time
    tz = ZoneInfo(TIMEZONE)
    now = datetime.now(tz)
    print(f"Current time in {TIMEZONE}: {now.strftime('%Y-%m-%d %H:%M:%S %Z')}")

    # Determine desired state (started vs stopped)
    if args.action == "start":
        should_be_active = True
        print("Action override: Force starting all machines...")
    elif args.action == "stop":
        should_be_active = False
        print("Action override: Force stopping all machines...")
    else:
        # Start hour: 10:00 AM (10 * 60 = 600 minutes)
        # End hour: 11:59 PM (23 * 60 + 59 = 1439 minutes)
        current_minutes = now.hour * 60 + now.minute
        should_be_active = (600 <= current_minutes <= 1439)
        print("Running automatic schedule checks...")

    # 2. Get list of Fly machines
    stdout = run_command(["fly", "machine", "list", "-a", APP_NAME, "--json"])
    if not stdout:
        print("Failed to fetch Fly machines list.", file=sys.stderr)
        sys.exit(1)

    try:
        machines = json.loads(stdout)
    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON: {e}", file=sys.stderr)
        sys.exit(1)

    if should_be_active:
        print("Ensuring all machines are started...")
        for m in machines:
            m_id = m.get("id")
            state = m.get("state")
            if state != "started":
                print(f"Starting machine {m_id} (current state: {state})...")
                run_command(["fly", "machine", "start", m_id, "-a", APP_NAME])
            else:
                print(f"Machine {m_id} is already running.")
    else:
        print("Ensuring all machines are stopped...")
        for m in machines:
            m_id = m.get("id")
            state = m.get("state")
            if state == "started":
                print(f"Stopping machine {m_id} (current state: {state})...")
                run_command(["fly", "machine", "stop", m_id, "-a", APP_NAME])
            else:
                print(f"Machine {m_id} is already stopped.")

if __name__ == "__main__":
    main()
