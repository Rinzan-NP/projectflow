from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
    print("✓ Health check passed!")

def test_projects_crud():
    # 1. Create project
    res = client.post("/api/projects", json={
        "name": "FastAPI Pioneer",
        "key": "FAP",
        "company": "FastAPI Org",
        "description": "Built with FastAPI backend",
        "owner": "Rinzan"
    })
    assert res.status_code in [200, 201], res.text
    project = res.json()
    project_id = project["id"]
    print("✓ Created project:", project["name"], project["key"])

    # 2. List projects
    res = client.get("/api/projects")
    assert res.status_code == 200
    projects = res.json()
    assert any(p["key"] == "FAP" for p in projects)
    print(f"✓ Listed {len(projects)} projects")

    # 3. Stages
    res = client.get(f"/api/projects/{project_id}/stages")
    assert res.status_code == 200
    stages = res.json()
    assert len(stages) == 6
    print(f"✓ Default stages created ({len(stages)} stages)")

    # 4. Create item
    to_do_stage = next(s for s in stages if s["name"] == "To Do")
    res = client.post(f"/api/projects/{project_id}/items", json={
        "title": "Build FastAPI router",
        "stageId": to_do_stage["id"],
        "type": "TASK",
        "priority": "HIGH",
        "assignee": "Rinzan"
    })
    assert res.status_code in [200, 201], res.text
    item = res.json()
    assert item["humanId"] == "FAP-1"
    print("✓ Created item:", item["humanId"], item["title"])

    # 5. Create document
    res = client.post(f"/api/projects/{project_id}/documents", json={
        "title": "Architecture Spec",
        "category": "Architecture",
        "content": "# FastAPI Architecture\nHigh-performance Python backend."
    })
    assert res.status_code in [200, 201], res.text
    doc = res.json()
    assert doc["title"] == "Architecture Spec"
    print("✓ Created document:", doc["title"])

    print("\n🎉 ALL FASTAPI BACKEND TESTS PASSED!")

if __name__ == "__main__":
    test_health()
    test_projects_crud()
