import os
import uvicorn
import dotenv
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
from datetime import datetime, date, timedelta
from decimal import Decimal

from Database import pool, db_query, db_execute
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    RoleChecker,
)
from schemas import (
    SignupRequest,
    LoginRequest,
    LocationUpdate,
    LeadCreate,
    LeadUpdate,
    DealCreate,
    DealUpdate,
    InventoryItemCreate,
    InventoryItemUpdate,
    PurchaseRequestCreate,
    ProductionUpdate,
    InvoiceCreate,
    InvoicePaymentUpdate,
    CustomerCreate,
    IndentCreate,
    ReminderCreate,
)

dotenv.load_dotenv()

app = FastAPI(title="Papyrus CRM Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex="https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def parse_order_status(db_status: str):
    """Split orders.status (e.g. 'New|Pending Approval') into (stage, status)."""
    if not db_status:
        return "New", "Pending Approval"
    if "|" in db_status:
        parts = db_status.split("|", 1)
        return parts[0], parts[1]
    if db_status == "PENDING":
        return "New", "Pending Approval"
    return "New", db_status

def map_status_to_db(status: str) -> str:
    s = (status or "pending").lower()
    if s == "active":
        return "HOT"
    elif s == "converted":
        return "WON"
    elif s == "lost":
        return "LOST"
    else:
        return "COLD"

def map_status_from_db(db_status: str) -> str:
    s = (db_status or "COLD").upper()
    if s == "HOT":
        return "active"
    elif s == "WON":
        return "converted"
    elif s == "LOST":
        return "lost"
    else:
        return "pending"

def find_user_by_eid(eid: str):
    """Find user by employee_id, email, phone, or numeric id."""

    user = db_query("SELECT * FROM users WHERE employee_id = %s", (eid,), fetch_one=True)
    if user:
        return user

    user = db_query("SELECT * FROM users WHERE email = %s", (eid,), fetch_one=True)
    if user:
        return user

    user = db_query("SELECT * FROM users WHERE phone = %s", (eid,), fetch_one=True)
    if user:
        return user

    digits = "".join([c for c in eid if c.isdigit()])
    if digits:
        user = db_query("SELECT * FROM users WHERE id = %s", (int(digits),), fetch_one=True)
        if user:
            return user
    return None

@app.post("/signup")
def signup(req: SignupRequest):

    existing = db_query("SELECT id FROM users WHERE email = %s", (req.email,), fetch_one=True)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    role_upper = req.role.upper()
    prefix = "EMP"
    if role_upper == "ADMIN":
        prefix = "ADM"
    elif role_upper == "SALES":
        prefix = "SAL"
    elif role_upper == "INVENTORY":
        prefix = "INV"
    elif role_upper == "PRODUCTION":
        prefix = "PRD"
    elif role_upper == "HR":
        prefix = "HR"
    elif role_upper == "ACCOUNTANT":
        prefix = "ACC"

    existing_ids = db_query("SELECT employee_id FROM users WHERE employee_id LIKE %s", (f"{prefix}%",))
    numbers = []
    for item in existing_ids:
        eid = item["employee_id"]
        if eid:
            digit_part = "".join([char for char in eid if char.isdigit()])
            if digit_part:
                try:
                    numbers.append(int(digit_part))
                except ValueError:
                    pass
    next_num = max(numbers) + 1 if numbers else 1
    generated_eid = f"{prefix}{next_num:03d}"

    pw_hash = hash_password(req.password)

    user_id = db_execute(
        """
        INSERT INTO users (name, email, phone, password_hash, role, employee_id, is_active)
        VALUES (%s, %s, %s, %s, %s, %s, true)
        RETURNING id
        """,
        (req.name, req.email, req.phone, pw_hash, role_upper, generated_eid),
        return_id=True
    )

    return {
        "status": "success",
        "message": "User created successfully",
        "user_id": user_id,
        "employee_id": generated_eid
    }

def auto_cleanup_forgotten_checkouts(user_id: int):
    """If a user has check-in but no check-out for any day before today, mark it as ABSENT."""
    try:
        db_execute(
            """
            UPDATE attendance
            SET check_out = check_in, work_hours = 0
            WHERE user_id = %s
              AND date < CURRENT_DATE
              AND check_out IS NULL
            """,
            (user_id,)
        )
    except Exception as e:
        print(f"Error in auto_cleanup_forgotten_checkouts: {e}")

@app.post("/login")
def login(req: LoginRequest):
    user = find_user_by_eid(req.employee_id)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid employee ID or email")

    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Invalid password")

    token = create_access_token({"sub": str(user["id"])})

    auto_cleanup_forgotten_checkouts(user["id"])

    today = date.today()
    now = datetime.now()
    existing = db_query("SELECT check_in FROM attendance WHERE user_id = %s AND date = %s", (user["id"], today), fetch_one=True)
    if not existing:
        db_execute(
            "INSERT INTO attendance (user_id, check_in, date) VALUES (%s, %s, %s)",
            (user["id"], now, today)
        )
        checkin_time = now
    else:
        checkin_time = existing["check_in"]

    return {
        "status": "success",
        "token": token,
        "role": user["role"],
        "employee_id": user["employee_id"] or str(user["id"]),
        "checkin_time": checkin_time.isoformat() if checkin_time else None
    }

@app.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):

    loc = db_query(
        "SELECT latitude, longitude, recorded_at FROM employee_locations WHERE user_id = %s ORDER BY recorded_at DESC LIMIT 1",
        (current_user["id"],),
        fetch_one=True
    )

    payload = {
        "employee_id": current_user["employee_id"] or str(current_user["id"]),
        "name": current_user["name"],
        "email": current_user["email"],
        "phone": current_user["phone"],
        "role": current_user["role"],
        "verified": current_user["is_active"],
        "latitude": float(loc["latitude"]) if loc and loc["latitude"] else None,
        "longitude": float(loc["longitude"]) if loc and loc["longitude"] else None,
        "location_updated": loc["recorded_at"].isoformat() if loc and loc["recorded_at"] else None
    }

    return {
        "Status": "Success",
        "status": "success",
        "payload": payload
    }

@app.get("/dashboard/stats")
def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    role = current_user["role"].lower()

    total_leads = db_query("SELECT COUNT(*) as cnt FROM leads", fetch_one=True)["cnt"]
    converted_leads = db_query("SELECT COUNT(*) as cnt FROM leads WHERE status = 'WON'", fetch_one=True)["cnt"]
    active_leads = db_query("SELECT COUNT(*) as cnt FROM leads WHERE status = 'HOT'", fetch_one=True)["cnt"]

    total_sales = db_query("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders", fetch_one=True)["total"]

    low_stock_count = db_query("SELECT COUNT(*) as cnt FROM inventory WHERE current_stock <= minimum_stock AND current_stock > 0", fetch_one=True)["cnt"]
    out_of_stock_count = db_query("SELECT COUNT(*) as cnt FROM inventory WHERE current_stock <= 0", fetch_one=True)["cnt"]
    total_items = db_query("SELECT COUNT(*) as cnt FROM inventory", fetch_one=True)["cnt"]

    pending_pr_count = db_query("SELECT COUNT(*) as cnt FROM purchase_requests WHERE status = 'PENDING'", fetch_one=True)["cnt"]
    approved_pr_count = db_query("SELECT COUNT(*) as cnt FROM purchase_requests WHERE status = 'APPROVED'", fetch_one=True)["cnt"]

    active_employees = db_query("SELECT COUNT(*) as cnt FROM users WHERE is_active = true", fetch_one=True)["cnt"]
    pending_employees = db_query("SELECT COUNT(*) as cnt FROM users WHERE is_active = false", fetch_one=True)["cnt"]

    total_customers = db_query("SELECT COUNT(*) as cnt FROM customers", fetch_one=True)["cnt"]

    total_receivables = db_query("SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices", fetch_one=True)["total"]
    payments_received = db_query("SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE payment_status = 'PAID'", fetch_one=True)["total"]
    outstanding_balance = db_query("SELECT COALESCE(SUM(total_amount), 0) as total FROM invoices WHERE payment_status != 'PAID'", fetch_one=True)["total"]

    prod_rows = db_query("SELECT status, COUNT(*) as cnt FROM production GROUP BY status")
    prod_summary = {"PENDING": 0, "PRINTING": 0, "PASTING": 0, "PACKING": 0, "OUT FOR DELIVERY": 0, "COMPLETED": 0}
    for row in prod_rows:
        if row["status"] in prod_summary:
            prod_summary[row["status"]] = row["cnt"]

    my_total_leads = db_query("SELECT COUNT(*) as cnt FROM leads WHERE assigned_sales_id = %s", (user_id,), fetch_one=True)["cnt"]
    my_converted_leads = db_query("SELECT COUNT(*) as cnt FROM leads WHERE assigned_sales_id = %s AND status = 'WON'", (user_id,), fetch_one=True)["cnt"]
    my_active_leads = db_query("SELECT COUNT(*) as cnt FROM leads WHERE assigned_sales_id = %s AND status = 'HOT'", (user_id,), fetch_one=True)["cnt"]
    my_pipeline_value = db_query("SELECT COALESCE(SUM(o.total_amount), 0) as total FROM orders o JOIN leads l ON o.lead_id = l.id WHERE l.assigned_sales_id = %s", (user_id,), fetch_one=True)["total"]

    today_checkins = db_query("SELECT COUNT(*) as cnt FROM attendance WHERE date = CURRENT_DATE", fetch_one=True)["cnt"]

    return {
        "status": "success",
        "role": role,
        "admin_stats": {
            "total_leads": total_leads,
            "converted_leads": converted_leads,
            "active_leads": active_leads,
            "total_sales": float(total_sales),
            "low_stock_count": low_stock_count,
            "pending_pr_count": pending_pr_count,
            "active_employees": active_employees,
            "total_customers": total_customers,
            "total_receivables": float(total_receivables),
            "payments_received": float(payments_received),
            "outstanding_balance": float(outstanding_balance)
        },
        "sales_stats": {
            "my_total_leads": my_total_leads,
            "my_converted_leads": my_converted_leads,
            "my_active_leads": my_active_leads,
            "my_pipeline_value": float(my_pipeline_value)
        },
        "inventory_stats": {
            "total_items": total_items,
            "low_stock_count": low_stock_count,
            "out_of_stock_count": out_of_stock_count,
            "pending_pr_count": pending_pr_count,
            "approved_pr_count": approved_pr_count
        },
        "production_stats": {
            "pending_count": prod_summary["PENDING"],
            "printing_count": prod_summary["PRINTING"],
            "pasting_count": prod_summary["PASTING"],
            "packing_count": prod_summary["PACKING"],
            "out_for_delivery_count": prod_summary["OUT FOR DELIVERY"],
            "completed_count": prod_summary["COMPLETED"]
        },
        "hr_stats": {
            "total_employees": active_employees + pending_employees,
            "pending_approvals": pending_employees,
            "today_checkins": today_checkins
        }
    }

@app.get("/users")
def list_users(current_user: dict = Depends(get_current_user)):
    users = db_query(
        """
        SELECT u.id, u.employee_id, u.name, u.email, u.phone, u.role, u.salary, u.is_active,
               el.latitude, el.longitude, el.recorded_at as location_updated
        FROM users u
        LEFT JOIN (
            SELECT DISTINCT ON (user_id) user_id, latitude, longitude, recorded_at
            FROM employee_locations
            ORDER BY user_id, recorded_at DESC
        ) el ON u.id = el.user_id
        ORDER BY u.id
        """
    )

    formatted = []
    for u in users:
        formatted.append({
            "id": u["id"],
            "employee_id": u["employee_id"] or str(u["id"]),
            "name": u["name"],
            "email": u["email"],
            "phone": u["phone"],
            "role": u["role"],
            "salary": float(u["salary"]) if u["salary"] else 0.0,
            "status": u["is_active"],
            "latitude": float(u["latitude"]) if u["latitude"] else None,
            "longitude": float(u["longitude"]) if u["longitude"] else None,
            "location_updated": u["location_updated"].isoformat() if u["location_updated"] else None
        })

    return {"status": "success", "users": formatted}

@app.get("/user/{employee_id}")
def get_user(employee_id: str, current_user: dict = Depends(get_current_user)):
    user = find_user_by_eid(employee_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    loc = db_query(
        "SELECT latitude, longitude, recorded_at FROM employee_locations WHERE user_id = %s ORDER BY recorded_at DESC LIMIT 1",
        (user["id"],),
        fetch_one=True
    )

    formatted_user = {
        "id": user["id"],
        "employee_id": user["employee_id"] or str(user["id"]),
        "name": user["name"],
        "email": user["email"],
        "phone": user["phone"],
        "role": user["role"],
        "salary": float(user["salary"]) if user["salary"] else 0.0,
        "status": user["is_active"],
        "created_at": user["created_at"].isoformat() if user["created_at"] else None,
        "latitude": float(loc["latitude"]) if loc and loc["latitude"] else None,
        "longitude": float(loc["longitude"]) if loc and loc["longitude"] else None,
        "location_updated": loc["recorded_at"].isoformat() if loc and loc["recorded_at"] else None
    }

    return {"status": "success", "user": formatted_user}

@app.put("/verify/{employee_id}")
def verify_user(employee_id: str, current_user: dict = Depends(RoleChecker(["admin", "hr"]))):
    user = find_user_by_eid(employee_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db_execute("UPDATE users SET is_active = true WHERE id = %s", (user["id"],))
    return {"status": "success", "message": "User verified successfully"}

@app.delete("/user/{employee_id}")
def delete_user(employee_id: str, current_user: dict = Depends(RoleChecker(["admin", "hr"]))):
    user = find_user_by_eid(employee_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db_execute("DELETE FROM users WHERE id = %s", (user["id"],))
    return {"status": "success", "message": "User deleted successfully"}

@app.post("/checkin")
def check_in(req: LocationUpdate, employee_id: str = Query(...), current_user: dict = Depends(get_current_user)):
    user = find_user_by_eid(employee_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now()
    today = date.today()

    existing = db_query("SELECT id FROM attendance WHERE user_id = %s AND date = %s", (user["id"], today), fetch_one=True)
    if existing:
        raise HTTPException(status_code=400, detail="Already checked in today")

    db_execute(
        "INSERT INTO employee_locations (user_id, latitude, longitude, recorded_at) VALUES (%s, %s, %s, %s)",
        (user["id"], Decimal(str(req.lat)), Decimal(str(req.lon)), now)
    )

    db_execute(
        "INSERT INTO attendance (user_id, check_in, date) VALUES (%s, %s, %s)",
        (user["id"], now, today)
    )

    return {"status": "success", "message": "Checked in successfully"}

@app.put("/checkout")
def check_out(req: LocationUpdate, employee_id: str = Query(...), current_user: dict = Depends(get_current_user)):
    user = find_user_by_eid(employee_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now()
    today = date.today()

    att = db_query("SELECT * FROM attendance WHERE user_id = %s AND date = %s", (user["id"], today), fetch_one=True)
    if not att:
        raise HTTPException(status_code=400, detail="No check-in record found for today")

    db_execute(
        "INSERT INTO employee_locations (user_id, latitude, longitude, recorded_at) VALUES (%s, %s, %s, %s)",
        (user["id"], Decimal(str(req.lat)), Decimal(str(req.lon)), now)
    )

    check_in_time = att["check_in"]
    time_diff = now - check_in_time
    hours = Decimal(time_diff.total_seconds() / 3600.0)

    db_execute(
        "UPDATE attendance SET check_out = %s, work_hours = %s WHERE id = %s",
        (now, hours, att["id"])
    )

    return {"status": "success", "message": "Checked out successfully"}

@app.get("/attendance/{employee_id}")
def get_attendance_logs(employee_id: str, month: int = Query(...), year: int = Query(...), current_user: dict = Depends(get_current_user)):
    user = find_user_by_eid(employee_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    logs = db_query(
        """
        SELECT * FROM attendance
        WHERE user_id = %s
          AND EXTRACT(MONTH FROM date) = %s
          AND EXTRACT(YEAR FROM date) = %s
        ORDER BY date DESC
        """,
        (user["id"], month, year)
    )

    formatted = []
    for log in logs:

        checkin_loc = None
        checkout_loc = None

        if log["check_in"]:
            checkin_loc = db_query(
                """
                SELECT latitude, longitude FROM employee_locations
                WHERE user_id = %s AND recorded_at BETWEEN %s - INTERVAL '30 minutes' AND %s + INTERVAL '30 minutes'
                ORDER BY ABS(EXTRACT(EPOCH FROM (recorded_at - %s))) ASC LIMIT 1
                """,
                (user["id"], log["check_in"], log["check_in"], log["check_in"]),
                fetch_one=True
            )

        if log["check_out"]:
            checkout_loc = db_query(
                """
                SELECT latitude, longitude FROM employee_locations
                WHERE user_id = %s AND recorded_at BETWEEN %s - INTERVAL '30 minutes' AND %s + INTERVAL '30 minutes'
                ORDER BY ABS(EXTRACT(EPOCH FROM (recorded_at - %s))) ASC LIMIT 1
                """,
                (user["id"], log["check_out"], log["check_out"], log["check_out"]),
                fetch_one=True
            )

        formatted.append({
            "id": log["id"],
            "attendance_date": log["date"].isoformat(),
            "status": "present",
            "checkin_time": log["check_in"].isoformat() if log["check_in"] else None,
            "checkout_time": log["check_out"].isoformat() if log["check_out"] else None,
            "work_hours": float(log["work_hours"]) if log["work_hours"] else 0.0,
            "checkin_lat": float(checkin_loc["latitude"]) if checkin_loc else None,
            "checkin_lon": float(checkin_loc["longitude"]) if checkin_loc else None,
            "checkout_lat": float(checkout_loc["latitude"]) if checkout_loc else None,
            "checkout_lon": float(checkout_loc["longitude"]) if checkout_loc else None,
        })

    return {"status": "success", "attendance": formatted}

@app.put("/update_location")
def update_location(req: LocationUpdate, employee_id: str = Query(...), current_user: dict = Depends(get_current_user)):
    user = find_user_by_eid(employee_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db_execute(
        "INSERT INTO employee_locations (user_id, latitude, longitude) VALUES (%s, %s, %s)",
        (user["id"], Decimal(str(req.lat)), Decimal(str(req.lon)))
    )

    return {"status": "success", "message": "Location updated successfully"}

@app.get("/customers")
def list_customers(current_user: dict = Depends(get_current_user)):
    role = current_user["role"].lower()
    user_id = current_user["id"]

    if role == "sales":
        customers = db_query(
            """
            SELECT DISTINCT c.* FROM customers c
            LEFT JOIN leads l ON l.customer_id = c.id
            LEFT JOIN orders o ON o.customer_id = c.id
            LEFT JOIN leads ol ON o.lead_id = ol.id
            WHERE l.assigned_sales_id = %s OR l.created_by_id = %s
               OR ol.assigned_sales_id = %s OR ol.created_by_id = %s
            ORDER BY c.company_name
            """,
            (user_id, user_id, user_id, user_id)
        )
        leads = db_query("SELECT * FROM leads WHERE assigned_sales_id = %s OR created_by_id = %s", (user_id, user_id))
        orders = db_query(
            """
            SELECT DISTINCT o.* FROM orders o
            LEFT JOIN leads l ON o.lead_id = l.id
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN leads cl ON cl.customer_id = c.id
            WHERE l.assigned_sales_id = %s OR l.created_by_id = %s
               OR cl.assigned_sales_id = %s OR cl.created_by_id = %s
            """,
            (user_id, user_id, user_id, user_id)
        )
    else:
        customers = db_query("SELECT * FROM customers ORDER BY company_name")
        leads = db_query("SELECT * FROM leads")
        orders = db_query("SELECT * FROM orders")

    cust_map = {}
    for c in customers:
        cust_map[c["id"]] = {
            "id": c["id"],
            "company_name": c["company_name"],
            "contact_person": c["contact_person"],
            "phone": c["phone"],
            "alternate_phone": c["alternate_phone"],
            "email": c["email"],
            "address": c["address"],
            "gst_number": c["gst_number"],
            "notes": c["notes"],
            "created_at": c["created_at"].isoformat() if c["created_at"] else None,
            "leads": [],
            "orders": []
        }

    for l in leads:
        cid = l["customer_id"]
        if cid in cust_map:
            frontend_status = map_status_from_db(l["status"])
            is_verified = frontend_status != "pending"
            is_converted = frontend_status == "converted"
            cust_map[cid]["leads"].append({
                "id": l["id"],
                "status": frontend_status,
                "db_status": l["status"],
                "priority": l["priority"] or "Priority(days)",
                "product_type": l["product_type"],
                "size": l["size"],
                "color": l["color"],
                "gsm": l["gsm"],
                "quantity": l["quantity"],
                "remarks": l["remarks"],
                "is_verified": is_verified,
                "is_converted": is_converted,
                "created_at": l["created_at"].isoformat() if l["created_at"] else None
            })

    for o in orders:
        cid = o["customer_id"]
        if cid in cust_map:
            stage, approval_status = parse_order_status(o["status"])
            cust_map[cid]["orders"].append({
                "id": o["id"],
                "order_number": o["order_number"],
                "product_type": o["product_type"],
                "size": o["size"],
                "color": o["color"],
                "gsm": o["gsm"],
                "quantity": o["quantity"],
                "unit_price": float(o["unit_price"]) if o["unit_price"] else 0.0,
                "total_amount": float(o["total_amount"]) if o["total_amount"] else 0.0,
                "status": approval_status,
                "stage": stage,
                "created_at": o["created_at"].isoformat() if o["created_at"] else None
            })

    return {"status": "success", "customers": list(cust_map.values())}

@app.get("/leads")
def list_leads(current_user: dict = Depends(get_current_user)):
    role = current_user["role"].lower()
    user_id = current_user["id"]

    query = """
        SELECT l.id, l.customer_id, l.assigned_sales_id, l.created_by_id, l.status, l.priority, l.product_type, l.size, l.color, l.gsm, l.quantity, l.remarks, l.created_at,
               l.handles, l.print_color, l.bag_type, l.followup_date,
               c.contact_person, c.company_name, c.email, c.phone, c.address,
               u.name as assigned_name, u.employee_id as assigned_employee_id,
               u2.name as creator_name, u2.employee_id as creator_employee_id
        FROM leads l
        JOIN customers c ON l.customer_id = c.id
        LEFT JOIN users u ON l.assigned_sales_id = u.id
        LEFT JOIN users u2 ON l.created_by_id = u2.id
    """

    if role == "sales":
        query += " WHERE l.assigned_sales_id = %s OR l.created_by_id = %s"
        query += " ORDER BY l.created_at DESC"
        leads = db_query(query, (user_id, user_id))
    else:
        query += " ORDER BY l.created_at DESC"
        leads = db_query(query)

    formatted = []
    for l in leads:
        frontend_status = map_status_from_db(l["status"])
        is_verified = not l["status"].startswith("PENDING_")
        is_converted = l["status"] == "WON"

        formatted.append({
            "id": l["id"],
            "customer_id": l["customer_id"],
            "name": l["contact_person"],
            "company_name": l["company_name"],
            "email": l["email"],
            "phone": l["phone"],
            "location": l["address"],
            "status": frontend_status,
            "db_status": l["status"],
            "note": l["remarks"],
            "source": "Manual",
            "is_verified": is_verified,
            "is_converted": is_converted,
            "priority": l["priority"] or "Priority(days)",
            "product_type": l["product_type"],
            "size": l["size"],
            "color": l["color"],
            "gsm": l["gsm"],
            "quantity": l["quantity"],
            "handles": l["handles"],
            "print_color": l["print_color"],
            "bag_type": l["bag_type"],
            "followup_date": str(l["followup_date"]) if l["followup_date"] else None,
            "assigned_to": l["assigned_employee_id"] if l["assigned_employee_id"] else "",
            "created_by": l["creator_employee_id"] if l["creator_employee_id"] else "",
            "created_at": l["created_at"].isoformat() if l["created_at"] else None
        })

    return {"status": "success", "leads": formatted}

@app.post("/lead")
def create_lead(req: LeadCreate, current_user: dict = Depends(get_current_user)):

    phone_val = req.phone.strip() if req.phone else None
    email_val = req.email.strip() if req.email else None
    company_val = req.company_name.strip() if req.company_name else None

    customer = None
    if phone_val or email_val:
        if phone_val and email_val:
            customer = db_query("SELECT id FROM customers WHERE (phone = %s AND phone != '') OR (email = %s AND email != '') LIMIT 1", (phone_val, email_val), fetch_one=True)
        elif phone_val:
            customer = db_query("SELECT id FROM customers WHERE phone = %s AND phone != '' LIMIT 1", (phone_val,), fetch_one=True)
        elif email_val:
            customer = db_query("SELECT id FROM customers WHERE email = %s AND email != '' LIMIT 1", (email_val,), fetch_one=True)

    if not customer and company_val:
        customer = db_query("SELECT id FROM customers WHERE company_name = %s AND company_name != '' LIMIT 1", (company_val,), fetch_one=True)

    if customer:
        cust_id = customer["id"]

        db_execute(
            "UPDATE customers SET company_name = %s, contact_person = %s, address = %s WHERE id = %s",
            (req.company_name, req.name, req.location, cust_id)
        )
    else:
        cust_id = db_execute(
            """
            INSERT INTO customers (company_name, contact_person, phone, email, address)
            VALUES (%s, %s, %s, %s, %s) RETURNING id
            """,
            (req.company_name, req.name, req.phone, req.email, req.location),
            return_id=True
        )

    assigned_sales_id = current_user["id"]
    if req.assigned_to:
        rep = find_user_by_eid(req.assigned_to)
        if rep:
            assigned_sales_id = rep["id"]

    role = current_user["role"].upper()
    frontend_status = (req.status or "PENDING_HOT").upper()
    if role in ["ADMIN", "HR"]:
        if frontend_status.startswith("PENDING_"):
            db_status = frontend_status.replace("PENDING_", "")
        else:
            db_status = frontend_status if frontend_status in ["HOT", "COLD"] else "HOT"
    else:
        if frontend_status in ["HOT", "PENDING_HOT"]:
            db_status = "PENDING_HOT"
        else:
            db_status = "PENDING_COLD"

    lead_id = db_execute(
        """
        INSERT INTO leads (customer_id, assigned_sales_id, status, remarks, priority, product_type, size, color, gsm, quantity, handles, print_color, bag_type, created_by_id, followup_date)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
        """,
        (cust_id, assigned_sales_id, db_status, req.note, req.priority or "Priority(days)", req.product_type, req.size, req.color, req.gsm, req.quantity, req.handles, req.print_color, req.bag_type, current_user["id"], req.followup_date),
        return_id=True
    )

    return {"status": "success", "message": "Lead created successfully", "lead_id": lead_id}

@app.put("/lead/{id}")
def update_lead(id: int, req: LeadUpdate, current_user: dict = Depends(get_current_user)):
    lead = db_query("SELECT * FROM leads WHERE id = %s", (id,), fetch_one=True)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    db_execute(
        "UPDATE customers SET company_name = %s, contact_person = %s, phone = %s, email = %s, address = %s WHERE id = %s",
        (req.company_name, req.name, req.phone, req.email, req.location, lead["customer_id"])
    )

    assigned_sales_id = lead["assigned_sales_id"]
    if req.assigned_to:
        rep = find_user_by_eid(req.assigned_to)
        if rep:
            assigned_sales_id = rep["id"]

    role = current_user["role"].upper()
    frontend_status = req.status.upper()

    if frontend_status in ["WON", "LOST"]:
        db_status = frontend_status
    elif role in ["ADMIN", "HR"]:
        if frontend_status.startswith("PENDING_"):
            db_status = frontend_status.replace("PENDING_", "")
        else:
            db_status = frontend_status if frontend_status in ["HOT", "COLD"] else "HOT"
    else:
        was_verified = not lead["status"].startswith("PENDING_")
        if was_verified:
            db_status = "HOT" if "HOT" in frontend_status else "COLD"
        else:
            db_status = "PENDING_HOT" if "HOT" in frontend_status else "PENDING_COLD"

    db_execute(
        """
        UPDATE leads
        SET remarks = %s, status = %s, assigned_sales_id = %s,
            priority = %s, product_type = %s, size = %s, color = %s, gsm = %s, quantity = %s,
            handles = %s, print_color = %s, bag_type = %s, followup_date = %s
        WHERE id = %s
        """,
        (req.note, db_status, assigned_sales_id, req.priority or "Priority(days)", req.product_type, req.size, req.color, req.gsm, req.quantity, req.handles, req.print_color, req.bag_type, req.followup_date, id)
    )

    return {"status": "success", "message": "Lead updated successfully"}

@app.put("/lead/{id}/verify")
def verify_lead(id: int, current_user: dict = Depends(RoleChecker(["admin", "hr"]))):
    lead = db_query("SELECT status FROM leads WHERE id = %s", (id,), fetch_one=True)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    old_status = lead["status"] or "PENDING_COLD"
    if old_status == "PENDING_HOT":
        new_status = "HOT"
    elif old_status == "PENDING_COLD":
        new_status = "COLD"
    else:
        new_status = "HOT"

    db_execute("UPDATE leads SET status = %s WHERE id = %s", (new_status, id))
    return {"status": "success", "message": "Lead verified successfully"}

@app.delete("/lead/{id}")
def delete_lead(id: int, current_user: dict = Depends(get_current_user)):
    lead = db_query("SELECT customer_id FROM leads WHERE id = %s", (id,), fetch_one=True)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    db_execute("DELETE FROM leads WHERE id = %s", (id,))
    db_execute("DELETE FROM customers WHERE id = %s", (lead["customer_id"],))
    return {"status": "success", "message": "Lead deleted successfully"}

@app.post("/lead/{id}/deal")
def convert_lead_to_deal(id: int, current_user: dict = Depends(get_current_user)):
    lead = db_query(
        """
        SELECT l.*, c.company_name, c.contact_person
        FROM leads l
        JOIN customers c ON l.customer_id = c.id
        WHERE l.id = %s
        """,
        (id,),
        fetch_one=True
    )
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    frontend_status = map_status_from_db(lead["status"])
    if frontend_status == "pending":
        raise HTTPException(status_code=400, detail="Lead must be verified before conversion")

    product_name = lead["product_type"] or "Standard Box"
    qty_needed = Decimal(str(lead["quantity"] or 1000))

    stock = db_query(
        "SELECT * FROM inventory WHERE item_name = %s AND category IN ('Indents', 'Finished Goods')",
        (product_name,),
        fetch_one=True
    )

    raw_materials_sufficient = True

    if not stock or stock["current_stock"] < qty_needed:

        raw_items = db_query("SELECT * FROM inventory WHERE category = 'Raw Material'")
        for raw in raw_items:
            if raw["current_stock"] < raw["minimum_stock"]:
                raw_materials_sufficient = False

                db_execute(
                    """
                    INSERT INTO purchase_requests (item_name, quantity, vendor_name, status, requested_by)
                    VALUES (%s, %s, %s, 'PENDING', %s)
                    """,
                    (raw["item_name"], raw["minimum_stock"] * 2, "Default Vendor", current_user["id"])
                )

    db_execute("UPDATE leads SET status = 'WON' WHERE id = %s", (id,))

    order_number = f"ORD-{datetime.now().strftime('%Y%m%d')}-{id}"

    order_id = db_execute(
        """
        INSERT INTO orders (customer_id, lead_id, order_number, product_type, size, color, gsm, quantity, unit_price, total_amount, status, handles, print_color, bag_type)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            lead["customer_id"],
            id,
            order_number,
            product_name,
            lead["size"] or "10x10x10",
            lead["color"] or "Brown",
            lead["gsm"] or "120",
            lead["quantity"] or 1000,
            Decimal("10.0"),
            qty_needed * Decimal("10.0"),
            "New|Pending Approval",
            lead["handles"],
            lead["print_color"],
            lead["bag_type"]
        ),
        return_id=True
    )

    return {
        "status": "success",
        "message": "Lead converted to Order successfully",
        "order_id": order_id,
        "raw_materials_sufficient": raw_materials_sufficient
    }

@app.get("/deals")
def list_deals(current_user: dict = Depends(get_current_user)):
    role = current_user["role"].lower()
    user_id = current_user["id"]

    query = """
        SELECT o.id, o.customer_id, o.lead_id, o.order_number, o.product_type, o.size, o.color, o.gsm,
               o.quantity, o.unit_price, o.total_amount, o.status as order_status, o.created_at,
               o.advance_received, o.balance_amount, o.expected_delivery_date,
               o.handles, o.print_color, o.bag_type,
               c.company_name, c.contact_person, c.phone, c.email,
               l.assigned_sales_id, l.created_by_id,
               u.employee_id as assigned_employee_id, u2.employee_id as creator_employee_id,
               p.status as production_status, p.expected_completion_date as production_expected_date,
               i.payment_status as invoice_payment_status, i.invoice_number as invoice_num
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        LEFT JOIN leads l ON o.lead_id = l.id
        LEFT JOIN users u ON l.assigned_sales_id = u.id
        LEFT JOIN users u2 ON l.created_by_id = u2.id
        LEFT JOIN production p ON o.id = p.order_id
        LEFT JOIN invoices i ON o.id = i.order_id
    """

    if role == "sales":
        query += """
            WHERE l.assigned_sales_id = %s OR l.created_by_id = %s
               OR o.customer_id IN (
                   SELECT customer_id FROM leads
                   WHERE assigned_sales_id = %s OR created_by_id = %s
               )
        """
        query += " ORDER BY o.created_at DESC"
        orders = db_query(query, (user_id, user_id, user_id, user_id))
    else:
        query += " ORDER BY o.created_at DESC"
        orders = db_query(query)

    formatted = []
    for o in orders:
        stage, approval_status = parse_order_status(o["order_status"])

        assigned_to = o["assigned_employee_id"] or current_user["employee_id"]
        created_by = o["creator_employee_id"] or current_user["employee_id"]

        formatted.append({
            "id": o["id"],
            "deal_name": o["order_number"],
            "company_name": o["company_name"],
            "contact_name": o["contact_person"],
            "phone": o["phone"],
            "email": o["email"],
            "deal_value": float(o["total_amount"]) if o["total_amount"] else 0.0,
            "stage": stage,
            "status": approval_status,
            "note": f"Product: {o['product_type']}, Qty: {o['quantity']}",
            "assigned_to": str(assigned_to),
            "created_by": str(created_by),
            "created_at": o["created_at"].isoformat() if o["created_at"] else None,
            "product_type": o["product_type"],
            "size": o["size"],
            "color": o["color"],
            "gsm": o["gsm"],
            "quantity": o["quantity"],
            "handles": o["handles"],
            "print_color": o["print_color"],
            "bag_type": o["bag_type"],
            "unit_price": float(o["unit_price"]) if o["unit_price"] else 0.0,
            "advance_received": float(o["advance_received"]) if o["advance_received"] else 0.0,
            "balance_amount": float(o["balance_amount"]) if o["balance_amount"] else 0.0,
            "expected_delivery_date": o["expected_delivery_date"].isoformat() if o["expected_delivery_date"] else None,
            "production_status": o["production_status"] or "N/A",
            "production_expected_date": o["production_expected_date"].isoformat() if o["production_expected_date"] else None,
            "invoice_payment_status": o["invoice_payment_status"] or "UNBILLED",
            "invoice_num": o["invoice_num"] or "N/A"
        })
    return {"status": "success", "deals": formatted}

@app.post("/deal")
def create_deal(req: DealCreate, current_user: dict = Depends(get_current_user)):

    phone_val = req.phone.strip() if req.phone else None
    email_val = req.email.strip() if req.email else None
    company_val = req.company_name.strip() if req.company_name else None

    customer = None
    if phone_val or email_val:
        if phone_val and email_val:
            customer = db_query("SELECT id FROM customers WHERE (phone = %s AND phone != '') OR (email = %s AND email != '') LIMIT 1", (phone_val, email_val), fetch_one=True)
        elif phone_val:
            customer = db_query("SELECT id FROM customers WHERE phone = %s AND phone != '' LIMIT 1", (phone_val,), fetch_one=True)
        elif email_val:
            customer = db_query("SELECT id FROM customers WHERE email = %s AND email != '' LIMIT 1", (email_val,), fetch_one=True)

    if not customer and company_val:
        customer = db_query("SELECT id FROM customers WHERE company_name = %s AND company_name != '' LIMIT 1", (company_val,), fetch_one=True)

    if customer:
        cust_id = customer["id"]
        db_execute(
            "UPDATE customers SET company_name = %s, contact_person = %s WHERE id = %s",
            (req.company_name, req.contact_name, cust_id)
        )
    else:
        cust_id = db_execute(
            """
            INSERT INTO customers (company_name, contact_person, phone, email)
            VALUES (%s, %s, %s, %s) RETURNING id
            """,
            (req.company_name, req.contact_name, req.phone, req.email),
            return_id=True
        )

    order_number = req.deal_name
    total_val = req.deal_value if req.deal_value else (req.quantity * req.unit_price if req.quantity and req.unit_price else Decimal("0"))

    order_id = db_execute(
        """
        INSERT INTO orders (customer_id, order_number, total_amount, status, product_type, size, color, gsm, quantity, unit_price, advance_received, balance_amount, expected_delivery_date)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
        """,
        (
            cust_id,
            order_number,
            total_val,
            "New|Pending Approval",
            req.product_type or "Standard Box",
            req.size or "10x10x10",
            req.color or "Brown",
            req.gsm or "120",
            req.quantity or 0,
            req.unit_price or Decimal("0"),
            req.advance_received or Decimal("0"),
            req.balance_amount or Decimal("0"),
            req.expected_delivery_date
        ),
        return_id=True
    )

    return {"status": "success", "message": "Deal created successfully", "deal_id": order_id}

@app.put("/deal/{id}")
def update_deal(id: int, req: DealUpdate, stage: Optional[str] = None, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    order = db_query("SELECT * FROM orders WHERE id = %s", (id,), fetch_one=True)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    curr_stage, curr_status = parse_order_status(order["status"])
    final_stage = stage if stage is not None else curr_stage
    final_status = status if status is not None else curr_status

    db_status = f"{final_stage}|{final_status}"

    total_val = req.deal_value if req.deal_value else (req.quantity * req.unit_price if req.quantity and req.unit_price else Decimal("0"))

    db_execute(
        """
        UPDATE orders
        SET order_number = %s, total_amount = %s, status = %s,
            product_type = %s, size = %s, color = %s, gsm = %s, quantity = %s, unit_price = %s,
            advance_received = %s, balance_amount = %s, expected_delivery_date = %s
        WHERE id = %s
        """,
        (
            req.deal_name,
            total_val,
            db_status,
            req.product_type or order["product_type"],
            req.size or order["size"],
            req.color or order["color"],
            req.gsm or order["gsm"],
            req.quantity if req.quantity is not None else order["quantity"],
            req.unit_price if req.unit_price is not None else order["unit_price"],
            req.advance_received if req.advance_received is not None else order["advance_received"],
            req.balance_amount if req.balance_amount is not None else order["balance_amount"],
            req.expected_delivery_date or order["expected_delivery_date"],
            id
        )
    )

    db_execute(
        "UPDATE customers SET company_name = %s, contact_person = %s, phone = %s, email = %s WHERE id = %s",
        (req.company_name, req.contact_name, req.phone, req.email, order["customer_id"])
    )

    if final_status == "Approved" and final_stage == "In Progress":

        prod = db_query("SELECT id FROM production WHERE order_id = %s", (id,), fetch_one=True)
        if not prod:
            db_execute(
                """
                INSERT INTO production (order_id, status, expected_completion_date)
                VALUES (%s, 'PENDING', %s)
                """,
                (id, date.today() + timedelta(days=7))
            )

    return {"status": "success", "message": "Deal updated successfully"}

@app.put("/deal/{id}/approve")
def approve_deal(id: int, current_user: dict = Depends(RoleChecker(["admin"]))):
    order = db_query("SELECT * FROM orders WHERE id = %s", (id,), fetch_one=True)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    stage, _ = parse_order_status(order["status"])

    new_status = f"{stage}|Approved"
    db_execute("UPDATE orders SET status = %s WHERE id = %s", (new_status, id))

    prod = db_query("SELECT id FROM production WHERE order_id = %s", (id,), fetch_one=True)
    if not prod:
        db_execute(
            """
            INSERT INTO production (order_id, status, expected_completion_date)
            VALUES (%s, 'PENDING', %s)
            """,
            (id, date.today() + timedelta(days=7))
        )

    return {"status": "success", "message": "Deal approved successfully"}

@app.put("/deal/{id}/reject")
def reject_deal(id: int, current_user: dict = Depends(RoleChecker(["admin"]))):
    order = db_query("SELECT * FROM orders WHERE id = %s", (id,), fetch_one=True)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    stage, _ = parse_order_status(order["status"])
    new_status = f"{stage}|Rejected"
    db_execute("UPDATE orders SET status = %s WHERE id = %s", (new_status, id))
    return {"status": "success", "message": "Deal rejected successfully"}

@app.get("/inventory")
def get_inventory(current_user: dict = Depends(get_current_user)):
    items = db_query("SELECT * FROM inventory ORDER BY id")
    formatted = []
    for item in items:

        status = "In Stock"
        if item["current_stock"] <= 0:
            status = "Out of Stock"
        elif item["current_stock"] <= item["minimum_stock"]:
            status = "Low Stock"

        formatted.append({
            "id": item["id"],
            "name": item["item_name"],
            "sku": f"SKU-{item['id']:03d}",
            "stock": float(item["current_stock"]),
            "minimum_stock": float(item["minimum_stock"]),
            "price": "₹10",
            "status": status,
            "supplier": "Default Supplier",
            "category": item["category"],
            "unit": item["unit"] or "pcs"
        })
    return {"status": "success", "inventory": formatted}

@app.post("/inventory/item")
def create_inventory_item(req: InventoryItemCreate, current_user: dict = Depends(RoleChecker(["admin", "inventory"]))):
    item_id = db_execute(
        """
        INSERT INTO inventory (item_name, category, unit, current_stock, minimum_stock)
        VALUES (%s, %s, %s, %s, %s) RETURNING id
        """,
        (req.item_name, req.category, req.unit, req.current_stock, req.minimum_stock),
        return_id=True
    )
    return {"status": "success", "message": "Inventory item created", "id": item_id}

@app.put("/inventory/item/{id}")
def update_inventory_item(id: int, req: InventoryItemUpdate, current_user: dict = Depends(RoleChecker(["admin", "inventory"]))):
    db_execute(
        """
        UPDATE inventory
        SET item_name = %s, category = %s, unit = %s, current_stock = %s, minimum_stock = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        """,
        (req.item_name, req.category, req.unit, req.current_stock, req.minimum_stock, id)
    )
    return {"status": "success", "message": "Inventory item updated successfully"}

@app.get("/purchase_requests")
def list_purchase_requests(current_user: dict = Depends(get_current_user)):
    reqs = db_query(
        """
        SELECT pr.*, u.name as requester_name
        FROM purchase_requests pr
        LEFT JOIN users u ON pr.requested_by = u.id
        ORDER BY pr.created_at DESC
        """
    )

    formatted = []
    for r in reqs:
        formatted.append({
            "id": r["id"],
            "item_name": r["item_name"],
            "quantity": float(r["quantity"]),
            "vendor_name": r["vendor_name"],
            "status": r["status"],
            "requested_by": r["requester_name"] or str(r["requested_by"]),
            "created_at": r["created_at"].isoformat() if r["created_at"] else None
        })
    return {"status": "success", "purchase_requests": formatted}

@app.post("/purchase_request")
def raise_purchase_request(req: PurchaseRequestCreate, current_user: dict = Depends(get_current_user)):
    pr_id = db_execute(
        """
        INSERT INTO purchase_requests (item_name, quantity, vendor_name, status, requested_by)
        VALUES (%s, %s, %s, 'PENDING', %s) RETURNING id
        """,
        (req.item_name, req.quantity, req.vendor_name or "Default Vendor", current_user["id"]),
        return_id=True
    )
    return {"status": "success", "message": "Purchase request raised", "id": pr_id}

@app.put("/purchase_request/{id}/approve")
def approve_purchase_request(id: int, current_user: dict = Depends(RoleChecker(["admin", "accountant", "accounts"]))):
    pr = db_query("SELECT * FROM purchase_requests WHERE id = %s", (id,), fetch_one=True)
    if not pr:
        raise HTTPException(status_code=404, detail="Purchase request not found")

    db_execute("UPDATE purchase_requests SET status = 'APPROVED', approved_by = %s WHERE id = %s", (current_user["id"], id))

    db_execute(
        "UPDATE inventory SET current_stock = current_stock + %s WHERE item_name = %s AND category = 'Raw Material'",
        (pr["quantity"], pr["item_name"])
    )

    return {"status": "success", "message": "Purchase request approved and inventory updated"}

@app.put("/purchase_request/{id}/reject")
def reject_purchase_request(id: int, current_user: dict = Depends(RoleChecker(["admin", "accountant", "accounts"]))):
    db_execute("UPDATE purchase_requests SET status = 'REJECTED', approved_by = %s WHERE id = %s", (current_user["id"], id))
    return {"status": "success", "message": "Purchase request rejected"}

@app.get("/production")
def list_production_records(current_user: dict = Depends(get_current_user)):
    records = db_query(
        """
        SELECT p.*, o.order_number, o.product_type, o.quantity, o.size, o.color, o.gsm, o.handles, o.print_color, o.bag_type, c.company_name
        FROM production p
        JOIN orders o ON p.order_id = o.id
        JOIN customers c ON o.customer_id = c.id
        ORDER BY p.id DESC
        """
    )

    formatted = []
    for r in records:
        formatted.append({
            "id": r["id"],
            "order_id": r["order_id"],
            "order_number": r["order_number"],
            "product_type": r["product_type"],
            "quantity": r["quantity"],
            "size": r["size"],
            "color": r["color"],
            "gsm": r["gsm"],
            "handles": r["handles"],
            "print_color": r["print_color"],
            "bag_type": r["bag_type"],
            "company_name": r["company_name"],
            "status": r["status"],
            "expected_completion_date": r["expected_completion_date"].isoformat() if r["expected_completion_date"] else None,
            "started_at": r["started_at"].isoformat() if r["started_at"] else None,
            "completed_at": r["completed_at"].isoformat() if r["completed_at"] else None,
            "remarks": r["remarks"]
        })
    return {"status": "success", "production": formatted}

@app.put("/production/{id}")
def update_production_status(id: int, req: ProductionUpdate, current_user: dict = Depends(RoleChecker(["admin", "production"]))):
    prod = db_query("SELECT * FROM production WHERE id = %s", (id,), fetch_one=True)
    if not prod:
        raise HTTPException(status_code=404, detail="Production record not found")

    started_at_clause = ""
    completed_at_clause = ""

    if req.status != "PENDING" and not prod["started_at"]:
        started_at_clause = ", started_at = CURRENT_TIMESTAMP"
    if req.status == "COMPLETED" and not prod["completed_at"]:
        completed_at_clause = ", completed_at = CURRENT_TIMESTAMP"

    db_execute(
        f"""
        UPDATE production
        SET status = %s, expected_completion_date = %s, remarks = %s {started_at_clause} {completed_at_clause}
        WHERE id = %s
        """,
        (req.status, req.expected_completion_date, req.remarks, id)
    )

    db_execute(
        "UPDATE orders SET status = %s WHERE id = %s",
        (f"In Progress|{req.status}", prod["order_id"])
    )

    if req.status == "COMPLETED":

        inv = db_query("SELECT id FROM invoices WHERE order_id = %s", (prod["order_id"],), fetch_one=True)
        if not inv:
            order = db_query("SELECT * FROM orders WHERE id = %s", (prod["order_id"],), fetch_one=True)
            invoice_num = f"INV-{datetime.now().strftime('%Y%m%d')}-{prod['order_id']}"
            subtotal = order["total_amount"]
            gst = subtotal * Decimal("0.18")
            total = subtotal + gst

            db_execute(
                """
                INSERT INTO invoices (order_id, invoice_number, subtotal, gst, total_amount, payment_status)
                VALUES (%s, %s, %s, %s, %s, 'PENDING')
                """,
                (prod["order_id"], invoice_num, subtotal, gst, total)
            )

    return {"status": "success", "message": "Production record updated successfully"}

@app.get("/invoices")
def list_invoices(current_user: dict = Depends(get_current_user)):
    invs = db_query(
        """
        SELECT i.*, o.order_number, c.company_name
        FROM invoices i
        JOIN orders o ON i.order_id = o.id
        JOIN customers c ON o.customer_id = c.id
        ORDER BY i.generated_at DESC
        """
    )

    formatted = []
    for iv in invs:
        formatted.append({
            "id": iv["id"],
            "order_id": iv["order_id"],
            "order_number": iv["order_number"],
            "company_name": iv["company_name"],
            "invoice_number": iv["invoice_number"],
            "subtotal": float(iv["subtotal"]),
            "gst": float(iv["gst"]),
            "transport_charge": float(iv["transport_charge"]),
            "stereo_charge": float(iv["stereo_charge"]),
            "total_amount": float(iv["total_amount"]),
            "payment_status": iv["payment_status"],
            "generated_at": iv["generated_at"].isoformat() if iv["generated_at"] else None
        })
    return {"status": "success", "invoices": formatted}

@app.post("/invoice")
def create_invoice(req: InvoiceCreate, current_user: dict = Depends(RoleChecker(["admin", "accountant", "accounts"]))):

    inv = db_query("SELECT id FROM invoices WHERE order_id = %s OR invoice_number = %s", (req.order_id, req.invoice_number), fetch_one=True)
    if inv:
        raise HTTPException(status_code=400, detail="Invoice for this order or with this invoice number already exists")

    db_execute(
        """
        INSERT INTO invoices (order_id, invoice_number, subtotal, gst, transport_charge, stereo_charge, total_amount, payment_status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (req.order_id, req.invoice_number, req.subtotal, req.gst, req.transport_charge or 0, req.stereo_charge or 0, req.total_amount, req.payment_status or "PENDING")
    )
    return {"status": "success", "message": "Invoice generated successfully"}

@app.put("/invoice/{id}/payment")
def update_invoice_payment_status(id: int, req: InvoicePaymentUpdate, current_user: dict = Depends(RoleChecker(["admin", "accountant", "accounts"]))):
    inv = db_query("SELECT * FROM invoices WHERE id = %s", (id,), fetch_one=True)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")

    db_execute("UPDATE invoices SET payment_status = %s WHERE id = %s", (req.payment_status, id))

    if req.payment_status == "PAID":

        db_status = "Closed Won|PAYMENT_RECEIVED"
        db_execute("UPDATE orders SET status = %s WHERE id = %s", (db_status, inv["order_id"]))

    return {"status": "success", "message": "Invoice payment status updated successfully"}

@app.post("/customer")
def create_customer(req: CustomerCreate, current_user: dict = Depends(get_current_user)):

    existing = db_query("SELECT id FROM customers WHERE phone = %s OR (email IS NOT NULL AND email = %s)", (req.phone, req.email), fetch_one=True)
    if existing:
        raise HTTPException(status_code=400, detail="Customer with this phone or email already exists")

    cust_id = db_execute(
        """
        INSERT INTO customers (company_name, contact_person, phone, alternate_phone, email, address, gst_number, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
        """,
        (req.company_name, req.contact_person, req.phone, req.alternate_phone, req.email, req.address, req.gst_number, req.notes),
        return_id=True
    )
    return {"status": "success", "message": "Customer created successfully", "customer_id": cust_id}

@app.post("/production/start/{order_id}")
def start_production(order_id: int, current_user: dict = Depends(get_current_user)):
    order = db_query("SELECT * FROM orders WHERE id = %s", (order_id,), fetch_one=True)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    prod = db_query("SELECT id FROM production WHERE order_id = %s", (order_id,), fetch_one=True)
    if prod:
        raise HTTPException(status_code=400, detail="Production has already started for this order")

    db_execute(
        """
        INSERT INTO production (order_id, status, expected_completion_date)
        VALUES (%s, 'PENDING', %s)
        """,
        (order_id, date.today() + timedelta(days=7))
    )

    db_execute(
        "UPDATE orders SET status = 'In Progress|PENDING' WHERE id = %s",
        (order_id,)
    )

    return {"status": "success", "message": "Production started successfully"}

@app.get("/indents")
def list_indents(current_user: dict = Depends(get_current_user)):
    indents = db_query(
        """
        SELECT i.*, u.name as requester_name, app.name as approver_name
        FROM indents i
        LEFT JOIN users u ON i.requested_by = u.id
        LEFT JOIN users app ON i.approved_by = app.id
        ORDER BY i.created_at DESC
        """
    )

    formatted = []
    for ind in indents:
        formatted.append({
            "id": ind["id"],
            "item_name": ind["item_name"],
            "size": ind["size"],
            "quantity": float(ind["quantity"]),
            "status": ind["status"],
            "requester_name": ind["requester_name"] or "System",
            "approver_name": ind["approver_name"] or "N/A",
            "created_at": ind["created_at"].isoformat() if ind["created_at"] else None
        })
    return {"status": "success", "indents": formatted}

@app.post("/indent")
def create_indent(req: IndentCreate, current_user: dict = Depends(get_current_user)):
    indent_id = db_execute(
        """
        INSERT INTO indents (item_name, size, quantity, requested_by)
        VALUES (%s, %s, %s, %s) RETURNING id
        """,
        (req.item_name, req.size, req.quantity, current_user["id"]),
        return_id=True
    )
    return {"status": "success", "message": "Indent request submitted successfully", "indent_id": indent_id}

@app.put("/indent/{id}/approve")
def approve_indent(id: int, current_user: dict = Depends(RoleChecker(["admin", "accountant", "accounts"]))):
    indent = db_query("SELECT * FROM indents WHERE id = %s", (id,), fetch_one=True)
    if not indent:
        raise HTTPException(status_code=404, detail="Indent request not found")

    if indent["status"] != "PENDING":
        raise HTTPException(status_code=400, detail="Indent is already processed")

    db_execute(
        "UPDATE indents SET status = 'APPROVED', approved_by = %s WHERE id = %s",
        (current_user["id"], id)
    )

    inv_item = db_query(
        "SELECT id, current_stock FROM inventory WHERE item_name = %s",
        (indent["item_name"],),
        fetch_one=True
    )
    if inv_item:
        new_stock = inv_item["current_stock"] + indent["quantity"]
        db_execute(
            "UPDATE inventory SET current_stock = %s WHERE id = %s",
            (new_stock, inv_item["id"])
        )
    else:

        category = "Indents" if any(p in indent["item_name"] for p in ["Medical pouches", "V bottoms", "Square bottom", "Tissues"]) else "Raw Material"
        db_execute(
            """
            INSERT INTO inventory (item_name, category, current_stock, minimum_stock, unit)
            VALUES (%s, %s, %s, 100, 'Units')
            """,
            (indent["item_name"], category, indent["quantity"])
        )

    return {"status": "success", "message": "Indent approved and inventory updated"}

@app.put("/indent/{id}/reject")
def reject_indent(id: int, current_user: dict = Depends(RoleChecker(["admin", "accountant", "accounts"]))):
    indent = db_query("SELECT * FROM indents WHERE id = %s", (id,), fetch_one=True)
    if not indent:
        raise HTTPException(status_code=404, detail="Indent request not found")

    if indent["status"] != "PENDING":
        raise HTTPException(status_code=400, detail="Indent is already processed")

    db_execute(
        "UPDATE indents SET status = 'REJECTED', approved_by = %s WHERE id = %s",
        (current_user["id"], id)
    )
    return {"status": "success", "message": "Indent request rejected"}

@app.post("/logout")
def logout(current_user: dict = Depends(get_current_user)):
    today = date.today()
    now = datetime.now()
    att = db_query("SELECT * FROM attendance WHERE user_id = %s AND date = %s", (current_user["id"], today), fetch_one=True)
    if att and not att["check_out"]:
        check_in_time = att["check_in"]
        time_diff = now - check_in_time
        hours = Decimal(time_diff.total_seconds() / 3600.0)
        db_execute(
            "UPDATE attendance SET check_out = %s, work_hours = %s WHERE id = %s",
            (now, hours, att["id"])
        )
    return {"status": "success", "message": "Logged out successfully"}

@app.get("/alerts")
def get_alerts(current_user: dict = Depends(get_current_user)):
    role = current_user["role"].lower()
    user_id = current_user["id"]
    alerts = []

    reminders = db_query("""
        SELECT id, title, description, remind_at
        FROM reminders
        WHERE user_id = %s OR user_id IS NULL
        ORDER BY remind_at ASC
    """, (user_id,))
    for r in reminders:
        alerts.append({
            "id": f"reminder-{r['id']}",
            "type": "reminder",
            "category": "Reminders",
            "title": r["title"],
            "description": r["description"] or "",
            "date": r["remind_at"].strftime("%Y-%m-%d %H:%M") if r["remind_at"] else "",
            "severity": "info",
            "raw_id": r["id"]
        })

    if role == "sales" or role == "admin":
        query_lead_followup = """
            SELECT l.id, c.company_name, c.contact_person, l.followup_date
            FROM leads l
            JOIN customers c ON l.customer_id = c.id
            WHERE l.followup_date IS NOT NULL
        """
        params = ()
        if role == "sales":
            query_lead_followup += " AND (l.assigned_sales_id = %s OR l.created_by_id = %s)"
            params = (user_id, user_id)

        followups = db_query(query_lead_followup, params)
        today = date.today()
        for f in followups:
            fdate = f["followup_date"]
            if fdate:
                diff = (fdate - today).days
                if diff <= 3:
                    severity = "warning" if diff < 0 else "info"
                    status_str = f"Overdue by {abs(diff)} days!" if diff < 0 else (f"Due today!" if diff == 0 else f"Due in {diff} days")
                    alerts.append({
                        "id": f"followup-{f['id']}",
                        "type": "lead_followup",
                        "category": "Lead Followups",
                        "title": f"Follow up with {f['contact_person']} ({f['company_name']})",
                        "description": f"Follow-up date: {fdate.strftime('%Y-%m-%d')} ({status_str})",
                        "date": fdate.strftime("%Y-%m-%d"),
                        "severity": severity
                    })

    if role == "inventory" or role == "admin":
        low_stock_items = db_query("""
            SELECT item_name, current_stock, minimum_stock, unit
            FROM inventory
            WHERE current_stock <= minimum_stock
        """)
        for item in low_stock_items:
            severity = "danger" if item["current_stock"] <= 0 else "warning"
            stock_str = f"{item['current_stock']} {item['unit'] or ''}" if item['current_stock'] > 0 else "OUT OF STOCK"
            alerts.append({
                "id": f"lowstock-{item['item_name']}",
                "type": "low_stock",
                "category": "Stock Alerts",
                "title": f"Low stock: {item['item_name']}",
                "description": f"Current: {stock_str} | Minimum: {item['minimum_stock']}",
                "date": "Now",
                "severity": severity
            })

        pr_query = "SELECT id, item_name, quantity, status FROM purchase_requests"
        if role == "inventory":
            pr_query += " WHERE requested_by = %s"
            params = (user_id,)
        else:
            params = ()
        prs = db_query(pr_query, params)
        for pr in prs:
            if pr["status"] == "PENDING":
                alerts.append({
                    "id": f"pr-{pr['id']}",
                    "type": "purchase_request",
                    "category": "Purchase Requests",
                    "title": f"PR Pending: {pr['item_name']}",
                    "description": f"Quantity: {pr['quantity']} - Awaiting Admin approval",
                    "date": "Pending",
                    "severity": "info"
                })

    if role == "production" or role == "admin":
        prod_tasks = db_query("""
            SELECT p.id, o.order_number, p.status, p.expected_completion_date
            FROM production p
            JOIN orders o ON p.order_id = o.id
            WHERE p.status != 'COMPLETED'
        """)
        for task in prod_tasks:
            severity = "info" if task["status"] != "PENDING" else "warning"
            alerts.append({
                "id": f"prod-{task['id']}",
                "type": "production",
                "category": "Production Queue",
                "title": f"Production order: {task['order_number']}",
                "description": f"Stage: {task['status']} | Expected completion: {task['expected_completion_date'] or 'N/A'}",
                "date": str(task["expected_completion_date"]) if task["expected_completion_date"] else "No date",
                "severity": severity
            })

    if role == "admin":
        pending_users = db_query("SELECT id, name, employee_id, role FROM users WHERE is_active = false")
        for u in pending_users:
            alerts.append({
                "id": f"userverify-{u['id']}",
                "type": "user_verification",
                "category": "User Approvals",
                "title": f"User Verification: {u['name']}",
                "description": f"Role: {u['role']} | Emp ID: {u['employee_id']}",
                "date": "Pending",
                "severity": "warning"
            })

        pending_leads = db_query("""
            SELECT l.id, c.company_name, c.contact_person
            FROM leads l
            JOIN customers c ON l.customer_id = c.id
            WHERE l.status LIKE 'PENDING_%'
        """)
        for l in pending_leads:
            alerts.append({
                "id": f"leadverify-{l['id']}",
                "type": "lead_verification",
                "category": "Lead Approvals",
                "title": f"Verify Lead: {l['contact_person']}",
                "description": f"Company: {l['company_name']} - Awaiting conversion check",
                "date": "Awaiting",
                "severity": "warning"
            })

    return {"status": "success", "alerts": alerts}

@app.post("/reminder")
def create_reminder(req: ReminderCreate, current_user: dict = Depends(get_current_user)):
    reminder_id = db_execute(
        """
        INSERT INTO reminders (user_id, title, description, remind_at)
        VALUES (%s, %s, %s, %s) RETURNING id
        """,
        (current_user["id"], req.title, req.description, req.remind_at),
        return_id=True
    )
    return {"status": "success", "message": "Reminder created successfully", "reminder_id": reminder_id}

@app.delete("/reminder/{id}")
def delete_reminder(id: int, current_user: dict = Depends(get_current_user)):
    rem = db_query("SELECT user_id FROM reminders WHERE id = %s", (id,), fetch_one=True)
    if not rem:
        raise HTTPException(status_code=404, detail="Reminder not found")
    if rem["user_id"] != current_user["id"] and current_user["role"].lower() != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this reminder")

    db_execute("DELETE FROM reminders WHERE id = %s", (id,))
    return {"status": "success", "message": "Reminder deleted successfully"}

def seed_admin():
    try:
        user_count = db_query("SELECT COUNT(*) as count FROM users", fetch_one=True)
        if user_count and user_count["count"] == 0:
            pw_hash = hash_password("password123")
            db_execute(
                """
                INSERT INTO users (name, email, phone, password_hash, role, department, designation, salary, employee_id, is_active)
                VALUES ('Admin User', 'admin@papyrus.com', '9999999999', %s, 'ADMIN', 'Management', 'Administrator', 0.0, 'EMP001', true)
                """,
                (pw_hash,)
            )
            print("Default admin seeded: admin@papyrus.com / password123")
    except Exception as e:
        print(f"Error seeding admin: {e}")

seed_admin()

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
