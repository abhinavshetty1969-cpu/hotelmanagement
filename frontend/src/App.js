import { useState, useEffect, createContext, useContext, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  LayoutDashboard, Users, Calendar, Receipt, TrendingUp, 
  UserPlus, LogOut, Menu, X, Bell, Download, Plus, Edit2, Trash2,
  Phone, MapPin, DollarSign, Clock, AlertCircle, CheckCircle,
  Search, Filter, ChevronDown
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
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    const res = await axios.post(`${API}/auth/login`, { username, password });
    localStorage.setItem("token", res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!token) return <Navigate to="/login" />;
  return children;
};

// Login Page
const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("staff");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isRegister) {
        await axios.post(`${API}/auth/register`, { username, password, full_name: fullName, role });
        toast.success("Registration successful! Please login.");
        setIsRegister(false);
      } else {
        await login(username, password);
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong");
    }
  };

  return (
    <div className="login-container" data-testid="login-page">
      <div className="login-image">
        <div className="login-image-content">
          <h1>Event Venue Pro</h1>
          <p>Manage your hotel bookings and events with ease</p>
        </div>
      </div>
      <div className="login-form-container">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>{isRegister ? "Create Account" : "Welcome Back"}</h2>
          <p>{isRegister ? "Register to get started" : "Sign in to your account"}</p>
          
          {error && <div className="reminder-alert" style={{ marginBottom: "1rem", background: "#FEE2E2", borderColor: "#FECACA" }}>
            <AlertCircle size={18} />
            <div className="reminder-alert-content">
              <p style={{ color: "#DC2626" }}>{error}</p>
            </div>
          </div>}
          
          {isRegister && (
            <>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  data-testid="register-fullname"
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)} data-testid="register-role">
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </>
          )}
          
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              data-testid="login-username"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              data-testid="login-password"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" data-testid="login-submit">
            {isRegister ? "Create Account" : "Sign In"}
          </button>
          <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.875rem", color: "#64748B" }}>
            {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
            <button type="button" onClick={() => setIsRegister(!isRegister)} style={{ color: "#1A362D", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }} data-testid="toggle-auth-mode">
              {isRegister ? "Sign In" : "Register"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

// Sidebar Component
const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Calendar, label: "Bookings", path: "/bookings" },
    { icon: Users, label: "Customers", path: "/customers" },
    { icon: Receipt, label: "Expenses", path: "/expenses" },
    { icon: DollarSign, label: "Payments", path: "/payments" },
    { icon: TrendingUp, label: "Leads", path: "/leads" },
  ];

  const handleNav = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? "open" : ""}`} onClick={() => setIsOpen(false)} />
      <aside className={`sidebar ${isOpen ? "open" : ""}`} data-testid="sidebar">
        <div className="sidebar-logo">
          <Calendar size={28} style={{ color: "#1A362D" }} />
          <h1>EventVenue Pro</h1>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <div
              key={item.path}
              className={`nav-item ${location.pathname === item.path ? "active" : ""}`}
              onClick={() => handleNav(item.path)}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
        <div className="user-menu">
          <div className="user-avatar">{user?.full_name?.charAt(0) || "U"}</div>
          <div className="user-info">
            <h4>{user?.full_name || "User"}</h4>
            <p>{user?.role || "staff"}</p>
          </div>
          <button onClick={handleLogout} className="btn-ghost" style={{ padding: "0.5rem" }} data-testid="logout-btn">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
};

// Main Layout
const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-container">
      <div className="mobile-header">
        <button onClick={() => setSidebarOpen(true)} className="btn-ghost" data-testid="mobile-menu-btn">
          <Menu size={24} />
        </button>
        <h1 style={{ fontSize: "1rem", fontWeight: 600 }}>EventVenue Pro</h1>
        <div style={{ width: 24 }} />
      </div>
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <main className="main-content">{children}</main>
    </div>
  );
};

// Modal Component
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

// Dashboard Page
const DashboardPage = () => {
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

  if (loading) return <div className="main-content"><p>Loading...</p></div>;

  return (
    <MainLayout>
      <div data-testid="dashboard-page">
        <div className="page-header">
          <h1>Dashboard</h1>
          <p style={{ color: "#64748B", fontSize: "0.875rem" }}>{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
        </div>

        {/* Reminders */}
        {dashboard?.follow_up_reminders?.length > 0 && (
          <div className="reminder-alert" data-testid="follow-up-reminder">
            <Bell size={20} />
            <div className="reminder-alert-content">
              <h4>Follow-up Reminders ({dashboard.follow_up_reminders.length})</h4>
              <p>You have pending follow-ups that need attention today</p>
            </div>
          </div>
        )}

        {/* Stats */}
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

        {/* Overview Cards */}
        <div className="grid-2">
          {/* Today's Events */}
          <div className="data-card">
            <div className="card-header">
              <h3>Today's Events</h3>
            </div>
            {dashboard?.todays_events?.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Event Type</th>
                    <th>Venue</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.todays_events.map((event) => (
                    <tr key={event.id}>
                      <td>{event.customer_name}</td>
                      <td>{event.event_type}</td>
                      <td>{event.venue_name}</td>
                      <td>{event.event_timing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <p>No events scheduled for today</p>
              </div>
            )}
          </div>

          {/* Pending Payments */}
          <div className="data-card">
            <div className="card-header">
              <h3>Pending Payments</h3>
            </div>
            {dashboard?.pending_payments?.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.pending_payments.slice(0, 5).map((payment) => (
                    <tr key={payment.event_id}>
                      <td>{payment.customer_name}</td>
                      <td>₹{payment.total_amount.toLocaleString()}</td>
                      <td style={{ color: "#DC2626", fontWeight: 500 }}>₹{payment.pending.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <CheckCircle size={40} style={{ color: "#10B981", marginBottom: "0.5rem" }} />
                <p>All payments are up to date!</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="data-card" style={{ marginTop: "1.5rem" }}>
          <div className="card-header">
            <h3>Quick Stats</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", padding: "1.5rem" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: 600, color: "#1A362D" }}>{dashboard?.stats?.total_customers || 0}</div>
              <div style={{ fontSize: "0.75rem", color: "#64748B", textTransform: "uppercase" }}>Total Customers</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: 600, color: "#1A362D" }}>{dashboard?.stats?.total_events || 0}</div>
              <div style={{ fontSize: "0.75rem", color: "#64748B", textTransform: "uppercase" }}>Total Events</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: 600, color: "#1A362D" }}>{dashboard?.stats?.total_leads || 0}</div>
              <div style={{ fontSize: "0.75rem", color: "#64748B", textTransform: "uppercase" }}>Total Leads</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2rem", fontWeight: 600, color: "#C85A3C" }}>{dashboard?.stats?.hot_leads || 0}</div>
              <div style={{ fontSize: "0.75rem", color: "#64748B", textTransform: "uppercase" }}>Hot Leads</div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

// Customers Page
const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({ client_name: "", phone_number: "", address: "", reference: "" });

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
    setFormData(customer || { client_name: "", phone_number: "", address: "", reference: "" });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCustomer(null);
    setFormData({ client_name: "", phone_number: "", address: "", reference: "" });
  };

  return (
    <MainLayout>
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
              <button className="btn btn-primary" onClick={() => openModal()} style={{ marginTop: "1rem" }}>
                <Plus size={18} /> Add Customer
              </button>
            </div>
          ) : (
            <table className="data-table" data-testid="customers-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Reference</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.client_name}</td>
                    <td><Phone size={14} style={{ marginRight: "0.25rem", opacity: 0.5 }} />{c.phone_number}</td>
                    <td><MapPin size={14} style={{ marginRight: "0.25rem", opacity: 0.5 }} />{c.address}</td>
                    <td>{c.reference || "-"}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn edit" onClick={() => openModal(c)} data-testid={`edit-customer-${c.id}`}><Edit2 size={14} /></button>
                        <button className="action-btn delete" onClick={() => handleDelete(c.id)} data-testid={`delete-customer-${c.id}`}><Trash2 size={14} /></button>
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
                <input className="form-input" value={formData.client_name} onChange={(e) => setFormData({ ...formData, client_name: e.target.value })} required data-testid="customer-name-input" />
              </div>
              <div className="form-group">
                <label>Phone Number *</label>
                <input className="form-input" value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} required data-testid="customer-phone-input" />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input className="form-input" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} data-testid="customer-address-input" />
              </div>
              <div className="form-group">
                <label>Reference</label>
                <input className="form-input" value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} placeholder="Who referred this customer?" data-testid="customer-reference-input" />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn btn-primary" data-testid="save-customer-btn">{editingCustomer ? "Update" : "Create"}</button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
};

// Bookings Page
const BookingsPage = () => {
  const [events, setEvents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    customer_id: "", event_date: "", event_type: "Wedding", number_of_guests: 100,
    event_timing: "", venue_name: "", per_plate_cost: 0, discount: 0, quotation_status: "Pending", notes: ""
  });

  const fetchData = useCallback(async () => {
    try {
      const [eventsRes, customersRes] = await Promise.all([
        axios.get(`${API}/events`),
        axios.get(`${API}/customers`)
      ]);
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

  const openModal = (event = null) => {
    setEditingEvent(event);
    if (event) {
      setFormData({
        customer_id: event.customer_id, event_date: event.event_date, event_type: event.event_type,
        number_of_guests: event.number_of_guests, event_timing: event.event_timing, venue_name: event.venue_name,
        per_plate_cost: event.per_plate_cost, discount: event.discount, quotation_status: event.quotation_status, notes: event.notes || ""
      });
    } else {
      setFormData({
        customer_id: "", event_date: "", event_type: "Wedding", number_of_guests: 100,
        event_timing: "", venue_name: "", per_plate_cost: 0, discount: 0, quotation_status: "Pending", notes: ""
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
    const classes = { Approved: "badge-approved", Sent: "badge-sent", Pending: "badge-pending" };
    return <span className={`badge ${classes[status] || "badge-pending"}`}>{status}</span>;
  };

  const totalAmount = formData.per_plate_cost * formData.number_of_guests;
  const finalAmount = totalAmount - formData.discount;

  return (
    <MainLayout>
      <div data-testid="bookings-page">
        <div className="page-header">
          <h1>Bookings</h1>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn btn-outline" onClick={handleExport} data-testid="export-bookings-btn">
              <Download size={18} /> Export
            </button>
            <button className="btn btn-primary" onClick={() => openModal()} data-testid="add-booking-btn">
              <Plus size={18} /> Add Booking
            </button>
          </div>
        </div>

        <div className="data-card">
          {loading ? (
            <p style={{ padding: "2rem", textAlign: "center" }}>Loading...</p>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <img src="https://images.pexels.com/photos/29641446/pexels-photo-29641446.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=200&w=300" alt="Events" style={{ borderRadius: "0.5rem" }} />
              <h3>No Bookings Yet</h3>
              <p>Create your first event booking</p>
              <button className="btn btn-primary" onClick={() => openModal()} style={{ marginTop: "1rem" }}>
                <Plus size={18} /> Add Booking
              </button>
            </div>
          ) : (
            <table className="data-table" data-testid="bookings-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Event Date</th>
                  <th>Type</th>
                  <th>Guests</th>
                  <th>Venue</th>
                  <th>Final Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
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
                    <td>
                      <div className="action-buttons">
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
                <select className="form-select" value={formData.customer_id} onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })} required data-testid="booking-customer-select">
                  <option value="">Select Customer</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.client_name}</option>)}
                </select>
              </div>
              <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Event Date *</label>
                  <input type="date" className="form-input" value={formData.event_date} onChange={(e) => setFormData({ ...formData, event_date: e.target.value })} required data-testid="booking-date-input" />
                </div>
                <div className="form-group">
                  <label>Event Type *</label>
                  <select className="form-select" value={formData.event_type} onChange={(e) => setFormData({ ...formData, event_type: e.target.value })} data-testid="booking-type-select">
                    <option>Wedding</option>
                    <option>Birthday</option>
                    <option>Corporate</option>
                    <option>Anniversary</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Number of Guests *</label>
                  <input type="number" className="form-input" value={formData.number_of_guests} onChange={(e) => setFormData({ ...formData, number_of_guests: parseInt(e.target.value) || 0 })} required data-testid="booking-guests-input" />
                </div>
                <div className="form-group">
                  <label>Event Timing *</label>
                  <input className="form-input" value={formData.event_timing} onChange={(e) => setFormData({ ...formData, event_timing: e.target.value })} placeholder="e.g., 6 PM - 11 PM" required data-testid="booking-timing-input" />
                </div>
              </div>
              <div className="form-group">
                <label>Venue Name *</label>
                <input className="form-input" value={formData.venue_name} onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })} required data-testid="booking-venue-input" />
              </div>
              <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Per Plate Cost (₹) *</label>
                  <input type="number" className="form-input" value={formData.per_plate_cost} onChange={(e) => setFormData({ ...formData, per_plate_cost: parseFloat(e.target.value) || 0 })} required data-testid="booking-perplate-input" />
                </div>
                <div className="form-group">
                  <label>Discount (₹)</label>
                  <input type="number" className="form-input" value={formData.discount} onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })} data-testid="booking-discount-input" />
                </div>
              </div>
              <div style={{ background: "#F3F1EC", padding: "1rem", borderRadius: "0.5rem", marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span>Total Amount:</span>
                  <span>₹{totalAmount.toLocaleString()}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, fontSize: "1.125rem" }}>
                  <span>Final Amount:</span>
                  <span style={{ color: "#1A362D" }}>₹{finalAmount.toLocaleString()}</span>
                </div>
              </div>
              <div className="form-group">
                <label>Quotation Status</label>
                <select className="form-select" value={formData.quotation_status} onChange={(e) => setFormData({ ...formData, quotation_status: e.target.value })} data-testid="booking-status-select">
                  <option>Pending</option>
                  <option>Sent</option>
                  <option>Approved</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea className="form-input" rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Any special requirements..." data-testid="booking-notes-input" />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn btn-primary" data-testid="save-booking-btn">{editingEvent ? "Update" : "Create"}</button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
};

// Expenses Page
const ExpensesPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ expense_date: format(new Date(), "yyyy-MM-dd"), expense_type: "Vegetables", amount: 0, notes: "" });

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/expenses`);
      setExpenses(res.data);
    } catch {
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/expenses`, formData);
      toast.success("Expense added");
      fetchExpenses();
      closeModal();
    } catch {
      toast.error("Failed to add expense");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      await axios.delete(`${API}/expenses/${id}`);
      toast.success("Expense deleted");
      fetchExpenses();
    } catch {
      toast.error("Delete failed");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData({ expense_date: format(new Date(), "yyyy-MM-dd"), expense_type: "Vegetables", amount: 0, notes: "" });
  };

  const handleExport = async () => {
    try {
      const res = await axios.get(`${API}/export/expenses`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "expenses.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export downloaded");
    } catch {
      toast.error("Export failed");
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <MainLayout>
      <div data-testid="expenses-page">
        <div className="page-header">
          <h1>Daily Expenses</h1>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn btn-outline" onClick={handleExport} data-testid="export-expenses-btn">
              <Download size={18} /> Export
            </button>
            <button className="btn btn-primary" onClick={() => setModalOpen(true)} data-testid="add-expense-btn">
              <Plus size={18} /> Add Expense
            </button>
          </div>
        </div>

        <div className="stat-card" style={{ marginBottom: "1.5rem" }}>
          <div className="stat-label">Total Expenses</div>
          <div className="stat-value" style={{ color: "#C85A3C" }}>₹{totalExpenses.toLocaleString()}</div>
        </div>

        <div className="data-card">
          {loading ? (
            <p style={{ padding: "2rem", textAlign: "center" }}>Loading...</p>
          ) : expenses.length === 0 ? (
            <div className="empty-state">
              <Receipt size={48} style={{ color: "#E5E3DF", marginBottom: "1rem" }} />
              <h3>No Expenses Recorded</h3>
              <p>Start tracking your daily expenses</p>
            </div>
          ) : (
            <table className="data-table" data-testid="expenses-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td>{e.expense_date}</td>
                    <td><span className="badge badge-pending">{e.expense_type}</span></td>
                    <td style={{ fontWeight: 500 }}>₹{e.amount.toLocaleString()}</td>
                    <td>{e.notes || "-"}</td>
                    <td>
                      <button className="action-btn delete" onClick={() => handleDelete(e.id)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Modal isOpen={modalOpen} onClose={closeModal} title="Add Expense">
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label>Date *</label>
                <input type="date" className="form-input" value={formData.expense_date} onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })} required data-testid="expense-date-input" />
              </div>
              <div className="form-group">
                <label>Expense Type *</label>
                <select className="form-select" value={formData.expense_type} onChange={(e) => setFormData({ ...formData, expense_type: e.target.value })} data-testid="expense-type-select">
                  <option>Vegetables</option>
                  <option>Gas</option>
                  <option>Labour</option>
                  <option>Transport</option>
                  <option>Groceries</option>
                  <option>Utensils</option>
                  <option>Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Amount (₹) *</label>
                <input type="number" className="form-input" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} required data-testid="expense-amount-input" />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea className="form-input" rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} data-testid="expense-notes-input" />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn btn-primary" data-testid="save-expense-btn">Add Expense</button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
};

// Payments Page
const PaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [tracking, setTracking] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ event_id: "", amount: 0, payment_mode: "Cash", notes: "" });

  const fetchData = useCallback(async () => {
    try {
      const [paymentsRes, trackingRes, eventsRes] = await Promise.all([
        axios.get(`${API}/payments`),
        axios.get(`${API}/payment-tracking`),
        axios.get(`${API}/events`)
      ]);
      setPayments(paymentsRes.data);
      setTracking(trackingRes.data);
      setEvents(eventsRes.data);
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
      await axios.post(`${API}/payments`, formData);
      toast.success("Payment recorded");
      fetchData();
      closeModal();
    } catch {
      toast.error("Failed to record payment");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this payment?")) return;
    try {
      await axios.delete(`${API}/payments/${id}`);
      toast.success("Payment deleted");
      fetchData();
    } catch {
      toast.error("Delete failed");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormData({ event_id: "", amount: 0, payment_mode: "Cash", notes: "" });
  };

  const handleExport = async () => {
    try {
      const res = await axios.get(`${API}/export/payments`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "payments.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export downloaded");
    } catch {
      toast.error("Export failed");
    }
  };

  const getStatusBadge = (status) => {
    const classes = { Paid: "badge-paid", Partial: "badge-partial", Pending: "badge-pending" };
    return <span className={`badge ${classes[status] || "badge-pending"}`}>{status}</span>;
  };

  const totalReceived = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <MainLayout>
      <div data-testid="payments-page">
        <div className="page-header">
          <h1>Payments</h1>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn btn-outline" onClick={handleExport} data-testid="export-payments-btn">
              <Download size={18} /> Export
            </button>
            <button className="btn btn-primary" onClick={() => setModalOpen(true)} data-testid="add-payment-btn">
              <Plus size={18} /> Record Payment
            </button>
          </div>
        </div>

        <div className="stat-card" style={{ marginBottom: "1.5rem" }}>
          <div className="stat-label">Total Received</div>
          <div className="stat-value" style={{ color: "#10B981" }}>₹{totalReceived.toLocaleString()}</div>
        </div>

        {/* Payment Tracking */}
        <div className="data-card" style={{ marginBottom: "1.5rem" }}>
          <div className="card-header">
            <h3>Payment Tracking by Event</h3>
          </div>
          {tracking.length > 0 ? (
            <table className="data-table" data-testid="payment-tracking-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Event Date</th>
                  <th>Type</th>
                  <th>Total</th>
                  <th>Received</th>
                  <th>Pending</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tracking.map((t) => (
                  <tr key={t.event_id}>
                    <td style={{ fontWeight: 500 }}>{t.customer_name}</td>
                    <td>{t.event_date}</td>
                    <td>{t.event_type}</td>
                    <td>₹{t.total_amount.toLocaleString()}</td>
                    <td style={{ color: "#10B981" }}>₹{t.advance_received.toLocaleString()}</td>
                    <td style={{ color: t.pending_amount > 0 ? "#DC2626" : "#10B981", fontWeight: 500 }}>₹{t.pending_amount.toLocaleString()}</td>
                    <td>{getStatusBadge(t.payment_status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p>No events to track</p>
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="data-card">
          <div className="card-header">
            <h3>Recent Payments</h3>
          </div>
          {payments.length > 0 ? (
            <table className="data-table" data-testid="payments-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Mode</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.payment_date?.split("T")[0]}</td>
                    <td style={{ fontWeight: 500 }}>{p.customer_name}</td>
                    <td style={{ fontWeight: 500, color: "#10B981" }}>₹{p.amount.toLocaleString()}</td>
                    <td><span className="badge badge-sent">{p.payment_mode}</span></td>
                    <td>{p.notes || "-"}</td>
                    <td>
                      <button className="action-btn delete" onClick={() => handleDelete(p.id)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <DollarSign size={48} style={{ color: "#E5E3DF", marginBottom: "1rem" }} />
              <h3>No Payments Recorded</h3>
              <p>Start recording payments received</p>
            </div>
          )}
        </div>

        <Modal isOpen={modalOpen} onClose={closeModal} title="Record Payment">
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label>Select Event *</label>
                <select className="form-select" value={formData.event_id} onChange={(e) => setFormData({ ...formData, event_id: e.target.value })} required data-testid="payment-event-select">
                  <option value="">Select Event</option>
                  {events.map((e) => <option key={e.id} value={e.id}>{e.customer_name} - {e.event_date} ({e.event_type})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Amount (₹) *</label>
                <input type="number" className="form-input" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} required data-testid="payment-amount-input" />
              </div>
              <div className="form-group">
                <label>Payment Mode *</label>
                <select className="form-select" value={formData.payment_mode} onChange={(e) => setFormData({ ...formData, payment_mode: e.target.value })} data-testid="payment-mode-select">
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Bank</option>
                  <option>Cheque</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea className="form-input" rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} data-testid="payment-notes-input" />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn btn-primary" data-testid="save-payment-btn">Record Payment</button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
};

// Leads Page
const LeadsPage = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [formData, setFormData] = useState({
    client_name: "", phone_number: "", inquiry_date: format(new Date(), "yyyy-MM-dd"),
    lead_source: "Instagram", follow_up_date: "", status: "Warm", notes: ""
  });

  const fetchLeads = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/leads`);
      setLeads(res.data);
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLead) {
        await axios.put(`${API}/leads/${editingLead.id}`, formData);
        toast.success("Lead updated");
      } else {
        await axios.post(`${API}/leads`, formData);
        toast.success("Lead created");
      }
      fetchLeads();
      closeModal();
    } catch {
      toast.error("Operation failed");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this lead?")) return;
    try {
      await axios.delete(`${API}/leads/${id}`);
      toast.success("Lead deleted");
      fetchLeads();
    } catch {
      toast.error("Delete failed");
    }
  };

  const openModal = (lead = null) => {
    setEditingLead(lead);
    if (lead) {
      setFormData({
        client_name: lead.client_name, phone_number: lead.phone_number, inquiry_date: lead.inquiry_date,
        lead_source: lead.lead_source, follow_up_date: lead.follow_up_date, status: lead.status, notes: lead.notes || ""
      });
    } else {
      setFormData({
        client_name: "", phone_number: "", inquiry_date: format(new Date(), "yyyy-MM-dd"),
        lead_source: "Instagram", follow_up_date: "", status: "Warm", notes: ""
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditingLead(null); };

  const handleExport = async () => {
    try {
      const res = await axios.get(`${API}/export/leads`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "leads.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export downloaded");
    } catch {
      toast.error("Export failed");
    }
  };

  const getStatusBadge = (status) => {
    const classes = { Hot: "badge-hot", Warm: "badge-warm", Cold: "badge-cold" };
    return <span className={`badge ${classes[status] || "badge-warm"}`}>{status}</span>;
  };

  return (
    <MainLayout>
      <div data-testid="leads-page">
        <div className="page-header">
          <h1>Leads & Follow-ups</h1>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn btn-outline" onClick={handleExport} data-testid="export-leads-btn">
              <Download size={18} /> Export
            </button>
            <button className="btn btn-primary" onClick={() => openModal()} data-testid="add-lead-btn">
              <Plus size={18} /> Add Lead
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "1.5rem" }}>
          <div className="stat-card">
            <div className="stat-label">Hot Leads</div>
            <div className="stat-value" style={{ color: "#DC2626" }}>{leads.filter(l => l.status === "Hot").length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Warm Leads</div>
            <div className="stat-value" style={{ color: "#D97706" }}>{leads.filter(l => l.status === "Warm").length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Cold Leads</div>
            <div className="stat-value" style={{ color: "#1D4ED8" }}>{leads.filter(l => l.status === "Cold").length}</div>
          </div>
        </div>

        <div className="data-card">
          {loading ? (
            <p style={{ padding: "2rem", textAlign: "center" }}>Loading...</p>
          ) : leads.length === 0 ? (
            <div className="empty-state">
              <TrendingUp size={48} style={{ color: "#E5E3DF", marginBottom: "1rem" }} />
              <h3>No Leads Yet</h3>
              <p>Start tracking your inquiries</p>
            </div>
          ) : (
            <table className="data-table" data-testid="leads-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Inquiry Date</th>
                  <th>Source</th>
                  <th>Follow-up</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 500 }}>{l.client_name}</td>
                    <td>{l.phone_number}</td>
                    <td>{l.inquiry_date}</td>
                    <td>{l.lead_source}</td>
                    <td>{l.follow_up_date}</td>
                    <td>{getStatusBadge(l.status)}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn edit" onClick={() => openModal(l)}><Edit2 size={14} /></button>
                        <button className="action-btn delete" onClick={() => handleDelete(l.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Modal isOpen={modalOpen} onClose={closeModal} title={editingLead ? "Edit Lead" : "Add Lead"}>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="form-group">
                <label>Client Name *</label>
                <input className="form-input" value={formData.client_name} onChange={(e) => setFormData({ ...formData, client_name: e.target.value })} required data-testid="lead-name-input" />
              </div>
              <div className="form-group">
                <label>Phone Number *</label>
                <input className="form-input" value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} required data-testid="lead-phone-input" />
              </div>
              <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Inquiry Date *</label>
                  <input type="date" className="form-input" value={formData.inquiry_date} onChange={(e) => setFormData({ ...formData, inquiry_date: e.target.value })} required data-testid="lead-inquiry-date-input" />
                </div>
                <div className="form-group">
                  <label>Follow-up Date *</label>
                  <input type="date" className="form-input" value={formData.follow_up_date} onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })} required data-testid="lead-followup-date-input" />
                </div>
              </div>
              <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="form-group">
                  <label>Lead Source</label>
                  <select className="form-select" value={formData.lead_source} onChange={(e) => setFormData({ ...formData, lead_source: e.target.value })} data-testid="lead-source-select">
                    <option>Instagram</option>
                    <option>Facebook</option>
                    <option>Reference</option>
                    <option>Website</option>
                    <option>Walk-in</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select className="form-select" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} data-testid="lead-status-select">
                    <option>Hot</option>
                    <option>Warm</option>
                    <option>Cold</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea className="form-input" rows={2} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} data-testid="lead-notes-input" />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
              <button type="submit" className="btn btn-primary" data-testid="save-lead-btn">{editingLead ? "Update" : "Create"}</button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
};

// Main App
function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/bookings" element={<ProtectedRoute><BookingsPage /></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
          <Route path="/expenses" element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
          <Route path="/payments" element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />
          <Route path="/leads" element={<ProtectedRoute><LeadsPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
