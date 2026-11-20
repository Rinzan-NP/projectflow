import urllib.request
import json

RENDER_URL = "https://projectflow-api-sgm3.onrender.com"

projects_to_seed = [
    {
        "name": "AutoPioneer",
        "key": "AU",
        "company": "Solinify",
        "description": "Automated workflow and pioneer operations platform.",
        "color": "#f43f5e",
        "icon": "FolderKanban",
        "status": "ACTIVE",
        "owner": "Rinzan",
        "members": "Alex Rivers,Sam Taylor,Jordan Lee",
    },
    {
        "name": "Account Bloom",
        "key": "AB",
        "company": "Solinify",
        "description": "Finance and client accounting management system.",
        "color": "#64748b",
        "icon": "FolderKanban",
        "status": "ACTIVE",
        "owner": "Rinzan",
        "members": "Alex Rivers,Sam Taylor,Jordan Lee",
    },
    {
        "name": "Quality ERP",
        "key": "QE",
        "company": "Solinify",
        "description": "Enterprise resource planning and quality tracking.",
        "color": "#06b6d4",
        "icon": "FolderKanban",
        "status": "ACTIVE",
        "owner": "Rinzan",
        "members": "Alex Rivers,Sam Taylor,Jordan Lee",
    },
    {
        "name": "First Medical Pulse",
        "key": "FMP",
        "company": "Solinify",
        "description": "Healthcare patient records and triage system.",
        "color": "#06b6d4",
        "icon": "FolderKanban",
        "status": "ACTIVE",
        "owner": "Rinzan",
        "members": "Alex Rivers,Sam Taylor,Jordan Lee",
    },
    {
        "name": "Cravio",
        "key": "G-1",
        "company": "Gingr",
        "description": "Culinary logistics and order fulfillment hub.",
        "color": "#10b981",
        "icon": "FolderKanban",
        "status": "ACTIVE",
        "owner": "Rinzan",
        "members": "Alex Rivers,Sam Taylor,Jordan Lee",
    },
]

def main():
    # Check existing projects on Render
    req = urllib.request.Request(f"{RENDER_URL}/api/projects", headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req) as response:
            existing = json.loads(response.read().decode())
            existing_keys = {p["key"] for p in existing}
            print(f"Existing project keys on Render: {existing_keys}")
    except Exception as e:
        print(f"Error checking projects: {e}")
        existing_keys = set()

    for p in projects_to_seed:
        if p["key"] in existing_keys:
            print(f"Project {p['key']} already exists on Render.")
            continue
        print(f"Creating project {p['key']} on Render...")
        data = json.dumps(p).encode('utf-8')
        post_req = urllib.request.Request(
            f"{RENDER_URL}/api/projects",
            data=data,
            headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(post_req) as resp:
                created = json.loads(resp.read().decode())
                print(f"Created {created.get('name')} ({created.get('key')}) successfully!")
        except Exception as e:
            print(f"Failed to create {p['key']}: {e}")

if __name__ == "__main__":
    main()
