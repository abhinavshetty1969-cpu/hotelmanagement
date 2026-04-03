import { useState, useEffect, createContext, useContext, useCallback, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  LayoutDashboard, Users, Calendar, Receipt, TrendingUp, 
  UserPlus, LogOut, Menu, X, Bell, Download, Plus, Edit2, Trash2,
  Phone, MapPin, DollarSign, Clock, AlertCircle, CheckCircle,
  Star, Image, CalendarPlus, History, Home, Camera, MessageSquare,
  UserCog, Check, XCircle
} from "lucide-react";
import { format } from "date-fns";
import { Toaster, toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState(localStorage.getItem("userType") || null);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`);
      setUser(res.data);
      setUserType(res.data.user_type || res.data.role);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const loginAdmin = async (email, password) => {
    const res = await axios.post(`${API}/auth/admin-login`, { email, password });
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("userType", "admin");
    setToken(res.data.token);
    setUser(res.data.user);
    setUserType("admin");
    axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
    return res.data;
  };

  const loginStaff = async (username, password) => {
    const res = await axios.post(`${API}/auth/staff-login`, { username, password });
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("userType", "staff");
    setToken(res.data.token);
    setUser(res.data.user);
    setUserType("staff");
    axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
    return res.data;
  };

  const loginCustomer = async (email, password) => {
    const res = await axios.post(`${API}/customer/login`, { email, password });
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("userType", "customer");
    setToken(res.data.token);
    setUser(res.data.user);
    setUserType("customer");
    axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
    return res.data;
  };

  const registerCustomer = async (name, email, phone, password) => {
    const res = await axios.post(`${API}/customer/register`, { name, email, phone, password });
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("userType", "customer");
    setToken(res.data.token);
    setUser(res.data.user);
    setUserType("customer");
    axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userType");
    setToken(null);
    setUser(null);
    setUserType(null);
    delete axios.defaults.headers.common["Authorization"];
  };

  return (
    <AuthContext.Provider value={{ user, token, userType, loginAdmin, loginStaff, loginCustomer, registerCustomer, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Routes
const ProtectedRoute = ({ children, allowedTypes = [] }) => {
  const { token, loading, userType } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!token) return <Navigate to="/" />;
  if (allowedTypes.length > 0 && !allowedTypes.includes(userType)) {
    return <Navigate to="/" />;
  }
  return children;
};

// ============== QUOTATION TEMPLATE ==============
const QuotationTemplate = ({ event, customer }) => {
  if (!event || !customer) return null;
  const totalAmount = (event.per_plate_cost || 0) * (event.number_of_guests || 0);
  const finalAmount = totalAmount - (event.discount || 0);

  return (
    <div className="quotation-print-container" style={{ padding: "40px", backgroundColor: "white", color: "black", minHeight: "297mm" }}>
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #1A362D", paddingBottom: "20px", marginBottom: "30px" }}>
        <div>
          <h1 style={{ margin: 0, color: "#1A362D", fontSize: "28px" }}>CATERPRO</h1>
          <p style={{ margin: "5px 0", fontSize: "14px" }}>Premium Catering & Event Management</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <h2 style={{ margin: 0, fontSize: "24px", color: "#64748B" }}>QUOTATION</h2>
          <p style={{ margin: "5px 0" }}>Date: {format(new Date(), "dd/MM/yyyy")}</p>
          <p style={{ margin: "5px 0" }}>ID: #{event.id?.slice(0, 8)}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", marginBottom: "40px" }}>
        <div>
          <h3 style={{ color: "#1A362D", borderBottom: "1px solid #E2E8F0", paddingBottom: "5px" }}>Client Details</h3>
          <p><strong>Name:</strong> {customer.client_name}</p>
          <p><strong>Phone:</strong> {customer.phone_number}</p>
          <p><strong>Email:</strong> {customer.email || "-"}</p>
          <p><strong>Address:</strong> {customer.address || "-"}</p>
        </div>
        <div>
          <h3 style={{ color: "#1A362D", borderBottom: "1px solid #E2E8F0", paddingBottom: "5px" }}>Event Details</h3>
          <p><strong>Type:</strong> {event.event_type}</p>
          <p><strong>Date:</strong> {event.event_date}</p>
          <p><strong>Venue:</strong> {event.venue_name}</p>
          <p><strong>Guests:</strong> {event.number_of_guests}</p>
          <p><strong>Timing:</strong> {event.event_timing}</p>
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "40px" }}>
        <thead>
          <tr style={{ backgroundColor: "#F8FAFC", textAlign: "left" }}>
            <th style={{ padding: "12px", border: "1px solid #E2E8F0" }}>Description</th>
            <th style={{ padding: "12px", border: "1px solid #E2E8F0" }}>Quantity</th>
            <th style={{ padding: "12px", border: "1px solid #E2E8F0" }}>Rate</th>
            <th style={{ padding: "12px", border: "1px solid #E2E8F0" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: "12px", border: "1px solid #E2E8F0" }}>Catering Services - Per Plate Charge ({event.event_type})</td>
            <td style={{ padding: "12px", border: "1px solid #E2E8F0" }}>{event.number_of_guests}</td>
            <td style={{ padding: "12px", border: "1px solid #E2E8F0" }}>₹{event.per_plate_cost}</td>
            <td style={{ padding: "12px", border: "1px solid #E2E8F0" }}>₹{totalAmount.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginLeft: "auto", width: "300px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
          <span>Subtotal:</span>
          <span>₹{totalAmount.toLocaleString()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", color: "#DC2626" }}>
          <span>Discount:</span>
          <span>-₹{event.discount?.toLocaleString() || "0"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "15px 0", borderTop: "2px solid #1A362D", fontWeight: "bold", fontSize: "18px" }}>
          <span>Total Amount:</span>
          <span>₹{finalAmount.toLocaleString()}</span>
        </div>
      </div>

      <div style={{ marginTop: "60px", fontSize: "12px", color: "#64748B" }}>
        <p><strong>Terms & Conditions:</strong></p>
        <ol>
          <li>50% advance payment required for confirmation.</li>
          <li>Remaining balance to be cleared on or before the event date.</li>
          <li>Cancellation charges apply as per company policy.</li>
        </ol>
      </div>
    </div>
  );
};

// ============== LANDING PAGE ==============
const LandingPage = () => {
  const navigate = useNavigate();
  const { token, userType } = useAuth();

  useEffect(() => {
    if (token) {
      if (userType === "customer") {
        navigate("/customer/dashboard");
      } else {
        navigate("/admin/dashboard");
      }
    }
  }, [token, userType, navigate]);

  return (
    <div className="landing-page" data-testid="landing-page">
      <div className="landing-hero">
        <div className="landing-overlay"></div>
        <div className="landing-content">
          <h1>CaterPro</h1>
          <p>Premium Event Management & Catering Services</p>
          <div className="landing-buttons">
            <button className="btn btn-primary btn-lg" onClick={() => navigate("/customer/login")} data-testid="customer-login-btn">
              <Users size={20} /> Customer Portal
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => navigate("/admin/login")} data-testid="admin-login-btn">
              <UserCog size={20} /> Admin / Staff Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============== CUSTOMER LOGIN PAGE ==============
const CustomerLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const { loginCustomer, registerCustomer } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegister) {
        await registerCustomer(name, email, phone, password);
        toast.success("Registration successful!");
      } else {
        await loginCustomer(email, password);
      }
      navigate("/customer/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong");
    }
  };

  return (
    <div className="login-container" data-testid="customer-login-page">
      <div className="login-image customer-bg">
        <div className="login-image-content">
          <h1>Welcome to CaterPro</h1>
          <p>View your past events, photos, reviews & book new slots</p>
        </div>
      </div>
      <div className="login-form-container">
        <form className="login-form" onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.5rem" }}>
            <button type="button" onClick={() => navigate("/")} className="btn btn-ghost btn-sm">
              ← Back to Home
            </button>
          </div>
          <h2>{isRegister ? "Create Account" : "Customer Login"}</h2>
          <p>{isRegister ? "Register to access your events" : "Sign in to view your events & book slots"}</p>
          
          {error && <div className="error-alert"><AlertCircle size={18} /><span>{error}</span></div>}
          
          {isRegister && (
            <>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" required data-testid="customer-register-name" />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="tel" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter phone number" required data-testid="customer-register-phone" />
              </div>
            </>
          )}
          
          <div className="form-group">
            <label>Email</label>
            <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email" required data-testid="customer-login-email" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required data-testid="customer-login-password" />
          </div>
          <button type="submit" className="btn btn-primary btn-full" data-testid="customer-login-submit">
            {isRegister ? "Create Account" : "Sign In"}
          </button>
          <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.875rem", color: "#64748B" }}>
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <button type="button" onClick={() => setIsRegister(!isRegister)} className="link-btn" data-testid="customer-toggle-auth">
              {isRegister ? "Sign In" : "Register"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

// ============== ADMIN/STAFF LOGIN PAGE ==============
const AdminLoginPage = () => {
  const [loginType, setLoginType] = useState("admin"); // admin or staff
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { loginAdmin, loginStaff } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (loginType === "admin") {
        await loginAdmin(email, password);
      } else {
        await loginStaff(username, password);
      }
      navigate("/admin/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid credentials");
    }
  };

  return (
    <div className="login-container" data-testid="admin-login-page">
      <div className="login-image">
        <div className="login-image-content">
          <h1>CaterPro</h1>
          <p>Manage your hotel bookings and events with ease</p>
        </div>
      </div>
      <div className="login-form-container">
        <form className="login-form" onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.5rem" }}>
            <button type="button" onClick={() => navigate("/")} className="btn btn-ghost btn-sm">
              ← Back to Home
            </button>
          </div>
          <h2>Admin / Staff Login</h2>
          <p>Sign in to manage operations</p>

          <div className="login-type-toggle">
            <button type="button" className={`toggle-btn ${loginType === "admin" ? "active" : ""}`} onClick={() => setLoginType("admin")} data-testid="admin-type-btn">
              Admin
            </button>
            <button type="button" className={`toggle-btn ${loginType === "staff" ? "active" : ""}`} onClick={() => setLoginType("staff")} data-testid="staff-type-btn">
              Staff
            </button>
          </div>
          
          {error && <div className="error-alert"><AlertCircle size={18} /><span>{error}</span></div>}
          
          {loginType === "admin" ? (
            <div className="form-group">
              <label>Admin Email</label>
              <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin1@gmail.com" required data-testid="admin-email-input" />
            </div>
          ) : (
            <div className="form-group">
              <label>Username</label>
              <input type="text" className="form-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" required data-testid="staff-username-input" />
            </div>
          )}
          <div className="form-group">
            <label>Password</label>
            <input type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required data-testid="admin-password-input" />
          </div>
          <button type="submit" className="btn btn-primary btn-full" data-testid="admin-login-submit">
            Sign In as {loginType === "admin" ? "Admin" : "Staff"}
          </button>
        </form>
      </div>
    </div>
  );
};

// ============== ADMIN SIDEBAR ==============
const AdminSidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout, userType } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
    { icon: Calendar, label: "Bookings", path: "/admin/bookings" },
    { icon: Users, label: "Customers", path: "/admin/customers" },
    { icon: Receipt, label: "Expenses", path: "/admin/expenses" },
    { icon: DollarSign, label: "Payments", path: "/admin/payments" },
    { icon: TrendingUp, label: "Leads", path: "/admin/leads" },
    { icon: CalendarPlus, label: "Slot Requests", path: "/admin/slot-requests" },
  ];

  // Add staff management for admin only
  if (userType === "admin") {
    navItems.push({ icon: UserCog, label: "Staff", path: "/admin/staff" });
  }

  const handleNav = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? "open" : ""}`} onClick={() => setIsOpen(false)} />
      <aside className={`sidebar ${isOpen ? "open" : ""}`} data-testid="admin-sidebar">
        <div className="sidebar-logo">
          <Calendar size={28} style={{ color: "#1A362D" }} />
          <h1>CaterPro</h1>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <div
              key={item.path}
              className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
              onClick={() => handleNav(item.path)}
              data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
        <div className="user-menu">
          <div className="user-avatar">{user?.full_name?.charAt(0) || user?.username?.charAt(0) || "A"}</div>
          <div className="user-info">
            <h4>{user?.full_name || user?.username || "Admin"}</h4>
            <p>{userType}</p>
          </div>
          <button onClick={handleLogout} className="btn-ghost" style={{ padding: "0.5rem" }} data-testid="admin-logout-btn">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
};

// ============== ADMIN LAYOUT ==============
const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-container">
      <div className="mobile-header">
        <button onClick={() => setSidebarOpen(true)} className="btn-ghost">
          <Menu size={24} />
        </button>
        <h1 style={{ fontSize: "1rem", fontWeight: 600 }}>CaterPro</h1>
        <div style={{ width: 24 }} />
      </div>
      <AdminSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <main className="main-content">{children}</main>
    </div>
  );
};

// ============== CUSTOMER SIDEBAR ==============
const CustomerSidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Dashboard", path: "/customer/dashboard" },
    { icon: History, label: "Past Events", path: "/customer/past-events" },
    { icon: CalendarPlus, label: "Book Slot", path: "/customer/book-slot" },
    { icon: Calendar, label: "My Bookings", path: "/customer/my-bookings" },
  ];

  const handleNav = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? "open" : ""}`} onClick={() => setIsOpen(false)} />
      <aside className={`sidebar ${isOpen ? "open" : ""}`} data-testid="customer-sidebar">
        <div className="sidebar-logo">
          <Calendar size={28} style={{ color: "#1A362D" }} />
          <h1>CaterPro</h1>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <div
              key={item.path}
              className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
              onClick={() => handleNav(item.path)}
              data-testid={`customer-nav-${item.label.toLowerCase().replace(" ", "-")}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
        <div className="user-menu">
          <div className="user-avatar">{user?.name?.charAt(0) || "C"}</div>
          <div className="user-info">
            <h4>{user?.name || "Customer"}</h4>
            <p>Customer</p>
          </div>
          <button onClick={handleLogout} className="btn-ghost" style={{ padding: "0.5rem" }} data-testid="customer-logout-btn">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
};

// ============== CUSTOMER LAYOUT ==============
const CustomerLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-container">
      <div className="mobile-header">
        <button onClick={() => setSidebarOpen(true)} className="btn-ghost">
          <Menu size={24} />
        </button>
        <h1 style={{ fontSize: "1rem", fontWeight: 600 }}>CaterPro</h1>
        <div style={{ width: 24 }} />
      </div>
      <CustomerSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <main className="main-content">{children}</main>
    </div>
  );
};

// ============== MODAL COMPONENT ==============
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} className="btn-ghost" style={{ padding: "0.25rem" }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ============== CUSTOMER DASHBOARD ==============
const CustomerDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/customer/alerts`);
      setAlerts(res.data);
    } catch (err) {
      console.error("Failed to fetch alerts", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchAlerts();
  }, [user, fetchAlerts]);

  return (
    <CustomerLayout>
      <div data-testid="customer-dashboard-page">
        <div className="page-header">
          <h1>Welcome, {user?.name || "Customer"}!</h1>
        </div>

        {alerts.length > 0 && (
          <div className="alert-section" style={{ marginBottom: "2rem" }}>
            {alerts.map((alert, idx) => (
              <div key={idx} className="alert-card warning" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem", background: "#FFFBEB", borderLeft: "4px solid #D97706", borderRadius: "8px", marginBottom: "0.75rem" }}>
                <AlertCircle size={24} color="#D97706" />
                <div>
                  <h4 style={{ margin: 0, color: "#92400E" }}>Payment Due Soon</h4>
                  <p style={{ margin: 0, fontSize: "0.875rem", color: "#B45309" }}>{alert.msg}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="customer-welcome-card">
          <div className="welcome-content">
            <h2>What would you like to do today?</h2>
            <p>Manage your events, view memories, and book new slots</p>
          </div>
        </div>

        <div className="customer-actions-grid">
          <div className="action-card" onClick={() => navigate("/customer/past-events")} data-testid="view-past-events-card">
            <div className="action-icon" style={{ background: "#1A362D" }}><History size={24} /></div>
            <h3>View Past Events</h3>
            <p>Browse photos and memories from your previous events</p>
          </div>
          <div className="action-card" onClick={() => navigate("/customer/book-slot")} data-testid="book-slot-card">
            <div className="action-icon" style={{ background: "#C85A3C" }}><CalendarPlus size={24} /></div>
            <h3>Book a Slot</h3>
            <p>Schedule your next event with us</p>
          </div>
          <div className="action-card" onClick={() => navigate("/customer/my-bookings")} data-testid="my-bookings-card">
            <div className="action-icon" style={{ background: "#10B981" }}><Calendar size={24} /></div>
            <h3>My Bookings</h3>
            <p>Check the status of your booking requests</p>
          </div>
        </div>

        <PendingQuotationsSection />
      </div>
    </CustomerLayout>
  );
};

const PendingQuotationsSection = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const { user } = useAuth();
  
  const fetchEvents = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/customer/events`);
      setEvents(res.data.filter(e => e.quotation_status === "Sent"));
    } catch (err) {
      console.error("Failed to fetch events", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchEvents();
  }, [user, fetchEvents]);

  const handleAction = async (status, reason = "") => {
    try {
      await axios.put(`${API}/events/${selectedEvent.id}/quotation-status?status=${status}&rejection_reason=${reason}`);
      toast.success(`Quotation ${status}`);
      setModalOpen(false);
      setRejectModalOpen(false);
      fetchEvents();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  if (loading) return null;
  if (events.length === 0) return null;

  return (
    <div style={{ marginTop: "2rem" }}>
      <div className="page-header">
        <h3>Pending Quotations</h3>
      </div>
      <div className="events-grid">
        {events.map((event) => (
          <div key={event.id} className="data-card" style={{ padding: "1.5rem", borderLeft: "4px solid #C85A3C" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <h4 style={{ margin: 0, fontSize: "1.1rem" }}>{event.event_type}</h4>
                <p style={{ margin: "0.25rem 0", color: "#64748B", fontSize: "0.875rem" }}>{event.event_date} @ {event.venue_name}</p>
              </div>
              <span className="badge badge-sent">Quotation Sent</span>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn btn-primary btn-sm" onClick={() => { setSelectedEvent(event); setModalOpen(true); }}>
                View & Action
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Review Quotation">
        <div className="modal-body" style={{ maxHeight: "60vh", overflowY: "auto", background: "#F1F5F9", padding: "20px" }}>
          <QuotationTemplate event={selectedEvent} customer={{ client_name: user.name, phone_number: user.username, email: user.email, address: "" }} />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Close</button>
          <button type="button" className="btn btn-outline" style={{ color: "#DC2626" }} onClick={() => setRejectModalOpen(true)}>Reject</button>
          <button type="button" className="btn btn-primary" onClick={() => handleAction("Approved")}>Approve Quotation</button>
        </div>
      </Modal>

      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Quotation">
        <div className="modal-body">
          <p style={{ marginBottom: "1rem" }}>Please specify the reason for rejection:</p>
          <div className="form-group">
            <label>Rejection Reason *</label>
            <select className="form-select" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}>
              <option value="Prices are more">Prices are more</option>
              <option value="Event is cancelled">Event is cancelled</option>
              <option value="Others">Others</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={() => setRejectModalOpen(false)}>Cancel</button>
          <button type="button" className="btn btn-primary" style={{ background: "#DC2626" }} onClick={() => handleAction("Rejected", rejectionReason)}>Confirm Rejection</button>
        </div>
      </Modal>
    </div>
  );
};

// ============== CUSTOMER PAST EVENTS ==============
const CustomerPastEventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 5, review_text: "" });

  const fetchPastEvents = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/customer/past-events`);
      setEvents(res.data);
    } catch {
      // If no past events, show empty state
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPastEvents(); }, [fetchPastEvents]);

  const submitReview = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/customer/review`, {
        event_id: selectedEvent.id,
        rating: reviewData.rating,
        review_text: reviewData.review_text
      });
      toast.success("Review submitted!");
      setReviewModal(false);
      fetchPastEvents();
    } catch {
      toast.error("Failed to submit review");
    }
  };

  return (
    <CustomerLayout>
      <div data-testid="customer-past-events-page">
        <div className="page-header">
          <h1>Past Events</h1>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : events.length === 0 ? (
          <div className="empty-state-card">
            <History size={48} style={{ color: "#E5E3DF", marginBottom: "1rem" }} />
            <h3>No Past Events Yet</h3>
            <p>Once you have completed events with us, they will appear here with photos and memories.</p>
          </div>
        ) : (
          <div className="events-grid">
            {events.map((event) => (
              <div key={event.id} className="event-card" data-testid={`past-event-${event.id}`}>
                <div className="event-card-header">
                  <h3>{event.event_type}</h3>
                  <span className="event-date">{event.event_date}</span>
                </div>
                <div className="event-card-body">
                  <p><MapPin size={14} /> {event.venue_name}</p>
                  <p><Users size={14} /> {event.number_of_guests} Guests</p>
                </div>
                
                {event.photos?.length > 0 && (
                  <div className="event-photos-preview">
                    {event.photos.slice(0, 3).map((photo, idx) => (
                      <img key={idx} src={photo.photo_url} alt={photo.caption || "Event"} />
                    ))}
                    {event.photos.length > 3 && <span className="more-photos">+{event.photos.length - 3} more</span>}
                  </div>
                )}

                {event.reviews?.length > 0 && (
                  <div className="event-reviews-preview">
                    <div className="review-item">
                      <div className="review-stars">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} fill={i < event.reviews[0].rating ? "#F59E0B" : "none"} color="#F59E0B" />
                        ))}
                      </div>
                      <p className="review-text">{event.reviews[0].review_text}</p>
                    </div>
                  </div>
                )}

                <div className="event-card-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => { setSelectedEvent(event); setReviewModal(true); }}>
                    <MessageSquare size={14} /> Add Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal isOpen={reviewModal} onClose={() => setReviewModal(false)} title="Write a Review">
          <form onSubmit={submitReview}>
            <div className="modal-body">
              <div className="form-group">
                <label>Rating</label>
                <div className="rating-input">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={28}
                      fill={star <= reviewData.rating ? "#F59E0B" : "none"}
                      color="#F59E0B"
                      style={{ cursor: "pointer" }}
                      onClick={() => setReviewData({ ...reviewData, rating: star })}
                    />
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Your Review</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={reviewData.review_text}
                  onChange={(e) => setReviewData({ ...reviewData, review_text: e.target.value })}
                  placeholder="Share your experience..."
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setReviewModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Submit Review</button>
            </div>
          </form>
        </Modal>
      </div>
    </CustomerLayout>
  );
};

// ============== CUSTOMER BOOK SLOT ==============
const CustomerBookSlotPage = () => {
  const [formData, setFormData] = useState({
    event_date: "",
    event_type: "Wedding",
    number_of_guests: 100,
    event_timing: "",
    venue_preference: "",
    special_requests: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/customer/book-slot`, formData);
      toast.success("Booking request submitted! We will contact you soon.");
      setFormData({
        event_date: "",
        event_type: "Wedding",
        number_of_guests: 100,
        event_timing: "",
        venue_preference: "",
        special_requests: ""
      });
    } catch {
      toast.error("Failed to submit booking request");
    }
  };

  return (
    <CustomerLayout>
      <div data-testid="customer-book-slot-page">
        <div className="page-header">
          <h1>Book a Slot</h1>
        </div>

        <div className="booking-form-card">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Event Date *</label>
                <input type="date" className="form-input" value={formData.event_date} onChange={(e) => setFormData({ ...formData, event_date: e.target.value })} required data-testid="slot-date-input" />
              </div>
              <div className="form-group">
                <label>Event Type *</label>
                <select className="form-select" value={formData.event_type} onChange={(e) => setFormData({ ...formData, event_type: e.target.value })} data-testid="slot-type-select">
                  <option>Wedding</option>
                  <option>Birthday</option>
                  <option>Corporate</option>
                  <option>Anniversary</option>
                  <option>Engagement</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Number of Guests *</label>
                <input type="number" className="form-input" value={formData.number_of_guests} onChange={(e) => setFormData({ ...formData, number_of_guests: parseInt(e.target.value) || 0 })} required data-testid="slot-guests-input" />
              </div>
              <div className="form-group">
                <label>Preferred Timing *</label>
                <input className="form-input" value={formData.event_timing} onChange={(e) => setFormData({ ...formData, event_timing: e.target.value })} placeholder="e.g., 6 PM - 11 PM" required data-testid="slot-timing-input" />
              </div>
              <div className="form-group">
                <label>Venue Preference *</label>
                <select 
                  className="form-select" 
                  value={formData.venue_preference} 
                  onChange={(e) => setFormData({ ...formData, venue_preference: e.target.value })} 
                  required
                  data-testid="slot-venue-input"
                >
                  <option value="">Select Venue</option>
                  <option value="Hall 1">Hall 1 (Yeoor Hills)</option>
                  <option value="Hall 2">Hall 2 (Yeoor Hills)</option>
                  <option value="Outdoor Lawn">Outdoor Lawn</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group full-width">
                <label>Special Requests</label>
                <textarea className="form-input" rows={3} value={formData.special_requests} onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })} placeholder="Any special requirements or requests..." data-testid="slot-requests-input" />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-lg" data-testid="submit-booking-btn">
              <CalendarPlus size={20} /> Submit Booking Request
            </button>
          </form>
        </div>
      </div>
    </CustomerLayout>
  );
};

// ============== CUSTOMER MY BOOKINGS ==============
const CustomerMyBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/customer/my-bookings`);
      setBookings(res.data);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const getStatusBadge = (status) => {
    const classes = { Confirmed: "badge-approved", Pending: "badge-pending", Rejected: "badge-hot" };
    return <span className={`badge ${classes[status] || "badge-pending"}`}>{status}</span>;
  };

  return (
    <CustomerLayout>
      <div data-testid="customer-my-bookings-page">
        <div className="page-header">
          <h1>My Bookings</h1>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : bookings.length === 0 ? (
          <div className="empty-state-card">
            <Calendar size={48} style={{ color: "#E5E3DF", marginBottom: "1rem" }} />
            <h3>No Booking Requests</h3>
            <p>You haven't made any booking requests yet.</p>
          </div>
        ) : (
          <div className="data-card">
            <table className="data-table" data-testid="my-bookings-table">
              <thead>
                <tr>
                  <th>Event Date</th>
                  <th>Type</th>
                  <th>Guests</th>
                  <th>Timing</th>
                  <th>Venue Preference</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td>{b.event_date}</td>
                    <td>{b.event_type}</td>
                    <td>{b.number_of_guests}</td>
                    <td>{b.event_timing}</td>
                    <td>{b.venue_preference || "-"}</td>
                    <td>{getStatusBadge(b.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
};

// ============== ADMIN DASHBOARD ==============
const AdminDashboardPage = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${API}/dashboard`);
      setDashboard(res.data);
    } catch (err) {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <AdminLayout><p>Loading...</p></AdminLayout>;

  return (
    <AdminLayout>
      <div data-testid="admin-dashboard-page">
        <div className="page-header">
          <h1>Dashboard</h1>
          <p style={{ color: "#64748B", fontSize: "0.875rem" }}>{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>

        {(dashboard?.follow_up_reminders?.length > 0 || dashboard?.pending_bookings_count > 0) && (
          <div className="reminder-alert" data-testid="follow-up-reminder">
            <Bell size={20} />
            <div className="reminder-alert-content">
              <h4>Attention Needed</h4>
              <p>
                {dashboard?.pending_bookings_count > 0 && `${dashboard.pending_bookings_count} pending slot requests. `}
                {dashboard?.follow_up_reminders?.length > 0 && `${dashboard.follow_up_reminders.length} follow-ups due.`}
              </p>
            </div>
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-card" data-testid="stat-events">
            <div className="stat-icon primary"><Calendar size={20} /></div>
            <div className="stat-label">Today's Events</div>
            <div className="stat-value">{dashboard?.todays_events_count || 0}</div>
          </div>
          <div className="stat-card" data-testid="stat-expenses">
            <div className="stat-icon accent"><Receipt size={20} /></div>
            <div className="stat-label">Today's Expenses</div>
            <div className="stat-value">₹{(dashboard?.total_today_expenses || 0).toLocaleString()}</div>
          </div>
          <div className="stat-card" data-testid="stat-payments">
            <div className="stat-icon success"><DollarSign size={20} /></div>
            <div className="stat-label">Today's Collections</div>
            <div className="stat-value">₹{(dashboard?.total_today_payments || 0).toLocaleString()}</div>
          </div>
          <div className="stat-card" data-testid="stat-pending">
            <div className="stat-icon warning"><AlertCircle size={20} /></div>
            <div className="stat-label">Pending Amount</div>
            <div className="stat-value">₹{(dashboard?.total_pending_amount || 0).toLocaleString()}</div>
          </div>
        </div>

        <div className="grid-2">
          <div className="data-card">
            <div className="card-header"><h3>Today's Events</h3></div>
            {dashboard?.todays_events?.length > 0 ? (
              <table className="data-table">
                <thead><tr><th>Customer</th><th>Event Type</th><th>Venue</th><th>Time</th></tr></thead>
                <tbody>
                  {dashboard.todays_events.map((event) => (
                    <tr key={event.id}><td>{event.customer_name}</td><td>{event.event_type}</td><td>{event.venue_name}</td><td>{event.event_timing}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state"><p>No events scheduled for today</p></div>
            )}
          </div>

          <div className="data-card">
            <div className="card-header"><h3>Pending Payments</h3></div>
            {dashboard?.pending_payments?.length > 0 ? (
              <table className="data-table">
                <thead><tr><th>Customer</th><th>Amount</th><th>Pending</th></tr></thead>
                <tbody>
                  {dashboard.pending_payments.slice(0, 5).map((payment) => (
                    <tr key={payment.event_id}><td>{payment.customer_name}</td><td>₹{payment.total_amount.toLocaleString()}</td><td style={{ color: "#DC2626", fontWeight: 500 }}>₹{payment.pending.toLocaleString()}</td></tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state"><CheckCircle size={40} style={{ color: "#10B981", marginBottom: "0.5rem" }} /><p>All payments are up to date!</p></div>
            )}
          </div>
        </div>

        <div className="data-card" style={{ marginTop: "1.5rem" }}>
          <div className="card-header"><h3>Quick Stats</h3></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem", padding: "1.5rem" }}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: "2rem", fontWeight: 600, color: "#1A362D" }}>{dashboard?.stats?.total_customers || 0}</div><div style={{ fontSize: "0.75rem", color: "#64748B", textTransform: "uppercase" }}>Customers</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: "2rem", fontWeight: 600, color: "#1A362D" }}>{dashboard?.stats?.total_events || 0}</div><div style={{ fontSize: "0.75rem", color: "#64748B", textTransform: "uppercase" }}>Events</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: "2rem", fontWeight: 600, color: "#1A362D" }}>{dashboard?.stats?.total_leads || 0}</div><div style={{ fontSize: "0.75rem", color: "#64748B", textTransform: "uppercase" }}>Leads</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: "2rem", fontWeight: 600, color: "#C85A3C" }}>{dashboard?.stats?.hot_leads || 0}</div><div style={{ fontSize: "0.75rem", color: "#64748B", textTransform: "uppercase" }}>Hot Leads</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: "2rem", fontWeight: 600, color: "#10B981" }}>{dashboard?.stats?.total_staff || 0}</div><div style={{ fontSize: "0.75rem", color: "#64748B", textTransform: "uppercase" }}>Staff</div></div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

// ============== STAFF MANAGEMENT (Admin Only) ==============
const StaffManagementPage = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ username: "", password: "", full_name: "", email: "" });

  const fetchStaff = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/staff`);
      setStaff(res.data);
    } catch {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/staff`, formData);
      toast.success("Staff member added!");
      fetchStaff();
      setModalOpen(false);
      setFormData({ username: "", password: "", full_name: "", email: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add staff");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this staff member?")) return;
    try {
      await axios.delete(`${API}/staff/${id}`);
      toast.success("Staff removed");
      fetchStaff();
    } catch {
      toast.error("Failed to remove staff");
    }
  };

  return (
    <AdminLayout>
      <div data-testid="staff-management-page">
        <div className="page-header">
          <h1>Staff Management</h1>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)} data-testid="add-staff-btn">
            <UserPlus size={18} /> Add Staff
          </button>
        </div>

        <div className="data-card">
          {loading ? (
            <p style={{ padding: "2rem", textAlign: "center" }}>Loading...</p>
          ) : staff.length === 0 ? (
            <div className="empty-state">
              <UserCog size={48} style={{ color: "#E5E3DF", marginBottom: "1rem" }} />
              <h3>No Staff Members</h3>
              <p>Add staff members to help manage operations</p>
            </div>
          ) : (
            <table className="data-table" data-testid="staff-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500 }}>{s.full_name}</td>
                    <td>{s.username}</td>
                    <td>{s.email || "-"}</td>
                    <td>{s.created_at?.split("T")[0]}</td>
                    <td>
                      <button className="action-btn delete" onClick={() => handleDelete(s.id)} data-testid={`delete-staff-${s.id}`}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Staff Member">
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label>Full Name *</label>
                <input className="form-input" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} required data-testid="staff-name-input" />
              </div>
              <div className="form-group">
                <label>Username *</label>
                <input className="form-input" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required data-testid="staff-username-input" />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input type="password" className="form-input" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required data-testid="staff-password-input" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" className="form-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} data-testid="staff-email-input" />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" data-testid="save-staff-btn">Add Staff</button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
};

// ============== SLOT REQUESTS PAGE ==============
const SlotRequestsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [formData, setFormData] = useState({ per_plate_cost: 0, discount: 0 });

  const fetchBookings = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/slot-bookings`);
      setBookings(res.data);
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`${API}/slot-bookings/${id}/status?status=${status}`);
      toast.success(`Booking ${status.toLowerCase()}`);
      fetchBookings();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const openQuoteModal = (booking) => {
    setSelectedBooking(booking);
    setFormData({ per_plate_cost: 0, discount: 0 });
    setModalOpen(true);
  };

  const handleMakeQuotation = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/slot-bookings/${selectedBooking.id}/accept`, null, {
        params: {
          per_plate_cost: formData.per_plate_cost,
          discount: formData.discount
        }
      });
      toast.success("Quotation sent and booking confirmed!");
      setModalOpen(false);
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to make quotation");
    }
  };

  const getStatusBadge = (status) => {
    const classes = { Confirmed: "badge-approved", Pending: "badge-pending", Rejected: "badge-hot" };
    return <span className={`badge ${classes[status] || "badge-pending"}`}>{status}</span>;
  };

  return (
    <AdminLayout>
      <div data-testid="slot-requests-page">
        <div className="page-header">
          <h1>Slot Booking Requests</h1>
        </div>

        <div className="data-card">
          {loading ? (
            <p style={{ padding: "2rem", textAlign: "center" }}>Loading...</p>
          ) : bookings.length === 0 ? (
            <div className="empty-state">
              <CalendarPlus size={48} style={{ color: "#E5E3DF", marginBottom: "1rem" }} />
              <h3>No Booking Requests</h3>
              <p>Customer booking requests will appear here</p>
            </div>
          ) : (
            <table className="data-table" data-testid="slot-requests-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Event Date</th>
                  <th>Type</th>
                  <th>Guests</th>
                  <th>Venue Pref.</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 500 }}>{b.customer_name}</td>
                    <td><Phone size={12} /> {b.customer_phone}<br />{b.customer_email}</td>
                    <td>{b.event_date}</td>
                    <td>{b.event_type}</td>
                    <td>{b.number_of_guests}</td>
                    <td>{b.venue_preference}</td>
                    <td>{getStatusBadge(b.status)}</td>
                    <td>
                      {b.status === "Pending" && (
                        <div className="action-buttons">
                          <button className="action-btn edit" onClick={() => openQuoteModal(b)} title="Make Quotation">
                            <Edit2 size={14} /> Quote
                          </button>
                          <button className="action-btn delete" onClick={() => updateStatus(b.id, "Rejected")} title="Reject">
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Make Quotation">
          <form onSubmit={handleMakeQuotation}>
            <div className="modal-body">
              <p style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "#64748B" }}>
                Setting a Per Plate Cost will automatically send the quotation to <strong>{selectedBooking?.customer_name}</strong>.
              </p>
              <div className="form-group">
                <label>Per Plate Cost (₹) *</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={formData.per_plate_cost} 
                  onChange={(e) => setFormData({ ...formData, per_plate_cost: parseFloat(e.target.value) || 0 })} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Discount (₹)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={formData.discount} 
                  onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })} 
                />
              </div>
              <div style={{ background: "#F3F1EC", padding: "1rem", borderRadius: "0.5rem", marginTop: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span>Total (for {selectedBooking?.number_of_guests} guests):</span>
                  <span>₹{(formData.per_plate_cost * (selectedBooking?.number_of_guests || 0)).toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                  <span>Final Quote Amount:</span>
                  <span>₹{((formData.per_plate_cost * (selectedBooking?.number_of_guests || 0)) - formData.discount).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Create & Send Quotation</button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
};

// ============== IMPORT EXISTING ADMIN PAGES ==============
// Customers Page
const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({ client_name: "", phone_number: "", address: "", reference: "", email: "" });

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/customers`);
      setCustomers(res.data);
    } catch {
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await axios.put(`${API}/customers/${editingCustomer.id}`, formData);
        toast.success("Customer updated");
      } else {
        await axios.post(`${API}/customers`, formData);
        toast.success("Customer created");
      }
      fetchCustomers();
      closeModal();
    } catch {
      toast.error("Operation failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this customer?")) return;
    try {
      await axios.delete(`${API}/customers/${id}`);
      toast.success("Customer deleted");
      fetchCustomers();
    } catch {
      toast.error("Delete failed");
    }
  };

  const openModal = (customer = null) => {
    setEditingCustomer(customer);
    setFormData(customer || { client_name: "", phone_number: "", address: "", reference: "", email: "" });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCustomer(null);
    setFormData({ client_name: "", phone_number: "", address: "", reference: "", email: "" });
  };

  return (
    <AdminLayout>
      <div data-testid="customers-page">
        <div className="page-header">
          <h1>Customers</h1>
          <button className="btn btn-primary" onClick={() => openModal()} data-testid="add-customer-btn">
            <Plus size={18} /> Add Customer
          </button>
        </div>

        <div className="data-card">
          {loading ? (
            <p style={{ padding: "2rem", textAlign: "center" }}>Loading...</p>
          ) : customers.length === 0 ? (
            <div className="empty-state">
              <Users size={48} style={{ color: "#E5E3DF", marginBottom: "1rem" }} />
              <h3>No Customers Yet</h3>
              <p>Add your first customer to get started</p>
            </div>
          ) : (
            <table className="data-table" data-testid="customers-table">
              <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Address</th><th>Reference</th><th>Actions</th></tr></thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.client_name}</td>
                    <td><Phone size={14} style={{ marginRight: "0.25rem", opacity: 0.5 }} />{c.phone_number}</td>
                    <td>{c.email || "-"}</td>
                    <td><MapPin size={14} style={{ marginRight: "0.25rem", opacity: 0.5 }} />{c.address}</td>
                    <td>{c.reference || "-"}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn edit" onClick={() => openModal(c)}><Edit2 size={14} /></button>
                        <button className="action-btn delete" onClick={() => handleDelete(c.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Modal isOpen={modalOpen} onClose={closeModal} title={editingCustomer ? "Edit Customer" : "Add Customer"}>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label>Client Name *</label>
                <input className="form-input" value={formData.client_name} onChange={(e) => setFormData({ ...formData, client_name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Phone Number *</label>
                <input className="form-input" value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" className="form-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Customer email for portal access" />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input className="form-input" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Reference</label>
                <input className="form-input" value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} placeholder="Who referred this customer?" />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editingCustomer ? "Update" : "Create"}</button>
            </div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
};

// Bookings Page
const BookingsPage = () => {
  const [events, setEvents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedEventForQuotation, setSelectedEventForQuotation] = useState(null);
  const quotationRef = useRef();
  
  const handlePrint = useReactToPrint({
    contentRef: quotationRef,
  });

  const [formData, setFormData] = useState({
    customer_id: "", event_date: "", event_type: "Wedding", number_of_guests: 100,
    event_timing: "", venue_name: "", per_plate_cost: 0, discount: 0, quotation_status: "Pending", notes: "", is_completed: false, advance_received: 0, due_date: ""
  });

  const fetchData = useCallback(async () => {
    try {
      const [eventsRes, customersRes] = await Promise.all([axios.get(`${API}/events`), axios.get(`${API}/customers`)]);
      setEvents(eventsRes.data);
      setCustomers(customersRes.data);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        await axios.put(`${API}/events/${editingEvent.id}`, formData);
        toast.success("Booking updated");
      } else {
        await axios.post(`${API}/events`, formData);
        toast.success("Booking created");
      }
      fetchData();
      closeModal();
    } catch {
      toast.error("Operation failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this booking?")) return;
    try {
      await axios.delete(`${API}/events/${id}`);
      toast.success("Booking deleted");
      fetchData();
    } catch {
      toast.error("Delete failed");
    }
  };

  const markComplete = async (id) => {
    try {
      await axios.put(`${API}/events/${id}/complete`);
      toast.success("Event marked as completed");
      fetchData();
    } catch {
      toast.error("Failed to update");
    }
  };

  const openModal = (event = null) => {
    setEditingEvent(event);
    if (event) {
      setFormData({
        customer_id: event.customer_id, event_date: event.event_date, event_type: event.event_type,
        number_of_guests: event.number_of_guests, event_timing: event.event_timing, venue_name: event.venue_name,
        per_plate_cost: event.per_plate_cost, discount: event.discount, quotation_status: event.quotation_status, notes: event.notes || "", is_completed: event.is_completed || false, advance_received: event.advance_received || 0, due_date: event.due_date || ""
      });
    } else {
      setFormData({
        customer_id: "", event_date: "", event_type: "Wedding", number_of_guests: 100,
        event_timing: "", venue_name: "", per_plate_cost: 0, discount: 0, quotation_status: "Pending", notes: "", is_completed: false, advance_received: 0, due_date: ""
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditingEvent(null); };

  const handleExport = async () => {
    try {
      const res = await axios.get(`${API}/export/events`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "events.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export downloaded");
    } catch {
      toast.error("Export failed");
    }
  };

  const getStatusBadge = (status) => {
    return <span className={`badge ${classes[status] || "badge-pending"}`}>{status}</span>;
  };

  const sendQuotation = async (id) => {
    try {
      await axios.put(`${API}/events/${id}/quotation-status?status=Sent`);
      toast.success("Quotation marked as Sent");
      fetchData();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const totalAmount = formData.per_plate_cost * formData.number_of_guests;
  const finalAmount = totalAmount - formData.discount;

  return (
    <AdminLayout>
      <div data-testid="bookings-page">
        <div className="page-header">
          <h1>Bookings</h1>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn btn-outline" onClick={handleExport}><Download size={18} /> Export</button>
            <button className="btn btn-primary" onClick={() => openModal()} data-testid="add-booking-btn"><Plus size={18} /> Add Booking</button>
          </div>
        </div>

        <div className="data-card">
          {loading ? (
            <p style={{ padding: "2rem", textAlign: "center" }}>Loading...</p>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <Calendar size={48} style={{ color: "#E5E3DF", marginBottom: "1rem" }} />
              <h3>No Bookings Yet</h3>
              <p>Create your first event booking</p>
            </div>
          ) : (
            <table className="data-table" data-testid="bookings-table">
              <thead><tr><th>Customer</th><th>Event Date</th><th>Type</th><th>Guests</th><th>Venue</th><th>Final Amount</th><th>Status</th><th>Completed</th><th>Actions</th></tr></thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 500 }}>{e.customer_name}</td>
                    <td>{e.event_date}</td>
                    <td>{e.event_type}</td>
                    <td>{e.number_of_guests}</td>
                    <td>{e.venue_name}</td>
                    <td style={{ fontWeight: 500 }}>₹{e.final_amount?.toLocaleString()}</td>
                    <td>{getStatusBadge(e.quotation_status)}</td>
                    <td>{e.is_completed ? <span className="badge badge-approved">Yes</span> : <button className="btn btn-sm btn-outline" onClick={() => markComplete(e.id)}>Mark Done</button>}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn edit" onClick={() => { setSelectedEventForQuotation(e); setQuotationModalOpen(true); }} title="View Quotation"><Receipt size={14} /></button>
                        <button className="action-btn edit" onClick={() => openModal(e)}><Edit2 size={14} /></button>
                        <button className="action-btn delete" onClick={() => handleDelete(e.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Modal isOpen={modalOpen} onClose={closeModal} title={editingEvent ? "Edit Booking" : "New Booking"}>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label>Customer *</label>
                <select className="form-select" value={formData.customer_id} onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })} required>
                  <option value="">Select Customer</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.client_name}</option>)}
                </select>
              </div>
              <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Event Date *</label>
                  <input type="date" className="form-input" value={formData.event_date} onChange={(e) => setFormData({ ...formData, event_date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>Event Type *</label>
                  <select className="form-select" value={formData.event_type} onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}>
                    <option>Wedding</option><option>Birthday</option><option>Corporate</option><option>Anniversary</option><option>Other</option>
                  </select>
                </div>
              </div>
              <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Number of Guests *</label>
                  <input type="number" className="form-input" value={formData.number_of_guests} onChange={(e) => setFormData({ ...formData, number_of_guests: parseInt(e.target.value) || 0 })} required />
                </div>
                <div className="form-group">
                  <label>Event Timing *</label>
                  <input className="form-input" value={formData.event_timing} onChange={(e) => setFormData({ ...formData, event_timing: e.target.value })} placeholder="e.g., 6 PM - 11 PM" required />
                </div>
              </div>
              <div className="form-group">
                <label>Venue Name *</label>
                <input className="form-input" value={formData.venue_name} onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })} required />
              </div>
              <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Per Plate Cost (₹) *</label>
                  <input type="number" className="form-input" value={formData.per_plate_cost} onChange={(e) => setFormData({ ...formData, per_plate_cost: parseFloat(e.target.value) || 0 })} required />
                </div>
                <div className="form-group">
                  <label>Discount (₹)</label>
                  <input type="number" className="form-input" value={formData.discount} onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Advance Received (₹)</label>
                  <input type="number" className="form-input" value={formData.advance_received} onChange={(e) => setFormData({ ...formData, advance_received: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input type="date" className="form-input" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
                </div>
              </div>
              <div style={{ background: "#F3F1EC", padding: "1rem", borderRadius: "0.5rem", marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}><span>Total Amount:</span><span>₹{totalAmount.toLocaleString()}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: "1.125rem" }}><span>Final Amount:</span><span style={{ color: "#1A362D" }}>₹{finalAmount.toLocaleString()}</span></div>
              </div>
              <div className="form-group">
                <label>Quotation Status</label>
                <select className="form-select" value={formData.quotation_status} onChange={(e) => setFormData({ ...formData, quotation_status: e.target.value })}>
                  <option>Pending</option><option>Sent</option><option>Approved</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea className="form-input" rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Any special requirements..." />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn btn-primary">{editingEvent ? "Update" : "Create"}</button>
            </div>
          </form>
        </Modal>

        <Modal isOpen={quotationModalOpen} onClose={() => setQuotationModalOpen(false)} title="Event Quotation">
          <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto", background: "#F1F5F9", padding: "20px" }}>
            <div ref={quotationRef}>
              <QuotationTemplate 
                event={selectedEventForQuotation} 
                customer={customers.find(c => c.id === selectedEventForQuotation?.customer_id)} 
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={() => setQuotationModalOpen(false)}>Close</button>
            <button type="button" className="btn btn-outline" onClick={handlePrint}><Download size={18} /> Print / Save PDF</button>
            {selectedEventForQuotation?.quotation_status === "Pending" && (
              <button type="button" className="btn btn-primary" onClick={() => { sendQuotation(selectedEventForQuotation.id); setQuotationModalOpen(false); }}>Mark as Sent</button>
            )}
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};

// ============== EXPENSES PAGE ==============
const ExpensesPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    expense_date: format(new Date(), "yyyy-MM-dd"), 
    expense_type: "Vegetables", 
    category: "Spend",
    amount: 0, 
    due_date: "",
    customer_id: "",
    notes: "" 
  });

  const fetchData = useCallback(async () => {
    try { 
      const [expRes, custRes] = await Promise.all([
        axios.get(`${API}/expenses`),
        axios.get(`${API}/customers`)
      ]);
      setExpenses(expRes.data); 
      setCustomers(custRes.data);
    } catch { 
      toast.error("Failed to load data"); 
    } finally { 
      setLoading(false); 
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { 
      await axios.post(`${API}/expenses`, formData); 
      toast.success("Expense recorded"); 
      fetchData(); 
      setModalOpen(false); 
      setFormData({ expense_date: format(new Date(), "yyyy-MM-dd"), expense_type: "Vegetables", category: "Spend", amount: 0, due_date: "", customer_id: "", notes: "" }); 
    } catch { 
      toast.error("Failed to add expense"); 
    }
  };

  const handleSettle = async (id) => {
    try {
      await axios.put(`${API}/expenses/${id}/settle`);
      toast.success("Payment settled and balance updated");
      fetchData();
    } catch {
      toast.error("Failed to settle payment");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try { await axios.delete(`${API}/expenses/${id}`); toast.success("Entry deleted"); fetchData(); } catch { toast.error("Delete failed"); }
  };

  const handleExport = async () => {
    try { const res = await axios.get(`${API}/export/expenses`, { responseType: "blob" }); const url = window.URL.createObjectURL(new Blob([res.data])); const link = document.createElement("a"); link.href = url; link.setAttribute("download", "expenses.xlsx"); document.body.appendChild(link); link.click(); link.remove(); toast.success("Export downloaded"); } catch { toast.error("Export failed"); }
  };

  const totalSpent = expenses.filter(e => e.category === "Spend").reduce((sum, e) => sum + e.amount, 0);
  const totalReceived = expenses.filter(e => e.category === "Received").reduce((sum, e) => sum + e.amount, 0);
  const yetToReceive = expenses.filter(e => e.category === "Yet to Receive" && !e.is_settled).reduce((sum, e) => sum + e.amount, 0);
  const duePayment = expenses.filter(e => e.category === "Due Payment" && !e.is_settled).reduce((sum, e) => sum + e.amount, 0);

  const getCategoryBadge = (cat) => {
    const classes = { Spend: "badge-hot", Received: "badge-paid", "Yet to Receive": "badge-warm", "Due Payment": "badge-hot" };
    return <span className={`badge ${classes[cat] || "badge-pending"}`}>{cat}</span>;
  };

  return (
    <AdminLayout>
      <div data-testid="expenses-page">
        <div className="page-header">
          <h1>Expense & Reconciliation</h1>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn btn-outline" onClick={handleExport}><Download size={18} /> Export</button>
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}><Plus size={18} /> Add Entry</button>
          </div>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: "1.5rem" }}>
          <div className="stat-card"><div className="stat-label">Total Spent</div><div className="stat-value" style={{ color: "#DC2626" }}>₹{totalSpent.toLocaleString()}</div></div>
          <div className="stat-card"><div className="stat-label">Total Received</div><div className="stat-value" style={{ color: "#10B981" }}>₹{totalReceived.toLocaleString()}</div></div>
          <div className="stat-card"><div className="stat-label">Yet to Receive</div><div className="stat-value" style={{ color: "#D97706" }}>₹{yetToReceive.toLocaleString()}</div></div>
          <div className="stat-card"><div className="stat-label">Due to Pay</div><div className="stat-value" style={{ color: "#DC2626" }}>₹{duePayment.toLocaleString()}</div></div>
        </div>

        <div className="data-card">
          {loading ? <p style={{ padding: "2rem", textAlign: "center" }}>Loading...</p> : expenses.length === 0 ? <div className="empty-state"><Receipt size={48} style={{ color: "#E5E3DF", marginBottom: "1rem" }} /><h3>No Entries recorded</h3></div> : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td>{e.expense_date}</td>
                    <td>{getCategoryBadge(e.category)}</td>
                    <td>{e.expense_type}</td>
                    <td style={{ fontWeight: 600, color: (e.category === "Spend" || e.category === "Due Payment") ? "#DC2626" : "#10B981" }}>
                      ₹{e.amount.toLocaleString()}
                    </td>
                    <td>
                      {e.is_settled ? (
                        <span style={{ color: "#10B981", fontSize: "0.75rem", fontWeight: 600 }}>SETTLED</span>
                      ) : (e.category === "Yet to Receive" || e.category === "Due Payment") ? (
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: "0.65rem", padding: "2px 6px" }} onClick={() => handleSettle(e.id)}>Mark Settled</button>
                      ) : (
                        <span style={{ color: "#64748B", fontSize: "0.75rem" }}>Completed</span>
                      )}
                    </td>
                    <td>{e.due_date || "-"}</td>
                    <td><button className="action-btn delete" onClick={() => handleDelete(e.id)}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Transaction">
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label>Category *</label>
                <select className="form-select" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} required>
                  <option value="Spend">Spend (Direct Expense)</option>
                  <option value="Received">Received (Direct Income)</option>
                  <option value="Yet to Receive">Yet to Receive (Pending from Customer)</option>
                  <option value="Due Payment">Due Payment (Payable to Vendor)</option>
                </select>
              </div>
              <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group"><label>Date *</label><input type="date" className="form-input" value={formData.expense_date} onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })} required /></div>
                <div className="form-group"><label>Type *</label>
                  <select className="form-select" value={formData.expense_type} onChange={(e) => setFormData({ ...formData, expense_type: e.target.value })}>
                    <option>Vegetables</option><option>Gas</option><option>Labour</option><option>Transport</option><option>Groceries</option><option>Utensils</option><option>Vendor Payment</option><option>Customer Payment</option><option>Other</option>
                  </select>
                </div>
              </div>
              <div className="form-group"><label>Amount (₹) *</label><input type="number" className="form-input" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} required /></div>
              
              {(formData.category === "Yet to Receive" || formData.category === "Due Payment") && (
                <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Due Date</label>
                    <input type="date" className="form-input" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} required />
                  </div>
                  {formData.category === "Yet to Receive" && (
                    <div className="form-group">
                      <label>Customer *</label>
                      <select className="form-select" value={formData.customer_id} onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })} required>
                        <option value="">Select Customer</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}
              
              <div className="form-group"><label>Notes</label><textarea className="form-input" rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>
            </div>
            <div className="modal-footer"><button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="btn btn-primary">Save Transaction</button></div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
};

const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [tracking, setTracking] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ event_id: "", amount: 0, payment_mode: "Cash", notes: "" });

  const fetchData = useCallback(async () => {
    try { const [paymentsRes, trackingRes, eventsRes] = await Promise.all([axios.get(`${API}/payments`), axios.get(`${API}/payment-tracking`), axios.get(`${API}/events`)]); setPayments(paymentsRes.data); setTracking(trackingRes.data); setEvents(eventsRes.data); } catch { toast.error("Failed to load data"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { await axios.post(`${API}/payments`, formData); toast.success("Payment recorded"); fetchData(); setModalOpen(false); setFormData({ event_id: "", amount: 0, payment_mode: "Cash", notes: "" }); } catch { toast.error("Failed to record payment"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this payment?")) return;
    try { await axios.delete(`${API}/payments/${id}`); toast.success("Payment deleted"); fetchData(); } catch { toast.error("Delete failed"); }
  };

  const handleExport = async () => {
    try { const res = await axios.get(`${API}/export/payments`, { responseType: "blob" }); const url = window.URL.createObjectURL(new Blob([res.data])); const link = document.createElement("a"); link.href = url; link.setAttribute("download", "payments.xlsx"); document.body.appendChild(link); link.click(); link.remove(); toast.success("Export downloaded"); } catch { toast.error("Export failed"); }
  };

  const getStatusBadge = (status) => { const classes = { Paid: "badge-paid", Partial: "badge-partial", Pending: "badge-pending" }; return <span className={`badge ${classes[status] || "badge-pending"}`}>{status}</span>; };
  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <AdminLayout>
      <div data-testid="payments-page">
        <div className="page-header"><h1>Payments</h1><div style={{ display: "flex", gap: "0.75rem" }}><button className="btn btn-outline" onClick={handleExport}><Download size={18} /> Export</button><button className="btn btn-primary" onClick={() => setModalOpen(true)}><Plus size={18} /> Record Payment</button></div></div>
        <div className="stats-grid" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: "1.5rem" }}>
          <div className="stat-card"><div className="stat-label">Total Received</div><div className="stat-value" style={{ color: "#10B981" }}>₹{totalReceived.toLocaleString()}</div></div>
          <div className="stat-card"><div className="stat-label">Today's Collections</div><div className="stat-value" style={{ color: "#10B981" }}>₹{
            payments.filter(p => p.payment_date?.split("T")[0] === format(new Date(), "yyyy-MM-dd"))
                   .reduce((sum, p) => sum + p.amount, 0).toLocaleString()
          }</div></div>
        </div>
        <div className="data-card" style={{ marginBottom: "1.5rem" }}>
          <div className="card-header"><h3>Payment Tracking by Event</h3></div>
          {tracking.length > 0 ? (<table className="data-table"><thead><tr><th>Customer</th><th>Event Date</th><th>Type</th><th>Total</th><th>Received</th><th>Pending</th><th>Status</th></tr></thead><tbody>{tracking.map((t) => (<tr key={t.event_id}><td style={{ fontWeight: 500 }}>{t.customer_name}</td><td>{t.event_date}</td><td>{t.event_type}</td><td>₹{t.total_amount.toLocaleString()}</td><td style={{ color: "#10B981" }}>₹{t.advance_received.toLocaleString()}</td><td style={{ color: t.pending_amount > 0 ? "#DC2626" : "#10B981", fontWeight: 500 }}>₹{t.pending_amount.toLocaleString()}</td><td>{getStatusBadge(t.payment_status)}</td></tr>))}</tbody></table>) : (<div className="empty-state"><p>No events to track</p></div>)}
        </div>
        <div className="data-card">
          <div className="card-header"><h3>Recent Payments</h3></div>
          {payments.length > 0 ? (<table className="data-table"><thead><tr><th>Date</th><th>Customer</th><th>Amount</th><th>Mode</th><th>Notes</th><th>Actions</th></tr></thead><tbody>{payments.map((p) => (<tr key={p.id}><td>{p.payment_date?.split("T")[0]}</td><td style={{ fontWeight: 500 }}>{p.customer_name}</td><td style={{ fontWeight: 500, color: "#10B981" }}>₹{p.amount.toLocaleString()}</td><td><span className="badge badge-sent">{p.payment_mode}</span></td><td>{p.notes || "-"}</td><td><button className="action-btn delete" onClick={() => handleDelete(p.id)}><Trash2 size={14} /></button></td></tr>))}</tbody></table>) : (<div className="empty-state"><DollarSign size={48} style={{ color: "#E5E3DF", marginBottom: "1rem" }} /><h3>No Payments Recorded</h3></div>)}
        </div>
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Record Payment">
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group"><label>Select Event *</label><select className="form-select" value={formData.event_id} onChange={(e) => setFormData({ ...formData, event_id: e.target.value })} required><option value="">Select Event</option>{events.map((e) => <option key={e.id} value={e.id}>{e.customer_name} - {e.event_date} ({e.event_type})</option>)}</select></div>
              <div className="form-group"><label>Amount (₹) *</label><input type="number" className="form-input" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} required /></div>
              <div className="form-group"><label>Payment Mode *</label><select className="form-select" value={formData.payment_mode} onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })}><option>Cash</option><option>UPI</option><option>Bank</option><option>Cheque</option></select></div>
              <div className="form-group"><label>Notes</label><textarea className="form-input" rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>
            </div>
            <div className="modal-footer"><button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="btn btn-primary">Record Payment</button></div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
};

const LeadsPage = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [formData, setFormData] = useState({ client_name: "", phone_number: "", inquiry_date: format(new Date(), "yyyy-MM-dd"), lead_source: "Instagram", follow_up_date: "", status: "Warm", notes: "" });

  const fetchLeads = useCallback(async () => { try { const res = await axios.get(`${API}/leads`); setLeads(res.data); } catch { toast.error("Failed to load leads"); } finally { setLoading(false); } }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try { if (editingLead) { await axios.put(`${API}/leads/${editingLead.id}`, formData); toast.success("Lead updated"); } else { await axios.post(`${API}/leads`, formData); toast.success("Lead created"); } fetchLeads(); closeModal(); } catch { toast.error("Operation failed"); }
  };

  const handleDelete = async (id) => { if (!window.confirm("Delete this lead?")) return; try { await axios.delete(`${API}/leads/${id}`); toast.success("Lead deleted"); fetchLeads(); } catch { toast.error("Delete failed"); } };

  const openModal = (lead = null) => { setEditingLead(lead); if (lead) { setFormData({ client_name: lead.client_name, phone_number: lead.phone_number, inquiry_date: lead.inquiry_date, lead_source: lead.lead_source, follow_up_date: lead.follow_up_date, status: lead.status, notes: lead.notes || "" }); } else { setFormData({ client_name: "", phone_number: "", inquiry_date: format(new Date(), "yyyy-MM-dd"), lead_source: "Instagram", follow_up_date: "", status: "Warm", notes: "" }); } setModalOpen(true); };

  const closeModal = () => { setModalOpen(false); setEditingLead(null); };

  const handleExport = async () => { try { const res = await axios.get(`${API}/export/leads`, { responseType: "blob" }); const url = window.URL.createObjectURL(new Blob([res.data])); const link = document.createElement("a"); link.href = url; link.setAttribute("download", "leads.xlsx"); document.body.appendChild(link); link.click(); link.remove(); toast.success("Export downloaded"); } catch { toast.error("Export failed"); } };

  const getStatusBadge = (status) => { const classes = { Hot: "badge-hot", Warm: "badge-warm", Cold: "badge-cold" }; return <span className={`badge ${classes[status] || "badge-warm"}`}>{status}</span>; };

  return (
    <AdminLayout>
      <div data-testid="leads-page">
        <div className="page-header"><h1>Leads & Follow-ups</h1><div style={{ display: "flex", gap: "0.75rem" }}><button className="btn btn-outline" onClick={handleExport}><Download size={18} /> Export</button><button className="btn btn-primary" onClick={() => openModal()}><Plus size={18} /> Add Lead</button></div></div>
        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "1.5rem" }}><div className="stat-card"><div className="stat-label">Hot Leads</div><div className="stat-value" style={{ color: "#DC2626" }}>{leads.filter(l => l.status === "Hot").length}</div></div><div className="stat-card"><div className="stat-label">Warm Leads</div><div className="stat-value" style={{ color: "#D97706" }}>{leads.filter(l => l.status === "Warm").length}</div></div><div className="stat-card"><div className="stat-label">Cold Leads</div><div className="stat-value" style={{ color: "#1D4ED8" }}>{leads.filter(l => l.status === "Cold").length}</div></div></div>
        <div className="data-card">
          {loading ? <p style={{ padding: "2rem", textAlign: "center" }}>Loading...</p> : leads.length === 0 ? <div className="empty-state"><TrendingUp size={48} style={{ color: "#E5E3DF", marginBottom: "1rem" }} /><h3>No Leads Yet</h3></div> : (
            <table className="data-table"><thead><tr><th>Name</th><th>Phone</th><th>Inquiry Date</th><th>Source</th><th>Follow-up</th><th>Status</th><th>Actions</th></tr></thead><tbody>{leads.map((l) => (<tr key={l.id}><td style={{ fontWeight: 500 }}>{l.client_name}</td><td>{l.phone_number}</td><td>{l.inquiry_date}</td><td>{l.lead_source}</td><td>{l.follow_up_date}</td><td>{getStatusBadge(l.status)}</td><td><div className="action-buttons"><button className="action-btn edit" onClick={() => openModal(l)}><Edit2 size={14} /></button><button className="action-btn delete" onClick={() => handleDelete(l.id)}><Trash2 size={14} /></button></div></td></tr>))}</tbody></table>
          )}
        </div>
        <Modal isOpen={modalOpen} onClose={closeModal} title={editingLead ? "Edit Lead" : "Add Lead"}>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group"><label>Client Name *</label><input className="form-input" value={formData.client_name} onChange={(e) => setFormData({ ...formData, client_name: e.target.value })} required /></div>
              <div className="form-group"><label>Phone Number *</label><input className="form-input" value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} required /></div>
              <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}><div className="form-group"><label>Inquiry Date *</label><input type="date" className="form-input" value={formData.inquiry_date} onChange={(e) => setFormData({ ...formData, inquiry_date: e.target.value })} required /></div><div className="form-group"><label>Follow-up Date *</label><input type="date" className="form-input" value={formData.follow_up_date} onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })} required /></div></div>
              <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}><div className="form-group"><label>Lead Source</label><select className="form-select" value={formData.lead_source} onChange={(e) => setFormData({ ...formData, lead_source: e.target.value })}><option>Instagram</option><option>Facebook</option><option>Reference</option><option>Website</option><option>Walk-in</option><option>Other</option></select></div><div className="form-group"><label>Status</label><select className="form-select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}><option>Hot</option><option>Warm</option><option>Cold</option></select></div></div>
              <div className="form-group"><label>Notes</label><textarea className="form-input" rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} /></div>
            </div>
            <div className="modal-footer"><button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button><button type="submit" className="btn btn-primary">{editingLead ? "Update" : "Create"}</button></div>
          </form>
        </Modal>
      </div>
    </AdminLayout>
  );
};

// ============== MAIN APP ==============
function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/customer/login" element={<CustomerLoginPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Customer Routes */}
          <Route path="/customer/dashboard" element={<ProtectedRoute allowedTypes={["customer"]}><CustomerDashboardPage /></ProtectedRoute>} />
          <Route path="/customer/past-events" element={<ProtectedRoute allowedTypes={["customer"]}><CustomerPastEventsPage /></ProtectedRoute>} />
          <Route path="/customer/book-slot" element={<ProtectedRoute allowedTypes={["customer"]}><CustomerBookSlotPage /></ProtectedRoute>} />
          <Route path="/book-slot" element={<ProtectedRoute allowedTypes={["customer"]}><CustomerBookSlotPage /></ProtectedRoute>} />
          <Route path="/customer/my-bookings" element={<ProtectedRoute allowedTypes={["customer"]}><CustomerMyBookingsPage /></ProtectedRoute>} />

          {/* Admin/Staff Routes */}
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedTypes={["admin", "staff"]}><AdminDashboardPage /></ProtectedRoute>} />
          <Route path="/admin/bookings" element={<ProtectedRoute allowedTypes={["admin", "staff"]}><BookingsPage /></ProtectedRoute>} />
          <Route path="/admin/customers" element={<ProtectedRoute allowedTypes={["admin", "staff"]}><CustomersPage /></ProtectedRoute>} />
          <Route path="/admin/expenses" element={<ProtectedRoute allowedTypes={["admin", "staff"]}><ExpensesPage /></ProtectedRoute>} />
          <Route path="/admin/payments" element={<ProtectedRoute allowedTypes={["admin", "staff"]}><PaymentsPage /></ProtectedRoute>} />
          <Route path="/admin/leads" element={<ProtectedRoute allowedTypes={["admin", "staff"]}><LeadsPage /></ProtectedRoute>} />
          <Route path="/admin/slot-requests" element={<ProtectedRoute allowedTypes={["admin", "staff"]}><SlotRequestsPage /></ProtectedRoute>} />
          <Route path="/admin/staff" element={<ProtectedRoute allowedTypes={["admin"]}><StaffManagementPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
