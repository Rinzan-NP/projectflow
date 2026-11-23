from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from ..database import get_db
from ..models import Project, Stage, Item, Label, ItemLabel, ActivityLog, ChecklistItem, Comment, Attachment
from ..schemas import ItemCreate, ItemUpdate, ItemReorder, BulkAction, ItemMoveProject

router = APIRouter(tags=["items"])

def serialize_item(item: Item):
    return {
        "id": item.id,
        "humanId": item.humanId,
        "itemNumber": item.itemNumber,
        "projectId": item.projectId,
        "project": {
            "id": item.project.id,
            "key": item.project.key,
            "name": item.project.name,
            "color": item.project.color,
            "company": getattr(item.project, "company", None),
            "priority": getattr(item.project, "priority", "MEDIUM") or "MEDIUM",
        } if item.project else None,
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

@router.get("/api/items")
def get_all_items(
    projectId: Optional[str] = None,
    projectKey: Optional[str] = None,
    company: Optional[str] = None,
    type: Optional[str] = None,
    priority: Optional[str] = None,
    assignee: Optional[str] = None,
    label: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Item).join(Project, Item.projectId == Project.id)

    if projectId and projectId != "ALL":
        query = query.filter((Item.projectId == projectId) | (Project.key == projectId.upper()))
    if projectKey and projectKey != "ALL":
        query = query.filter(Project.key == projectKey.upper())
    if company and company != "ALL":
        query = query.filter(Project.company == company)
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
    if not project and data.parentId:
        parent = db.query(Item).filter(Item.id == data.parentId).first()
        if parent:
            project = parent.project

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    stage = db.query(Stage).filter(Stage.id == data.stageId).first()
    if not stage:
        # Fallback to the project's first stage if unified or invalid stage ID was provided
        stage = db.query(Stage).filter(Stage.projectId == project.id).order_by(Stage.order.asc()).first()

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
        reporter=data.reporter or "Rinzan",
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
        author=data.reporter or "Rinzan",
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

def move_item_to_project(item: Item, target_proj_id_or_key: str, db: Session, author: Optional[str] = None):
    target_proj = db.query(Project).filter(
        (Project.id == target_proj_id_or_key) | (Project.key == target_proj_id_or_key.upper())
    ).first()
    if not target_proj:
        raise HTTPException(status_code=404, detail="Target project not found")

    if target_proj.id == item.projectId:
        return item

    old_proj_name = item.project.name if item.project else "Unknown"
    old_human_id = item.humanId

    # 1. Update project and humanId
    target_proj.itemCounter += 1
    item.projectId = target_proj.id
    item.itemNumber = target_proj.itemCounter
    item.humanId = f"{target_proj.key}-{item.itemNumber}"

    # 2. Stage mapping: Find equivalent stage in target project
    target_stages = db.query(Stage).filter(Stage.projectId == target_proj.id).order_by(Stage.order.asc()).all()
    target_stage = None
    if item.stage and target_stages:
        for s in target_stages:
            if s.name.strip().lower() == item.stage.name.strip().lower():
                target_stage = s
                break
        if not target_stage and item.stage.isDoneStage:
            for s in target_stages:
                if s.isDoneStage:
                    target_stage = s
                    break
    if not target_stage and target_stages:
        target_stage = target_stages[0]

    if target_stage:
        item.stageId = target_stage.id
        if target_stage.isDoneStage and not item.completedAt:
            item.completedAt = datetime.utcnow()
        elif not target_stage.isDoneStage:
            item.completedAt = None

    # 3. Update all subtasks to target project
    for sub in item.subtasks:
        target_proj.itemCounter += 1
        sub.projectId = target_proj.id
        sub.itemNumber = target_proj.itemCounter
        sub.humanId = f"{target_proj.key}-{sub.itemNumber}"

    # 4. Re-link labels to the new project so label names are preserved
    if item.labels:
        old_label_names = [l.name for l in item.labels]
        db.query(ItemLabel).filter(ItemLabel.itemId == item.id).delete()
        db.flush()
        for lbl_name in old_label_names:
            lbl = db.query(Label).filter(Label.projectId == target_proj.id, Label.name == lbl_name).first()
            if not lbl:
                lbl = Label(projectId=target_proj.id, name=lbl_name, color="#64748b")
                db.add(lbl)
                db.flush()
            db.add(ItemLabel(itemId=item.id, labelId=lbl.id))

    # 5. Log activity
    log = ActivityLog(
        itemId=item.id,
        author=author or item.reporter or "User",
        action="moved project",
        fromValue=f"{old_proj_name} ({old_human_id})",
        toValue=f"{target_proj.name} ({item.humanId})",
    )
    db.add(log)
    return item

@router.patch("/api/items/{id}")
def update_item(id: str, data: ItemUpdate, db: Session = Depends(get_db)):
    item = db.query(Item).filter((Item.id == id) | (Item.humanId == id.upper())).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    update_dict = data.dict(exclude_unset=True)

    # Handle project move if projectId is provided
    if "projectId" in update_dict:
        target_proj_val = update_dict.pop("projectId")
        if target_proj_val and target_proj_val != item.projectId:
            move_item_to_project(item, target_proj_val, db, author=item.reporter)

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
                author=item.reporter or "Rinzan",
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

    # Handle checklist operations
    if "addChecklistText" in update_dict and update_dict["addChecklistText"]:
        chk_text = str(update_dict.pop("addChecklistText")).strip()
        if chk_text:
            existing_orders = [c.order for c in item.checklists]
            max_order = max(existing_orders, default=0)
            new_chk = ChecklistItem(
                itemId=item.id,
                text=chk_text,
                isDone=False,
                order=int(max_order + 1),
            )
            db.add(new_chk)
    elif "addChecklistText" in update_dict:
        update_dict.pop("addChecklistText")

    if "toggleChecklistId" in update_dict and update_dict["toggleChecklistId"]:
        chk_id = update_dict.pop("toggleChecklistId")
        chk = db.query(ChecklistItem).filter(ChecklistItem.id == chk_id, ChecklistItem.itemId == item.id).first()
        if chk:
            chk.isDone = not chk.isDone
    elif "toggleChecklistId" in update_dict:
        update_dict.pop("toggleChecklistId")

    if "deleteChecklistId" in update_dict and update_dict["deleteChecklistId"]:
        chk_id = update_dict.pop("deleteChecklistId")
        db.query(ChecklistItem).filter(ChecklistItem.id == chk_id, ChecklistItem.itemId == item.id).delete()
    elif "deleteChecklistId" in update_dict:
        update_dict.pop("deleteChecklistId")

    # Handle comments
    if "newCommentBody" in update_dict and update_dict["newCommentBody"]:
        com_body = str(update_dict.pop("newCommentBody")).strip()
        com_author = update_dict.pop("commentAuthor", None) or item.reporter or "User"
        if com_body:
            new_com = Comment(
                itemId=item.id,
                author=com_author,
                body=com_body,
            )
            db.add(new_com)
    elif "newCommentBody" in update_dict:
        update_dict.pop("newCommentBody")

    if "commentAuthor" in update_dict:
        update_dict.pop("commentAuthor")

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

@router.post("/api/items/{id}/move")
def move_item_endpoint(id: str, payload: ItemMoveProject, db: Session = Depends(get_db)):
    item = db.query(Item).filter((Item.id == id) | (Item.humanId == id.upper())).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    move_item_to_project(item, payload.projectId, db, author=payload.author)
    db.commit()
    db.refresh(item)
    return serialize_item(item)

@router.post("/api/items/reorder")
@router.put("/api/items/reorder")
def reorder_item(payload: ItemReorder, db: Session = Depends(get_db)):
    if payload.items:
        for entry in payload.items:
            it = db.query(Item).filter(Item.id == (entry.get("id") or entry.get("itemId"))).first()
            if it:
                if "stageId" in entry and entry["stageId"]:
                    it.stageId = entry["stageId"]
                if "order" in entry and entry["order"] is not None:
                    it.order = float(entry["order"])
        db.commit()
        return {"message": "Items reordered successfully"}

    if not payload.itemId or not payload.targetStageId:
        return {"message": "No item to reorder"}

    item = db.query(Item).filter(Item.id == payload.itemId).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    stage_changed = item.stageId != payload.targetStageId
    old_stage_name = item.stage.name if item.stage else ""

    item.stageId = payload.targetStageId
    item.order = payload.newOrder if payload.newOrder is not None else item.order

    target_stage = db.query(Stage).filter(Stage.id == payload.targetStageId).first()
    if target_stage:
        if target_stage.isDoneStage and not item.completedAt:
            item.completedAt = datetime.utcnow()
        elif not target_stage.isDoneStage:
            item.completedAt = None

        if stage_changed:
            log = ActivityLog(
                itemId=item.id,
                author=item.assignee or item.reporter or "Rinzan",
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

@router.post("/api/items/{id}/checklists")
def add_item_checklist(id: str, payload: dict, db: Session = Depends(get_db)):
    item = db.query(Item).filter((Item.id == id) | (Item.humanId == id.upper())).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    text = (payload.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Checklist text cannot be empty")

    existing_orders = [c.order for c in item.checklists]
    max_order = max(existing_orders, default=0)
    chk = ChecklistItem(
        itemId=item.id,
        text=text,
        isDone=False,
        order=int(max_order + 1),
    )
    db.add(chk)
    db.commit()
    db.refresh(item)
    return serialize_item(item)

@router.patch("/api/checklists/{chk_id}")
def update_checklist_item(chk_id: str, payload: dict, db: Session = Depends(get_db)):
    chk = db.query(ChecklistItem).filter(ChecklistItem.id == chk_id).first()
    if not chk:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    if "isDone" in payload:
        chk.isDone = bool(payload["isDone"])
    if "text" in payload and str(payload["text"]).strip():
        chk.text = str(payload["text"]).strip()

    db.commit()
    item = db.query(Item).filter(Item.id == chk.itemId).first()
    return serialize_item(item) if item else {"id": chk.id, "isDone": chk.isDone, "text": chk.text}

@router.delete("/api/checklists/{chk_id}")
def delete_checklist_item(chk_id: str, db: Session = Depends(get_db)):
    chk = db.query(ChecklistItem).filter(ChecklistItem.id == chk_id).first()
    if not chk:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    item_id = chk.itemId
    db.delete(chk)
    db.commit()
    item = db.query(Item).filter(Item.id == item_id).first()
    return serialize_item(item) if item else {"message": "Deleted"}

@router.post("/api/items/{id}/subtasks")
def add_item_subtask(id: str, payload: dict, db: Session = Depends(get_db)):
    parent = db.query(Item).filter((Item.id == id) | (Item.humanId == id.upper())).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent item not found")

    title = (payload.get("title") or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Subtask title cannot be empty")

    project = parent.project
    project.itemCounter += 1
    item_number = project.itemCounter
    human_id = f"{project.key}-{item_number}"

    stage_id = payload.get("stageId")
    stage = db.query(Stage).filter(Stage.id == stage_id).first() if stage_id else None
    if not stage:
        stage = db.query(Stage).filter(Stage.projectId == project.id).order_by(Stage.order.asc()).first()

    subtask = Item(
        humanId=human_id,
        itemNumber=item_number,
        projectId=project.id,
        stageId=stage.id if stage else parent.stageId,
        type="TASK",
        title=title,
        priority=payload.get("priority") or "MEDIUM",
        assignee=payload.get("assignee"),
        reporter=payload.get("reporter") or parent.reporter or "Rinzan",
        order=1.0,
        parentId=parent.id,
    )
    db.add(subtask)
    db.commit()
    db.refresh(parent)
    return serialize_item(parent)
