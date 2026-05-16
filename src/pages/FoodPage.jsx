import { useState, useEffect, useCallback } from 'react';
import {
  UtensilsCrossed, Download, AlertCircle, CheckCircle2,
  RefreshCw, CalendarX, CalendarCheck, CalendarOff, CalendarRange, Lock,
  Bell, BellOff,
} from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import {
  getFoodStatus,
  subscribeToFood,
  cancelNextWeekFood,
  undoCancelNextWeekFood,
  bulkDisableFood,
  undoBulkDisableFood,
  enableNextWeekFood,
  undoEnableNextWeekFood,
  enableFoodYear,
  getFoodCalendar,
  getFoodReport,
  downloadFoodReport,
  triggerFoodReminder,
} from '../services/foodService';
import FoodOptInModal from '../components/food/FoodOptInModal';
import FoodCalendar   from '../components/food/FoodCalendar';

const REPORT_DEPTS = ['HR', 'Food Committee'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export default function FoodPage({ currentUser }) {
  const now          = new Date();
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, loading: pushLoading, error: pushError, subscribe: enablePush, unsubscribe: disablePush } = usePushNotifications();
  const [testLoading, setTestLoading] = useState(false);
  const isReportRole = currentUser?.role === 'DeptHOD' && REPORT_DEPTS.includes(currentUser?.dept);
  const isRequestor  = ['Requestor', 'RM', 'HOD', 'HR', 'FoodCommittee', 'Intern'].includes(currentUser?.role);

  // ── Status ────────────────────────────────────────────────────────────────
  const [status,        setStatus]        = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [showOptIn,     setShowOptIn]     = useState(false);
  const [optInLoading,  setOptInLoading]  = useState(false);
  const [statusMsg,     setStatusMsg]     = useState(null);

  // Per-button loading states
  const [btn1Loading, setBtn1Loading] = useState(false);
  const [btn2Loading, setBtn2Loading] = useState(false);
  const [btn3Loading, setBtn3Loading] = useState(false);
  const [btn4Loading, setBtn4Loading] = useState(false);

  // Confirmation for Button 2 (Cancel This Year — big action)
  const [showBtn2Confirm, setShowBtn2Confirm] = useState(false);

  // ── Calendar ──────────────────────────────────────────────────────────────
  const [calMonth,   setCalMonth]   = useState(now.getMonth() + 1);
  const [calYear,    setCalYear]    = useState(now.getFullYear());
  const [calData,    setCalData]    = useState(null);
  const [calLoading, setCalLoading] = useState(false);

  // ── Report ────────────────────────────────────────────────────────────────
  const [reportType,    setReportType]    = useState('month');
  const [repMonth,      setRepMonth]      = useState(now.getMonth() + 1);
  const [repYear,       setRepYear]       = useState(now.getFullYear());
  const [weekStart,     setWeekStart]     = useState('');
  const [reportData,    setReportData]    = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [dlLoading,     setDlLoading]     = useState(false);

  // ── Load status ───────────────────────────────────────────────────────────
  const loadStatus = useCallback(async () => {
    try {
      setLoadingStatus(true);
      const data = await getFoodStatus();
      setStatus(data);
      if (isRequestor && !data.subscribed) setShowOptIn(true);
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to load food status.' });
    } finally {
      setLoadingStatus(false);
    }
  }, [isRequestor]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  // ── Load calendar ─────────────────────────────────────────────────────────
  const loadCalendar = useCallback(async (month, year) => {
    setCalLoading(true);
    try {
      const data = await getFoodCalendar(month, year);
      setCalData(data);
    } catch {
      setCalData(null);
    } finally {
      setCalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== null && isRequestor) loadCalendar(calMonth, calYear);
  }, [calMonth, calYear, status, isRequestor, loadCalendar]);

  // ── Opt In ────────────────────────────────────────────────────────────────
  const handleOptIn = async () => {
    setOptInLoading(true);
    try {
      await subscribeToFood();
      setShowOptIn(false);
      await loadStatus();
      setStatusMsg({ type: 'success', text: 'Opted in! Your food subscription starts from next Monday.' });
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to opt in.' });
    } finally {
      setOptInLoading(false);
    }
  };

  const refresh = async (msg) => {
    await loadStatus();
    loadCalendar(calMonth, calYear);
    if (msg) setStatusMsg({ type: 'success', text: msg });
  };

  // ── Button 1: Cancel Next Week Food ───────────────────────────────────────
  // Creates a single-week FoodCancellation for next Monday.
  // "Cancel Request" undoes it. Locked after Sunday 10:30 AM if already cancelled.
  const handleBtn1 = async () => {
    setBtn1Loading(true);
    try {
      if (status.isCancelledNextWeek && status.canCancelNow) {
        await undoCancelNextWeekFood();
        await refresh('Next week food restored.');
      } else {
        await cancelNextWeekFood();
        await refresh('Next week skipped. You can undo this before Sunday 10:30 AM.');
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Action failed.' });
    } finally {
      setBtn1Loading(false);
    }
  };

  // ── Button 2: Cancel This Year Food ───────────────────────────────────────
  // Sets suspendedFrom = next Monday (disables food from next week to year end).
  // "Cancel Request" clears the suspension. Locked after Sunday 10:30 AM if set.
  const handleBtn2 = async () => {
    setBtn2Loading(true);
    setShowBtn2Confirm(false);
    try {
      if (status.isBulkSuspendedNextWeek && status.canCancelNow) {
        await undoBulkDisableFood();
        await refresh('Year pause removed. Food is active for the whole year.');
      } else {
        await bulkDisableFood();
        await refresh('Food paused for the rest of the year. You can undo before Sunday 10:30 AM.');
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Action failed.' });
    } finally {
      setBtn2Loading(false);
    }
  };

  // ── Button 3: Enable Next Week Food ───────────────────────────────────────
  // When year is suspended, enables just next week.
  // "Cancel Request" undoes it (restores suspension from next Monday).
  const handleBtn3 = async () => {
    setBtn3Loading(true);
    try {
      if (status.isEnabledNextWeekOnly && status.canCancelNow) {
        await undoEnableNextWeekFood();
        await refresh('Next week resume undone. Year pause is back in effect.');
      } else {
        await enableNextWeekFood();
        await refresh('Next week food resumed. Year pause continues from the week after.');
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Action failed.' });
    } finally {
      setBtn3Loading(false);
    }
  };

  // ── Button 4: Enable This Year Food ───────────────────────────────────────
  // Clears any suspension or disabled state — fully re-enables for the year.
  const handleBtn4 = async () => {
    setBtn4Loading(true);
    try {
      await enableFoodYear();
      await refresh('Food resumed for the whole year.');
    } catch (err) {
      setStatusMsg({ type: 'error', text: err.message || 'Action failed.' });
    } finally {
      setBtn4Loading(false);
    }
  };

  // ── Report ────────────────────────────────────────────────────────────────
  const loadReport = async () => {
    setReportLoading(true);
    try {
      const params = reportType === 'week'
        ? { type: 'week', weekStart }
        : { type: 'month', month: repMonth, year: repYear };
      setReportData(await getFoodReport(params));
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to load report.' });
    } finally {
      setReportLoading(false);
    }
  };

  const handleDownload = async () => {
    setDlLoading(true);
    try {
      const params = reportType === 'week'
        ? { type: 'week', weekStart }
        : { type: 'month', month: repMonth, year: repYear };
      await downloadFoodReport(params);
    } catch {
      setStatusMsg({ type: 'error', text: 'Download failed.' });
    } finally {
      setDlLoading(false);
    }
  };

  // ── Calendar nav ──────────────────────────────────────────────────────────
  const minCalMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const minCalYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const maxCalMonth = now.getMonth() === 11 ? 1  : now.getMonth() + 2;
  const maxCalYear  = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
  const canGoPrev   = calYear > minCalYear || (calYear === minCalYear && calMonth > minCalMonth);
  const canGoNext   = calYear < maxCalYear || (calYear === maxCalYear && calMonth < maxCalMonth);

  const handlePrev = () => {
    if (!canGoPrev) return;
    if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const handleNext = () => {
    if (!canGoNext) return;
    if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  // ── Auto-clear toast ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!statusMsg) return;
    const t = setTimeout(() => setStatusMsg(null), 5000);
    return () => clearTimeout(t);
  }, [statusMsg]);

  const yearOptions = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  if (loadingStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Derived state for buttons ─────────────────────────────────────────────
  const canCancelNow           = status?.canCancelNow;
  const isActive               = status?.isActive;
  const isSuspended            = !!status?.suspendedFrom;
  const isCancelledNextWeek    = status?.isCancelledNextWeek;      // manual single-week cancel
  const isBulkSuspendedNextWeek = status?.isBulkSuspendedNextWeek; // year cancelled from next Monday
  const isEnabledNextWeekOnly  = status?.isEnabledNextWeekOnly;    // year cancelled but next week re-enabled

  // Subscription display date
  const startDate    = status?.subscription?.startDate;
  const optedInAt    = status?.subscription?.optedInAt;
  const startsInFuture = startDate && new Date(startDate) > now;
  const startDateFmt = startDate
    ? new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;
  const suspFromFmt  = status?.suspendedFrom
    ? new Date(status.suspendedFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  // Status badge label
  const statusBadge = !isActive
    ? { label: 'Year Disabled',       cls: 'bg-orange-100 text-orange-600' }
    : isBulkSuspendedNextWeek
      ? { label: `Cancelled from ${suspFromFmt}`, cls: 'bg-red-100 text-red-600' }
      : isEnabledNextWeekOnly
        ? { label: 'Next Week Enabled', cls: 'bg-indigo-100 text-indigo-700' }
        : isCancelledNextWeek
          ? { label: 'Next Week Cancelled', cls: 'bg-amber-100 text-amber-700' }
          : startsInFuture
            ? { label: `Starts ${startDateFmt}`, cls: 'bg-sky-100 text-sky-700' }
            : { label: 'Active', cls: 'bg-green-100 text-green-700' };

  // ── Button 1: Cancel Next Week Food ──────────────────────────────────────
  // Visible: when subscribed + isActive + year is not bulk-suspended
  const btn1Show    = isActive && !isBulkSuspendedNextWeek;
  const btn1IsUndo  = isCancelledNextWeek && canCancelNow;
  const btn1Locked  = isCancelledNextWeek && !canCancelNow;
  const btn1Disable = btn1Loading || isEnabledNextWeekOnly || btn1Locked;

  // ── Button 2: Cancel This Year Food ──────────────────────────────────────
  // Visible: when subscribed + isActive
  const btn2Show    = isActive;
  const btn2IsUndo  = isBulkSuspendedNextWeek && canCancelNow;
  const btn2Locked  = isBulkSuspendedNextWeek && !canCancelNow;
  const btn2Disable = btn2Loading || isEnabledNextWeekOnly || btn2Locked || showBtn2Confirm;

  // ── Button 3: Enable Next Week Food ──────────────────────────────────────
  // Visible: when subscribed + isActive + any suspension is active
  const btn3Show    = isActive && isSuspended;
  const btn3IsUndo  = isEnabledNextWeekOnly && canCancelNow;
  const btn3Locked  = isEnabledNextWeekOnly && !canCancelNow;
  const btn3Disable = btn3Loading || btn3Locked || (!isBulkSuspendedNextWeek && !isEnabledNextWeekOnly);

  // ── Button 4: Enable This Year Food ──────────────────────────────────────
  // Visible: when subscribed + (year is disabled OR any suspension exists)
  const btn4Show    = !isActive || isSuspended;
  const btn4Disable = btn4Loading;

  // ── Locked badge helper ───────────────────────────────────────────────────
  const LockedSlot = () => (
    <div className="flex-1 flex items-center justify-center gap-1.5 border border-slate-200 bg-slate-50 px-3 py-2.5 rounded-xl">
      <Lock size={12} className="text-slate-400 shrink-0" />
      <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">Locked</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Opt-In Modal */}
      {showOptIn && isRequestor && (
        <FoodOptInModal loading={optInLoading} onConfirm={handleOptIn} onDecline={() => setShowOptIn(false)} />
      )}

      {/* Toast */}
      {statusMsg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-[12px] font-bold border ${
          statusMsg.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {statusMsg.text}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* REQUESTOR SECTION                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isRequestor && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">

            {/* Subscription info row */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  status?.subscribed
                    ? isActive ? 'bg-green-100' : 'bg-orange-100'
                    : 'bg-slate-100'
                }`}>
                  <UtensilsCrossed size={20} className={
                    status?.subscribed
                      ? isActive ? 'text-green-600' : 'text-orange-500'
                      : 'text-slate-400'
                  } />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-black text-slate-800 text-[13px]">
                      {status?.subscribed ? 'Food Subscription' : 'Not Subscribed'}
                    </p>
                    {status?.subscribed && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${statusBadge.cls}`}>
                        {statusBadge.label}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-[11px] font-medium">
                    {status?.subscribed
                      ? startsInFuture
                        ? `Opted in — food starts from ${startDateFmt}`
                        : `Opted in since ${new Date(optedInAt || startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : 'Click Opt In to join the daily food program — ₹30/day'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!status?.subscribed && (
                  <button
                    onClick={() => setShowOptIn(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-black text-[12px] shadow-md transition-all active:scale-95"
                  >
                    Opt In
                  </button>
                )}
                {pushSupported && (
                  <button
                    onClick={pushSubscribed ? disablePush : enablePush}
                    disabled={pushLoading}
                    title={pushSubscribed ? 'Turn off food notifications' : 'Enable food notifications on this device'}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black transition-all active:scale-95 border ${
                      pushSubscribed
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    } ${pushLoading ? 'opacity-60 pointer-events-none' : ''}`}
                  >
                    {pushSubscribed ? <Bell size={13} /> : <BellOff size={13} />}
                    <span className="hidden sm:inline">{pushSubscribed ? 'Notifications On' : 'Notify Me'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Push error (e.g. HTTPS required) */}
            {pushError && (
              <p className="text-[10px] text-red-500 font-medium flex items-center gap-1">
                <AlertCircle size={11} /> {pushError}
              </p>
            )}

            {/* Cancellation window notice */}
            {status?.subscribed && (
              <p className="text-[15px] text-slate-700 font-medium">
                Any changes for next week can be made only before <span className="font-black text-slate-500">Saturday 6:30 PM</span> of the current week.
              </p>
            )}

            {/* 4 Action Buttons */}
            {status?.subscribed && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

                  {/* ── BUTTON 1: Cancel Next Week Food ─────────────────── */}
                  {btn1Show ? (
                    btn1Locked ? <LockedSlot /> : (
                      <button
                        onClick={handleBtn1}
                        disabled={btn1Disable}
                        title={
                          isEnabledNextWeekOnly ? 'Next week is already resumed — undo that first'
                          : btn1IsUndo           ? 'Restore next week food'
                          :                        'Skip food for next week only'
                        }
                        className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-black text-[11px] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed border ${
                          btn1IsUndo
                            ? 'border-green-300 bg-green-50 hover:bg-green-100 text-green-700'
                            : 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700'
                        }`}
                      >
                        {btn1Loading
                          ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          : btn1IsUndo
                            ? <><CalendarCheck size={13} /> <span className="whitespace-nowrap">Undo Skip</span></>
                            : <><CalendarX size={13} />     <span className="whitespace-nowrap">Skip Next Week</span></>}
                      </button>
                    )
                  ) : (
                    /* Placeholder keeps grid alignment */
                    <div className="hidden sm:block" />
                  )}

                  {/* ── BUTTON 2: Cancel This Year Food ─────────────────── */}
                  {btn2Show ? (
                    btn2Locked ? <LockedSlot /> : (
                      <button
                        onClick={btn2IsUndo ? handleBtn2 : () => setShowBtn2Confirm(true)}
                        disabled={btn2Disable}
                        title={
                          isEnabledNextWeekOnly ? 'Year is paused — undo next week resume first'
                          : btn2IsUndo           ? 'Remove the year pause and resume food'
                          :                        'Pause food from next week through year end'
                        }
                        className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-black text-[11px] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed border ${
                          btn2IsUndo
                            ? 'border-green-300 bg-green-50 hover:bg-green-100 text-green-700'
                            : 'border-red-300 bg-red-50 hover:bg-red-100 text-red-600'
                        }`}
                      >
                        {btn2Loading
                          ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          : btn2IsUndo
                            ? <><CalendarCheck size={13} /> <span className="whitespace-nowrap">Undo Year Pause</span></>
                            : <><CalendarOff size={13} />   <span className="whitespace-nowrap">Pause for the Year</span></>}
                      </button>
                    )
                  ) : (
                    <div className="hidden sm:block" />
                  )}

                  {/* ── BUTTON 3: Enable Next Week Food ─────────────────── */}
                  {btn3Show ? (
                    btn3Locked ? <LockedSlot /> : (
                      <button
                        onClick={handleBtn3}
                        disabled={btn3Disable}
                        title={
                          btn3IsUndo ? 'Undo the one-week resume'
                          :            'Resume food for next week only (year pause continues after)'
                        }
                        className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-black text-[11px] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed border ${
                          btn3IsUndo
                            ? 'border-green-300 bg-green-50 hover:bg-green-100 text-green-700'
                            : 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {btn3Loading
                          ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          : btn3IsUndo
                            ? <><CalendarCheck size={13} /> <span className="whitespace-nowrap">Undo Resume</span></>
                            : <><CalendarCheck size={13} /> <span className="whitespace-nowrap">Resume Next Week</span></>}
                      </button>
                    )
                  ) : (
                    <div className="hidden sm:block" />
                  )}

                  {/* ── BUTTON 4: Enable This Year Food ─────────────────── */}
                  {btn4Show && (
                    <button
                      onClick={handleBtn4}
                      disabled={btn4Disable}
                      title="Resume food for the whole year and clear any pauses"
                      className="flex items-center justify-center gap-1.5 border border-green-300 bg-green-50 hover:bg-green-100 text-green-700 px-3 py-2.5 rounded-xl font-black text-[11px] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {btn4Loading
                        ? <span className="w-3.5 h-3.5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                        : <><CalendarRange size={13} /> <span className="whitespace-nowrap">Resume for the Year</span></>}
                    </button>
                  )}

                </div>

                {/* Confirmation panel for Button 2 (Cancel This Year) */}
                {showBtn2Confirm && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <div className="flex-1">
                      <p className="text-[12px] font-black text-red-800">Pause food for the rest of this year?</p>
                      <p className="text-[10px] text-red-400 font-medium mt-0.5">
                        Food will be paused from next week onwards. You can undo this before Sunday 10:30 AM.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => setShowBtn2Confirm(false)}
                        disabled={btn2Loading}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 font-black text-[11px] hover:bg-slate-50 transition-all"
                      >
                        Keep
                      </button>
                      <button
                        onClick={handleBtn2}
                        disabled={btn2Loading}
                        className="px-4 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-black text-[11px] transition-all disabled:opacity-60 flex items-center gap-1.5"
                      >
                        {btn2Loading
                          ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : 'Yes, Pause for Year'}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Calendar */}
          {status?.subscribed && (
            <FoodCalendar
              calendarData={calData}
              month={calMonth}
              year={calYear}
              onPrev={handlePrev}
              onNext={handleNext}
              loading={calLoading}
              canGoPrev={canGoPrev}
              canGoNext={canGoNext}
            />
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HR / FOOD COMMITTEE — NOTIFICATION CONTROL                          */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isReportRole && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-white flex items-center gap-2">
            <Bell size={16} className="text-violet-600" />
            <h3 className="font-black text-slate-800 text-[14px]">Food Notification Control</h3>
          </div>
          <div className="px-5 py-4 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[220px]">
              <p className="text-[11px] font-black text-slate-600">Automatic Schedule</p>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                Auto-reminders fire every <span className="font-black text-slate-600">Mon / Wed / Sat at 5:00 PM IST</span>.
                Use the button to send one immediately.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {pushSupported && (
                  <button
                    onClick={pushSubscribed ? disablePush : enablePush}
                    disabled={pushLoading}
                    title={pushSubscribed ? 'Turn off notifications on this device' : 'Enable push on this device'}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black border transition-all active:scale-95 ${
                      pushSubscribed
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    } ${pushLoading ? 'opacity-60 pointer-events-none' : ''}`}
                  >
                    {pushSubscribed ? <Bell size={13} /> : <BellOff size={13} />}
                    {pushSubscribed ? 'My Notifications On' : 'Enable on This Device'}
                  </button>
                )}
                <button
                  disabled={testLoading}
                  onClick={async () => {
                    setTestLoading(true);
                    try {
                      await triggerFoodReminder();
                      setStatusMsg({ type: 'success', text: 'Food reminder sent to all active subscribers!' });
                    } catch {
                      setStatusMsg({ type: 'error', text: 'Failed to send reminder.' });
                    } finally {
                      setTestLoading(false);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black border bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition-all active:scale-95 ${testLoading ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  <Bell size={13} className={testLoading ? 'animate-bounce' : ''} />
                  {testLoading ? 'Sending...' : 'Send Reminder to All Now'}
                </button>
              </div>
              {pushError && (
                <p className="text-[10px] text-red-500 font-medium flex items-center gap-1">
                  <AlertCircle size={11} /> {pushError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HR / FOOD COMMITTEE REPORT SECTION                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isReportRole && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-indigo-50 to-white">
            <div className="flex items-center gap-2">
              <UtensilsCrossed size={18} className="text-indigo-600" />
              <h3 className="font-black text-slate-800 text-[14px]">Food Request Report</h3>
            </div>
            {reportData && (
              <button
                onClick={handleDownload}
                disabled={dlLoading}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-black text-[11px] shadow-sm transition-all active:scale-95 disabled:opacity-60"
              >
                <Download size={14} />
                {dlLoading ? 'Downloading...' : 'Download CSV'}
              </button>
            )}
          </div>

          <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap items-end gap-3">
            <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden text-[11px] font-black">
              {['month', 'week'].map(t => (
                <button
                  key={t}
                  onClick={() => setReportType(t)}
                  className={`px-4 py-2 transition-all ${
                    reportType === t ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t === 'month' ? 'By Month' : 'By Week'}
                </button>
              ))}
            </div>

            {reportType === 'month' && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight ml-1">Month</label>
                  <select
                    value={repMonth}
                    onChange={e => setRepMonth(Number(e.target.value))}
                    className="bg-white border border-slate-200 py-1.5 px-3 rounded-lg text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight ml-1">Year</label>
                  <select
                    value={repYear}
                    onChange={e => setRepYear(Number(e.target.value))}
                    className="bg-white border border-slate-200 py-1.5 px-3 rounded-lg text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  >
                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </>
            )}

            {reportType === 'week' && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-tight ml-1">Select any date in the week</label>
                <input
                  type="date"
                  value={weekStart}
                  onChange={e => setWeekStart(e.target.value)}
                  className="bg-white border border-slate-200 py-1.5 px-3 rounded-lg text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            )}

            <button
              onClick={loadReport}
              disabled={reportLoading || (reportType === 'week' && !weekStart)}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-black text-[11px] shadow-sm transition-all active:scale-95 disabled:opacity-60"
            >
              <RefreshCw size={13} className={reportLoading ? 'animate-spin' : ''} />
              {reportLoading ? 'Loading...' : 'Load Report'}
            </button>
          </div>

          {reportData ? (
            <div className="space-y-3">
              <div className="px-5 pt-4">
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[11px] font-black shadow-sm">
                  TOTAL FOOD REQUESTS: {reportData.data.length}
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl mx-3 sm:mx-5 mb-4 sm:mb-5">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {['Sl.No', 'User ID', 'Name', 'Department', 'Month/Week', 'Working Days', 'Total Amount'].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-black text-slate-600 text-[11px] uppercase tracking-tight whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.data.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-400 font-medium">
                          No subscribed users found for this period.
                        </td>
                      </tr>
                    ) : (
                      reportData.data.map((row, i) => (
                        <tr key={row.empId} className={`border-b border-slate-100 hover:bg-indigo-50/30 transition-colors ${i % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}`}>
                          <td className="px-4 py-3 font-bold text-slate-400">{i + 1}</td>
                          <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">{row.empId}</td>
                          <td className="px-4 py-3 font-bold text-slate-800">{row.name}</td>
                          <td className="px-4 py-3 text-slate-600">{row.dept}</td>
                          <td className="px-4 py-3 text-slate-600">{row.period}</td>
                          <td className="px-4 py-3 text-center font-black text-indigo-700">{row.workingDays}</td>
                          <td className="px-4 py-3 font-black text-green-700">₹{row.totalAmount}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {reportData.data.length > 0 && (
                    <tfoot>
                      <tr className="bg-indigo-50 border-t-2 border-indigo-200">
                        <td colSpan={5} className="px-4 py-3 font-black text-slate-700 text-[11px] uppercase">
                          Grand Total — {reportData.data.length} users
                        </td>
                        <td className="px-4 py-3 text-center font-black text-indigo-700">
                          {reportData.data.reduce((s, r) => s + r.workingDays, 0)}
                        </td>
                        <td className="px-4 py-3 font-black text-green-700">
                          ₹{reportData.data.reduce((s, r) => s + r.totalAmount, 0)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          ) : (
            !reportLoading && (
              <div className="py-14 text-center text-slate-400 font-medium text-[12px]">
                Select filters and click{' '}
                <span className="font-black text-slate-600">Load Report</span>{' '}
                to view food request data.
              </div>
            )
          )}
        </div>
      )}

    </div>
  );
}
