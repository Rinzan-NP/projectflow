import io
import csv
import json
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Project, Item, Stage, Attachment, Label, ActivityLog

router = APIRouter(prefix="/api/dev-kit", tags=["devkit"])

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    projects_count = db.query(Project).count()
    items_count = db.query(Item).count()
    stages_count = db.query(Stage).count()
    attachments_count = db.query(Attachment).count()
    labels_count = db.query(Label).count()
    activity_count = db.query(ActivityLog).count()

    tasks_count = db.query(Item).filter(Item.type == "TASK").count()
    bugs_count = db.query(Item).filter(Item.type == "BUG").count()
    features_count = db.query(Item).filter(Item.type == "FEATURE").count()

    return {
        "projects": projects_count,
        "items": items_count,
        "stages": stages_count,
        "attachments": attachments_count,
        "labels": labels_count,
        "activities": activity_count,
        "breakdown": {
            "tasks": tasks_count,
            "bugs": bugs_count,
            "features": features_count,
        },
    }

@router.get("/export")
def export_data(format: str = Query("json"), db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    data = []

    for p in projects:
        data.append({
            "id": p.id,
            "name": p.name,
            "key": p.key,
            "company": p.company,
            "status": p.status,
            "owner": p.owner,
            "createdAt": str(p.createdAt),
            "itemCount": len(p.items),
            "stages": [s.name for s in p.stages],
        })

    if format == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=["id", "name", "key", "company", "status", "owner", "createdAt", "itemCount", "stages"])
        writer.writeheader()
        for row in data:
            row_copy = row.copy()
            row_copy["stages"] = ", ".join(row_copy["stages"])
            writer.writerow(row_copy)

        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="projects-export.csv"'},
        )

    return Response(
        content=json.dumps(data, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="projects-export.json"'},
    )
