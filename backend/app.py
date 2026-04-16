from flask import Flask, request, jsonify
from google.oauth2 import service_account
from googleapiclient.discovery import build
from dotenv import load_dotenv
import re
import time
import os

app = Flask(__name__)

load_dotenv()


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    return response


ROOT_FOLDER_ID = os.getenv("ROOT_FOLDER_ID")

SERVICE_ACCOUNT_FILE = "better-file-search-sa.json"
SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]

creds = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=SCOPES
)

drive_service = build("drive", "v3", credentials=creds)

CACHE_TTL_SECONDS = 10 * 60
response_cache = {}


def get_cached_response(cache_key):
    cached_entry = response_cache.get(cache_key)

    if not cached_entry:
        return None

    cached_at, payload, status_code = cached_entry

    if time.monotonic() - cached_at > CACHE_TTL_SECONDS:
        response_cache.pop(cache_key, None)
        return None

    return jsonify(payload), status_code


def set_cached_response(cache_key, payload, status_code=200):
    response_cache[cache_key] = (time.monotonic(), payload, status_code)
    return jsonify(payload), status_code


def list_folders(parent_id):
    results = (
        drive_service.files()
        .list(
            q=f"'{parent_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields="files(id, name)",
        )
        .execute()
    )

    return results.get("files", [])


def list_files(folder_id):
    results = (
        drive_service.files()
        .list(
            q=f"'{folder_id}' in parents and trashed=false",
            fields="files(id, name, createdTime)",
        )
        .execute()
    )

    return results.get("files", [])


@app.route("/branches")
def get_branches():
    cache_key = "branches"
    cached_response = get_cached_response(cache_key)

    if cached_response:
        return cached_response

    folders = list_folders(ROOT_FOLDER_ID)

    branches = [{"name": f["name"], "folder_id": f["id"]} for f in folders]

    return set_cached_response(
        cache_key, {"count": len(branches), "branches": branches}
    )


@app.route("/api/branches")
def get_api_branches():
    return get_branches()


@app.route("/builds")
def get_builds():
    branch = request.args.get("branch")
    cache_key = f"builds:{branch}"
    cached_response = get_cached_response(cache_key)

    if cached_response:
        return cached_response

    if not branch:
        return jsonify({"error": "Missing branch parameter"}), 400

    folders = list_folders(ROOT_FOLDER_ID)
    branch_folder = next((f for f in folders if f["name"] == branch), None)

    if not branch_folder:
        return jsonify({"error": "Branch not found"}), 404

    commit_folders = list_folders(branch_folder["id"])

    pattern = re.compile(
        r"Better\s+File\s+Search\s+Setup\s+(\d+\.\d+\.\d+)\.exe$", re.IGNORECASE
    )

    matched = []

    for commit_folder in commit_folders:
        files = list_files(commit_folder["id"])

        for f in files:
            name = f["name"].strip()
            match = pattern.match(name)

            if match:
                version = match.group(1)

                matched.append(
                    {
                        "version": version,
                        "commit_id": commit_folder["name"],
                        "file_id": f["id"],
                        "file_name": name,
                        "date_created": f["createdTime"],
                        "download_url": f"https://drive.google.com/uc?id={f['id']}&export=download",
                    }
                )

    return set_cached_response(
        cache_key, {"branch": branch, "count": len(matched), "builds": matched}
    )


@app.route("/api/builds")
def get_api_builds():
    return get_builds()


if __name__ == "__main__":
    app.run(debug=True)
