from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class StageBase(BaseModel):
    name: str
    order: Optional[int] = 0
    color: Optional[str] = "#64748b"
    isDoneStage: Optional[bool] = False
    wipLimit: Optional[int] = None

class StageCreate(StageBase):
    pass

class StageUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    isDoneStage: Optional[bool] = None
    wipLimit: Optional[int] = None

class StageOut(StageBase):
    id: str
    projectId: str
    createdAt: datetime
    updatedAt: datetime
    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    name: str
    key: str
    company: Optional[str] = "Company 1"
    description: Optional[str] = None
    color: Optional[str] = "#3b82f6"
    icon: Optional[str] = "FolderKanban"
    status: Optional[str] = "ACTIVE"
    priority: Optional[str] = "MEDIUM"
    startDate: Optional[datetime] = None
    targetDate: Optional[datetime] = None
    owner: Optional[str] = "Rinzan"
    members: Optional[str] = "Sam Taylor,Jordan Lee"

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    startDate: Optional[datetime] = None
    targetDate: Optional[datetime] = None
    owner: Optional[str] = None
    members: Optional[str] = None

class LabelOut(BaseModel):
    id: str
    name: str
    color: str
    class Config:
        from_attributes = True

class ItemBase(BaseModel):
    title: str
    type: Optional[str] = "TASK"
    description: Optional[str] = None
    priority: Optional[str] = "MEDIUM"
    assignee: Optional[str] = None
    reporter: Optional[str] = "Rinzan"
    dueDate: Optional[datetime] = None
    estimateHours: Optional[float] = None
    parentId: Optional[str] = None
    milestoneId: Optional[str] = None
    severity: Optional[str] = None
    stepsToReproduce: Optional[str] = None
    expectedResult: Optional[str] = None
    actualResult: Optional[str] = None
    environment: Optional[str] = None
    source: Optional[str] = "INTERNAL"
    userStory: Optional[str] = None
    acceptanceCriteria: Optional[str] = None
    requestedBy: Optional[str] = None

class ItemCreate(ItemBase):
    stageId: str
    labels: Optional[List[str]] = []

class ItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    projectId: Optional[str] = None
    stageId: Optional[str] = None
    type: Optional[str] = None
    priority: Optional[str] = None
    assignee: Optional[str] = None
    reporter: Optional[str] = None
    dueDate: Optional[datetime] = None
    estimateHours: Optional[float] = None
    order: Optional[float] = None
    parentId: Optional[str] = None
    milestoneId: Optional[str] = None
    severity: Optional[str] = None
    stepsToReproduce: Optional[str] = None
    expectedResult: Optional[str] = None
    actualResult: Optional[str] = None
    environment: Optional[str] = None
    source: Optional[str] = None
    userStory: Optional[str] = None
    acceptanceCriteria: Optional[str] = None
    requestedBy: Optional[str] = None
    labels: Optional[List[str]] = None
    addChecklistText: Optional[str] = None
    toggleChecklistId: Optional[str] = None
    deleteChecklistId: Optional[str] = None
    newCommentBody: Optional[str] = None
    commentAuthor: Optional[str] = None

class ItemMoveProject(BaseModel):
    projectId: str
    author: Optional[str] = None

class ItemReorder(BaseModel):
    itemId: Optional[str] = None
    targetStageId: Optional[str] = None
    newOrder: Optional[float] = None
    items: Optional[List[dict]] = None

class BulkAction(BaseModel):
    itemIds: List[str]
    action: str  # "change_stage", "change_priority", "change_assignee", "delete"
    stageId: Optional[str] = None
    priority: Optional[str] = None
    assignee: Optional[str] = None

class DocumentBase(BaseModel):
    title: str
    category: Optional[str] = "PRD"
    description: Optional[str] = None
    content: Optional[str] = None
    author: Optional[str] = "Rinzan"

class DocumentCreate(DocumentBase):
    fileUrl: Optional[str] = None
    fileName: Optional[str] = None
    fileSize: Optional[int] = None
    mimeType: Optional[str] = None

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
