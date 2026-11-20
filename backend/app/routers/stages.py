from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from ..database import get_db
from ..models import Project, Stage, Item
from ..schemas import StageCreate, StageUpdate

router = APIRouter(tags=["stages"])

class StageReorderItem(BaseModel):
    id: str
    order: int

class StageReorderRequest(BaseModel):
    stages: List[StageReorderItem]

@router.get("/api/projects/{id}/stages")
def get_project_stages(id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter((Project.id == id) | (Project.key == id.upper())).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    stages = db.query(Stage).filter(Stage.projectId == project.id).order_by(Stage.order.asc()).all()
    return stages

@router.post("/api/projects/{id}/stages", status_code=status.HTTP_201_CREATED)
def create_stage(id: str, data: StageCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter((Project.id == id) | (Project.key == id.upper())).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    last_stage = db.query(Stage).filter(Stage.projectId == project.id).order_by(Stage.order.desc()).first()
    order = (last_stage.order + 1) if last_stage else 0

    stage = Stage(
        projectId=project.id,
        name=data.name.strip(),
        order=data.order if data.order is not None else order,
        color=data.color or "#64748b",
        isDoneStage=data.isDoneStage or False,
        wipLimit=data.wipLimit,
    )
    db.add(stage)
    db.commit()
    db.refresh(stage)
    return stage

@router.patch("/api/projects/{id}/stages")
def reorder_stages(id: str, payload: StageReorderRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter((Project.id == id) | (Project.key == id.upper())).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for item in payload.stages:
        stage = db.query(Stage).filter(Stage.id == item.id, Stage.projectId == project.id).first()
        if stage:
            stage.order = item.order

    db.commit()
    stages = db.query(Stage).filter(Stage.projectId == project.id).order_by(Stage.order.asc()).all()
    return stages

@router.patch("/api/stages/{id}")
def update_stage(id: str, data: StageUpdate, db: Session = Depends(get_db)):
    stage = db.query(Stage).filter(Stage.id == id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    update_dict = data.dict(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(stage, field, val)

    db.commit()
    db.refresh(stage)
    return stage

@router.delete("/api/stages/{id}")
def delete_stage(id: str, move_to: Optional[str] = None, db: Session = Depends(get_db)):
    stage = db.query(Stage).filter(Stage.id == id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    items = db.query(Item).filter(Item.stageId == stage.id).all()
    if items:
        if not move_to:
            raise HTTPException(
                status_code=400,
                detail="Stage contains items. Specify move_to query param to move items first."
            )
        target_stage = db.query(Stage).filter(Stage.id == move_to).first()
        if not target_stage:
            raise HTTPException(status_code=400, detail="Target stage not found")

        for item in items:
            item.stageId = target_stage.id

    db.delete(stage)
    db.commit()
    return {"message": "Stage deleted"}
