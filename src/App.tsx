import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  PlusCircle, 
  PieChart, 
  FileText, 
  ShieldCheck, 
  LogOut,
  RefreshCcw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Scale,
  Settings,
  Download,
  Menu,
  X,
  Link2,
  Mail,
  Lock,
  UserPlus,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { initAuth, googleSignIn, logout, getAccessToken, emailSignIn, emailSignUp, linkGoogleAccount, resetPassword } from "./lib/firebase.ts";
import { User } from "firebase/auth";
import { Transaction, CATEGORIES_LIST, ACCOUNT_TYPES, getQuarter, QUARTERS_LIST, MONTHS, getMonthName } from "./types.ts";
import { format } from "date-fns";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart as RePieChart, 
  Pie, 
  Cell, 
  Legend 
} from "recharts";

import { findSpreadsheet, createSpreadsheet, readSheetValues, appendSheetValues } from "./services/googleSheets.ts";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"DASHBOARD" | "INPUT" | "REKAP" | "LABA_RUGI" | "NERACA" | "SETTINGS">("DASHBOARD");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [appName, setAppName] = useState(() => localStorage.getItem("appName") || "Keuangan 2026");
  const [isSyncing, setIsSyncing] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [loginMode, setLoginMode] = useState<"SIGN_IN" | "SIGN_UP">("SIGN_IN");
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "info", message: string } | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setUser(user);
        setAccessToken(token);
        if (token) findOrCreateSpreadsheet(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const findOrCreateSpreadsheet = async (token: string) => {
    setIsSyncing(true);
    try {
      const files = await findSpreadsheet(token);
      
      if (files && files.length > 0) {
        setSpreadsheetId(files[0].id);
        await fetchData(files[0].id, token);
        setNotification({ type: "success", message: "Spreadsheet ditemukan dan data dimuat." });
      } else {
        const newSheet = await createSpreadsheet(token);
        setSpreadsheetId(newSheet.spreadsheetId);
        await fetchData(newSheet.spreadsheetId, token);
        setNotification({ type: "success", message: "Spreadsheet baru berhasil dibuat!" });
      }
    } catch (err: any) {
      console.error(err);
      setNotification({ type: "error", message: err.message });
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  };

  const fetchData = async (sid: string, token: string) => {
    if (!sid || !token) {
      setIsSyncing(false);
      return;
    }
    setIsSyncing(true);
    try {
      const data = await readSheetValues(sid, "INPUT!A2:I", token);
      if (data.values) {
        const mapped: Transaction[] = data.values.map((row: any[]) => ({
          date: row[0] || "",
          month: row[1] || "",
          quarter: row[2] || "",
          category: row[3] || "",
          accountType: row[4] || "",
          description: row[5] || "",
          debit: parseFloat(row[6]) || 0,
          kredit: parseFloat(row[7]) || 0,
          timestamp: row[8] || ""
        }));
        setTransactions(mapped);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsSyncing(false);
    }
  };


  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoading(true);
    try {
      if (loginMode === "SIGN_IN") {
        await emailSignIn(email, password);
      } else {
        await emailSignUp(email, password);
      }
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setAuthError("Email ini sudah terdaftar. Silakan gunakan tab 'Masuk'.");
      } else if (err.code === "auth/wrong-password") {
        setAuthError("Password salah. Silakan coba lagi.");
      } else {
        setAuthError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setAuthError("Masukkan email Anda terlebih dahulu.");
      return;
    }
    setAuthError(null);
    setIsLoading(true);
    try {
      await resetPassword(email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLink = async () => {
    if (user?.uid === "guest") {
      setNotification({ type: "error", message: "Akses Tamu tidak dapat menghubungkan spreadsheet asli. Silakan daftar/masuk dengan email." });
      return;
    }
    setNotification({ type: "info", message: "Menghubungkan ke Google..." });
    try {
      const res = await linkGoogleAccount();
      if (res && res.accessToken) {
        setAccessToken(res.accessToken);
        await findOrCreateSpreadsheet(res.accessToken);
      } else {
        throw new Error("Gagal mendapatkan akses dari Google.");
      }
    } catch (err: any) {
      console.error(err);
      setNotification({ type: "error", message: `Gagal: ${err.message}` });
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setSpreadsheetId(null);
    setTransactions([]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg-tertiary flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#185FA5]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-bg-tertiary flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-bg-primary border border-border-tertiary p-8 rounded-2xl shadow-xl shadow-slate-200/50"
        >
          <div className="flex flex-col items-center text-center space-y-3 mb-8">
            <div className="w-14 h-14 bg-[#185FA5] rounded-xl flex items-center justify-center shadow-lg shadow-[#185FA5]/20">
              <Scale className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">{appName}</h1>
            <p className="text-text-secondary text-sm">
              Sistem keuangan operasional cerdas terintegrasi spreadsheet.
            </p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[12px] font-bold text-text-secondary uppercase">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@anda.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-bg-secondary border border-border-secondary rounded-lg focus:ring-2 focus:ring-[#185FA5]/10 focus:border-[#185FA5] outline-none transition-all"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[12px] font-bold text-text-secondary uppercase">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-bg-secondary border border-border-secondary rounded-lg focus:ring-2 focus:ring-[#185FA5]/10 focus:border-[#185FA5] outline-none transition-all"
                  required
                />
              </div>
            </div>

            {authError && (
              <div className="text-[11px] text-rose-500 bg-rose-50 p-2.5 rounded border border-rose-100 font-medium">
                {authError}
              </div>
            )}

            {resetSent && (
              <div className="text-[11px] text-emerald-600 bg-emerald-50 p-2.5 rounded border border-emerald-100 font-medium">
                Instruksi reset password telah dikirim ke email Anda.
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#185FA5] text-white rounded-lg font-bold hover:bg-[#0C447C] transition-all shadow-md active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : loginMode === "SIGN_IN" ? "Masuk ke Panel" : "Daftar Akun Baru"}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border-tertiary"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-bg-primary px-2 text-text-secondary font-bold">Atau</span></div>
            </div>

            <button 
              type="button"
              onClick={() => {
                setUser({ email: "guest@demo.com", displayName: "Operator Tamu", uid: "guest" } as any);
                setAccessToken("demo-token");
                setIsLoading(false);
              }}
              className="w-full py-3 border-2 border-border-tertiary text-text-primary rounded-lg font-bold hover:bg-bg-tertiary transition-all flex items-center justify-center gap-2"
            >
              <UserPlus size={16} /> Akses Tamu / Demo
            </button>

            {loginMode === "SIGN_IN" && (
              <button 
                type="button"
                onClick={handleResetPassword}
                disabled={isLoading}
                className="w-full text-center text-xs text-text-secondary hover:text-[#185FA5] font-medium transition-colors"
              >
                Lupa Password?
              </button>
            )}
          </form>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-text-secondary">
            <span>{loginMode === "SIGN_IN" ? "Belum punya akun?" : "Sudah punya akun?"}</span>
            <button 
              onClick={() => setLoginMode(loginMode === "SIGN_IN" ? "SIGN_UP" : "SIGN_IN")}
              className="text-[#185FA5] font-bold hover:underline"
            >
              {loginMode === "SIGN_IN" ? "Daftar Sekarang" : "Masuk"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg-tertiary text-text-primary overflow-hidden relative">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-[210px] bg-bg-primary border-r-[0.5px] border-border-tertiary flex-col py-4 flex-shrink-0">
        <div className="px-4 pb-4 border-b-[0.5px] border-border-tertiary mb-2">
          <div className="text-[14px] font-bold text-text-primary">{appName}</div>
          <div className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">Panel Administrasi</div>
        </div>
        <nav className="flex-1 overflow-y-auto">
          <NavigationItems activeTab={activeTab} setActiveTab={setActiveTab} />
        </nav>
        <div className="px-4 pt-4 border-t-[0.5px] border-border-tertiary mt-auto">
          <UserBrief user={user} onLogout={handleLogout} />
        </div>
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {showMobileSidebar && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileSidebar(false)}
              className="lg:hidden fixed inset-0 bg-black z-40"
            />
            <motion.aside 
              initial={{ x: -210 }}
              animate={{ x: 0 }}
              exit={{ x: -210 }}
              className="lg:hidden fixed top-0 left-0 bottom-0 w-[210px] bg-bg-primary z-50 flex flex-col py-4 shadow-2xl"
            >
              <div className="px-4 pb-4 border-b-[0.5px] border-border-tertiary mb-2 flex justify-between items-center">
                <div>
                  <div className="text-[14px] font-bold text-text-primary">{appName}</div>
                  <div className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">Admin Mobile</div>
                </div>
                <button onClick={() => setShowMobileSidebar(false)} className="text-text-secondary p-1">
                  <X size={18} />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto">
                <NavigationItems 
                  activeTab={activeTab} 
                  setActiveTab={(tab) => {
                    setActiveTab(tab);
                    setShowMobileSidebar(false);
                  }} 
                />
              </nav>
              <div className="px-4 pt-4 border-t-[0.5px] border-border-tertiary mt-auto">
                <UserBrief user={user} onLogout={handleLogout} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Banner Notifikasi */}
        <AnimatePresence>
          {notification && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`shrink-0 overflow-hidden text-center py-2 px-4 shadow-md font-bold text-xs flex items-center justify-center gap-2 z-50 ${
                notification.type === "success" ? "bg-emerald-500 text-white" : 
                notification.type === "error" ? "bg-rose-500 text-white" : 
                "bg-[#185FA5] text-white"
              }`}
            >
              {notification.type === "error" ? <X size={14} /> : notification.type === "success" ? <ShieldCheck size={14} /> : <Loader2 size={14} className="animate-spin" />}
              {notification.message}
              <button onClick={() => setNotification(null)} className="ml-auto opacity-70 hover:opacity-100"><X size={14} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        <header className="lg:hidden flex items-center justify-between px-4 h-[56px] bg-bg-primary border-b border-border-tertiary shrink-0">
          <button onClick={() => setShowMobileSidebar(true)} className="p-1 -ml-1">
            <Menu size={20} className="text-text-primary" />
          </button>
          <div className="text-[14px] font-bold text-text-primary truncate px-2">{appName}</div>
          <div className="w-8"></div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 lg:pb-6">
          <header className="hidden lg:flex items-center justify-between mb-6">
            <h2 className="text-[20px] font-bold text-text-primary capitalize">{activeTab.replace("_", " ")}</h2>
            <SpreadsheetBadge sid={spreadsheetId} onSync={() => fetchData(spreadsheetId!, accessToken!)} isSyncing={isSyncing} />
          </header>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "DASHBOARD" && <DashboardPanel transactions={transactions} />}
              {activeTab === "INPUT" && (
                <TransactionPanel 
                  spreadsheetId={spreadsheetId!} 
                  accessToken={accessToken!} 
                  transactions={transactions}
                  onSuccess={() => fetchData(spreadsheetId!, accessToken!)} 
                />
              )}
              {activeTab === "REKAP" && <RekapPanel transactions={transactions} />}
              {activeTab === "LABA_RUGI" && <LabaRugiPanel transactions={transactions} />}
              {activeTab === "NERACA" && <NeracaPanel transactions={transactions} />}
              {activeTab === "SETTINGS" && (
                <SettingsPanel 
                  appName={appName} 
                  setAppName={(val) => {
                    setAppName(val);
                    localStorage.setItem("appName", val);
                  }}
                  transactions={transactions}
                  spreadsheetId={spreadsheetId!}
                  setSpreadsheetId={setSpreadsheetId}
                  accessToken={accessToken!}
                  onGoogleLink={handleGoogleLink}
                  onImportSuccess={() => fetchData(spreadsheetId!, accessToken!)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-[64px] bg-bg-primary border-t border-border-tertiary flex items-center justify-around px-2 z-30">
          <MobileNavItem icon={<LayoutDashboard size={20} />} active={activeTab === "DASHBOARD"} onClick={() => setActiveTab("DASHBOARD")} />
          <MobileNavItem icon={<PlusCircle size={20} />} active={activeTab === "INPUT"} onClick={() => setActiveTab("INPUT")} />
          <MobileNavItem icon={<Scale size={20} />} active={activeTab === "NERACA"} onClick={() => setActiveTab("NERACA")} />
          <MobileNavItem icon={<Settings size={20} />} active={activeTab === "SETTINGS"} onClick={() => setActiveTab("SETTINGS")} />
        </nav>
      </main>
    </div>
  );
}

function NavigationItems({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: any) => void }) {
  return (
    <>
      <NavItem icon={<LayoutDashboard size={17} />} label="Dashboard" active={activeTab === "DASHBOARD"} onClick={() => setActiveTab("DASHBOARD")} />
      <NavItem icon={<PlusCircle size={17} />} label="Input Transaksi" active={activeTab === "INPUT"} onClick={() => setActiveTab("INPUT")} />
      <NavItem icon={<PieChart size={17} />} label="Rekap Bulanan" active={activeTab === "REKAP"} onClick={() => setActiveTab("REKAP")} />
      <NavItem icon={<TrendingUp size={17} />} label="Laba Rugi" active={activeTab === "LABA_RUGI"} onClick={() => setActiveTab("LABA_RUGI")} />
      <NavItem icon={<Scale size={17} />} label="Neraca" active={activeTab === "NERACA"} onClick={() => setActiveTab("NERACA")} />
      <div className="mt-2 pt-2 border-t border-border-tertiary">
        <NavItem icon={<Settings size={17} />} label="Konfigurasi" active={activeTab === "SETTINGS"} onClick={() => setActiveTab("SETTINGS")} />
      </div>
    </>
  );
}

function UserBrief({ user, onLogout }: { user: User, onLogout: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#b6d0e9] text-[#185FA5] flex items-center justify-center font-bold text-xs border border-[#185FA5]/10">
          {user.email?.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-text-primary truncate">{user.displayName || user.email?.split('@')[0]}</p>
          <p className="text-[10px] text-text-secondary truncate">{user.email}</p>
        </div>
      </div>
      <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-[11px] text-rose-500 hover:text-rose-600 font-bold py-2 border border-rose-100 rounded bg-rose-50 transition-colors">
        <LogOut size={12} /> Keluar
      </button>
    </div>
  );
}

function SpreadsheetBadge({ sid, onSync, isSyncing }: { sid: string | null, onSync: () => void, isSyncing: boolean }) {
  return (
    <div className="flex items-center gap-2 bg-bg-primary border border-border-tertiary py-1 px-2 rounded-lg shadow-sm">
      <div className={`w-2 h-2 rounded-full ${sid ? "bg-emerald-500" : "bg-rose-400 animate-pulse"}`}></div>
      <span className="text-[10px] font-mono text-text-secondary truncate max-w-[100px]">{sid ? sid.substring(0, 8) : "No Connection"}</span>
      <button onClick={onSync} className={`p-1 hover:bg-bg-secondary rounded ${isSyncing ? "animate-spin" : ""}`}><RefreshCcw size={12} /></button>
    </div>
  );
}

function MobileNavItem({ icon, active, onClick }: { icon: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`p-3 rounded-xl flex flex-col items-center justify-center transition-all ${active ? "text-[#185FA5] bg-blue-50" : "text-text-secondary"}`}>{icon}</button>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-[10px] px-4 py-[9px] text-[13px] cursor-pointer transition-colors ${active ? "bg-blue-50 text-text-info font-medium" : "text-text-secondary hover:bg-bg-secondary"}`}>
      <span className="opacity-80">{icon}</span><span>{label}</span>
    </button>
  );
}

function DashboardPanel({ transactions }: { transactions: Transaction[] }) {
  const totalIncome = transactions.reduce((acc, t) => acc + t.debit, 0);
  const totalExpense = transactions.reduce((acc, t) => acc + t.kredit, 0);
  const netIncome = totalIncome - totalExpense;

  const monthlyData = MONTHS.map(m => {
    const monthTransactions = transactions.filter(t => t.month === m);
    return { name: m.substring(0, 3), income: monthTransactions.reduce((acc, t) => acc + t.debit, 0), expense: monthTransactions.reduce((acc, t) => acc + t.kredit, 0) };
  }).filter(d => d.income > 0 || d.expense > 0);

  const expenseByCategory = transactions.filter(t => t.kredit > 0).reduce((acc, t) => {
    acc[t.accountType] = (acc[t.accountType] || 0) + t.kredit;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }));
  const COLORS = ['#185FA5', '#1D9E75', '#BA7517', '#D85A30', '#534AB7', '#6c757d'];

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="Total Pendapatan" val={totalIncome} color="text-[#1D9E75]" />
        <StatCard label="Total Beban" val={totalExpense} color="text-[#D85A30]" />
        <StatCard label="Laba Bersih" val={netIncome} color="text-[#185FA5]" />
        <StatCard label="Total Record" val={transactions.length} isCurrency={false} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
        <div className="bg-bg-primary border border-border-tertiary rounded-2xl p-4 lg:p-6 shadow-sm">
          <div className="text-[14px] font-bold text-text-primary mb-5">Analisis Arus Kas Bulanan</div>
          <div className="h-[250px] lg:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f3f5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#868e96' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#868e96' }} tickFormatter={(v) => `${(v/1000000).toFixed(0)}jt`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(v: number) => [formatCurrency(v), ""]} 
                />
                <Bar dataKey="income" fill="#1D9E75" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="expense" fill="#D85A30" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-bg-primary border border-border-tertiary rounded-2xl p-4 lg:p-6 shadow-sm">
          <div className="text-[14px] font-bold text-text-primary mb-5">Distribusi Pengeluaran</div>
          <div className="h-[250px] lg:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie 
                  data={pieData} 
                  innerRadius="60%" 
                  outerRadius="80%" 
                  paddingAngle={5} 
                  dataKey="value"
                >
                  {pieData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                   formatter={(v: number) => formatCurrency(v)} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 20 }} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-bg-primary border border-border-tertiary rounded-2xl p-4 lg:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[14px] font-bold text-text-primary">Transaksi Terakhir</div>
          <span className="text-[10px] bg-bg-secondary px-2 py-1 rounded-full font-bold text-text-secondary uppercase">Live View</span>
        </div>
        <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0">
          <table className="w-full text-sm">
            <thead className="text-[11px] font-bold text-text-secondary uppercase border-b border-border-tertiary">
              <tr>
                <th className="text-left py-3 font-bold">Tanggal</th>
                <th className="text-left py-3 font-bold">Keterangan</th>
                <th className="text-right py-3 font-bold">Debit</th>
                <th className="text-right py-3 font-bold">Kredit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-tertiary">
              {transactions.slice(-5).reverse().map((t, i) => (
                <tr key={i} className="hover:bg-bg-tertiary transition-colors">
                  <td className="py-3 text-[12px]">{format(new Date(t.date), "dd/MM/yy")}</td>
                  <td className="py-3">
                    <div className="text-[13px] font-medium leading-tight">{t.description}</div>
                    <div className="text-[10px] text-text-secondary">{t.accountType}</div>
                  </td>
                  <td className="py-3 text-right text-emerald-600 font-medium text-[13px]">{t.debit > 0 ? formatCurrency(t.debit) : "-"}</td>
                  <td className="py-3 text-right text-rose-500 font-medium text-[13px]">{t.kredit > 0 ? formatCurrency(t.kredit) : "-"}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-text-secondary italic">Belum ada data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, val, color = "text-text-primary", isCurrency = true }: { label: string, val: number, color?: string, isCurrency?: boolean }) {
  return (
    <div className="bg-bg-primary rounded-lg p-[14px] border border-border-tertiary">
      <div className="text-[12px] text-text-secondary mb-[6px]">{label}</div>
      <div className={`text-[18px] font-bold ${color}`}>{isCurrency ? formatCurrency(val) : val}</div>
    </div>
  );
}

function TransactionPanel({ spreadsheetId, accessToken, transactions, onSuccess }: { spreadsheetId: string, accessToken: string, transactions: Transaction[], onSuccess: () => void }) {
  const [formData, setFormData] = useState({ date: format(new Date(), "yyyy-MM-dd"), month: getMonthName(new Date().toISOString()), quarter: getQuarter(new Date().toISOString()), category: CATEGORIES_LIST[0], accountType: ACCOUNT_TYPES[0], description: "", debit: "", kredit: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description) return;
    setIsSubmitting(true);
    try {
      const values = [[formData.date, formData.month, formData.quarter, formData.category, formData.accountType, formData.description, parseFloat(formData.debit) || 0, parseFloat(formData.kredit) || 0, new Date().toISOString()]];
      await appendSheetValues(spreadsheetId, "INPUT!A2:I", values, accessToken);
      setFormData({ ...formData, description: "", debit: "", kredit: "" });
      onSuccess();
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-bg-primary border border-border-tertiary rounded-xl p-5">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputGroup label="Tanggal" type="date" value={formData.date} onChange={v => setFormData({...formData, date: v, month: getMonthName(v), quarter: getQuarter(v)})} />
          <InputGroup label="Kategori" type="select" options={CATEGORIES_LIST} value={formData.category} onChange={v => setFormData({...formData, category: v})} />
          <InputGroup label="Akun" type="select" options={ACCOUNT_TYPES} value={formData.accountType} onChange={v => setFormData({...formData, accountType: v})} colSpan="md:col-span-2" />
          <InputGroup label="Keterangan" type="text" value={formData.description} onChange={v => setFormData({...formData, description: v})} colSpan="md:col-span-2" />
          <InputGroup label="Debit (+)" type="number" value={formData.debit} onChange={v => setFormData({...formData, debit: v, kredit: ""})} />
          <InputGroup label="Kredit (-)" type="number" value={formData.kredit} onChange={v => setFormData({...formData, kredit: v, debit: ""})} />
          <button type="submit" disabled={isSubmitting} className="md:col-span-2 py-3 bg-[#185FA5] text-white rounded font-bold hover:bg-[#0C447C] transition-all disabled:opacity-50">{isSubmitting ? "Menyimpan..." : "Simpan Transaksi"}</button>
        </form>
      </div>
    </div>
  );
}

function InputGroup({ label, type, value, onChange, options, colSpan = "" }: any) {
  return (
    <div className={`flex flex-col gap-1 ${colSpan}`}>
      <label className="text-[12px] font-bold text-text-secondary uppercase">{label}</label>
      {type === "select" ? (
        <select value={value} onChange={e => onChange(e.target.value)} className="border border-border-secondary p-2 rounded bg-bg-secondary text-sm outline-none focus:border-[#185FA5]">{options.map((o: any) => <option key={o} value={o}>{o}</option>)}</select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} className="border border-border-secondary p-2 rounded bg-bg-secondary text-sm outline-none focus:border-[#185FA5]" />
      )}
    </div>
  );
}

function RekapPanel({ transactions }: { transactions: Transaction[] }) {
  const [activeMonth, setActiveMonth] = useState(MONTHS[new Date().getMonth()]);
  const monthData = transactions.filter(t => t.month === activeMonth);
  const totalIn = monthData.reduce((a, t) => a + t.debit, 0);
  const totalOut = monthData.reduce((a, t) => a + t.kredit, 0);

  return (
    <div className="bg-bg-primary border border-border-tertiary rounded-xl p-5">
      <div className="flex overflow-x-auto gap-2 pb-4 scrollbar-hide">
        {MONTHS.map(m => <button key={m} onClick={() => setActiveMonth(m)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeMonth === m ? "bg-[#185FA5] text-white" : "bg-bg-secondary text-text-secondary hover:bg-border-tertiary"}`}>{m}</button>)}
      </div>
      <div className="grid grid-cols-3 bg-bg-secondary p-4 rounded-lg mb-6 text-center">
        <div><div className="text-[10px] uppercase text-text-secondary">In</div><div className="text-emerald-600 font-bold">{formatCurrency(totalIn)}</div></div>
        <div><div className="text-[10px] uppercase text-text-secondary">Out</div><div className="text-rose-600 font-bold">{formatCurrency(totalOut)}</div></div>
        <div><div className="text-[10px] uppercase text-text-secondary">Net</div><div className="text-[#185FA5] font-bold">{formatCurrency(totalIn - totalOut)}</div></div>
      </div>
      <table className="w-full text-sm">
        <thead className="text-[11px] uppercase text-text-secondary border-b"><tr><th className="text-left py-2">Akun</th><th className="text-right py-2">Net Amount</th></tr></thead>
        <tbody>
          {ACCOUNT_TYPES.map(acc => {
            const net = monthData.filter(t => t.accountType === acc).reduce((a, t) => a + (t.debit - t.kredit), 0);
            if (net === 0) return null;
            return <tr key={acc} className="border-b last:border-0"><td className="py-2.5">{acc}</td><td className={`text-right font-medium ${net > 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatCurrency(net)}</td></tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}

function LabaRugiPanel({ transactions }: { transactions: Transaction[] }) {
  const totals = { 
    in: transactions.reduce((a, t) => a + t.debit, 0), 
    out: transactions.reduce((a, t) => a + t.kredit, 0) 
  };

  const incomeByAccount = transactions
    .filter(t => t.debit > 0)
    .reduce((acc, t) => {
      acc[t.accountType] = (acc[t.accountType] || 0) + t.debit;
      return acc;
    }, {} as Record<string, number>);

  const expenseByAccount = transactions
    .filter(t => t.kredit > 0)
    .reduce((acc, t) => {
      acc[t.accountType] = (acc[t.accountType] || 0) + t.kredit;
      return acc;
    }, {} as Record<string, number>);

  return (
    <div className="bg-bg-primary border border-border-tertiary rounded-xl p-5 max-w-2xl mx-auto shadow-sm">
      <h3 className="font-bold text-center mb-8 text-xl text-text-primary">Laporan Laba Rugi</h3>
      
      <div className="space-y-8">
        {/* Section Pendapatan */}
        <section>
          <div className="flex justify-between items-end border-b-2 border-[#1D9E75] pb-2 mb-3">
            <span className="font-black text-sm tracking-widest text-[#1D9E75]">PENDAPATAN</span>
            <span className="font-bold text-[#1D9E75]">{formatCurrency(totals.in)}</span>
          </div>
          <div className="space-y-2">
            {Object.entries(incomeByAccount).map(([acc, val]) => (
              <LRSect key={acc} label={acc} val={val} total={totals.in} />
            ))}
            {Object.keys(incomeByAccount).length === 0 && <p className="text-[11px] text-text-secondary italic text-center py-2">Belum ada pendapatan</p>}
          </div>
        </section>

        {/* Section Beban */}
        <section>
          <div className="flex justify-between items-end border-b-2 border-[#D85A30] pb-2 mb-3">
            <span className="font-black text-sm tracking-widest text-[#D85A30]">BEBAN OPERASIONAL</span>
            <span className="font-bold text-[#D85A30]">({formatCurrency(totals.out)})</span>
          </div>
          <div className="space-y-2">
            {Object.entries(expenseByAccount).map(([acc, val]) => (
              <LRSect key={acc} label={acc} val={val} total={totals.out} isNeg />
            ))}
            {Object.keys(expenseByAccount).length === 0 && <p className="text-[11px] text-text-secondary italic text-center py-2">Belum ada beban</p>}
          </div>
        </section>

        {/* Bottom Line */}
        <div className="pt-6 border-t-4 border-text-primary flex justify-between items-center font-black text-xl">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase text-text-secondary tracking-[0.2em]">Laba Bersih</span>
            <span>NET PROFIT</span>
          </div>
          <span className={totals.in - totals.out >= 0 ? "text-emerald-600" : "text-rose-600"}>
            {formatCurrency(totals.in - totals.out)}
          </span>
        </div>
      </div>
    </div>
  );
}

function LRSect({ label, val, total, isNeg = false }: any) {
  const percentage = total > 0 ? (val / total) * 100 : 0;
  return (
    <div className="group flex flex-col py-2 px-3 rounded-lg hover:bg-bg-tertiary transition-colors">
      <div className="flex justify-between items-center mb-1">
        <div className="flex flex-col">
          <span className="text-[13px] font-bold text-text-primary">{label}</span>
        </div>
        <span className={`font-mono text-sm font-medium ${isNeg ? "text-rose-500" : "text-emerald-600"}`}>
          {isNeg ? `(${formatCurrency(val)})` : formatCurrency(val)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-bg-secondary rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            className={`h-full rounded-full ${isNeg ? "bg-rose-400" : "bg-emerald-400"}`}
          />
        </div>
        <span className="text-[10px] text-text-secondary font-mono w-10 text-right">{percentage.toFixed(1)}%</span>
      </div>
    </div>
  );
}

function NeracaPanel({ transactions }: { transactions: Transaction[] }) {
  const net = transactions.reduce((a, t) => a + (t.debit - t.kredit), 0);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="bg-bg-primary border border-border-tertiary rounded-xl p-5"><h3 className="font-bold border-b mb-4 pb-2">AKTIVA</h3><NeracaRow label="Kas & Bank" val={net} pos /><NeracaRow label="Piutang" val={0} pos /><NeracaRow label="Asset Tetap" val={25000000} pos /><div className="flex justify-between mt-4 pt-2 border-t font-bold"><span>Total</span><span>{formatCurrency(net + 25000000)}</span></div></div>
      <div className="bg-bg-primary border border-border-tertiary rounded-xl p-5"><h3 className="font-bold border-b mb-4 pb-2">PASIVA</h3><NeracaRow label="Hutang" val={0} neg /><NeracaRow label="Modal" val={25000000} pos /><NeracaRow label="Laba Retensi" val={net} pos /><div className="flex justify-between mt-4 pt-2 border-t font-bold"><span>Total</span><span>{formatCurrency(net + 25000000)}</span></div></div>
    </div>
  );
}

function NeracaRow({ label, val, pos, neg }: any) {
  return <div className="flex justify-between py-2 border-b border-dashed text-sm"><span>{label}</span><span className={pos ? "text-emerald-600 font-bold" : neg ? "text-rose-600 font-bold" : ""}>{formatCurrency(val)}</span></div>;
}

function SettingsPanel({ 
  appName, 
  setAppName, 
  transactions, 
  spreadsheetId, 
  setSpreadsheetId,
  accessToken, 
  onGoogleLink,
  onImportSuccess 
}: { 
  appName: string, 
  setAppName: (name: string) => void, 
  transactions: Transaction[],
  spreadsheetId: string,
  setSpreadsheetId: (id: string) => void,
  accessToken: string,
  onGoogleLink: () => void,
  onImportSuccess: () => void
}) {
  const [newSid, setNewSid] = useState(spreadsheetId || "");
  const [isImporting, setIsImporting] = useState(false);

  const handleUpdateSid = () => {
    if (!newSid) return;
    setSpreadsheetId(newSid);
    onImportSuccess();
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `backup_${appName.toLowerCase().replace(/\s+/g, '_')}_${format(new Date(), "yyyy-MM-dd")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData: Transaction[] = JSON.parse(event.target?.result as string);
        if (!Array.isArray(importedData)) throw new Error("Format data tidak valid.");
        
        // Push to spreadsheet if connected
        if (spreadsheetId && accessToken) {
          const values = importedData.map(t => [t.date, t.month, t.quarter, t.category, t.accountType, t.description, t.debit, t.kredit, t.timestamp]);
          await appendSheetValues(spreadsheetId, "INPUT!A2:I", values, accessToken);
          onImportSuccess();
        } else {
          // If not connected, we can't really persist permanently unless we have a local storage sync
          // But for now, just tell them metadata
          alert("Data berhasil dibaca. Hubungkan Spreadsheet untuk menyimpan secara permanen.");
        }
      } catch (err: any) {
        alert("Gagal import: " + err.message);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10">
      <section className="bg-bg-primary border border-border-tertiary rounded-xl p-6">
        <h3 className="flex items-center gap-2 font-bold mb-4 text-text-primary"><Settings size={18} /> Identitas App</h3>
        <input type="text" value={appName} onChange={e => setAppName(e.target.value)} className="w-full border p-2.5 rounded bg-bg-secondary text-sm outline-none focus:border-[#185FA5]" />
      </section>

      <section className="bg-bg-primary border border-border-tertiary rounded-xl p-6">
        <h3 className="flex items-center gap-2 font-bold mb-4 text-text-primary"><Link2 size={18} /> Spreadsheet Google</h3>
        <div className="mb-4 text-xs text-text-secondary leading-relaxed bg-blue-50 p-3 rounded border border-blue-100">
          <strong>Penting:</strong> Fitur ini memerlukan integrasi Google Sheets. 
          Jika popup login tidak muncul, pastikan browser tidak memblokir popup untuk domain ini.
        </div>
        {!accessToken ? (
          <button onClick={onGoogleLink} className="w-full flex items-center justify-center gap-2 py-3 bg-amber-600 text-white rounded font-bold text-sm shadow-sm hover:shadow-md transition-all">Hubungkan Google</button>
        ) : (
          <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded mb-4 flex items-center justify-between border border-emerald-100">
            <span>TERHUBUNG KE GOOGLE</span>
            <RefreshCcw size={14} className="animate-spin" />
          </div>
        )}
        <div className="flex gap-2 mt-4">
          <input type="text" value={newSid} onChange={e => setNewSid(e.target.value)} placeholder="Masukkan ID Spreadsheet (Opsional)" className="flex-1 border p-2.5 rounded bg-bg-secondary text-xs font-mono" />
          <button onClick={handleUpdateSid} className="px-4 bg-[#185FA5] text-white rounded text-xs font-bold">Apply</button>
        </div>
      </section>

      <section className="bg-bg-primary border border-border-tertiary rounded-xl p-6">
        <h3 className="flex items-center gap-2 font-bold mb-4 text-text-primary"><Download size={18} /> Backup & Restore</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-[#185FA5] text-[#185FA5] rounded font-bold text-sm hover:bg-blue-50 transition-all font-mono uppercase tracking-widest">
            Export JSON
          </button>
          <label className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border-tertiary text-text-secondary rounded font-bold text-sm hover:bg-bg-secondary cursor-pointer transition-all font-mono uppercase tracking-widest">
            {isImporting ? "Importing..." : "Import JSON"}
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </section>

      <div className="bg-bg-primary border border-border-tertiary rounded-xl p-6">
        <h3 className="flex items-center gap-2 font-bold mb-2 text-text-primary"><TrendingUp size={18} /> Status Data</h3>
        <div className="text-xs text-text-secondary mb-4">
          Saat ini aplikasi menyimpan {transactions.length} record transaksi.
        </div>
        <button 
           onClick={() => {
             const demoData = [
               { date: format(new Date(), "yyyy-MM-dd"), month: getMonthName(new Date().toISOString()), quarter: getQuarter(new Date().toISOString()), category: "OPERASIONAL", accountType: "OPERASIONAL", description: "Saldo Awal Demo", debit: 5000000, kredit: 0, timestamp: new Date().toISOString() }
             ];
             const values = demoData.map(t => [t.date, t.month, t.quarter, t.category, t.accountType, t.description, t.debit, t.kredit, t.timestamp]);
             if (spreadsheetId && accessToken) {
                appendSheetValues(spreadsheetId, "INPUT!A2:I", values, accessToken).then(() => onImportSuccess());
             } else {
               alert("Data simulasi berhasil dimuat ke cache. Hubungkan spreadsheet untuk permanen.");
             }
           }}
           className="text-[10px] text-text-secondary hover:text-[#185FA5] underline"
        >
          Muat Data Simulasi
        </button>
      </div>
    </div>
  );
}

function getBadgeStyle(cat: string) {
  switch (cat) {
    case "JASA": return "bg-[#E6F1FB] text-[#185FA5]";
    case "OPERASIONAL": return "bg-[#F1EFE8] text-[#5F5E5A]";
    case "KAS": return "bg-[#E1F5EE] text-[#0F6E56]";
    case "KANTOR MATERIAL": return "bg-[#FAECE7] text-[#993C1D]";
    default: return "bg-bg-secondary text-text-secondary";
  }
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val).replace("Rp", "Rp ");
}
