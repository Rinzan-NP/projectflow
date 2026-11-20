from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from ..database import get_db
from ..models import Project, Stage, Item, Label, ItemLabel, ActivityLog, ChecklistItem, Comment, Attachment
from ..schemas import ItemCreate, ItemUpdate, ItemReorder, BulkAction

router = APIRouter(tags=["items"])

def serialize_item(item: Item):
    return {
        "id": item.id,
        "humanId": item.humanId,
        "itemNumber": item.itemNumber,
        "projectId": item.projectId,
        "stageId": item.stageId,
        "stage": {
            "id": item.stage.id,
            "name": item.stage.name,
            "color": item.stage.color,
            "isDoneStage": item.stage.isDoneStage,
            "order": item.stage.order,
        } if item.stage else None,
        "type": item.type,
        "title": item.title,
        "description": item.description,
        "priority": item.priority,
        "assignee": item.assignee,
        "reporter": item.reporter,
        "dueDate": item.dueDate,
        "estimateHours": item.estimateHours,
        "order": item.order,
        "parentId": item.parentId,
        "milestoneId": item.milestoneId,
        "severity": item.severity,
        "stepsToReproduce": item.stepsToReproduce,
        "expectedResult": item.expectedResult,
        "actualResult": item.actualResult,
        "environment": item.environment,
        "source": item.source,
        "userStory": item.userStory,
        "acceptanceCriteria": item.acceptanceCriteria,
        "requestedBy": item.requestedBy,
        "completedAt": item.completedAt,
        "createdAt": item.createdAt,
        "updatedAt": item.updatedAt,
        "labels": [{"id": l.id, "name": l.name, "color": l.color} for l in item.labels],
        "checklists": [
            {"id": c.id, "text": c.text, "isDone": c.isDone, "order": c.order}
            for c in item.checklists
        ],
        "comments": [
            {"id": c.id, "author": c.author, "body": c.body, "createdAt": c.createdAt}
            for c in item.comments
        ],
        "attachments": [
            {"id": a.id, "name": a.name, "url": a.url, "sizeBytes": a.sizeBytes, "mimeType": a.mimeType, "createdAt": a.createdAt}
            for a in item.attachments
        ],
        "activityLogs": [
            {"id": al.id, "author": al.author, "action": al.action, "fromValue": al.fromValue, "toValue": al.toValue, "createdAt": al.createdAt}
            for al in item.activityLogs
        ],
        "subtasks": [
            {
                "id": s.id,
                "humanId": s.humanId,
                "title": s.title,
                "type": s.type,
                "priority": s.priority,
                "stage": {"name": s.stage.name, "isDoneStage": s.stage.isDoneStage} if s.stage else None,
            }
            for s in item.subtasks
        ],
    }

@router.get("/api/projects/{id}/items")
def get_project_items(
    id: str,
    type: Optional[str] = None,
    priority: Optional[str] = None,
    assignee: Optional[str] = None,
    label: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter((Project.id == id) | (Project.key == id.upper())).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    query = db.query(Item).filter(Item.projectId == project.id)

    if type and type != "ALL":
        query = query.filter(Item.type == type)
    if priority and priority != "ALL":
        query = query.filter(Item.priority == priority)
    if assignee and assignee != "ALL":
        if assignee == "UNASSIGNED":
            query = query.filter(Item.assignee == None)
        else:
            query = query.filter(Item.assignee == assignee)
    if label and label != "ALL":
        query = query.join(Item.labels).filter(Label.name == label)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (Item.title.ilike(term)) | (Item.humanId.ilike(term)) | (Item.description.ilike(term))
        )

    items = query.order_by(Item.order.asc(), Item.createdAt.asc()).all()
    return [serialize_item(i) for i in items]

@router.post("/api/projects/{id}/items", status_code=status.HTTP_201_CREATED)
def create_project_item(id: str, data: ItemCreate, db: Session = Depends(get_db)):
    project = db.query(Project).filter((Project.id == id) | (Project.key == id.upper())).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    stage = db.query(Stage).filter(Stage.id == data.stageId).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Stage not found")

    # Increment itemCounter
    project.itemCounter += 1
    item_number = project.itemCounter
    human_id = f"{project.key}-{item_number}"

    # Calculate order
    last_item = db.query(Item).filter(Item.stageId == stage.id).order_by(Item.order.desc()).first()
    order = (last_item.order + 1.0) if last_item else 1.0

    completed_at = datetime.utcnow() if stage.isDoneStage else None

    item = Item(
        humanId=human_id,
        itemNumber=item_number,
        projectId=project.id,
        stageId=stage.id,
        type=data.type or "TASK",
        title=data.title.strip(),
        description=data.description,
        priority=data.priority or "MEDIUM",
        assignee=data.assignee,
        reporter=data.reporter or "Alex Rivers",
        dueDate=data.dueDate,
        estimateHours=data.estimateHours,
        order=order,
        parentId=data.parentId,
        milestoneId=data.milestoneId,
        severity=data.severity,
        stepsToReproduce=data.stepsToReproduce,
        expectedResult=data.expectedResult,
        actualResult=data.actualResult,
        environment=data.environment,
        source=data.source or "INTERNAL",
        userStory=data.userStory,
        acceptanceCriteria=data.acceptanceCriteria,
        requestedBy=data.requestedBy,
        completedAt=completed_at,
    )
    db.add(item)
    db.flush()

    # Handle labels
    if data.labels:
        for lbl_name in data.labels:
            label = db.query(Label).filter(Label.projectId == project.id, Label.name == lbl_name).first()
            if not label:
                label = Label(projectId=project.id, name=lbl_name, color="#64748b")
                db.add(label)
                db.flush()
            item_label = ItemLabel(itemId=item.id, labelId=label.id)
            db.add(item_label)

    # Activity log
    log = ActivityLog(
        itemId=item.id,
        author=data.reporter or "Alex Rivers",
        action="created this item",
    )
    db.add(log)

    db.commit()
    db.refresh(item)
    return serialize_item(item)

@router.get("/api/items/{id}")
def get_item(id: str, db: Session = Depends(get_db)):
    item = db.query(Item).filter((Item.id == id) | (Item.humanId == id.upper())).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return serialize_item(item)

@router.patch("/api/items/{id}")
def update_item(id: str, data: ItemUpdate, db: Session = Depends(get_db)):
    item = db.query(Item).filter((Item.id == id) | (Item.humanId == id.upper())).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    update_dict = data.dict(exclude_unset=True)

    # If stageId changed, check done status & log activity
    if "stageId" in update_dict and update_dict["stageId"] != item.stageId:
        new_stage = db.query(Stage).filter(Stage.id == update_dict["stageId"]).first()
        old_stage_name = item.stage.name if item.stage else "Unknown"
        if new_stage:
            if new_stage.isDoneStage and not item.completedAt:
                item.completedAt = datetime.utcnow()
            elif not new_stage.isDoneStage:
                item.completedAt = None

            log = ActivityLog(
                itemId=item.id,
                author=item.reporter or "Alex Rivers",
                action="moved stage",
                fromValue=old_stage_name,
                toValue=new_stage.name,
            )
            db.add(log)

    # Handle labels update if provided
    if "labels" in update_dict and update_dict["labels"] is not None:
        db.query(ItemLabel).filter(ItemLabel.itemId == item.id).delete()
        for lbl_name in update_dict["labels"]:
            label = db.query(Label).filter(Label.projectId == item.projectId, Label.name == lbl_name).first()
            if not label:
                label = Label(projectId=item.projectId, name=lbl_name, color="#64748b")
                db.add(label)
                db.flush()
            db.add(ItemLabel(itemId=item.id, labelId=label.id))
        del update_dict["labels"]

    for field, val in update_dict.items():
        setattr(item, field, val)

    db.commit()
    db.refresh(item)
    return serialize_item(item)

@router.delete("/api/items/{id}")
def delete_item(id: str, db: Session = Depends(get_db)):
    item = db.query(Item).filter((Item.id == id) | (Item.humanId == id.upper())).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)
    db.commit()
    return {"message": "Item deleted"}

@router.post("/api/items/reorder")
def reorder_item(payload: ItemReorder, db: Session = Depends(get_db)):
    item = db.query(Item).filter(Item.id == payload.itemId).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    stage_changed = item.stageId != payload.targetStageId
    old_stage_name = item.stage.name if item.stage else ""

    item.stageId = payload.targetStageId
    item.order = payload.newOrder

    target_stage = db.query(Stage).filter(Stage.id == payload.targetStageId).first()
    if target_stage:
        if target_stage.isDoneStage and not item.completedAt:
            item.completedAt = datetime.utcnow()
        elif not target_stage.isDoneStage:
            item.completedAt = None

        if stage_changed:
            log = ActivityLog(
                itemId=item.id,
                author=item.assignee or item.reporter or "Alex Rivers",
                action="moved stage",
                fromValue=old_stage_name,
                toValue=target_stage.name,
            )
            db.add(log)

    db.commit()
    db.refresh(item)
    return serialize_item(item)

@router.post("/api/items/bulk")
def bulk_items(payload: BulkAction, db: Session = Depends(get_db)):
    items = db.query(Item).filter(Item.id.in_(payload.itemIds)).all()
    if not items:
        return {"updated": 0}

    if payload.action == "delete":
        for item in items:
            db.delete(item)
        db.commit()
        return {"deleted": len(items)}

    for item in items:
        if payload.action == "change_stage" and payload.stageId:
            item.stageId = payload.stageId
        elif payload.action == "change_priority" and payload.priority:
            item.priority = payload.priority
        elif payload.action == "change_assignee":
            item.assignee = payload.assignee

    db.commit()
    return {"updated": len(items)}
