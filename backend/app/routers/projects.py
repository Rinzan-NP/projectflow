from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from ..database import get_db
from ..models import Project, Stage, Item
from ..schemas import ProjectCreate, ProjectUpdate, StageCreate, StageUpdate

router = APIRouter(prefix="/api/projects", tags=["projects"])

DEFAULT_STAGES = [
    {"name": "Backlog", "order": 0, "color": "#94a3b8", "isDoneStage": False, "wipLimit": None},
    {"name": "To Do", "order": 1, "color": "#38bdf8", "isDoneStage": False, "wipLimit": 10},
    {"name": "In Progress", "order": 2, "color": "#f59e0b", "isDoneStage": False, "wipLimit": 5},
    {"name": "In Review", "order": 3, "color": "#a855f7", "isDoneStage": False, "wipLimit": 5},
    {"name": "Testing", "order": 4, "color": "#ec4899", "isDoneStage": False, "wipLimit": None},
    {"name": "Done", "order": 5, "color": "#10b981", "isDoneStage": True, "wipLimit": None},
]

@router.get("")
def get_projects(
    status: Optional[str] = None,
    company: Optional[str] = None,
    q: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Project)
    if status and status != "ALL":
        query = query.filter(Project.status == status)
    if company and company != "ALL":
        query = query.filter(Project.company == company)
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(
            (Project.name.ilike(term)) | (Project.key.ilike(term)) | (Project.description.ilike(term))
        )

    projects = query.order_by(Project.createdAt.desc()).all()
    now = datetime.utcnow()

    result = []
    for p in projects:
        done_stage_ids = {s.id for s in p.stages if s.isDoneStage}
        total_items = len(p.items)
        done_items = sum(1 for i in p.items if i.stageId in done_stage_ids)
        progress = round((done_items / total_items) * 100) if total_items > 0 else 0

        open_bugs = sum(1 for i in p.items if i.type == "BUG" and i.stageId not in done_stage_ids)
        open_features = sum(1 for i in p.items if i.type == "FEATURE" and i.stageId not in done_stage_ids)
        overdue = sum(
            1 for i in p.items
            if i.dueDate and i.dueDate < now and i.stageId not in done_stage_ids
        )

        stages_data = [
            {
                "id": s.id,
                "projectId": s.projectId,
                "name": s.name,
                "order": s.order,
                "color": s.color,
                "isDoneStage": s.isDoneStage,
                "wipLimit": s.wipLimit,
                "createdAt": s.createdAt,
                "updatedAt": s.updatedAt,
            }
            for s in p.stages
        ]

        result.append({
            "id": p.id,
            "name": p.name,
            "key": p.key,
            "company": p.company,
            "description": p.description,
            "color": p.color,
            "icon": p.icon,
            "status": p.status,
            "priority": getattr(p, "priority", "MEDIUM") or "MEDIUM",
            "startDate": p.startDate,
            "targetDate": p.targetDate,
            "owner": p.owner,
            "members": p.members,
            "itemCounter": p.itemCounter,
            "createdAt": p.createdAt,
            "updatedAt": p.updatedAt,
            "stages": stages_data,
            "items": [],
            "totalItems": total_items,
            "doneItems": done_items,
            "progressPercent": progress,
            "openBugsCount": open_bugs,
            "openFeaturesCount": open_features,
            "overdueCount": overdue,
        })

    return result

@router.post("", status_code=status.HTTP_201_CREATED)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    key = data.key.strip().upper()
    existing = db.query(Project).filter(Project.key == key).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'Project key "{key}" is already taken',
        )

    project = Project(
        name=data.name.strip(),
        key=key,
        company=data.company or "Company 1",
        description=data.description,
        color=data.color or "#3b82f6",
        icon=data.icon or "FolderKanban",
        status=data.status or "ACTIVE",
        priority=(data.priority or "MEDIUM").upper(),
        startDate=data.startDate,
        targetDate=data.targetDate,
        owner=data.owner or "Rinzan",
        members=data.members or "Sam Taylor,Jordan Lee",
        itemCounter=0,
    )
    db.add(project)
    db.flush()

    # Create default stages
    for s in DEFAULT_STAGES:
        stage = Stage(
            projectId=project.id,
            name=s["name"],
            order=s["order"],
            color=s["color"],
            isDoneStage=s["isDoneStage"],
            wipLimit=s["wipLimit"],
        )
        db.add(stage)

    db.commit()
    db.refresh(project)
    return project

@router.get("/{id}")
def get_project(id: str, db: Session = Depends(get_db)):
    project = (
        db.query(Project)
        .filter((Project.id == id) | (Project.key == id.upper()))
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    done_stage_ids = {s.id for s in project.stages if s.isDoneStage}
    total_items = len(project.items)
    done_items = sum(1 for i in project.items if i.stageId in done_stage_ids)
    progress = round((done_items / total_items) * 100) if total_items > 0 else 0

    return {
        "id": project.id,
        "name": project.name,
        "key": project.key,
        "company": project.company,
        "description": project.description,
        "color": project.color,
        "icon": project.icon,
        "status": project.status,
        "priority": getattr(project, "priority", "MEDIUM") or "MEDIUM",
        "startDate": project.startDate,
        "targetDate": project.targetDate,
        "owner": project.owner,
        "members": project.members,
        "itemCounter": project.itemCounter,
        "createdAt": project.createdAt,
        "updatedAt": project.updatedAt,
        "stages": project.stages,
        "totalItems": total_items,
        "doneItems": done_items,
        "progressPercent": progress,
    }

@router.patch("/{id}")
def update_project(id: str, data: ProjectUpdate, db: Session = Depends(get_db)):
    project = (
        db.query(Project)
        .filter((Project.id == id) | (Project.key == id.upper()))
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_dict = data.dict(exclude_unset=True)
    if "priority" in update_dict and update_dict["priority"]:
        update_dict["priority"] = update_dict["priority"].upper()
    for field, val in update_dict.items():
        setattr(project, field, val)

    db.commit()
    db.refresh(project)
    return project

@router.delete("/{id}")
def delete_project(id: str, db: Session = Depends(get_db)):
    project = (
        db.query(Project)
        .filter((Project.id == id) | (Project.key == id.upper()))
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    db.delete(project)
    db.commit()
    return {"message": "Project deleted successfully"}
