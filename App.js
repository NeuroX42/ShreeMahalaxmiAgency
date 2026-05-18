import { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView,
  FlatList, Modal, Alert, SafeAreaView, StatusBar, KeyboardAvoidingView,
  Platform, ActivityIndicator, Pressable, Switch,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Brand Colors (VyaparBook style: deep navy + orange) ──────────────────────
const COLORS = {
  primary: "#1A2B6B",      // Deep navy blue (header)
  dark: "#0F1A4A",         // Darker navy
  accent: "#FF6B00",       // Vivid orange (New Sale button, highlights)
  accentLight: "#FFF0E0",  // Light orange tint
  light: "#E8ECFF",        // Light blue tint
  bg: "#F2F4FB",           // Page background
  white: "#FFFFFF",
  text: "#1A2038",
  textSub: "#6B7A99",
  textMuted: "#A0AABF",
  success: "#2E7D32",
  successBg: "#E8F5E9",
  warn: "#E65100",
  warnBg: "#FFF3E0",
  danger: "#C62828",
  dangerBg: "#FFEBEE",
  border: "#E0E4F0",
  cardShadow: "rgba(26,43,107,0.08)",
};

const GST_SLABS = [0, 5, 12, 18, 28];
const CATEGORIES = ["Grocery", "FMCG", "Dairy", "Beverage", "Pharma", "Electronics", "Clothing", "Stationary", "Other"];

// ─── Storage Helpers ──────────────────────────────────────────────────────────
const Store = {
  get: async (k, def) => {
    try { const v = await AsyncStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; }
  },
  set: async (k, v) => {
    try { await AsyncStorage.setItem(k, JSON.stringify(v)); } catch {}
  },
};

// ─── Initial Data ─────────────────────────────────────────────────────────────
const INIT_PRODUCTS = [
  { id: 1, barcode: "8901234567890", name: "Basmati Rice 5kg", category: "Grocery", mrp: 450, wholesale: 320, retail: 390, gst: 5, unit: "Bag", stock: 120 },
  { id: 2, barcode: "8902345678901", name: "Tata Salt 1kg", category: "Grocery", mrp: 24, wholesale: 16, retail: 20, gst: 0, unit: "Pkt", stock: 300 },
  { id: 3, barcode: "8903456789012", name: "Surf Excel 1kg", category: "FMCG", mrp: 200, wholesale: 140, retail: 170, gst: 18, unit: "Pkt", stock: 80 },
  { id: 4, barcode: "8904567890123", name: "Amul Butter 500g", category: "Dairy", mrp: 280, wholesale: 220, retail: 255, gst: 12, unit: "Pkt", stock: 50 },
  { id: 5, barcode: "8905678901234", name: "Bisleri Water 1L", category: "Beverage", mrp: 20, wholesale: 10, retail: 15, gst: 18, unit: "Bottle", stock: 500 },
];
const INIT_CUSTOMERS = [
  { id: 1, name: "Rajesh Traders", phone: "9876543210", address: "Gandhi Nagar, Delhi", gstNo: "07AABCT1332L1ZE", balance: 12500, type: "Wholesale" },
  { id: 2, name: "Suresh Kumar", phone: "9123456780", address: "Lajpat Nagar, Delhi", gstNo: "", balance: 3200, type: "Retail" },
  { id: 3, name: "Priya Stores", phone: "9988776655", address: "Karol Bagh, Delhi", gstNo: "07BBBCT4567M1ZE", balance: 0, type: "Wholesale" },
  { id: 4, name: "Mohan Medical", phone: "9871234560", address: "Rohini, Delhi", gstNo: "", balance: 8750, type: "Retail" },
];
const INIT_INVOICES = [
  { id: "INV-001", date: "2026-04-10", customerId: 1, customerName: "Rajesh Traders", type: "Wholesale", items: [{ productId: 1, name: "Basmati Rice 5kg", qty: 10, rate: 320, gst: 5, discount: 0 }, { productId: 3, name: "Surf Excel 1kg", qty: 5, rate: 140, gst: 18, discount: 2 }], paid: 2000, status: "Partial", note: "" },
  { id: "INV-002", date: "2026-04-12", customerId: 2, customerName: "Suresh Kumar", type: "Retail", items: [{ productId: 2, name: "Tata Salt 1kg", qty: 5, rate: 20, gst: 0, discount: 0 }, { productId: 5, name: "Bisleri Water 1L", qty: 20, rate: 15, gst: 18, discount: 0 }], paid: 400, status: "Partial", note: "" },
  { id: "INV-003", date: "2026-05-02", customerId: 3, customerName: "Priya Stores", type: "Wholesale", items: [{ productId: 4, name: "Amul Butter 500g", qty: 20, rate: 220, gst: 12, discount: 5 }], paid: 4400, status: "Paid", note: "Advance paid" },
  { id: "INV-004", date: "2026-05-10", customerId: 4, customerName: "Mohan Medical", type: "Retail", items: [{ productId: 1, name: "Basmati Rice 5kg", qty: 3, rate: 390, gst: 5, discount: 0 }], paid: 0, status: "Unpaid", note: "" },
];
const INIT_SETTINGS = {
  firmName: "VyaparBook",
  address: "Main Market, Your City, State - 000000",
  phone: "+91-XXXXXXXXXX",
  email: "info@vyaparbook.com",
  gstNo: "00AAAAA0000A0AA",
  bankName: "State Bank of India",
  accountNo: "XXXXXXXXXXXX",
  ifsc: "SBIN0000000",
  upiId: "",
};

// ─── Calc Helpers ─────────────────────────────────────────────────────────────
const calcItem = (it) => {
  const base = it.qty * it.rate;
  const discAmt = (base * (it.discount || 0)) / 100;
  const taxable = base - discAmt;
  const gstAmt = (taxable * (it.gst || 0)) / 100;
  return { base, discAmt, taxable, gstAmt, total: taxable + gstAmt };
};
const calcInvoice = (items) => {
  const rows = (items || []).map(calcItem);
  const subtotal = rows.reduce((s, r) => s + r.taxable, 0);
  const totalGst = rows.reduce((s, r) => s + r.gstAmt, 0);
  return { subtotal, totalGst, grand: subtotal + totalGst };
};
const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avt({ name, size = 44, color = COLORS.primary, textColor = COLORS.white }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: textColor, fontWeight: "800", fontSize: size * 0.36 }}>{(name || "?").slice(0, 2).toUpperCase()}</Text>
    </View>
  );
}

// ─── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ status }) {
  const map = { Paid: [COLORS.successBg, COLORS.success], Partial: [COLORS.warnBg, COLORS.warn], Unpaid: [COLORS.dangerBg, COLORS.danger] };
  const [bg, fg] = map[status] || map.Unpaid;
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
      <Text style={{ color: fg, fontWeight: "700", fontSize: 11 }}>{status}</Text>
    </View>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
function Card({ children, style, onPress }) {
  const content = (
    <View style={[{ backgroundColor: COLORS.white, borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: COLORS.cardShadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3, borderWidth: 1, borderColor: COLORS.border }, style]}>
      {children}
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, val, color }) {
  return (
    <Card style={{ flex: 1 }}>
      <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.text }}>{val}</Text>
      <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{label}</Text>
    </Card>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SecHead({ title, onViewAll }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, marginTop: 6 }}>
      <Text style={{ fontWeight: "800", color: COLORS.text, fontSize: 15 }}>{title}</Text>
      {onViewAll && <Pressable onPress={onViewAll}><Text style={{ color: COLORS.accent, fontWeight: "700", fontSize: 13 }}>View All →</Text></Pressable>}
    </View>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────
function Row({ l, v, bold, color }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
      <Text style={{ color: COLORS.textSub, fontSize: 13 }}>{l}</Text>
      <Text style={{ fontWeight: bold ? "800" : "600", color: color || COLORS.text, fontSize: bold ? 15 : 13 }}>{v}</Text>
    </View>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
function Inp({ label, ...props }) {
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.textSub, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={COLORS.textMuted}
        style={{ padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 14, backgroundColor: "#FAFBFF", color: COLORS.text }}
        {...props}
      />
    </View>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
function Btn({ label, onPress, color = COLORS.primary, textColor = COLORS.white, style, size = 14, disabled }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[{ backgroundColor: disabled ? COLORS.textMuted : color, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 10, alignItems: "center", justifyContent: "center", flexDirection: "row" }, style]}>
      <Text style={{ color: textColor, fontWeight: "700", fontSize: size }}>{label}</Text>
    </Pressable>
  );
}

// ─── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <View style={{ position: "absolute", top: 70, alignSelf: "center", backgroundColor: type === "err" ? COLORS.danger : COLORS.success, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 30, zIndex: 9999 }}>
      <Text style={{ color: COLORS.white, fontWeight: "700", fontSize: 14 }}>{msg}</Text>
    </View>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState("home");
  const [products, setProducts] = useState(INIT_PRODUCTS);
  const [customers, setCustomers] = useState(INIT_CUSTOMERS);
  const [invoices, setInvoices] = useState(INIT_INVOICES);
  const [settings, setSettings] = useState(INIT_SETTINGS);
  const [activeInv, setActiveInv] = useState(null);
  const [editingInv, setEditingInv] = useState(null);
  const [activeCust, setActiveCust] = useState(null);
  const [showNewSale, setShowNewSale] = useState(false);
  const [showNewProd, setShowNewProd] = useState(false);
  const [editProd, setEditProd] = useState(null);
  const [showNewCust, setShowNewCust] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      const p = await Store.get("vyp_products", INIT_PRODUCTS);
      const c = await Store.get("vyp_customers", INIT_CUSTOMERS);
      const i = await Store.get("vyp_invoices", INIT_INVOICES);
      const s = await Store.get("vyp_settings", INIT_SETTINGS);
      setProducts(p); setCustomers(c); setInvoices(i); setSettings(s);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) Store.set("vyp_products", products); }, [products]);
  useEffect(() => { if (loaded) Store.set("vyp_customers", customers); }, [customers]);
  useEffect(() => { if (loaded) Store.set("vyp_invoices", invoices); }, [invoices]);
  useEffect(() => { if (loaded) Store.set("vyp_settings", settings); }, [settings]);

  const showToast = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const nextInvId = () => {
    const nums = invoices.map(i => parseInt(i.id.split("-")[1]) || 0);
    return "INV-" + String((Math.max(0, ...nums) + 1)).padStart(3, "0");
  };

  const saveInvoice = (inv) => {
    if (editingInv) {
      setInvoices(prev => prev.map(x => x.id === inv.id ? inv : x));
      const oldInv = invoices.find(x => x.id === inv.id);
      const oldBal = calcInvoice(oldInv.items).grand - oldInv.paid;
      const newBal = calcInvoice(inv.items).grand - inv.paid;
      const diff = newBal - oldBal;
      if (diff !== 0) setCustomers(prev => prev.map(c => c.id === inv.customerId ? { ...c, balance: Math.max(0, c.balance + diff) } : c));
      setEditingInv(null); showToast("Invoice updated!");
    } else {
      setInvoices(prev => [...prev, inv]);
      const { grand } = calcInvoice(inv.items);
      const bal = grand - inv.paid;
      if (bal > 0) setCustomers(prev => prev.map(c => c.id === inv.customerId ? { ...c, balance: c.balance + bal } : c));
      showToast("Invoice saved!");
    }
    setShowNewSale(false);
    setPage("sales");
  };

  const deleteInvoice = (id) => {
    const inv = invoices.find(x => x.id === id);
    const bal = calcInvoice(inv.items).grand - inv.paid;
    if (bal > 0) setCustomers(prev => prev.map(c => c.id === inv.customerId ? { ...c, balance: Math.max(0, c.balance - bal) } : c));
    setInvoices(prev => prev.filter(x => x.id !== id));
    setActiveInv(null); showToast("Invoice deleted");
  };

  const goNav = (id) => {
    setPage(id); setActiveInv(null); setActiveCust(null);
    setShowNewSale(false); setEditingInv(null); setShowNewProd(false); setEditProd(null); setShowNewCust(false);
  };

  const NAV = [
    { id: "home", label: "Home" },
    { id: "sales", label: "Sales" },
    { id: "products", label: "Items" },
    { id: "customers", label: "Parties" },
    { id: "reports", label: "Reports" },
  ];

  if (!loaded) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: COLORS.white, fontSize: 28, fontWeight: "900" }}>VyaparBook</Text>
      <ActivityIndicator color={COLORS.accent} size="large" style={{ marginTop: 20 }} />
    </SafeAreaView>
  );

  const showNav = !showNewSale && !activeInv && !activeCust && page !== "settings";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar backgroundColor={COLORS.dark} barStyle="light-content" />

      {/* Header */}
      <View style={{ backgroundColor: COLORS.primary, paddingHorizontal: 16, height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: COLORS.white, fontWeight: "900", fontSize: 16 }}>V</Text>
          </View>
          <View>
            <Text style={{ color: COLORS.white, fontWeight: "800", fontSize: 16, lineHeight: 18 }}>{settings.firmName || "VyaparBook"}</Text>
            <Text style={{ color: "rgba(255,255,255,0.65)", fontSize: 10 }}>Business Manager</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable onPress={() => { setEditingInv(null); setShowNewSale(true); setPage("sales"); }}
            style={{ backgroundColor: COLORS.accent, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 22, flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ color: COLORS.white, fontWeight: "800", fontSize: 13 }}>+ New Sale</Text>
          </Pressable>
          <Pressable onPress={() => setPage("settings")}
            style={{ backgroundColor: "rgba(255,255,255,0.15)", width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: COLORS.white, fontSize: 18 }}>⚙</Text>
          </Pressable>
        </View>
      </View>

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Pages */}
      <View style={{ flex: 1 }}>
        {page === "home" && <HomePage customers={customers} invoices={invoices} products={products} goNav={goNav} setActiveCust={setActiveCust} setActiveInv={setActiveInv} />}
        {page === "sales" && !showNewSale && !activeInv && <SalesPage invoices={invoices} onNew={() => { setEditingInv(null); setShowNewSale(true); }} setActiveInv={setActiveInv} />}
        {page === "sales" && showNewSale && <SaleForm products={products} customers={customers} initInv={editingInv} onSave={saveInvoice} onClose={() => { setShowNewSale(false); setEditingInv(null); }} nextId={nextInvId()} />}
        {page === "sales" && activeInv && !showNewSale && <InvoicePage invoice={activeInv} settings={settings} onClose={() => setActiveInv(null)} onEdit={() => { setEditingInv(activeInv); setActiveInv(null); setShowNewSale(true); }} onDelete={deleteInvoice} showToast={showToast} />}
        {page === "products" && <ProductsPage products={products} setProducts={setProducts} showNew={showNewProd} setShowNew={setShowNewProd} editProd={editProd} setEditProd={setEditProd} showToast={showToast} />}
        {page === "customers" && !activeCust && <CustomersPage customers={customers} setCustomers={setCustomers} invoices={invoices} showNew={showNewCust} setShowNew={setShowNewCust} setActiveCust={setActiveCust} showToast={showToast} />}
        {page === "customers" && activeCust && <CustomerDetail customer={customers.find(c => c.id === activeCust.id) || activeCust} invoices={invoices.filter(i => i.customerId === activeCust.id)} settings={settings} onClose={() => setActiveCust(null)} setCustomers={setCustomers} showToast={showToast} />}
        {page === "reports" && <ReportsPage invoices={invoices} customers={customers} products={products} />}
        {page === "settings" && <SettingsPage settings={settings} setSettings={setSettings} showToast={showToast} onBack={() => setPage("home")} />}
      </View>

      {/* Bottom Nav */}
      {showNav && (
        <View style={{ flexDirection: "row", backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: 4 }}>
          {NAV.map(n => (
            <Pressable key={n.id} onPress={() => goNav(n.id)} style={{ flex: 1, alignItems: "center", paddingVertical: 8, gap: 2 }}>
              <Text style={{ fontSize: 18 }}>{n.id === "home" ? "🏠" : n.id === "sales" ? "🛒" : n.id === "products" ? "📦" : n.id === "customers" ? "👥" : "📊"}</Text>
              <Text style={{ fontSize: 10, color: page === n.id ? COLORS.primary : COLORS.textMuted, fontWeight: page === n.id ? "800" : "500" }}>{n.label}</Text>
              {page === n.id && <View style={{ width: 20, height: 2, backgroundColor: COLORS.primary, borderRadius: 2 }} />}
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────
function HomePage({ customers, invoices, products, goNav, setActiveCust, setActiveInv }) {
  const totalDue = customers.reduce((s, c) => s + c.balance, 0);
  const todayStr = today();
  const todaySales = invoices.filter(i => i.date === todayStr).reduce((s, i) => s + calcInvoice(i.items).grand, 0);
  const lowStock = products.filter(p => p.stock < 30).length;
  const pendingCusts = customers.filter(c => c.balance > 0).slice(0, 5);
  const recentInvs = [...invoices].reverse().slice(0, 3);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 20 }}>
      {/* Stats Grid */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
        <StatCard label="Total Receivable" val={fmt(totalDue)} color={COLORS.primary} />
        <StatCard label="Today's Sales" val={fmt(todaySales)} color={COLORS.accent} />
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
        <StatCard label="Total Customers" val={customers.length.toString()} color={COLORS.accent} />
        <StatCard label="Low Stock Items" val={lowStock.toString()} color={lowStock > 0 ? COLORS.danger : COLORS.success} />
      </View>

      {/* Pending Balance */}
      {pendingCusts.length > 0 && (
        <>
          <SecHead title="Customers – Pending Balance" onViewAll={() => goNav("customers")} />
          {pendingCusts.map(c => (
            <Card key={c.id} onPress={() => { setActiveCust(c); goNav("customers"); }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Avt name={c.name} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700", fontSize: 15, color: COLORS.text }}>{c.name}</Text>
                  <Text style={{ fontSize: 12, color: COLORS.textMuted }}>{c.phone} · {c.type}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontWeight: "800", color: COLORS.danger, fontSize: 16 }}>{fmt(c.balance)}</Text>
                  <View style={{ backgroundColor: COLORS.dangerBg, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10, marginTop: 2 }}>
                    <Text style={{ color: COLORS.danger, fontSize: 11, fontWeight: "700" }}>Due</Text>
                  </View>
                </View>
              </View>
            </Card>
          ))}
        </>
      )}

      {/* Recent Invoices */}
      <SecHead title="Recent Invoices" onViewAll={() => goNav("sales")} />
      {recentInvs.map(inv => {
        const { grand } = calcInvoice(inv.items);
        return (
          <Card key={inv.id} onPress={() => { setActiveInv(inv); goNav("sales"); }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ fontWeight: "700", color: COLORS.primary }}>{inv.id}</Text>
                <Text style={{ fontWeight: "600", color: COLORS.text, fontSize: 14 }}>{inv.customerName}</Text>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{inv.date} · {inv.items.length} items</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontWeight: "800", fontSize: 15, color: COLORS.text }}>{fmt(grand)}</Text>
                <Badge status={inv.status} />
              </View>
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );
}

// ─── Sales Page ───────────────────────────────────────────────────────────────
function SalesPage({ invoices, onNew, setActiveInv }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const filtered = invoices.filter(i =>
    (filter === "All" || i.status === filter) &&
    (i.id.toLowerCase().includes(search.toLowerCase()) || i.customerName.toLowerCase().includes(search.toLowerCase()))
  ).reverse();

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: COLORS.primary }}>Sales</Text>
        <Btn label="+ New" onPress={onNew} color={COLORS.primary} />
      </View>
      <Inp placeholder="Search invoice or party..." value={search} onChangeText={setSearch} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {["All", "Paid", "Partial", "Unpaid"].map(f => (
          <Pressable key={f} onPress={() => setFilter(f)} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: filter === f ? COLORS.primary : COLORS.border, backgroundColor: filter === f ? COLORS.light : COLORS.white, marginRight: 8 }}>
            <Text style={{ color: filter === f ? COLORS.primary : COLORS.textSub, fontWeight: "700", fontSize: 12 }}>{f}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={({ item: inv }) => {
          const { grand } = calcInvoice(inv.items);
          return (
            <Card onPress={() => setActiveInv(inv)}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ fontWeight: "700", color: COLORS.primary, fontSize: 15 }}>{inv.id}</Text>
                  <Text style={{ fontWeight: "600", color: COLORS.text }}>{inv.customerName}</Text>
                  <Text style={{ fontSize: 12, color: COLORS.textMuted }}>{inv.date} · {inv.items.length} item(s) · {inv.type}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontWeight: "800", fontSize: 16, color: COLORS.text }}>{fmt(grand)}</Text>
                  <Badge status={inv.status} />
                </View>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={<Text style={{ textAlign: "center", color: COLORS.textMuted, marginTop: 40, fontSize: 14 }}>No invoices found</Text>}
      />
    </View>
  );
}

// ─── Sale Form ────────────────────────────────────────────────────────────────
function SaleForm({ products, customers, initInv, onSave, onClose, nextId }) {
  const isEdit = !!initInv;
  const [custId, setCustId] = useState(initInv?.customerId || null);
  const [saleType, setSaleType] = useState(initInv?.type || "Retail");
  const [items, setItems] = useState(initInv?.items || []);
  const [paidAmt, setPaidAmt] = useState(initInv?.paid?.toString() || "");
  const [note, setNote] = useState(initInv?.note || "");
  const [date, setDate] = useState(initInv?.date || today());
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showCustDrop, setShowCustDrop] = useState(false);

  const selCust = customers.find(c => c.id === custId);
  const filtProds = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const { subtotal, totalGst, grand } = calcInvoice(items);
  const paid = Number(paidAmt) || 0;
  const balance = grand - paid;

  const addProd = (p) => {
    const rate = saleType === "Wholesale" ? p.wholesale : p.retail;
    setItems(prev => {
      const ex = prev.find(i => i.productId === p.id);
      if (ex) return prev.map(i => i.productId === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { productId: p.id, name: p.name, qty: 1, rate, gst: p.gst, discount: 0 }];
    });
    setShowSearch(false); setSearch("");
  };

  const updItem = (idx, k, v) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, [k]: Number(v) || 0 } : it));
  const remItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const save = () => {
    if (!custId) { Alert.alert("Error", "Please select a customer!"); return; }
    if (items.length === 0) { Alert.alert("Error", "Add at least one item!"); return; }
    const inv = {
      id: isEdit ? initInv.id : nextId,
      date, customerId: custId, customerName: selCust?.name || "",
      type: saleType, items, paid, note,
      status: paid >= grand - 0.01 ? "Paid" : paid > 0 ? "Partial" : "Unpaid"
    };
    onSave(inv);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Pressable onPress={onClose}><Text style={{ color: COLORS.primary, fontSize: 22 }}>←</Text></Pressable>
          <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.primary, flex: 1 }}>{isEdit ? `Edit ${initInv.id}` : `New Sale – ${nextId}`}</Text>
        </View>

        <Card>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            {["Retail", "Wholesale"].map(t => (
              <Pressable key={t} onPress={() => { setSaleType(t); setItems([]); }}
                style={{ flex: 1, padding: 10, borderRadius: 10, borderWidth: 2, borderColor: saleType === t ? COLORS.primary : COLORS.border, backgroundColor: saleType === t ? COLORS.light : COLORS.white, alignItems: "center" }}>
                <Text style={{ fontWeight: "800", color: saleType === t ? COLORS.primary : COLORS.textSub }}>{t}</Text>
              </Pressable>
            ))}
          </View>
          <Inp label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
          <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.textSub, marginBottom: 5, textTransform: "uppercase" }}>Customer *</Text>
          <Pressable onPress={() => setShowCustDrop(!showCustDrop)}
            style={{ padding: 12, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: "#FAFBFF", flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: selCust ? COLORS.text : COLORS.textMuted, fontSize: 14 }}>{selCust ? selCust.name : "Select customer..."}</Text>
            <Text style={{ color: COLORS.textMuted }}>▼</Text>
          </Pressable>
          {showCustDrop && (
            <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginTop: 4, maxHeight: 200 }}>
              <ScrollView>
                {customers.map(c => (
                  <Pressable key={c.id} onPress={() => { setCustId(c.id); setShowCustDrop(false); }}
                    style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Avt name={c.name} size={34} />
                    <View>
                      <Text style={{ fontWeight: "600", fontSize: 14 }}>{c.name}</Text>
                      <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{c.phone} · {c.type}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </Card>

        {/* Add Items */}
        <Card>
          <Pressable onPress={() => setShowSearch(!showSearch)}
            style={{ backgroundColor: COLORS.primary, padding: 12, borderRadius: 10, alignItems: "center" }}>
            <Text style={{ color: COLORS.white, fontWeight: "700" }}>+ Browse & Add Products</Text>
          </Pressable>
          {showSearch && (
            <View style={{ marginTop: 10 }}>
              <Inp placeholder="Search product..." value={search} onChangeText={setSearch} />
              <View style={{ maxHeight: 200, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10 }}>
                <ScrollView>
                  {filtProds.map(p => (
                    <Pressable key={p.id} onPress={() => addProd(p)}
                      style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: "row", justifyContent: "space-between" }}>
                      <View>
                        <Text style={{ fontWeight: "600", fontSize: 14 }}>{p.name}</Text>
                        <Text style={{ fontSize: 11, color: COLORS.textMuted }}>GST {p.gst}% · Stock: {p.stock}</Text>
                      </View>
                      <Text style={{ fontWeight: "700", color: COLORS.accent, fontSize: 14 }}>{fmt(saleType === "Wholesale" ? p.wholesale : p.retail)}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
        </Card>

        {/* Items List */}
        {items.length > 0 && (
          <Card>
            <Text style={{ fontWeight: "700", color: COLORS.primary, fontSize: 15, marginBottom: 10 }}>Items ({items.length})</Text>
            {items.map((it, idx) => {
              const { gstAmt, total } = calcItem(it);
              return (
                <View key={idx} style={{ backgroundColor: COLORS.light, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={{ fontWeight: "700", color: COLORS.text, flex: 1 }}>{it.name}</Text>
                    <Pressable onPress={() => remItem(idx)}><Text style={{ color: COLORS.danger, fontSize: 18 }}>🗑</Text></Pressable>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                    {[["Qty", "qty"], ["Rate ₹", "rate"], ["Disc %", "discount"]].map(([l, k]) => (
                      <View key={k} style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, color: COLORS.textMuted, marginBottom: 3 }}>{l}</Text>
                        <TextInput
                          keyboardType="numeric"
                          value={it[k].toString()}
                          onChangeText={v => updItem(idx, k, v)}
                          style={{ padding: 8, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 13, backgroundColor: COLORS.white, color: COLORS.text, textAlign: "right" }}
                        />
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 12, color: COLORS.textSub }}>GST {it.gst}% = {fmt(gstAmt)}</Text>
                    <Text style={{ fontWeight: "800", color: COLORS.primary, fontSize: 14 }}>= {fmt(total)}</Text>
                  </View>
                </View>
              );
            })}
            <View style={{ backgroundColor: COLORS.accentLight, borderRadius: 10, padding: 12 }}>
              <Row l="Subtotal" v={fmt(subtotal)} />
              <Row l="GST" v={fmt(totalGst)} />
              <View style={{ borderTopWidth: 2, borderTopColor: COLORS.accent, marginVertical: 8 }} />
              <Row l="Grand Total" v={fmt(grand)} bold />
            </View>
          </Card>
        )}

        {/* Payment */}
        {items.length > 0 && (
          <Card>
            <Inp label="Amount Received (₹)" keyboardType="numeric" value={paidAmt} onChangeText={setPaidAmt} placeholder="0.00" />
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {[["Credit", 0], ["Half", Math.round(grand / 2)], ["Full", Math.ceil(grand)]].map(([l, v]) => (
                <Pressable key={l} onPress={() => setPaidAmt(v.toString())}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.accent, backgroundColor: COLORS.white }}>
                  <Text style={{ color: COLORS.accent, fontWeight: "700", fontSize: 12 }}>{l}: {fmt(v)}</Text>
                </Pressable>
              ))}
            </View>
            {paidAmt !== "" && (
              <View style={{ backgroundColor: balance > 0 ? COLORS.warnBg : COLORS.successBg, borderRadius: 8, padding: 10, marginBottom: 10 }}>
                <Row l="Paid" v={fmt(paid)} />
                <Row l="Balance Due" v={fmt(Math.max(0, balance))} bold color={balance > 0 ? COLORS.danger : COLORS.success} />
              </View>
            )}
            <Inp label="Note / Remark" value={note} onChangeText={setNote} placeholder="Optional note..." />
          </Card>
        )}

        <Btn label={isEdit ? "✓ Update Invoice" : "✓ Save Invoice"} onPress={save} color={COLORS.primary} size={16} style={{ marginTop: 4, paddingVertical: 14, borderRadius: 12 }} />
        <View style={{ height: 30 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Invoice Page ─────────────────────────────────────────────────────────────
function InvoicePage({ invoice, settings, onClose, onEdit, onDelete, showToast }) {
  const { subtotal, totalGst, grand } = calcInvoice(invoice.items);
  const balance = grand - invoice.paid;

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <Pressable onPress={onClose}><Text style={{ color: COLORS.primary, fontSize: 22 }}>←</Text></Pressable>
        <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.primary, flex: 1 }}>{invoice.id}</Text>
        <Badge status={invoice.status} />
      </View>

      <Card style={{ backgroundColor: COLORS.primary }}>
        <Text style={{ color: COLORS.white, fontWeight: "900", fontSize: 18 }}>{settings.firmName}</Text>
        <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 }}>{settings.address}</Text>
        <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{settings.phone} · GST: {settings.gstNo}</Text>
      </Card>

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View><Text style={{ fontWeight: "700", color: COLORS.text }}>{invoice.customerName}</Text><Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{invoice.date} · {invoice.type}</Text></View>
          <Text style={{ fontWeight: "700", color: COLORS.primary }}>{invoice.id}</Text>
        </View>
      </Card>

      <Card>
        <Text style={{ fontWeight: "700", color: COLORS.primary, marginBottom: 8 }}>Items</Text>
        {invoice.items.map((it, i) => {
          const { total } = calcItem(it);
          return (
            <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "600", fontSize: 13 }}>{it.name}</Text>
                <Text style={{ fontSize: 11, color: COLORS.textMuted }}>Qty:{it.qty} × ₹{it.rate} | GST:{it.gst}% | Disc:{it.discount}%</Text>
              </View>
              <Text style={{ fontWeight: "700", color: COLORS.text }}>{fmt(total)}</Text>
            </View>
          );
        })}
        <View style={{ marginTop: 10 }}>
          <Row l="Subtotal" v={fmt(subtotal)} />
          <Row l="Total GST" v={fmt(totalGst)} />
          <View style={{ borderTopWidth: 2, borderTopColor: COLORS.primary, marginVertical: 6 }} />
          <Row l="Grand Total" v={fmt(grand)} bold />
          <Row l="Paid" v={fmt(invoice.paid)} color={COLORS.success} />
          <Row l="Balance Due" v={fmt(Math.max(0, balance))} bold color={balance > 0 ? COLORS.danger : COLORS.success} />
        </View>
      </Card>

      {invoice.note ? <Card><Text style={{ color: COLORS.textSub, fontSize: 13 }}>Note: {invoice.note}</Text></Card> : null}

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
        <Btn label="✏ Edit" onPress={onEdit} color={COLORS.primary} style={{ flex: 1 }} />
        <Btn label="🗑 Delete" onPress={() => { Alert.alert("Delete", "Delete this invoice?", [{ text: "Cancel" }, { text: "Delete", style: "destructive", onPress: () => onDelete(invoice.id) }]); }} color={COLORS.danger} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

// ─── Products Page ────────────────────────────────────────────────────────────
function ProductsPage({ products, setProducts, showNew, setShowNew, editProd, setEditProd, showToast }) {
  const [search, setSearch] = useState("");
  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search));

  if (showNew || editProd) return (
    <ProductForm product={editProd} onSave={(p) => {
      if (editProd) setProducts(products.map(x => x.id === p.id ? p : x));
      else setProducts([...products, { ...p, id: Date.now() }]);
      setShowNew(false); setEditProd(null); showToast(editProd ? "Product updated!" : "Product added!");
    }} onClose={() => { setShowNew(false); setEditProd(null); }} />
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: COLORS.primary }}>Products</Text>
        <Btn label="+ Add" onPress={() => setShowNew(true)} color={COLORS.primary} />
      </View>
      <Inp placeholder="Search name, barcode, category..." value={search} onChangeText={setSearch} />
      <FlatList
        data={filtered}
        keyExtractor={p => p.id.toString()}
        renderItem={({ item: p }) => (
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <Text style={{ fontWeight: "700", fontSize: 15, color: COLORS.text }}>{p.name}</Text>
                  <View style={{ backgroundColor: COLORS.light, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                    <Text style={{ fontSize: 10, color: COLORS.primary, fontWeight: "600" }}>{p.category}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 6 }}>📦 {p.barcode}</Text>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {[["MRP", fmt(p.mrp)], ["W/Sale", fmt(p.wholesale)], ["Retail", fmt(p.retail)], [`Stock:${p.stock}`, `GST ${p.gst}%`]].map(([l, v]) => (
                    <View key={l} style={{ flex: 1, backgroundColor: COLORS.bg, borderRadius: 8, padding: 6, alignItems: "center" }}>
                      <Text style={{ fontSize: 9, color: COLORS.textMuted }}>{l}</Text>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: COLORS.primary }}>{v}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <Pressable onPress={() => setEditProd(p)} style={{ marginLeft: 8 }}>
                <Text style={{ fontSize: 20, color: COLORS.primary }}>✏</Text>
              </Pressable>
            </View>
          </Card>
        )}
        ListEmptyComponent={<Text style={{ textAlign: "center", color: COLORS.textMuted, marginTop: 40 }}>No products found</Text>}
      />
    </View>
  );
}

function ProductForm({ product, onSave, onClose }) {
  const [f, setF] = useState(product || { barcode: "", name: "", category: "Grocery", mrp: "", wholesale: "", retail: "", gst: 18, unit: "Pkt", stock: 0 });
  const s = (k, v) => setF(x => ({ ...x, [k]: v }));

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Pressable onPress={onClose}><Text style={{ color: COLORS.primary, fontSize: 22 }}>←</Text></Pressable>
          <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.primary }}>{product ? "Edit" : "Add"} Product</Text>
        </View>
        <Card>
          <Inp label="Product Name *" value={f.name} onChangeText={v => s("name", v)} placeholder="Product name" />
          <Inp label="Barcode" value={f.barcode} onChangeText={v => s("barcode", v)} placeholder="Scan or enter" />
          <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.textSub, marginBottom: 5, textTransform: "uppercase" }}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {CATEGORIES.map(c => (
              <Pressable key={c} onPress={() => s("category", c)}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: f.category === c ? COLORS.primary : COLORS.border, backgroundColor: f.category === c ? COLORS.light : COLORS.white, marginRight: 6 }}>
                <Text style={{ color: f.category === c ? COLORS.primary : COLORS.textSub, fontWeight: "700", fontSize: 12 }}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Inp label="Unit" value={f.unit} onChangeText={v => s("unit", v)} placeholder="Pkt / Bag / Bottle" />
          <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.textSub, marginBottom: 5, textTransform: "uppercase" }}>GST Slab</Text>
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
            {GST_SLABS.map(g => (
              <Pressable key={g} onPress={() => s("gst", g)}
                style={{ flex: 1, padding: 8, borderRadius: 8, borderWidth: 2, borderColor: f.gst === g ? COLORS.primary : COLORS.border, backgroundColor: f.gst === g ? COLORS.light : COLORS.white, alignItems: "center" }}>
                <Text style={{ fontWeight: "800", color: f.gst === g ? COLORS.primary : COLORS.textSub, fontSize: 13 }}>{g}%</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[["MRP ₹", "mrp"], ["W/Sale ₹", "wholesale"], ["Retail ₹", "retail"]].map(([l, k]) => (
              <View key={k} style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.textSub, marginBottom: 4, textTransform: "uppercase" }}>{l}</Text>
                <TextInput keyboardType="numeric" value={f[k]?.toString()} onChangeText={v => s(k, v)} style={{ padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, fontSize: 13, backgroundColor: "#FAFBFF", color: COLORS.text }} />
              </View>
            ))}
          </View>
          <View style={{ height: 10 }} />
          <Inp label="Opening Stock" keyboardType="numeric" value={f.stock?.toString()} onChangeText={v => s("stock", Number(v) || 0)} />
        </Card>
        <Btn label={`✓ ${product ? "Update" : "Save"} Product`} onPress={() => { if (!f.name) { Alert.alert("Error", "Enter product name!"); return; } onSave(f); }} color={COLORS.primary} size={16} style={{ paddingVertical: 14, borderRadius: 12, marginBottom: 30 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Customers Page ───────────────────────────────────────────────────────────
function CustomersPage({ customers, setCustomers, invoices, showNew, setShowNew, setActiveCust, showToast }) {
  const [search, setSearch] = useState("");
  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  if (showNew) return (
    <CustomerForm onSave={(c) => { setCustomers([...customers, { ...c, id: Date.now(), balance: 0 }]); setShowNew(false); showToast("Customer added!"); }} onClose={() => setShowNew(false)} />
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: COLORS.primary }}>Parties</Text>
        <Btn label="+ Add" onPress={() => setShowNew(true)} color={COLORS.primary} />
      </View>
      <Inp placeholder="Search name or phone..." value={search} onChangeText={setSearch} />
      <FlatList
        data={filtered}
        keyExtractor={c => c.id.toString()}
        renderItem={({ item: c }) => (
          <Card onPress={() => setActiveCust(c)}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Avt name={c.name} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", fontSize: 15, color: COLORS.text }}>{c.name}</Text>
                <Text style={{ fontSize: 12, color: COLORS.textMuted }}>{c.phone} · {c.type}</Text>
              </View>
              {c.balance > 0
                ? <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontWeight: "800", color: COLORS.danger }}>{fmt(c.balance)}</Text>
                    <Badge status="Unpaid" />
                  </View>
                : <View style={{ backgroundColor: COLORS.successBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                    <Text style={{ color: COLORS.success, fontSize: 12, fontWeight: "700" }}>Cleared</Text>
                  </View>}
            </View>
          </Card>
        )}
      />
    </View>
  );
}

function CustomerDetail({ customer, invoices, settings, onClose, setCustomers, showToast }) {
  const total = invoices.reduce((s, i) => s + calcInvoice(i.items).grand, 0);
  const [editBal, setEditBal] = useState(false);
  const [balAdj, setBalAdj] = useState("");

  const adjustBalance = () => {
    const adj = Number(balAdj);
    setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, balance: Math.max(0, c.balance - adj) } : c));
    setEditBal(false); setBalAdj(""); showToast(`Payment of ${fmt(adj)} recorded!`);
  };

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <Pressable onPress={onClose}><Text style={{ color: COLORS.primary, fontSize: 22 }}>←</Text></Pressable>
        <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.primary, flex: 1 }}>{customer.name}</Text>
      </View>

      <View style={{ backgroundColor: COLORS.primary, borderRadius: 16, padding: 18, marginBottom: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <Avt name={customer.name} color={COLORS.white} textColor={COLORS.primary} size={52} />
          <View>
            <Text style={{ fontWeight: "800", fontSize: 18, color: COLORS.white }}>{customer.name}</Text>
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>{customer.phone} · {customer.type}</Text>
            {customer.gstNo ? <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>GST: {customer.gstNo}</Text> : null}
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, padding: 12 }}>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Balance Due</Text>
            <Text style={{ fontWeight: "900", fontSize: 20, color: COLORS.white }}>{fmt(customer.balance)}</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, padding: 12 }}>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Total Business</Text>
            <Text style={{ fontWeight: "900", fontSize: 20, color: COLORS.white }}>{fmt(total)}</Text>
          </View>
        </View>
        {customer.balance > 0 && (
          <Pressable onPress={() => setEditBal(true)} style={{ backgroundColor: COLORS.white, marginTop: 12, padding: 12, borderRadius: 10, alignItems: "center" }}>
            <Text style={{ color: COLORS.primary, fontWeight: "800" }}>💰 Record Payment</Text>
          </Pressable>
        )}
      </View>

      {editBal && (
        <Card style={{ backgroundColor: COLORS.warnBg }}>
          <Inp label="Payment Amount Received (₹)" keyboardType="numeric" value={balAdj} onChangeText={setBalAdj} placeholder="Amount received..." />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Btn label="Cancel" onPress={() => setEditBal(false)} color={COLORS.textSub} style={{ flex: 1 }} />
            <Btn label="✓ Save Payment" onPress={adjustBalance} color={COLORS.primary} style={{ flex: 2 }} />
          </View>
        </Card>
      )}

      <SecHead title={`Purchase History (${invoices.length})`} />
      {[...invoices].reverse().map(inv => {
        const { grand } = calcInvoice(inv.items);
        return (
          <Card key={inv.id}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View>
                <Text style={{ fontWeight: "700", color: COLORS.primary }}>{inv.id}</Text>
                <Text style={{ fontSize: 12, color: COLORS.textMuted }}>{inv.date} · {inv.items.length} items</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontWeight: "800", color: COLORS.text }}>{fmt(grand)}</Text>
                <Badge status={inv.status} />
              </View>
            </View>
          </Card>
        );
      })}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

function CustomerForm({ onSave, onClose }) {
  const [f, setF] = useState({ name: "", phone: "", address: "", gstNo: "", type: "Retail" });
  const s = (k, v) => setF(x => ({ ...x, [k]: v }));
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Pressable onPress={onClose}><Text style={{ color: COLORS.primary, fontSize: 22 }}>←</Text></Pressable>
          <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.primary }}>Add Customer</Text>
        </View>
        <Card>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            {["Retail", "Wholesale"].map(t => (
              <Pressable key={t} onPress={() => s("type", t)}
                style={{ flex: 1, padding: 10, borderRadius: 10, borderWidth: 2, borderColor: f.type === t ? COLORS.primary : COLORS.border, backgroundColor: f.type === t ? COLORS.light : COLORS.white, alignItems: "center" }}>
                <Text style={{ fontWeight: "800", color: f.type === t ? COLORS.primary : COLORS.textSub }}>{t}</Text>
              </Pressable>
            ))}
          </View>
          {[["Name *", "name", "Customer name"], ["Phone", "phone", "Mobile number"], ["Address", "address", "Full address"], ["GST No", "gstNo", "GST number (optional)"]].map(([l, k, ph]) => (
            <Inp key={k} label={l} value={f[k]} onChangeText={v => s(k, v)} placeholder={ph} />
          ))}
        </Card>
        <Btn label="✓ Add Customer" onPress={() => { if (!f.name) { Alert.alert("Error", "Enter customer name!"); return; } onSave(f); }} color={COLORS.primary} size={16} style={{ paddingVertical: 14, borderRadius: 12, marginBottom: 30 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Reports Page ─────────────────────────────────────────────────────────────
function ReportsPage({ invoices, customers, products }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const mInvs = invoices.filter(i => {
    const [y, m] = i.date.split("-").map(Number);
    return y === year && m === month;
  });

  const totalSales = mInvs.reduce((s, i) => s + calcInvoice(i.items).grand, 0);
  const totalPaid = mInvs.reduce((s, i) => s + i.paid, 0);
  const totalDue = totalSales - totalPaid;
  const totalGst = mInvs.reduce((s, i) => s + calcInvoice(i.items).totalGst, 0);

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "800", color: COLORS.primary, marginBottom: 14 }}>Reports</Text>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {MONTHS.map((m, i) => (
            <Pressable key={m} onPress={() => setMonth(i + 1)}
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: month === i + 1 ? COLORS.primary : COLORS.border, backgroundColor: month === i + 1 ? COLORS.primary : COLORS.white, marginRight: 6 }}>
              <Text style={{ color: month === i + 1 ? COLORS.white : COLORS.textSub, fontWeight: "700", fontSize: 12 }}>{m}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <Text style={{ fontWeight: "700", color: COLORS.primary, fontSize: 16, marginBottom: 10, textAlign: "center" }}>{MONTHS[month - 1]} {year} — {mInvs.length} Invoices</Text>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
        <StatCard label="Total Sales" val={fmt(totalSales)} color={COLORS.primary} />
        <StatCard label="Collected" val={fmt(totalPaid)} color={COLORS.success} />
      </View>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
        <StatCard label="Outstanding" val={fmt(totalDue)} color={COLORS.warn} />
        <StatCard label="Total GST" val={fmt(totalGst)} color={COLORS.primary} />
      </View>

      <Card>
        <Text style={{ fontWeight: "700", color: COLORS.primary, fontSize: 15, marginBottom: 10 }}>Monthly Summary</Text>
        <Row l="Total Invoices" v={mInvs.length.toString()} />
        <Row l="Gross Sales" v={fmt(totalSales)} bold />
        <Row l="Paid Amount" v={fmt(totalPaid)} color={COLORS.success} />
        <Row l="Pending Amount" v={fmt(totalDue)} color={totalDue > 0 ? COLORS.danger : COLORS.success} bold />
        <View style={{ borderTopWidth: 1, borderTopColor: COLORS.border, marginVertical: 8 }} />
        <Row l="Paid Invoices" v={mInvs.filter(i => i.status === "Paid").length.toString()} />
        <Row l="Partial Invoices" v={mInvs.filter(i => i.status === "Partial").length.toString()} />
        <Row l="Unpaid Invoices" v={mInvs.filter(i => i.status === "Unpaid").length.toString()} />
      </Card>
    </ScrollView>
  );
}

// ─── Settings Page ─────────────────────────────────────────────────────────────
function SettingsPage({ settings, setSettings, showToast, onBack }) {
  const [f, setF] = useState(settings);
  const s = (k, v) => setF(x => ({ ...x, [k]: v }));

  const save = () => { setSettings(f); showToast("Settings saved!"); onBack(); };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Pressable onPress={onBack}><Text style={{ color: COLORS.primary, fontSize: 22 }}>←</Text></Pressable>
          <Text style={{ fontSize: 20, fontWeight: "800", color: COLORS.primary }}>Settings</Text>
        </View>

        {/* Company Name - Highlighted */}
        <View style={{ backgroundColor: COLORS.primary, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <Text style={{ color: COLORS.white, fontWeight: "700", fontSize: 13, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>✏ Company Name (Editable)</Text>
          <TextInput
            value={f.firmName}
            onChangeText={v => s("firmName", v)}
            placeholder="Enter your company name"
            placeholderTextColor="rgba(255,255,255,0.5)"
            style={{ backgroundColor: "rgba(255,255,255,0.15)", color: COLORS.white, padding: 14, borderRadius: 10, fontSize: 20, fontWeight: "800", borderWidth: 2, borderColor: COLORS.accent }}
          />
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 6 }}>This name appears in the app header and on all invoices</Text>
        </View>

        <Card>
          <Text style={{ fontWeight: "700", color: COLORS.primary, marginBottom: 10 }}>Firm Details</Text>
          {[["Address", "address"], ["Phone", "phone"], ["Email", "email"], ["GST No", "gstNo"]].map(([l, k]) => (
            <Inp key={k} label={l} value={f[k]} onChangeText={v => s(k, v)} />
          ))}
        </Card>

        <Card>
          <Text style={{ fontWeight: "700", color: COLORS.primary, marginBottom: 10 }}>Bank Details</Text>
          {[["Bank Name", "bankName"], ["Account No", "accountNo"], ["IFSC Code", "ifsc"], ["UPI ID", "upiId"]].map(([l, k]) => (
            <Inp key={k} label={l} value={f[k]} onChangeText={v => s(k, v)} />
          ))}
        </Card>

        <Btn label="✓ Save Settings" onPress={save} color={COLORS.accent} size={16} style={{ paddingVertical: 14, borderRadius: 12, marginBottom: 30 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
