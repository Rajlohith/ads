from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    # Storing preferences as a simple comma-separated string for now (e.g., "tech,dark_mode,iot")
    preferences = Column(String, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    interactions = relationship("Interaction", back_populates="user")

class Ad(Base):
    __tablename__ = "ads"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(String)
    category = Column(String, index=True) # e.g., "tech", "sports"
    variant = Column(String) # e.g., "A" or "B"
    
    interactions = relationship("Interaction", back_populates="ad")

class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    ad_id = Column(Integer, ForeignKey("ads.id"))
    interaction_type = Column(String) # e.g., "view" or "click"
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="interactions")
    ad = relationship("Ad", back_populates="interactions")