'use client';

import React, { useState, useEffect } from 'react';
import { Bell, ChevronRight, LogOut, Settings, X, Medal, MapPin, Tag, CheckCircle2, Plus, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { logout } from '../../../store/slices/authSlice';
import { useGetMyStatsQuery, useGetLeaderboardQuery } from '../../../store/api/userApi';

// ─── helpers ────────────────────────────────────────────────
function getDivision(lat: number, lng: number): string {
  if (lat >= 25.0 && lng <= 90.0) return 'রংপুর';
  if (lat >= 24.5 && lng >= 90.5) return 'ময়মনসিংহ';
  if (lat >= 24.0 && lng <= 89.5) return 'রাজশাহী';
  if (lat >= 24.0 && lng >= 91.5) return 'সিলেট';
  if (lat >= 23.5 && lat < 24.5 && lng >= 89.9 && lng < 91.5) return 'ঢাকা';
  if (lat < 23.5 && lng >= 91.0) return 'চট্টগ্রাম';
  if (lat >= 22.0 && lat < 23.5 && lng >= 89.9) return 'বরিশাল';
  if (lat >= 22.0 && lng < 89.9) return 'খুলনা';
  return 'অন্যান্য';
}

function AccuracyRing({ pct, loading }: { pct: number; loading: boolean }) {
  const r = 38, stroke = 8;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  if (loading) return <div className="w-[100px] h-[100px] rounded-full bg-slate-100 animate-pulse" />;
  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle cx="50" cy="50" r={r} fill="none" stroke="#10B981" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 50 50)" />
      <text x="50" y="47" textAnchor="middle" fill="#064E3B" fontSize="17" fontWeight="900">{pct}%</text>
    </svg>
  );
}

function getBadge(total: number) {
  if (total === 0) return null;
  if (total < 6)  return { label: 'নতুন সদস্য',       color: 'text-slate-500 bg-slate-50' };
  if (total < 21) return { label: 'সক্রিয় অবদানকারী', color: 'text-blue-600 bg-blue-50' };
  return           { label: 'ভিড় কন্ট্রিবিউটর',       color: 'text-emerald-600 bg-emerald-50' };
}

// ─── Budget storage ──────────────────────────────────────────
const BUDGET_KEY   = 'bazar_monthly_budget';
const EXPENSES_KEY = 'bazar_monthly_expenses'; // [{amount, note, date}]
const SAVINGS_KEY  = 'bazar_savings';          // [{amount, date}] — written by Planner
const DEFAULT_BUDGET = 15000;

function monthKey(d: Date) { return `${d.getFullYear()}-${d.getMonth()}`; }

function loadExpenses(): { amount: number; note: string; date: string }[] {
  try { return JSON.parse(localStorage.getItem(EXPENSES_KEY) || '[]'); } catch { return []; }
}
function saveExpenses(arr: { amount: number; note: string; date: string }[]) {
  try { localStorage.setItem(EXPENSES_KEY, JSON.stringify(arr)); } catch {}
}

// ─── Component ───────────────────────────────────────────────
export function Profile() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAddExpense,    setShowAddExpense]    = useState(false);
  const [expenseInput,      setExpenseInput]      = useState('');
  const [expenseNote,       setExpenseNote]       = useState('');
  const [budget,            setBudget]            = useState(DEFAULT_BUDGET);
  const [expenses,          setExpenses]          = useState<{ amount: number; note: string; date: string }[]>([]);
  const [savings,           setSavings]           = useState<{ amount: number; date: string }[]>([]);

  const user            = useAppSelector(s => s.auth.user);
  const isAuthenticated = useAppSelector(s => s.auth.isAuthenticated);

  const { data: statsRes,       isLoading: loadingStats } = useGetMyStatsQuery(undefined, { skip: !isAuthenticated });
  const { data: leaderboardRes }                          = useGetLeaderboardQuery(undefined, { skip: !isAuthenticated });

  const stats      = statsRes?.data?.attributes || {};
  const leaderboard: any[] = Array.isArray(leaderboardRes?.data?.attributes)
    ? leaderboardRes.data.attributes
    : [];

  const totalSub    = stats.totalSubmissions    || 0;
  const verifiedSub = stats.verifiedSubmissions || 0;
  const accuracy    = totalSub > 0 ? Math.round((verifiedSub / totalSub) * 100) : 0;
  const badge       = getBadge(totalSub);

  const myUserId = (user as any)?._id || (user as any)?.id || '';
  const isMe = (u: any) =>
    (myUserId && (u.userId === myUserId || u._id === myUserId)) ||
    (user?.fullName && u.name === user.fullName);

  const myRank = leaderboard.length > 0
    ? (() => {
        const idx = leaderboard.findIndex(isMe);
        return idx >= 0 ? idx + 1 : null;
      })()
    : null;

  // ── Budget calculations ──────────────────────────────────
  useEffect(() => {
    if (!myUserId) return;
    const stored = localStorage.getItem(`${BUDGET_KEY}_${myUserId}`);
    if (stored) setBudget(Number(stored));
    try { setExpenses(JSON.parse(localStorage.getItem(`${EXPENSES_KEY}_${myUserId}`) || '[]')); } catch { setExpenses([]); }
    try { setSavings(JSON.parse(localStorage.getItem(`${SAVINGS_KEY}_${myUserId}`) || '[]')); } catch {}
  }, [myUserId]);

  const now       = new Date();
  const thisMonth = monthKey(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth     = monthKey(lastMonthDate);

  const thisMonthSpent = expenses
    .filter(e => monthKey(new Date(e.date)) === thisMonth)
    .reduce((s, e) => s + e.amount, 0);
  const lastMonthSpent = expenses
    .filter(e => monthKey(new Date(e.date)) === lastMonth)
    .reduce((s, e) => s + e.amount, 0);

  const budgetPct     = Math.min(100, Math.round((thisMonthSpent / budget) * 100));
  const monthlyChange = lastMonthSpent > 0
    ? Math.round(((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100)
    : null;

  // ── Savings (from Smart Planner) ─────────────────────────
  const thisMonthSaved = savings
    .filter(s => monthKey(new Date(s.date)) === thisMonth)
    .reduce((sum, s) => sum + s.amount, 0);
  const lastMonthSaved = savings
    .filter(s => monthKey(new Date(s.date)) === lastMonth)
    .reduce((sum, s) => sum + s.amount, 0);
  const savingsChange = lastMonthSaved > 0
    ? Math.round(((thisMonthSaved - lastMonthSaved) / lastMonthSaved) * 100)
    : null;

  const addExpense = () => {
    const amt = parseInt(expenseInput);
    if (!amt || amt <= 0) return;
    const updated = [...expenses, { amount: amt, note: expenseNote || 'বাজার খরচ', date: new Date().toISOString() }];
    setExpenses(updated);
    const expKey = myUserId ? `${EXPENSES_KEY}_${myUserId}` : EXPENSES_KEY;
    try { localStorage.setItem(expKey, JSON.stringify(updated)); } catch {}
    setExpenseInput('');
    setExpenseNote('');
    setShowAddExpense(false);
  };


  const handleLogout = () => {
    dispatch(logout());
    setShowLogoutConfirm(false);
    router.push('/login');
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="text-6xl">👤</div>
        <h2 className="text-xl font-bold text-slate-800">প্রোফাইল দেখতে লগইন করুন</h2>
        <div className="flex gap-3">
          <Link href="/login"    className="bg-[#064E3B] text-white px-6 py-3 rounded-xl font-bold">লগইন করুন</Link>
          <Link href="/register" className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold">রেজিস্ট্রেশন</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-24">

      {/* Page title */}
      <div className="text-center pt-2 pb-1">
        <h1 className="text-2xl font-black text-slate-900">আমার প্রোফাইল</h1>
        <p className="text-sm text-slate-400 mt-0.5">আপনার অর্জন ও অবদান পোর্টফোলিও</p>
      </div>

      {/* Identity card + savings */}
      <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-4">
          {/* Avatar — Cloudinary photo or initial fallback */}
          <div className="relative w-16 h-16 rounded-full shrink-0 shadow-md overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-300 flex items-center justify-center select-none">
            {(user as any)?.image ? (
              <Image
                src={(user as any).image}
                alt="profile"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <span className="text-white text-2xl font-black">
                {(user?.fullName || (user as any)?.name || '?')[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-tight">
              {user?.fullName || (user as any)?.name || 'ব্যবহারকারী'}
            </h2>
            {(user as any)?.location?.lat ? (
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {getDivision((user as any).location.lat, (user as any).location.lng)} বিভাগ
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-1">{user?.email}</p>
            )}
          </div>
        </div>

        {/* Savings card (inside identity card) */}
        <div className="bg-emerald-50 rounded-[18px] px-4 py-3 border border-emerald-100">
          <p className="text-xs text-emerald-700 font-semibold mb-1">এই মাসে আপনি সাশ্রয় করেছেন</p>
          <p className="text-3xl font-black text-[#064E3B] tracking-tight">
            ৳ {thisMonthSaved > 0 ? thisMonthSaved.toLocaleString() : '০'}
          </p>
          {savingsChange !== null && (
            <p className={`text-xs font-semibold mt-1 flex items-center gap-1 ${savingsChange >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {savingsChange >= 0 ? '↑' : '↓'} গত মাসের চেয়ে {Math.abs(savingsChange)}% {savingsChange >= 0 ? 'বেশি সাশ্রয়' : 'কম সাশ্রয়'}
            </p>
          )}
          {thisMonthSaved === 0 && (
            <p className="text-[11px] text-emerald-500 mt-1">স্মার্ট প্ল্যানার ব্যবহার করলে সাশ্রয় দেখাবে</p>
          )}
        </div>
      </div>

      {/* Monthly budget card */}
      <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🛒</span>
            <span className="text-sm font-bold text-slate-700">মাসিক বাজার বাজেট</span>
          </div>
          <button onClick={() => setShowAddExpense(true)}
            className="flex items-center gap-1 text-xs font-bold text-[#064E3B] bg-emerald-50 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition">
            <Plus className="w-3 h-3" /> খরচ যোগ করুন
          </button>
        </div>

        <div className="flex items-end gap-2 mb-2">
          <span className="text-3xl font-black text-slate-900">
            ৳{thisMonthSpent.toLocaleString()}
          </span>
          <span className="text-sm text-slate-400 mb-1">/ ৳{budget.toLocaleString()}</span>
        </div>

        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all duration-500 ${budgetPct >= 90 ? 'bg-rose-500' : budgetPct >= 70 ? 'bg-amber-400' : 'bg-[#10B981]'}`}
            style={{ width: `${budgetPct}%` }}
          />
        </div>

        {monthlyChange !== null && (
          <p className={`text-xs font-semibold flex items-center gap-1 ${monthlyChange > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            <AlertTriangle className="w-3 h-3" />
            গত মাসের চেয়ে {Math.abs(monthlyChange)}% {monthlyChange > 0 ? 'বেশি' : 'কম'} বাজার খরচ
          </p>
        )}
        {thisMonthSpent === 0 && (
          <p className="text-xs text-slate-400">এই মাসে এখনো খরচ যোগ করা হয়নি</p>
        )}
      </div>

      {/* Stats card */}
      <div className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm flex items-center gap-5">
        <div className="flex flex-col items-center shrink-0">
          <AccuracyRing pct={accuracy} loading={loadingStats} />
          <p className="text-[11px] font-bold text-slate-400 mt-1">তথ্য সঠিকতা</p>
          {badge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 ${badge.color}`}>
              {badge.label}
            </span>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-2.5">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">মোট অবদান</p>
          <div className="flex items-center justify-between bg-orange-50 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-slate-700">নতুন দাম</span>
            </div>
            <span className="text-xl font-black text-slate-900">{loadingStats ? '—' : totalSub}</span>
          </div>
          <div className="flex items-center justify-between bg-emerald-50 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-semibold text-slate-700">ভোট নিশ্চিতকরণ</span>
            </div>
            <span className="text-xl font-black text-slate-900">{loadingStats ? '—' : verifiedSub}</span>
          </div>
        </div>
      </div>

      {/* Leaderboard rank row */}
      <button onClick={() => router.push('/ranking')}
        className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm flex items-center justify-between w-full text-left hover:bg-slate-50 transition">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center shrink-0">
            <Medal className="w-5 h-5 text-[#064E3B]" />
          </div>
          <div>
            <p className="font-bold text-slate-700">শীর্ষ অবদানকারী</p>
            <p className="text-xs text-slate-400">
              {myRank ? `আপনার বর্তমান র‍্যাংক: ${myRank}` : 'র‍্যাংক দেখুন'}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300" />
      </button>

      {/* Settings */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-50">
          <div>
            <p className="font-semibold text-slate-700">এলাকা নোটিফিকেশন</p>
            <p className="text-xs text-slate-400 mt-0.5">কাছের বাজারের দাম আপডেট পাবেন</p>
          </div>
          <button onClick={() => setNotificationsEnabled(p => !p)}
            className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${notificationsEnabled ? 'bg-[#10B981]' : 'bg-slate-200'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <Link href="/settings"
          className="flex items-center justify-between p-4 border-b border-slate-50 hover:bg-slate-50 transition">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center">
              <Settings className="w-4 h-4 text-slate-500" />
            </div>
            <span className="font-semibold text-slate-700">একাউন্ট সেটিংস</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </Link>

        <button onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-3 p-4 hover:bg-rose-50 transition text-left">
          <div className="w-9 h-9 bg-rose-50 rounded-full flex items-center justify-center">
            <LogOut className="w-4 h-4 text-rose-500" />
          </div>
          <span className="font-semibold text-rose-600">লগ আউট</span>
        </button>
      </div>

      {/* ── Add Expense Modal ── */}
      {showAddExpense && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200 pb-20">
          <div className="absolute inset-0" onClick={() => setShowAddExpense(false)} />
          <div className="w-full max-w-lg bg-white rounded-t-[32px] p-6 pb-8 relative z-10 animate-in slide-in-from-bottom-full duration-300">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-800">খরচ যোগ করুন</h3>
              <button onClick={() => setShowAddExpense(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-3 mb-4">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">পরিমাণ (টাকা)</label>
                <input
                  type="number" placeholder="৳ ০"
                  value={expenseInput}
                  onChange={e => setExpenseInput(e.target.value)}
                  className="w-full h-12 px-4 border border-slate-200 rounded-2xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-[#10B981]/30"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">নোট (ঐচ্ছিক)</label>
                <input
                  type="text" placeholder="যেমন: কাঁচা বাজার, মাছ..."
                  value={expenseNote}
                  onChange={e => setExpenseNote(e.target.value)}
                  className="w-full h-12 px-4 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#10B981]/30"
                />
              </div>
            </div>
            <button onClick={addExpense}
              className="w-full bg-[#064E3B] text-white font-bold py-4 rounded-2xl active:scale-95 transition-all">
              যোগ করুন
            </button>
          </div>
        </div>
      )}


      {/* Logout confirm */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-xl">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">লগআউট করবেন?</h3>
            <p className="text-sm text-slate-500 mb-6">আপনার অ্যাকাউন্ট থেকে বের হতে চান?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold">বাতিল</button>
              <button onClick={handleLogout}                       className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold">লগআউট</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
