from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from io import BytesIO
import pandas as pd
from fastapi.responses import StreamingResponse, Response
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'hotel-management-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Admin credentials
ADMIN_EMAIL = "admin1@gmail.com"
ADMIN_PASSWORD = "admin123"

# Object Storage Configuration
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "eventvenue-pro"
storage_key = None

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Storage Functions
def init_storage():
    """Initialize storage and get storage key"""
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload file to storage"""
    key = init_storage()
    if not key:
        raise Exception("Storage not initialized")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    """Download file from storage"""
    key = init_storage()
    if not key:
        raise Exception("Storage not initialized")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "staff"  # admin or staff
    full_name: str
    email: Optional[str] = ""

class UserLogin(BaseModel):
    username: str
    password: str

class AdminLogin(BaseModel):
    email: str
    password: str

class StaffCreate(BaseModel):
    username: str
    password: str
    full_name: str
    email: Optional[str] = ""

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    role: str
    full_name: str
    email: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Customer Models
class CustomerUserCreate(BaseModel):
    name: str
    email: str
    phone: str
    password: str

class CustomerUserLogin(BaseModel):
    email: str
    password: str

class CustomerUser(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SlotBookingCreate(BaseModel):
    event_date: str
    event_type: str
    number_of_guests: int
    event_timing: str
    venue_preference: str
    special_requests: Optional[str] = ""

class SlotBooking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    customer_name: str
    customer_email: str
    customer_phone: str
    event_date: str
    event_type: str
    number_of_guests: int
    event_timing: str
    venue_preference: str
    special_requests: str = ""
    status: str = "Pending"  # Pending, Confirmed, Rejected
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ReviewCreate(BaseModel):
    event_id: str
    rating: int
    review_text: str

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    customer_id: str
    customer_name: str
    rating: int
    review_text: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EventPhotoCreate(BaseModel):
    event_id: str
    photo_url: str
    caption: Optional[str] = ""

class EventPhoto(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    photo_url: str
    caption: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CustomerCreate(BaseModel):
    client_name: str
    phone_number: str
    address: str
    reference: Optional[str] = ""
    email: Optional[str] = ""

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    phone_number: str
    address: str
    reference: str = ""
    email: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EventCreate(BaseModel):
    customer_id: str
    event_date: str
    event_type: str
    number_of_guests: int
    event_timing: str
    venue_name: str
    per_plate_cost: float
    discount: float = 0
    quotation_status: str = "Pending"
    notes: Optional[str] = ""
    is_completed: bool = False

class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    customer_name: Optional[str] = ""
    customer_email: Optional[str] = ""
    event_date: str
    event_type: str
    number_of_guests: int
    event_timing: str
    venue_name: str
    per_plate_cost: float
    total_amount: float = 0
    discount: float = 0
    final_amount: float = 0
    quotation_status: str = "Pending"
    notes: str = ""
    is_completed: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PaymentCreate(BaseModel):
    event_id: str
    amount: float
    payment_mode: str
    notes: Optional[str] = ""

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_id: str
    customer_name: Optional[str] = ""
    amount: float
    payment_mode: str
    payment_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    notes: str = ""

class ExpenseCreate(BaseModel):
    expense_date: str
    expense_type: str
    amount: float
    notes: Optional[str] = ""

class Expense(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    expense_date: str
    expense_type: str
    amount: float
    notes: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LeadCreate(BaseModel):
    client_name: str
    phone_number: str
    inquiry_date: str
    lead_source: str
    follow_up_date: str
    status: str = "Warm"
    notes: Optional[str] = ""

class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    phone_number: str
    inquiry_date: str
    lead_source: str
    follow_up_date: str
    status: str = "Warm"
    notes: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ============== AUTHENTICATION ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, username: str, role: str, user_type: str = "staff") -> str:
    payload = {
        "user_id": user_id,
        "username": username,
        "role": role,
        "user_type": user_type,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============== ADMIN AUTH ROUTES ==============

@api_router.post("/auth/admin-login")
async def admin_login(credentials: AdminLogin):
    # Check for hardcoded admin credentials
    if credentials.email == ADMIN_EMAIL and credentials.password == ADMIN_PASSWORD:
        # Check if admin exists in DB, if not create one
        admin = await db.users.find_one({"email": ADMIN_EMAIL, "role": "admin"})
        if not admin:
            admin_obj = User(
                username="admin",
                role="admin",
                full_name="Super Admin",
                email=ADMIN_EMAIL
            )
            doc = admin_obj.model_dump()
            doc['password_hash'] = hash_password(ADMIN_PASSWORD)
            await db.users.insert_one(doc)
            admin = doc
        
        token = create_token(admin.get('id', 'admin'), "admin", "admin", "admin")
        return {
            "token": token,
            "user": {
                "id": admin.get('id', 'admin'),
                "username": "admin",
                "role": "admin",
                "full_name": admin.get('full_name', 'Super Admin'),
                "email": ADMIN_EMAIL
            }
        }
    raise HTTPException(status_code=401, detail="Invalid admin credentials")

@api_router.post("/auth/staff-login")
async def staff_login(credentials: UserLogin):
    user = await db.users.find_one({"username": credentials.username, "role": "staff"})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user['id'], user['username'], user['role'], "staff")
    return {
        "token": token,
        "user": {
            "id": user['id'],
            "username": user['username'],
            "role": user['role'],
            "full_name": user['full_name']
        }
    }

@api_router.post("/auth/register", response_model=User)
async def register(user: UserCreate):
    existing = await db.users.find_one({"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user_obj = User(
        username=user.username,
        role=user.role,
        full_name=user.full_name,
        email=user.email or ""
    )
    doc = user_obj.model_dump()
    doc['password_hash'] = hash_password(user.password)
    await db.users.insert_one(doc)
    return user_obj

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"username": credentials.username})
    if not user or not verify_password(credentials.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user['id'], user['username'], user['role'], user['role'])
    return {
        "token": token,
        "user": {
            "id": user['id'],
            "username": user['username'],
            "role": user['role'],
            "full_name": user['full_name']
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user_type = current_user.get('user_type', 'staff')
    
    if user_type == 'customer':
        user = await db.customer_users.find_one({"id": current_user['user_id']}, {"_id": 0, "password_hash": 0})
        if user:
            user['user_type'] = 'customer'
            return user
    else:
        user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0, "password_hash": 0})
        if user:
            user['user_type'] = user.get('role', 'staff')
            return user
    
    # Return basic info from token if user not found in DB
    return {
        "id": current_user['user_id'],
        "username": current_user['username'],
        "role": current_user['role'],
        "user_type": user_type
    }

# ============== STAFF MANAGEMENT (Admin Only) ==============

@api_router.post("/staff", response_model=User)
async def create_staff(staff: StaffCreate, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    
    existing = await db.users.find_one({"username": staff.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user_obj = User(
        username=staff.username,
        role="staff",
        full_name=staff.full_name,
        email=staff.email or ""
    )
    doc = user_obj.model_dump()
    doc['password_hash'] = hash_password(staff.password)
    await db.users.insert_one(doc)
    return user_obj

@api_router.get("/staff", response_model=List[User])
async def get_staff(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    staff = await db.users.find({"role": "staff"}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return staff

@api_router.delete("/staff/{staff_id}")
async def delete_staff(staff_id: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.users.delete_one({"id": staff_id, "role": "staff"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Staff not found")
    return {"message": "Staff deleted"}

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

# ============== CUSTOMER USER AUTH ==============

@api_router.post("/customer/register")
async def customer_register(customer: CustomerUserCreate):
    existing = await db.customer_users.find_one({"email": customer.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    customer_obj = CustomerUser(
        name=customer.name,
        email=customer.email,
        phone=customer.phone
    )
    doc = customer_obj.model_dump()
    doc['password_hash'] = hash_password(customer.password)
    await db.customer_users.insert_one(doc)
    
    token = create_token(customer_obj.id, customer.email, "customer", "customer")
    return {
        "token": token,
        "user": {
            "id": customer_obj.id,
            "name": customer_obj.name,
            "email": customer_obj.email,
            "phone": customer_obj.phone,
            "user_type": "customer"
        }
    }

@api_router.post("/customer/login")
async def customer_login(credentials: CustomerUserLogin):
    customer = await db.customer_users.find_one({"email": credentials.email})
    if not customer or not verify_password(credentials.password, customer['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(customer['id'], customer['email'], "customer", "customer")
    return {
        "token": token,
        "user": {
            "id": customer['id'],
            "name": customer['name'],
            "email": customer['email'],
            "phone": customer['phone'],
            "user_type": "customer"
        }
    }

# ============== CUSTOMER PORTAL ==============

@api_router.get("/customer/past-events")
async def get_customer_past_events(current_user: dict = Depends(get_current_user)):
    if current_user.get('user_type') != 'customer':
        raise HTTPException(status_code=403, detail="Customer access required")
    
    customer = await db.customer_users.find_one({"id": current_user['user_id']}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Find events by customer email
    events = await db.events.find({
        "customer_email": customer['email'],
        "is_completed": True
    }, {"_id": 0}).to_list(100)
    
    # Get photos and reviews for each event
    for event in events:
        photos = await db.event_photos.find({"event_id": event['id']}, {"_id": 0}).to_list(50)
        reviews = await db.reviews.find({"event_id": event['id']}, {"_id": 0}).to_list(50)
        event['photos'] = photos
        event['reviews'] = reviews
    
    return events

@api_router.get("/customer/my-bookings")
async def get_customer_bookings(current_user: dict = Depends(get_current_user)):
    if current_user.get('user_type') != 'customer':
        raise HTTPException(status_code=403, detail="Customer access required")
    
    bookings = await db.slot_bookings.find(
        {"customer_id": current_user['user_id']},
        {"_id": 0}
    ).to_list(100)
    return bookings

@api_router.post("/customer/book-slot")
async def book_slot(booking: SlotBookingCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get('user_type') != 'customer':
        raise HTTPException(status_code=403, detail="Customer access required")
    
    customer = await db.customer_users.find_one({"id": current_user['user_id']}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    booking_obj = SlotBooking(
        customer_id=current_user['user_id'],
        customer_name=customer['name'],
        customer_email=customer['email'],
        customer_phone=customer['phone'],
        event_date=booking.event_date,
        event_type=booking.event_type,
        number_of_guests=booking.number_of_guests,
        event_timing=booking.event_timing,
        venue_preference=booking.venue_preference,
        special_requests=booking.special_requests or ""
    )
    
    doc = booking_obj.model_dump()
    await db.slot_bookings.insert_one(doc)
    return booking_obj

@api_router.post("/customer/review")
async def add_review(review: ReviewCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get('user_type') != 'customer':
        raise HTTPException(status_code=403, detail="Customer access required")
    
    customer = await db.customer_users.find_one({"id": current_user['user_id']}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    event = await db.events.find_one({"id": review.event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    review_obj = Review(
        event_id=review.event_id,
        customer_id=current_user['user_id'],
        customer_name=customer['name'],
        rating=review.rating,
        review_text=review.review_text
    )
    
    doc = review_obj.model_dump()
    await db.reviews.insert_one(doc)
    return review_obj

# ============== SLOT BOOKINGS (Admin/Staff) ==============

@api_router.get("/slot-bookings")
async def get_slot_bookings(current_user: dict = Depends(get_current_user)):
    if current_user.get('user_type') == 'customer':
        raise HTTPException(status_code=403, detail="Staff access required")
    
    bookings = await db.slot_bookings.find({}, {"_id": 0}).to_list(1000)
    return bookings

@api_router.put("/slot-bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, status: str, current_user: dict = Depends(get_current_user)):
    if current_user.get('user_type') == 'customer':
        raise HTTPException(status_code=403, detail="Staff access required")
    
    result = await db.slot_bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"message": f"Booking status updated to {status}"}

# ============== PHOTO UPLOAD ==============

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif', 'webp'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

def get_file_extension(filename: str) -> str:
    return filename.split(".")[-1].lower() if "." in filename else "jpg"

@api_router.post("/upload/photo")
async def upload_photo(
    event_id: str,
    caption: str = "",
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a photo for an event - accessible by both admin/staff and customers"""
    # Verify event exists
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check file extension
    ext = get_file_extension(file.filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}")
    
    # Read file
    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max size: 10MB")
    
    # Generate unique path
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/events/{event_id}/{file_id}.{ext}"
    
    # Upload to storage
    try:
        result = put_object(path, data, file.content_type or f"image/{ext}")
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload photo")
    
    # Get uploader info
    uploader_name = ""
    uploader_type = current_user.get('user_type', 'staff')
    if uploader_type == 'customer':
        customer = await db.customer_users.find_one({"id": current_user['user_id']}, {"_id": 0})
        uploader_name = customer.get('name', '') if customer else ''
    else:
        user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0})
        uploader_name = user.get('full_name', '') if user else ''
    
    # Save to database
    photo_doc = {
        "id": file_id,
        "event_id": event_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result.get("size", len(data)),
        "caption": caption,
        "uploaded_by": current_user['user_id'],
        "uploader_name": uploader_name,
        "uploader_type": uploader_type,
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.event_photos.insert_one(photo_doc)
    
    return {
        "id": file_id,
        "event_id": event_id,
        "caption": caption,
        "uploader_name": uploader_name,
        "created_at": photo_doc["created_at"]
    }

@api_router.get("/photos/{photo_id}")
async def get_photo(photo_id: str, auth: str = Query(None)):
    """Get a photo by ID - supports query param auth for img src"""
    photo = await db.event_photos.find_one({"id": photo_id, "is_deleted": False}, {"_id": 0})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    try:
        data, content_type = get_object(photo["storage_path"])
        return Response(content=data, media_type=photo.get("content_type", content_type))
    except Exception as e:
        logger.error(f"Failed to get photo: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve photo")

@api_router.get("/events/{event_id}/photos")
async def get_event_photos(event_id: str, current_user: dict = Depends(get_current_user)):
    """Get all photos for an event"""
    photos = await db.event_photos.find(
        {"event_id": event_id, "is_deleted": False},
        {"_id": 0, "storage_path": 0}
    ).to_list(100)
    return photos

@api_router.delete("/photos/{photo_id}")
async def delete_photo(photo_id: str, current_user: dict = Depends(get_current_user)):
    """Soft delete a photo - only uploader or admin can delete"""
    photo = await db.event_photos.find_one({"id": photo_id}, {"_id": 0})
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Check permission - admin can delete any, others can only delete their own
    if current_user.get('role') != 'admin' and photo.get('uploaded_by') != current_user['user_id']:
        raise HTTPException(status_code=403, detail="Not authorized to delete this photo")
    
    await db.event_photos.update_one({"id": photo_id}, {"$set": {"is_deleted": True}})
    return {"message": "Photo deleted"}

# Customer photo upload
@api_router.post("/customer/upload-photo")
async def customer_upload_photo(
    event_id: str,
    caption: str = "",
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Customer uploads photo for their completed event"""
    if current_user.get('user_type') != 'customer':
        raise HTTPException(status_code=403, detail="Customer access required")
    
    # Verify event exists and belongs to customer (by email match)
    event = await db.events.find_one({"id": event_id, "is_completed": True}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Completed event not found")
    
    customer = await db.customer_users.find_one({"id": current_user['user_id']}, {"_id": 0})
    if not customer or event.get('customer_email') != customer.get('email'):
        raise HTTPException(status_code=403, detail="Not authorized to upload photos for this event")
    
    # Use the main upload function
    ext = get_file_extension(file.filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type not allowed")
    
    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max size: 10MB")
    
    file_id = str(uuid.uuid4())
    path = f"{APP_NAME}/events/{event_id}/{file_id}.{ext}"
    
    try:
        result = put_object(path, data, file.content_type or f"image/{ext}")
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload photo")
    
    photo_doc = {
        "id": file_id,
        "event_id": event_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result.get("size", len(data)),
        "caption": caption,
        "uploaded_by": current_user['user_id'],
        "uploader_name": customer.get('name', ''),
        "uploader_type": "customer",
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.event_photos.insert_one(photo_doc)
    
    return {
        "id": file_id,
        "event_id": event_id,
        "caption": caption,
        "created_at": photo_doc["created_at"]
    }

# ============== EVENT PHOTOS (Legacy - keeping for compatibility) ==============

@api_router.post("/event-photos")
async def add_event_photo(photo: EventPhotoCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get('user_type') == 'customer':
        raise HTTPException(status_code=403, detail="Staff access required")
    
    photo_obj = EventPhoto(
        event_id=photo.event_id,
        photo_url=photo.photo_url,
        caption=photo.caption or ""
    )
    doc = photo_obj.model_dump()
    await db.event_photos.insert_one(doc)
    return photo_obj

@api_router.get("/event-photos/{event_id}")
async def get_event_photos(event_id: str, current_user: dict = Depends(get_current_user)):
    photos = await db.event_photos.find({"event_id": event_id}, {"_id": 0}).to_list(100)
    return photos

@api_router.delete("/event-photos/{photo_id}")
async def delete_event_photo(photo_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get('user_type') == 'customer':
        raise HTTPException(status_code=403, detail="Staff access required")
    result = await db.event_photos.delete_one({"id": photo_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Photo not found")
    return {"message": "Photo deleted"}

# ============== PUBLIC GALLERY ==============

@api_router.get("/public/gallery")
async def get_public_gallery():
    # Get all completed events with photos
    events = await db.events.find({"is_completed": True}, {"_id": 0}).to_list(100)
    gallery = []
    for event in events:
        photos = await db.event_photos.find({"event_id": event['id']}, {"_id": 0}).to_list(20)
        reviews = await db.reviews.find({"event_id": event['id']}, {"_id": 0}).to_list(20)
        if photos:
            gallery.append({
                "event_id": event['id'],
                "event_type": event['event_type'],
                "event_date": event['event_date'],
                "venue_name": event['venue_name'],
                "photos": photos,
                "reviews": reviews
            })
    return gallery

@api_router.get("/public/reviews")
async def get_public_reviews():
    reviews = await db.reviews.find({}, {"_id": 0}).to_list(100)
    return reviews

# ============== CUSTOMER ROUTES ==============

@api_router.post("/customers", response_model=Customer)
async def create_customer(customer: CustomerCreate, current_user: dict = Depends(get_current_user)):
    customer_obj = Customer(**customer.model_dump())
    doc = customer_obj.model_dump()
    await db.customers.insert_one(doc)
    return customer_obj

@api_router.get("/customers", response_model=List[Customer])
async def get_customers(current_user: dict = Depends(get_current_user)):
    customers = await db.customers.find({}, {"_id": 0}).to_list(1000)
    return customers

@api_router.get("/customers/{customer_id}", response_model=Customer)
async def get_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@api_router.put("/customers/{customer_id}", response_model=Customer)
async def update_customer(customer_id: str, customer: CustomerCreate, current_user: dict = Depends(get_current_user)):
    result = await db.customers.update_one(
        {"id": customer_id},
        {"$set": customer.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    updated = await db.customers.find_one({"id": customer_id}, {"_id": 0})
    return updated

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.customers.delete_one({"id": customer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted"}

# ============== EVENT/BOOKING ROUTES ==============

@api_router.post("/events", response_model=Event)
async def create_event(event: EventCreate, current_user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one({"id": event.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    total_amount = event.per_plate_cost * event.number_of_guests
    final_amount = total_amount - event.discount
    
    event_obj = Event(
        **event.model_dump(),
        customer_name=customer['client_name'],
        customer_email=customer.get('email', ''),
        total_amount=total_amount,
        final_amount=final_amount
    )
    doc = event_obj.model_dump()
    await db.events.insert_one(doc)
    return event_obj

@api_router.get("/events", response_model=List[Event])
async def get_events(current_user: dict = Depends(get_current_user)):
    events = await db.events.find({}, {"_id": 0}).to_list(1000)
    return events

@api_router.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@api_router.put("/events/{event_id}", response_model=Event)
async def update_event(event_id: str, event: EventCreate, current_user: dict = Depends(get_current_user)):
    customer = await db.customers.find_one({"id": event.customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    total_amount = event.per_plate_cost * event.number_of_guests
    final_amount = total_amount - event.discount
    
    update_data = event.model_dump()
    update_data['customer_name'] = customer['client_name']
    update_data['customer_email'] = customer.get('email', '')
    update_data['total_amount'] = total_amount
    update_data['final_amount'] = final_amount
    
    result = await db.events.update_one({"id": event_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    updated = await db.events.find_one({"id": event_id}, {"_id": 0})
    return updated

@api_router.put("/events/{event_id}/complete")
async def mark_event_complete(event_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.events.update_one({"id": event_id}, {"$set": {"is_completed": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event marked as completed"}

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.events.delete_one({"id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted"}

# ============== CALENDAR VIEW ==============

@api_router.get("/calendar/events")
async def get_calendar_events(
    start_date: str = Query(None),
    end_date: str = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get events for calendar view with optional date range filter"""
    query = {}
    
    if start_date and end_date:
        query["event_date"] = {"$gte": start_date, "$lte": end_date}
    elif start_date:
        query["event_date"] = {"$gte": start_date}
    elif end_date:
        query["event_date"] = {"$lte": end_date}
    
    events = await db.events.find(query, {"_id": 0}).to_list(1000)
    
    # Format for calendar
    calendar_events = []
    for event in events:
        calendar_events.append({
            "id": event["id"],
            "title": f"{event.get('customer_name', 'Unknown')} - {event.get('event_type', 'Event')}",
            "date": event["event_date"],
            "event_type": event.get("event_type", ""),
            "customer_name": event.get("customer_name", ""),
            "venue_name": event.get("venue_name", ""),
            "event_timing": event.get("event_timing", ""),
            "number_of_guests": event.get("number_of_guests", 0),
            "final_amount": event.get("final_amount", 0),
            "quotation_status": event.get("quotation_status", "Pending"),
            "is_completed": event.get("is_completed", False)
        })
    
    return calendar_events

@api_router.get("/calendar/stats")
async def get_calendar_stats(
    month: str = Query(None),  # Format: YYYY-MM
    current_user: dict = Depends(get_current_user)
):
    """Get monthly stats for calendar"""
    if month:
        start_date = f"{month}-01"
        # Get last day of month
        year, m = map(int, month.split("-"))
        if m == 12:
            end_date = f"{year + 1}-01-01"
        else:
            end_date = f"{year}-{m + 1:02d}-01"
        
        events = await db.events.find({
            "event_date": {"$gte": start_date, "$lt": end_date}
        }, {"_id": 0}).to_list(1000)
    else:
        events = await db.events.find({}, {"_id": 0}).to_list(1000)
    
    # Calculate stats
    total_events = len(events)
    completed_events = sum(1 for e in events if e.get('is_completed'))
    total_revenue = sum(e.get('final_amount', 0) for e in events)
    
    # Events by type
    events_by_type = {}
    for e in events:
        event_type = e.get('event_type', 'Other')
        events_by_type[event_type] = events_by_type.get(event_type, 0) + 1
    
    # Events by status
    events_by_status = {"Approved": 0, "Pending": 0, "Sent": 0}
    for e in events:
        status = e.get('quotation_status', 'Pending')
        events_by_status[status] = events_by_status.get(status, 0) + 1
    
    return {
        "total_events": total_events,
        "completed_events": completed_events,
        "pending_events": total_events - completed_events,
        "total_revenue": total_revenue,
        "events_by_type": events_by_type,
        "events_by_status": events_by_status
    }

# ============== PAYMENT ROUTES ==============

@api_router.post("/payments", response_model=Payment)
async def create_payment(payment: PaymentCreate, current_user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"id": payment.event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    payment_obj = Payment(
        **payment.model_dump(),
        customer_name=event.get('customer_name', '')
    )
    doc = payment_obj.model_dump()
    await db.payments.insert_one(doc)
    return payment_obj

@api_router.get("/payments", response_model=List[Payment])
async def get_payments(current_user: dict = Depends(get_current_user)):
    payments = await db.payments.find({}, {"_id": 0}).to_list(1000)
    return payments

@api_router.get("/payments/by-event/{event_id}", response_model=List[Payment])
async def get_payments_by_event(event_id: str, current_user: dict = Depends(get_current_user)):
    payments = await db.payments.find({"event_id": event_id}, {"_id": 0}).to_list(1000)
    return payments

@api_router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.payments.delete_one({"id": payment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"message": "Payment deleted"}

# ============== EXPENSE ROUTES ==============

@api_router.post("/expenses", response_model=Expense)
async def create_expense(expense: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    expense_obj = Expense(**expense.model_dump())
    doc = expense_obj.model_dump()
    await db.expenses.insert_one(doc)
    return expense_obj

@api_router.get("/expenses", response_model=List[Expense])
async def get_expenses(current_user: dict = Depends(get_current_user)):
    expenses = await db.expenses.find({}, {"_id": 0}).to_list(1000)
    return expenses

@api_router.get("/expenses/by-date/{date}")
async def get_expenses_by_date(date: str, current_user: dict = Depends(get_current_user)):
    expenses = await db.expenses.find({"expense_date": date}, {"_id": 0}).to_list(1000)
    total = sum(e['amount'] for e in expenses)
    return {"expenses": expenses, "total": total}

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.expenses.delete_one({"id": expense_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")
    return {"message": "Expense deleted"}

# ============== LEAD ROUTES ==============

@api_router.post("/leads", response_model=Lead)
async def create_lead(lead: LeadCreate, current_user: dict = Depends(get_current_user)):
    lead_obj = Lead(**lead.model_dump())
    doc = lead_obj.model_dump()
    await db.leads.insert_one(doc)
    return lead_obj

@api_router.get("/leads", response_model=List[Lead])
async def get_leads(current_user: dict = Depends(get_current_user)):
    leads = await db.leads.find({}, {"_id": 0}).to_list(1000)
    return leads

@api_router.put("/leads/{lead_id}", response_model=Lead)
async def update_lead(lead_id: str, lead: LeadCreate, current_user: dict = Depends(get_current_user)):
    result = await db.leads.update_one({"id": lead_id}, {"$set": lead.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    updated = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return updated

@api_router.delete("/leads/{lead_id}")
async def delete_lead(lead_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.leads.delete_one({"id": lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    return {"message": "Lead deleted"}

# ============== DASHBOARD & ANALYTICS ==============

@api_router.get("/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    todays_events = await db.events.find({"event_date": today}, {"_id": 0}).to_list(100)
    todays_expenses = await db.expenses.find({"expense_date": today}, {"_id": 0}).to_list(100)
    total_today_expenses = sum(e['amount'] for e in todays_expenses)
    
    todays_payments = await db.payments.find({}, {"_id": 0}).to_list(1000)
    todays_payments = [p for p in todays_payments if p.get('payment_date', '').startswith(today)]
    total_today_payments = sum(p['amount'] for p in todays_payments)
    
    all_events = await db.events.find({}, {"_id": 0}).to_list(1000)
    all_payments = await db.payments.find({}, {"_id": 0}).to_list(1000)
    
    pending_payments = []
    for event in all_events:
        event_payments = [p for p in all_payments if p.get('event_id') == event['id']]
        total_paid = sum(p['amount'] for p in event_payments)
        pending = event['final_amount'] - total_paid
        if pending > 0:
            pending_payments.append({
                "event_id": event['id'],
                "customer_name": event.get('customer_name', ''),
                "event_date": event['event_date'],
                "total_amount": event['final_amount'],
                "paid": total_paid,
                "pending": pending
            })
    
    leads = await db.leads.find({}, {"_id": 0}).to_list(1000)
    follow_ups = [l for l in leads if l.get('follow_up_date', '') <= today and l.get('status') != 'Cold']
    
    # Slot booking requests
    pending_bookings = await db.slot_bookings.find({"status": "Pending"}, {"_id": 0}).to_list(100)
    
    total_customers = await db.customers.count_documents({})
    total_events = await db.events.count_documents({})
    total_leads = await db.leads.count_documents({})
    hot_leads = await db.leads.count_documents({"status": "Hot"})
    total_staff = await db.users.count_documents({"role": "staff"})
    
    return {
        "todays_events": todays_events,
        "todays_events_count": len(todays_events),
        "todays_expenses": todays_expenses,
        "total_today_expenses": total_today_expenses,
        "todays_payments": todays_payments,
        "total_today_payments": total_today_payments,
        "pending_payments": pending_payments,
        "total_pending_amount": sum(p['pending'] for p in pending_payments),
        "follow_up_reminders": follow_ups,
        "pending_bookings": pending_bookings,
        "pending_bookings_count": len(pending_bookings),
        "stats": {
            "total_customers": total_customers,
            "total_events": total_events,
            "total_leads": total_leads,
            "hot_leads": hot_leads,
            "total_staff": total_staff
        }
    }

@api_router.get("/payment-tracking")
async def get_payment_tracking(current_user: dict = Depends(get_current_user)):
    events = await db.events.find({}, {"_id": 0}).to_list(1000)
    payments = await db.payments.find({}, {"_id": 0}).to_list(1000)
    
    tracking = []
    for event in events:
        event_payments = [p for p in payments if p.get('event_id') == event['id']]
        total_paid = sum(p['amount'] for p in event_payments)
        pending = event['final_amount'] - total_paid
        
        status = "Pending"
        if total_paid >= event['final_amount']:
            status = "Paid"
        elif total_paid > 0:
            status = "Partial"
        
        tracking.append({
            "event_id": event['id'],
            "customer_name": event.get('customer_name', ''),
            "event_date": event['event_date'],
            "event_type": event['event_type'],
            "total_amount": event['final_amount'],
            "advance_received": total_paid,
            "pending_amount": max(0, pending),
            "payment_status": status
        })
    
    return tracking

# ============== EXPORT ROUTES ==============

@api_router.get("/export/events")
async def export_events(current_user: dict = Depends(get_current_user)):
    events = await db.events.find({}, {"_id": 0}).to_list(1000)
    df = pd.DataFrame(events)
    output = BytesIO()
    df.to_excel(output, index=False, sheet_name='Events')
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=events.xlsx"}
    )

@api_router.get("/export/expenses")
async def export_expenses(current_user: dict = Depends(get_current_user)):
    expenses = await db.expenses.find({}, {"_id": 0}).to_list(1000)
    df = pd.DataFrame(expenses)
    output = BytesIO()
    df.to_excel(output, index=False, sheet_name='Expenses')
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=expenses.xlsx"}
    )

@api_router.get("/export/payments")
async def export_payments(current_user: dict = Depends(get_current_user)):
    payments = await db.payments.find({}, {"_id": 0}).to_list(1000)
    df = pd.DataFrame(payments)
    output = BytesIO()
    df.to_excel(output, index=False, sheet_name='Payments')
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=payments.xlsx"}
    )

@api_router.get("/export/leads")
async def export_leads(current_user: dict = Depends(get_current_user)):
    leads = await db.leads.find({}, {"_id": 0}).to_list(1000)
    df = pd.DataFrame(leads)
    output = BytesIO()
    df.to_excel(output, index=False, sheet_name='Leads')
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=leads.xlsx"}
    )

# ============== ROOT ROUTE ==============

@api_router.get("/")
async def root():
    return {"message": "Hotel Management API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Initialize storage on startup"""
    try:
        init_storage()
        logger.info("Storage initialized successfully")
    except Exception as e:
        logger.error(f"Storage initialization failed: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
