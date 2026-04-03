from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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
from fastapi.responses import StreamingResponse

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

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "staff"  # admin or staff
    full_name: str

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    role: str
    full_name: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CustomerCreate(BaseModel):
    client_name: str
    phone_number: str
    address: str
    reference: Optional[str] = ""

class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    phone_number: str
    address: str
    reference: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EventCreate(BaseModel):
    customer_id: str
    event_date: str
    event_type: str  # Wedding, Birthday, Corporate, etc.
    number_of_guests: int
    event_timing: str
    venue_name: str
    per_plate_cost: float
    discount: float = 0
    quotation_status: str = "Pending"  # Sent, Approved, Pending
    notes: Optional[str] = ""

class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    customer_name: Optional[str] = ""
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
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PaymentCreate(BaseModel):
    event_id: str
    amount: float
    payment_mode: str  # Cash, UPI, Bank
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
    expense_type: str  # Vegetables, Gas, Labour, Transport
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
    lead_source: str  # Instagram, Reference, etc.
    follow_up_date: str
    status: str = "Warm"  # Hot, Warm, Cold
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

class PaymentTracking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    event_id: str
    customer_name: str
    total_amount: float
    advance_received: float
    pending_amount: float
    due_date: Optional[str] = ""
    payment_status: str  # Paid, Partial, Pending

# ============== AUTHENTICATION ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, username: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "username": username,
        "role": role,
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

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=User)
async def register(user: UserCreate):
    existing = await db.users.find_one({"username": user.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user_obj = User(
        username=user.username,
        role=user.role,
        full_name=user.full_name
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
    
    token = create_token(user['id'], user['username'], user['role'])
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
    user = await db.users.find_one({"id": current_user['user_id']}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

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
    update_data['total_amount'] = total_amount
    update_data['final_amount'] = final_amount
    
    result = await db.events.update_one({"id": event_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    updated = await db.events.find_one({"id": event_id}, {"_id": 0})
    return updated

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.events.delete_one({"id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted"}

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
    
    # Today's events
    todays_events = await db.events.find({"event_date": today}, {"_id": 0}).to_list(100)
    
    # Today's expenses
    todays_expenses = await db.expenses.find({"expense_date": today}, {"_id": 0}).to_list(100)
    total_today_expenses = sum(e['amount'] for e in todays_expenses)
    
    # Today's payments received
    todays_payments = await db.payments.find({}, {"_id": 0}).to_list(1000)
    todays_payments = [p for p in todays_payments if p.get('payment_date', '').startswith(today)]
    total_today_payments = sum(p['amount'] for p in todays_payments)
    
    # Pending payments calculation
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
    
    # Follow-up reminders (due today or overdue)
    leads = await db.leads.find({}, {"_id": 0}).to_list(1000)
    follow_ups = [l for l in leads if l.get('follow_up_date', '') <= today and l.get('status') != 'Cold']
    
    # Total stats
    total_customers = await db.customers.count_documents({})
    total_events = await db.events.count_documents({})
    total_leads = await db.leads.count_documents({})
    hot_leads = await db.leads.count_documents({"status": "Hot"})
    
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
        "stats": {
            "total_customers": total_customers,
            "total_events": total_events,
            "total_leads": total_leads,
            "hot_leads": hot_leads
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
