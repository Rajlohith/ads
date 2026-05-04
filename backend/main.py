from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import random

# Internal imports
import models
import schemas
from database import engine, get_db

# Initialize the database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PWA Ad Engine API",
    description="Backend for serving personalized ads and tracking A/B testing data."
)

# --- USER ENDPOINTS ---

@app.post("/users/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = models.User(preferences=user.preferences)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/users/{user_id}", response_model=schemas.UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

# --- AD MANAGEMENT ENDPOINTS ---

@app.post("/ads/", response_model=schemas.AdResponse)
def create_ad(ad: schemas.AdCreate, db: Session = Depends(get_db)):
    db_ad = models.Ad(**ad.model_dump())
    db.add(db_ad)
    db.commit()
    db.refresh(db_ad)
    return db_ad

@app.get("/ads/", response_model=List[schemas.AdResponse])
def list_ads(db: Session = Depends(get_db)):
    return db.query(models.Ad).all()

# --- AD RECOMMENDATION LOGIC ---

@app.get("/serve-ad/{user_id}", response_model=schemas.AdResponse)
def serve_ad(user_id: int, db: Session = Depends(get_db)):
    """
    Core logic for serving ads. 
    Currently uses simple preference matching and random A/B variant selection.
    This will be replaced by the ML model in Phase 3.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Split preference string into a list
    user_prefs = [p.strip().lower() for p in user.preferences.split(",") if p.strip()]
    
    # Query ads matching user preferences
    matching_ads = db.query(models.Ad).filter(models.Ad.category.in_(user_prefs)).all()
    
    if matching_ads:
        # A/B Testing: Randomly pick from relevant ads
        selected_ad = random.choice(matching_ads)
    else:
        # Fallback: Serve any random ad if no preference match found
        all_ads = db.query(models.Ad).all()
        if not all_ads:
            raise HTTPException(status_code=404, detail="No ads available in database")
        selected_ad = random.choice(all_ads)

    return selected_ad

# --- INTERACTION/TRACKING ENDPOINTS ---

@app.post("/interactions/", response_model=schemas.InteractionResponse)
def log_interaction(interaction: schemas.InteractionCreate, db: Session = Depends(get_db)):
    """
    Logs every 'view' or 'click' to build the dataset for the ML algorithm.
    """
    # Validation for interaction type
    if interaction.interaction_type.lower() not in ["view", "click"]:
        raise HTTPException(status_code=400, detail="Type must be 'view' or 'click'")

    db_interaction = models.Interaction(**interaction.model_dump())
    db.add(db_interaction)
    db.commit()
    db.refresh(db_interaction)
    return db_interaction