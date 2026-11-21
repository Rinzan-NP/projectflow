import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    Table,
)
from sqlalchemy.orm import relationship
from .database import Base

def generate_id():
    return uuid.uuid4().hex[:24]

class Project(Base):
    __tablename__ = "Project"

    id = Column(String, primary_key=True, default=generate_id)
    name = Column(String, nullable=False)
    key = Column(String, unique=True, nullable=False, index=True)
    company = Column(String, default="Company 1", nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String, default="#3b82f6", nullable=False)
    icon = Column(String, default="FolderKanban", nullable=False)
    status = Column(String, default="ACTIVE", nullable=False)
    priority = Column(String, default="MEDIUM", nullable=False)

    startDate = Column(DateTime, nullable=True)
    targetDate = Column(DateTime, nullable=True)

    owner = Column(String, default="Alex Rivers", nullable=False)
    members = Column(String, default="Alex Rivers,Sam Taylor,Jordan Lee", nullable=False)
    itemCounter = Column(Integer, default=0, nullable=False)

    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    stages = relationship("Stage", back_populates="project", cascade="all, delete-orphan", order_by="Stage.order")
    items = relationship("Item", back_populates="project", cascade="all, delete-orphan")
    labels = relationship("Label", back_populates="project", cascade="all, delete-orphan")
    milestones = relationship("Milestone", back_populates="project", cascade="all, delete-orphan")
    documents = relationship("ProjectDocument", back_populates="project", cascade="all, delete-orphan")


class Stage(Base):
    __tablename__ = "Stage"

    id = Column(String, primary_key=True, default=generate_id)
    projectId = Column(String, ForeignKey("Project.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    order = Column(Integer, default=0, nullable=False)
    color = Column(String, default="#64748b", nullable=False)
    isDoneStage = Column(Boolean, default=False, nullable=False)
    wipLimit = Column(Integer, nullable=True)

    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="stages")
    items = relationship("Item", back_populates="stage")


class ItemLabel(Base):
    __tablename__ = "ItemLabel"

    itemId = Column(String, ForeignKey("Item.id", ondelete="CASCADE"), primary_key=True)
    labelId = Column(String, ForeignKey("Label.id", ondelete="CASCADE"), primary_key=True)


class Label(Base):
    __tablename__ = "Label"

    id = Column(String, primary_key=True, default=generate_id)
    projectId = Column(String, ForeignKey("Project.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    color = Column(String, default="#64748b", nullable=False)

    project = relationship("Project", back_populates="labels")
    items = relationship("Item", secondary="ItemLabel", back_populates="labels")


class Item(Base):
    __tablename__ = "Item"

    id = Column(String, primary_key=True, default=generate_id)
    humanId = Column(String, unique=True, nullable=False, index=True)
    itemNumber = Column(Integer, nullable=False)

    projectId = Column(String, ForeignKey("Project.id", ondelete="CASCADE"), nullable=False, index=True)
    stageId = Column(String, ForeignKey("Stage.id"), nullable=False, index=True)

    type = Column(String, default="TASK", nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(String, default="MEDIUM", nullable=False)

    assignee = Column(String, nullable=True, index=True)
    reporter = Column(String, default="Alex Rivers", nullable=False)
    dueDate = Column(DateTime, nullable=True)
    estimateHours = Column(Float, nullable=True)
    order = Column(Float, default=0.0, nullable=False)

    parentId = Column(String, ForeignKey("Item.id", ondelete="SET NULL"), nullable=True)
    milestoneId = Column(String, ForeignKey("Milestone.id", ondelete="SET NULL"), nullable=True)

    # Bug specific
    severity = Column(String, nullable=True)
    stepsToReproduce = Column(Text, nullable=True)
    expectedResult = Column(Text, nullable=True)
    actualResult = Column(Text, nullable=True)
    environment = Column(String, nullable=True)
    source = Column(String, default="INTERNAL", nullable=True)

    # Feature specific
    userStory = Column(Text, nullable=True)
    acceptanceCriteria = Column(Text, nullable=True)
    requestedBy = Column(String, nullable=True)

    completedAt = Column(DateTime, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="items")
    stage = relationship("Stage", back_populates="items")
    labels = relationship("Label", secondary="ItemLabel", back_populates="items")
    parent = relationship("Item", remote_side=[id], backref="subtasks")
    milestone = relationship("Milestone", back_populates="items")
    checklists = relationship("ChecklistItem", back_populates="item", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="item", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="item", cascade="all, delete-orphan")
    activityLogs = relationship("ActivityLog", back_populates="item", cascade="all, delete-orphan")


class ChecklistItem(Base):
    __tablename__ = "ChecklistItem"

    id = Column(String, primary_key=True, default=generate_id)
    itemId = Column(String, ForeignKey("Item.id", ondelete="CASCADE"), nullable=False)
    text = Column(String, nullable=False)
    isDone = Column(Boolean, default=False, nullable=False)
    order = Column(Integer, default=0, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)

    item = relationship("Item", back_populates="checklists")


class Comment(Base):
    __tablename__ = "Comment"

    id = Column(String, primary_key=True, default=generate_id)
    itemId = Column(String, ForeignKey("Item.id", ondelete="CASCADE"), nullable=False)
    author = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    item = relationship("Item", back_populates="comments")


class Attachment(Base):
    __tablename__ = "Attachment"

    id = Column(String, primary_key=True, default=generate_id)
    itemId = Column(String, ForeignKey("Item.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    sizeBytes = Column(Integer, nullable=True)
    mimeType = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)

    item = relationship("Item", back_populates="attachments")


class ActivityLog(Base):
    __tablename__ = "ActivityLog"

    id = Column(String, primary_key=True, default=generate_id)
    itemId = Column(String, ForeignKey("Item.id", ondelete="CASCADE"), nullable=False)
    author = Column(String, default="Alex Rivers", nullable=False)
    action = Column(String, nullable=False)
    fromValue = Column(String, nullable=True)
    toValue = Column(String, nullable=True)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)

    item = relationship("Item", back_populates="activityLogs")


class Milestone(Base):
    __tablename__ = "Milestone"

    id = Column(String, primary_key=True, default=generate_id)
    projectId = Column(String, ForeignKey("Project.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    targetDate = Column(DateTime, nullable=True)
    description = Column(Text, nullable=True)
    isCompleted = Column(Boolean, default=False, nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="milestones")
    items = relationship("Item", back_populates="milestone")


class ProjectDocument(Base):
    __tablename__ = "ProjectDocument"

    id = Column(String, primary_key=True, default=generate_id)
    projectId = Column(String, ForeignKey("Project.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, default="PRD", nullable=False, index=True)
    fileUrl = Column(String, nullable=True)
    fileName = Column(String, nullable=True)
    fileSize = Column(Integer, nullable=True)
    mimeType = Column(String, nullable=True)
    content = Column(Text, nullable=True)

    author = Column(String, default="Alex Rivers", nullable=False)
    createdAt = Column(DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="documents")
