
import React, { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";
import { v4 as uuidv4 } from "uuid";

// ---------- helpers ----------
const LS_KEY = "upnex_data_v1";

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const defaultDB = {
  staff: ["Adham", "Shahzod", "Malika", "Nodira"],
  students: [
    { id: uuidv4(), name: "Xayitbek", phone: "+998 90 123 45 67", program: "USA - Bachelor", status: "paid", enrolledAt: isoDaysAgo(18) },
    { id: uuidv4(), name: "Olloyor", phone: "+998 97 555 77 00", program: "Malaysia - Diploma", status: "enrolled", enrolledAt: isoDaysAgo(10) },
    { id: uuidv4(), name: "Makhliyo", phone: "+998 97 385 79 25", program: "TESOL - Master", status: "lead", enrolledAt: isoDaysAgo(3) },
  ],
  payments: [
    { id: uuidv4(), studentId: "", amount: 1500, currency: "USD", method: "card", receivedBy: "Adham", paidAt: isoDaysAgo(15), note: "Standard package" },
    { id: uuidv4(), studentId: "", amount: 4000, currency: "USD", method: "bank", receivedBy: "Malika", paidAt: isoDaysAgo(7), note: "Premium package" },
  ],
  expenses: [
    { id: uuidv4(), category: "Office Rent", amount: 400, currency: "USD", paidTo: "Landlord", paidAt: isoDaysAgo(20), method: "bank", note: "Andijan office", enteredBy: "Shahzod" },
    { id: uuidv4(), category: "Marketing (Instagram)", amount: 120, currency: "USD", paidTo: "Meta Ads", paidAt: isoDaysAgo(8), method: "card", note: "Reels boost", enteredBy: "Adham" },
    { id: uuidv4(), category: "Referral Commission", amount: 100, currency: "USD", paidTo: "Teacher Zaynab", paidAt: isoDaysAgo(6), method: "cash", note: "1 student", enteredBy: "Malika" },
  ],
};

function loadDB() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultDB;
    const parsed = JSON.parse(raw);
    if (parsed.payments) {
      parsed.payments = parsed.payments.map((p) => ({ ...p, studentId: p.studentId || (parsed.students?.[0]?.id ?? "") }));
    }
    return parsed;
  } catch {
    return defaultDB;
  }
}
function saveDB(db) { localStorage.setItem(LS_KEY, JSON.stringify(db)); }

function formatMoney(n, c="USD"){
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: c }).format(n); }
  catch { return `${Number(n).toFixed(2)} ${c}`; }
}

function useLocalDB(){
  const [db, setDB] = useState(loadDB());
  useEffect(()=>saveDB(db), [db]);
  return [db, setDB];
}

function useMonthRange(){
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()+1);
  const start = new Date(year, month-1, 1);
  const end = new Date(year, month, 1);
  return { year, month, setYear, setMonth, startISO: start.toISOString(), endISO: end.toISOString() };
}

function matches(obj, q){ return JSON.stringify(obj).toLowerCase().includes(q.toLowerCase()); }

function useFiltered(db, startISO, endISO, search){
  const students = useMemo(()=> db.students.filter(s => !s.enrolledAt || (s.enrolledAt >= startISO && s.enrolledAt < endISO)).filter(s => !search || matches(s, search)), [db.students, startISO, endISO, search]);
  const payments = useMemo(()=> db.payments.filter(p => p.paidAt >= startISO && p.paidAt < endISO).filter(p => !search || matches(p, search)), [db.payments, startISO, endISO, search]);
  const expenses = useMemo(()=> db.expenses.filter(e => e.paidAt >= startISO && e.paidAt < endISO).filter(e => !search || matches(e, search)), [db.expenses, startISO, endISO, search]);
  return { students, payments, expenses };
}

// ---------- App ----------
export default function App(){
  const [db, setDB] = useLocalDB();
  const [search, setSearch] = useState("");
  const { year, month, setYear, setMonth, startISO, endISO } = useMonthRange();
  const { students, payments, expenses } = useFiltered(db, startISO, endISO, search);

  const revenue = payments.reduce((s,p)=>s+Number(p.amount||0),0);
  const expenseTotal = expenses.reduce((s,e)=>s+Number(e.amount||0),0);
  const profit = revenue - expenseTotal;
  const paidStudents = new Set(payments.map(p=>p.studentId||p.note||p.id)).size;

  const addStudent = () => {
    const name = prompt("Full name:");
    if(!name) return;
    const phone = prompt("Phone:");
    const program = prompt("Program:");
    const status = prompt("Status (lead/enrolled/paid):","lead");
    const s = { id: uuidv4(), name, phone, program, status, enrolledAt: new Date().toISOString() };
    setDB({ ...db, students: [s, ...db.students] });
  };

  const addPayment = () => {
    const studentChoices = ["None", ...db.students.map(s=>`${s.name} (${s.id.slice(0,6)})`)];
    alert("Tip: copy a student ID from Students table to link payment.");
    const studentId = prompt("Student ID (optional):", db.students[0]?.id || "");
    const amount = Number(prompt("Amount (number):","1500") || "0");
    if(!amount) return;
    const currency = prompt("Currency (USD/EUR/UZS):","USD") || "USD";
    const method = prompt("Method (cash/card/bank/transfer/other):","cash") || "cash";
    const receivedBy = prompt("Received by (staff name):", db.staff[0] || "Admin") || (db.staff[0]||"Admin");
    const note = prompt("Note (optional):","");
    const p = { id: uuidv4(), studentId, amount, currency, method, receivedBy, paidAt: new Date().toISOString(), note };
    setDB({ ...db, payments: [p, ...db.payments] });
  };

  const addExpense = () => {
    const category = prompt("Category:","Office Rent");
    if(!category) return;
    const amount = Number(prompt("Amount (number):","100") || "0");
    if(!amount) return;
    const currency = prompt("Currency (USD/EUR/UZS):","USD") || "USD";
    const paidTo = prompt("Paid to:","Vendor") || "Vendor";
    const method = prompt("Method (cash/card/bank/transfer/other):","cash") || "cash";
    const enteredBy = prompt("Entered by (staff):", db.staff[0] || "Admin") || (db.staff[0]||"Admin");
    const note = prompt("Note (optional):","");
    const e = { id: uuidv4(), category, amount, currency, paidTo, paidAt: new Date().toISOString(), method, note, enteredBy };
    setDB({ ...db, expenses: [e, ...db.expenses] });
  };

  const addStaff = () => {
    const name = prompt("Staff name:");
    if(!name) return;
    if(db.staff.includes(name)) return alert("Already exists");
    setDB({ ...db, staff: [...db.staff, name] });
  };

  const deleteById = (key, id) => setDB({ ...db, [key]: db[key].filter(x=>x.id!==id) });

  // yearly data for chart
  const data = Array.from({length:12}).map((_,i)=>{
    const mStart = new Date(year, i, 1).toISOString();
    const mEnd = new Date(year, i+1, 1).toISOString();
    const rev = db.payments.filter(p=>p.paidAt>=mStart && p.paidAt<mEnd).reduce((s,p)=>s+Number(p.amount),0);
    const exp = db.expenses.filter(e=>e.paidAt>=mStart && e.paidAt<mEnd).reduce((s,e)=>s+Number(e.amount),0);
    return { month: new Date(year, i, 1).toLocaleString(undefined,{month:'short'}), revenue: rev, expenses: exp, profit: rev-exp };
  });

  const byStaff = Object.entries(payments.reduce((acc,p)=>{ acc[p.receivedBy]=(acc[p.receivedBy]||0)+Number(p.amount); return acc; },{}))
    .map(([name,total])=>({ name, total }));

  const exportJSON = () => {
    const raw = localStorage.getItem(LS_KEY) || JSON.stringify(defaultDB);
    const url = URL.createObjectURL(new Blob([raw],{type:"application/json"}));
    const a = document.createElement("a"); a.href=url; a.download=`upnex-data-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
  };

  const onImport = (e) => {
    const f = e.target.files?.[0]; if(!f) return;
    const reader = new FileReader(); reader.onload = () => {
      try{ const parsed = JSON.parse(reader.result); localStorage.setItem(LS_KEY, JSON.stringify(parsed)); location.reload(); }
      catch{ alert("Invalid JSON"); }
    }; reader.readAsText(f);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">UPNEX Admin Dashboard</h1>
          <p className="text-sm text-slate-500">Students • Payments • Expenses • Profit</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer">
            <input type="file" accept="application/json" className="hidden" onChange={onImport} />
            Import JSON
          </label>
          <button className="px-3 py-2 border rounded-lg" onClick={exportJSON}>Export JSON</button>
          <button className="px-3 py-2 border rounded-lg text-red-600" onClick={()=>{localStorage.removeItem(LS_KEY); location.reload();}}>Reset</button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select className="px-3 py-2 border rounded-lg" value={month} onChange={(e)=>setMonth(Number(e.target.value))}>
          {Array.from({length:12}).map((_,i)=>(
            <option key={i} value={i+1}>{new Date(0,i).toLocaleString(undefined,{month:'long'})}</option>
          ))}
        </select>
        <input className="px-3 py-2 border rounded-lg w-28" type="number" value={year} onChange={(e)=>setYear(Number(e.target.value||new Date().getFullYear()))} />
        <input className="px-3 py-2 border rounded-lg flex-1 min-w-[220px]" placeholder="Search name, note, phone, staff..." value={search} onChange={(e)=>setSearch(e.target.value)} />
        <div className="flex items-center gap-2 ml-auto text-sm">
          <button className="px-3 py-2 bg-black text-white rounded-lg" onClick={addStudent}>New Student</button>
          <button className="px-3 py-2 bg-slate-800 text-white rounded-lg" onClick={addPayment}>New Payment</button>
          <button className="px-3 py-2 bg-white border rounded-lg" onClick={addExpense}>New Expense</button>
          <button className="px-3 py-2 border rounded-lg" onClick={addStaff}>Add Staff</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          { title:"Revenue", value: formatMoney(revenue), sub: `${payments.length} payments`},
          { title:"Expenses", value: formatMoney(expenseTotal), sub: `${expenses.length} expenses`},
          { title:"Profit", value: formatMoney(profit), sub: profit>=0 ? "Positive":"Negative"},
          { title:"Students", value: String(students.length), sub: `${paidStudents} paid`},
        ].map((c)=>(
          <div key={c.title} className="rounded-2xl shadow-sm bg-white p-5">
            <p className="text-sm text-slate-500">{c.title}</p>
            <p className="text-2xl font-semibold">{c.value}</p>
            <p className="text-xs text-slate-500 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="xl:col-span-2 rounded-2xl shadow-sm bg-white p-5">
          <h3 className="font-semibold mb-3">Yearly Overview</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="currentColor" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="currentColor" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(v,n)=>[formatMoney(Number(v)), n]} />
                <Area type="monotone" dataKey="revenue" stroke="currentColor" fillOpacity={1} fill="url(#g1)" />
                <Area type="monotone" dataKey="expenses" stroke="currentColor" fillOpacity={0.3} />
                <Area type="monotone" dataKey="profit" stroke="currentColor" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl shadow-sm bg-white p-5">
          <h3 className="font-semibold mb-3">Payments by Staff (This Month)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStaff}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v)=>formatMoney(Number(v))} />
                <Bar dataKey="total" fill="currentColor" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="space-y-6">
        <Table
          title="Students"
          columns={[
            { key:"name", label:"Name" },
            { key:"phone", label:"Phone" },
            { key:"program", label:"Program" },
            { key:"status", label:"Status" },
            { key:"enrolledAt", label:"Enrolled At", render:(v)=> v ? new Date(v).toLocaleString() : "—" }
          ]}
          rows={students}
          onDelete={(id)=>deleteById("students", id)}
        />
        <Table
          title="Payments (Income)"
          columns={[
            { key:"paidAt", label:"Paid At", render:(v)=> new Date(v).toLocaleString() },
            { key:"studentId", label:"Student", render:(v)=> db.students.find(s=>s.id===v)?.name || "—" },
            { key:"amount", label:"Amount", render:(v,r)=> formatMoney(Number(v), r.currency) },
            { key:"currency", label:"Curr." },
            { key:"method", label:"Method" },
            { key:"receivedBy", label:"Received By" },
            { key:"note", label:"Note" },
          ]}
          rows={payments}
          onDelete={(id)=>deleteById("payments", id)}
        />
        <Table
          title="Expenses"
          columns={[
            { key:"paidAt", label:"Paid At", render:(v)=> new Date(v).toLocaleString() },
            { key:"category", label:"Category" },
            { key:"amount", label:"Amount", render:(v,r)=> formatMoney(Number(v), r.currency) },
            { key:"currency", label:"Curr." },
            { key:"method", label:"Method" },
            { key:"paidTo", label:"Paid To" },
            { key:"enteredBy", label:"Entered By" },
            { key:"note", label:"Note" },
          ]}
          rows={expenses}
          onDelete={(id)=>deleteById("expenses", id)}
        />
      </div>

      <p className="text-xs text-slate-500 mt-6">
        Local-only demo. For multi-user + real accounting: connect a backend (Supabase/Postgres), add auth/roles, invoices, FX, and audit logs.
      </p>
    </div>
  );
}

// simple table component
function Table({ title, columns, rows, onDelete }){
  const exportCSV = () => {
    const header = columns.map(c=>c.label).join(",");
    const csvRows = rows.map(r => columns.map(c => JSON.stringify(c.render ? c.render(r[c.key], r) : (r[c.key]??""))).join(","));
    const blob = new Blob([header + "\n" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${title.replace(/\\s+/g,'_')}-${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  return (
    <div className="rounded-2xl shadow-sm bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        <button className="px-3 py-1.5 border rounded-lg text-sm" onClick={exportCSV}>Export CSV</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              {columns.map(c=>(<th key={c.key} className="py-2 pr-4 font-medium text-slate-500">{c.label}</th>))}
              <th className="py-2 pr-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length===0 && (<tr><td className="py-3 text-slate-400" colSpan={columns.length+1}>No data</td></tr>)}
            {rows.map(r => (
              <tr key={r.id} className="border-b last:border-none">
                {columns.map(c => (<td key={c.key} className="py-2 pr-4">{c.render ? c.render(r[c.key], r) : String(r[c.key] ?? "")}</td>))}
                <td className="py-2 pr-2 text-right">
                  <button className="px-2 py-1 text-red-600" onClick={()=>onDelete(r.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
