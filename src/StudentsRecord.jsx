// StudentsRecord.jsx
// Shows students from `students` and merges matching `profiles` account data.
// Includes import/export, template download, duplicate validation, section/status filters, archive/restore, and import history logs.

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from './supabase';
import Sidebar from './Sidebar';
import { useTheme, ThemedCard } from './ThemeContext';

const fmtFull = (ds) => ds ? new Date(ds).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
const peso = (v) => `₱${Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const FUND_STATUS_CHIP = {
  'credited to fund': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'encoded':          'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'rejected':         'bg-red-500/10 text-red-400 border-red-500/20',
  'verified':         'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};
const fundChip = (v) => FUND_STATUS_CHIP[(v||'').toLowerCase()] || FUND_STATUS_CHIP['verified'];

const ALLOC_CHIP = (v, light) => {
  const s = (v||'').toLowerCase();
  if (s.includes('classroom')) return light ? 'bg-blue-50 text-blue-700' : 'bg-blue-500/10 text-blue-400';
  if (s.includes('general'))   return light ? 'bg-purple-50 text-purple-700' : 'bg-purple-500/10 text-purple-400';
  return light ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-500/10 text-emerald-400';
};

const allocLabel = (v) => {
  const s = (v||'').toLowerCase();
  if (s.includes('classroom')) return 'Classroom';
  if (s.includes('general'))   return 'General Fund';
  return 'Individual';
};

const IMPORT_LOGS_KEY = 'wishcraft_student_import_history_logs';
const STUDENT_TEMPLATE_HEADERS = ['Full Name', 'Email', 'LRN', 'Grade Level', 'Section', 'Status'];
const STUDENT_TEMPLATE_ROWS = [
  {
    full_name: 'Juan Dela Cruz',
    email: 'juan.delacruz@students.nu-dasma.edu.ph',
    lrn: '123456789012',
    grade_level: 'Grade 10',
    section: 'St. Matthew',
    status: 'Active',
  },
];

function clean(v) {
  return String(v ?? '').trim();
}

function normalize(v) {
  return clean(v).toLowerCase();
}

function isValidEmail(email) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeStatus(status) {
  const s = normalize(status);
  if (!s) return 'Active';
  if (['active', 'enrolled', 'enabled'].includes(s)) return 'Active';
  if (['inactive', 'disabled', 'archived'].includes(s)) return 'Inactive';
  return clean(status);
}

function mapHeader(header) {
  const h = normalize(header).replace(/[^a-z0-9]/g, '');
  const map = {
    fullname: 'full_name',
    name: 'full_name',
    studentname: 'full_name',
    email: 'email',
    schoolemail: 'email',
    studentemail: 'email',
    lrn: 'lrn',
    studentnumber: 'lrn',
    studentid: 'lrn',
    gradelevel: 'grade_level',
    grade: 'grade_level',
    level: 'grade_level',
    section: 'section',
    classroomsection: 'section',
    status: 'status',
    accountstatus: 'status',
  };
  return map[h] || h;
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quote = false;

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    const n = text[i + 1];

    if (c === '"') {
      if (quote && n === '"') {
        cell += '"';
        i += 1;
      } else {
        quote = !quote;
      }
      continue;
    }

    if (c === ',' && !quote) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((c === '\n' || c === '\r') && !quote) {
      if (c === '\r' && n === '\n') i += 1;
      row.push(cell);
      if (row.some(v => clean(v))) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += c;
  }

  row.push(cell);
  if (row.some(v => clean(v))) rows.push(row);
  return rows;
}

function parseHtmlTable(text) {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const trs = Array.from(doc.querySelectorAll('tr'));
  return trs.map(tr => Array.from(tr.querySelectorAll('th,td')).map(td => clean(td.textContent))).filter(r => r.length);
}

function rowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map(mapHeader);
  return rows.slice(1).map((row, index) => {
    const obj = { _row: index + 2 };
    headers.forEach((h, i) => { obj[h] = clean(row[i]); });
    return obj;
  }).filter(obj => Object.values(obj).some(v => clean(v) && !String(v).startsWith('_')));
}

function escapeCsv(value) {
  const s = String(value ?? '');
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function objectsToCsv(rows, columns) {
  const header = columns.map(c => escapeCsv(c.label)).join(',');
  const body = rows.map(row => columns.map(c => escapeCsv(c.value(row))).join(',')).join('\n');
  return `${header}\n${body}`;
}


function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadCsv(filename, rows, columns) {
  downloadFile(objectsToCsv(rows, columns), filename, 'text/csv;charset=utf-8;');
}


function studentExportColumns() {
  return [
    { label: 'Full Name', value: r => r.full_name || '' },
    { label: 'Email', value: r => r.email || r.school_email || '' },
    { label: 'LRN', value: r => r.lrn || '' },
    { label: 'Grade Level', value: r => r.grade_level || '' },
    { label: 'Section', value: r => r.section || '' },
    { label: 'Status', value: r => r.status || r.account_status || 'Active' },
    { label: 'App Account', value: r => r.account_label || (r.has_app_account ? 'Registered' : 'No App Account') },
    { label: 'Profile Email', value: r => r.profile_email || '' },
    { label: 'Submissions', value: r => r._count || 0 },
    { label: 'Total KG', value: r => Number(r._kg || 0).toFixed(2) },
    { label: 'Estimated Fund Value', value: r => Number(r._fund || 0).toFixed(2) },
  ];
}

function historyExportColumns(student) {
  return [
    { label: 'Student Name', value: () => student.full_name || '' },
    { label: 'Email', value: () => student.email || student.school_email || '' },
    { label: 'LRN', value: () => student.lrn || '' },
    { label: 'Date', value: r => fmtFull(r.date_received || r.created_at) },
    { label: 'Waste Type', value: r => r.waste_type || '' },
    { label: 'Weight KG', value: r => Number(r.weight_kg || 0).toFixed(2) },
    { label: 'Points', value: r => Number(r.points_earned || 0).toFixed(0) },
    { label: 'Estimated Fund Value', value: r => Number(r.estimated_credit || 0).toFixed(2) },
    { label: 'Condition', value: r => r.material_condition || '' },
    { label: 'Allocation', value: r => r.contribution_type || r.scholarship_allocation || '' },
    { label: 'Section', value: r => r.classroom_section || r.section || '' },
    { label: 'Status', value: r => r.encoded_status || r.status || '' },
    { label: 'Receipt', value: r => r.receipt_no || r.control_number || '' },
    { label: 'Officer', value: r => r.officer_name || '' },
  ];
}

function getImportLogs() {
  try {
    const saved = JSON.parse(localStorage.getItem(IMPORT_LOGS_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveImportLogs(logs) {
  localStorage.setItem(IMPORT_LOGS_KEY, JSON.stringify(logs.slice(0, 30)));
}

// ── Student Detail Drawer ──────────────────────────────────────────────────────
function StudentDrawer({ student, onClose, onArchive, isLightMode, t }) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!student) return;
    setLoading(true);

    const studentEmail = student.email || student.school_email || student.profile_email;
    const filters = [];
    if (student.lrn) filters.push(`lrn.eq.${student.lrn}`);
    if (studentEmail) filters.push(`resident_email.eq.${studentEmail}`);

    let query = supabase
      .from('surrender_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.length) {
      query = query.or(filters.join(','));
    } else {
      query = query.eq('id', -1);
    }

    query.then(({ data, error }) => {
      if (error) console.error('load student history error:', error);
      setLogs(data || []);
      setLoading(false);
    });
  }, [student]);

  if (!student) return null;

  const totalKg     = logs.reduce((s, l) => s + (Number(l.weight_kg) || 0), 0);
  const totalPts    = logs.reduce((s, l) => s + (Number(l.points_earned) || 0), 0);
  const totalFund   = logs.reduce((s, l) => s + (Number(l.estimated_credit) || 0), 0);
  const credited    = logs.filter(l => (l.encoded_status||'').toLowerCase() === 'credited to fund')
                          .reduce((s, l) => s + (Number(l.estimated_credit) || 0), 0);

  const cardCls = isLightMode ? 'bg-[#F4F9F5] border-[#D8EDDF]' : 'bg-[#0F1814]/80 border-white/[0.06]';
  const divider = isLightMode ? 'border-[#EDF0EB]' : 'border-white/[0.05]';
  const historyFilenameBase = `${(student.full_name || 'student').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_history`;

  const exportHistoryCsv = () => {
    downloadCsv(`${historyFilenameBase}.csv`, logs, historyExportColumns(student));
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" onClick={onClose}/>

      <div className={`fixed right-0 top-0 h-full w-full max-w-xl z-[110] flex flex-col shadow-2xl overflow-hidden transition-all duration-300
        ${isLightMode ? 'bg-white' : 'bg-[#0F1814]'}`}>

        <div className={`p-6 border-b ${divider} flex items-start justify-between flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0
              ${isLightMode ? 'bg-[#D8EDDF] text-[#2D6A4F]' : 'bg-[#2D6A4F]/30 text-[#52B788]'}`}>
              {(student.full_name || student.email || 'S')[0].toUpperCase()}
            </div>
            <div>
              <h3 className={`text-base font-bold ${t.textMain}`}>{student.full_name || 'Unknown Student'}</h3>
              <p className={`text-xs ${t.textMuted} mt-0.5`}>{student.email || student.school_email}</p>
              {student.lrn && <p className={`text-[11px] ${t.textMuted}`}>LRN: {student.lrn}</p>}
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition-all ${isLightMode ? 'hover:bg-[#F3F6F1] text-[#5E7A67]' : 'hover:bg-white/[0.05] text-[#A8BDA2]'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className={`px-6 py-3 border-b ${divider} flex flex-wrap gap-x-6 gap-y-1`}>
          {[
            { label: 'Section',      value: student.section || '—' },
            { label: 'Grade Level',  value: student.grade_level || '—' },
            { label: 'Status',       value: student.status || student.account_status || 'Active' },
            { label: 'App Account',  value: student.account_label || (student.has_app_account ? 'Registered' : 'No App Account') },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className={`text-[9px] font-bold uppercase tracking-widest ${t.textMuted}`}>{label}</p>
              <p className={`text-xs font-semibold ${t.textMain}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className={`px-6 py-4 border-b ${divider} grid grid-cols-2 gap-3`}>
          {[
            { label: 'Total KG Contributed',      value: `${totalKg.toFixed(2)} kg` },
            { label: 'Total Points',              value: `${Math.round(totalPts)} pts` },
            { label: 'Estimated Fund Value',      value: peso(totalFund) },
            { label: 'Credited to WISHCRAFT Fund', value: peso(credited) },
          ].map(({ label, value }) => (
            <div key={label} className={`rounded-xl p-3 border ${cardCls}`}>
              <p className={`text-[9px] font-bold uppercase tracking-widest ${t.textMuted} mb-1`}>{label}</p>
              <p className={`text-base font-bold ${t.accentText}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className={`px-6 py-3 border-b ${divider} flex flex-wrap gap-2`}>
          <button onClick={exportHistoryCsv} disabled={!logs.length} className={`px-3 py-2 rounded-xl text-[11px] font-bold border disabled:opacity-40 ${isLightMode ? 'bg-white border-[#DDE3DA] text-[#2D6A4F] hover:bg-[#F0F9F3]' : 'bg-white/[0.03] border-white/[0.07] text-[#52B788] hover:bg-white/[0.06]'}`}>
            Export History CSV
          </button>
          <button onClick={() => onArchive?.(student)} className={`px-3 py-2 rounded-xl text-[11px] font-bold border ${isLightMode ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/15'}`}>
            {(student.status || '').toLowerCase() === 'archived' ? 'Restore Student' : 'Archive Student'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3" style={{ scrollbarWidth: 'none' }}>
          <h4 className={`text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-3`}>
            Submission History ({logs.length})
          </h4>

          {loading ? (
            <div className={`text-center py-12 text-sm font-bold tracking-widest animate-pulse ${t.accentText}`}>LOADING...</div>
          ) : logs.length === 0 ? (
            <div className={`text-center py-12 ${t.textMuted} text-sm italic`}>No submissions found for this student.</div>
          ) : logs.map(log => {
            const status = log.encoded_status || log.status || 'Verified';
            const alloc  = log.contribution_type || log.scholarship_allocation || 'Individual Student Contribution';
            return (
              <div key={log.id} className={`rounded-xl border p-4 ${isLightMode ? 'bg-white border-[#E8F0E9]' : 'bg-[#0F1814] border-white/[0.06]'}`}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className={`text-sm font-bold ${t.textMain}`}>{log.waste_type || '—'}</p>
                    <p className={`text-[11px] ${t.textMuted} mt-0.5`}>{fmtFull(log.date_received || log.created_at)}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border flex-shrink-0 ${fundChip(status)}`}>{status}</span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div><span className={t.textMuted}>Weight: </span><span className={`font-semibold ${t.textMain}`}>{log.weight_kg} kg</span></div>
                  <div><span className={t.textMuted}>Points: </span><span className={`font-semibold ${t.textMain}`}>{Number(log.points_earned||0).toFixed(0)} pts</span></div>
                  <div><span className={t.textMuted}>Fund Value: </span><span className={`font-semibold ${t.accentText}`}>{peso(log.estimated_credit)}</span></div>
                  <div><span className={t.textMuted}>Condition: </span><span className={`font-semibold ${t.textMain}`}>{log.material_condition || '—'}</span></div>
                </div>

                <div className={`mt-3 pt-3 border-t ${divider} grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs`}>
                  <div>
                    <span className={t.textMuted}>Allocation: </span>
                    <span className={`inline font-bold px-1.5 py-0.5 rounded-md text-[10px] ${ALLOC_CHIP(alloc, isLightMode)}`}>{allocLabel(alloc)}</span>
                  </div>
                  <div><span className={t.textMuted}>Section: </span><span className={`font-semibold ${t.textMain}`}>{log.classroom_section || log.section || '—'}</span></div>
                  <div><span className={t.textMuted}>Beneficiary: </span><span className={`font-semibold ${t.textMain}`}>{log.beneficiary_name || '—'}</span></div>
                  <div><span className={t.textMuted}>Receipt: </span><span className={`font-semibold ${t.textMain}`}>{log.receipt_no || log.control_number || '—'}</span></div>
                </div>

                {log.officer_name && (
                  <p className={`text-[10px] ${t.textMuted} mt-2`}>Verified by: <span className="font-semibold">{log.officer_name}</span></p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function ImportPreviewModal({ open, onClose, rows, onImport, isImporting, isLightMode, t }) {
  if (!open) return null;

  const validRows = rows.filter(r => r.valid);
  const invalidRows = rows.filter(r => !r.valid);
  const divider = isLightMode ? 'border-[#E3E8E1]' : 'border-white/[0.07]';

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.62)' }} onClick={onClose}>
      <div className={`w-full max-w-5xl rounded-3xl border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col ${isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#101A12] border-white/[0.08]'}`} onClick={e => e.stopPropagation()}>
        <div className={`px-6 py-5 border-b ${divider} flex items-start justify-between gap-4`}>
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${t.textMuted}`}>Import Preview</p>
            <h3 className={`text-lg font-bold ${t.textMain}`}>Review student records before saving</h3>
            <p className={`text-xs mt-1 ${t.textMuted}`}>{validRows.length} valid · {invalidRows.length} needs fixing</p>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl ${isLightMode ? 'hover:bg-[#F3F6F1] text-[#5E7A67]' : 'hover:bg-white/[0.07] text-[#A8BDA2]'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="overflow-auto flex-1" style={{ scrollbarWidth: 'none' }}>
          <table className="w-full min-w-[900px] text-left border-collapse text-sm">
            <thead className={isLightMode ? 'bg-[#F7F9F6]' : 'bg-[#0A0F0D]'}>
              <tr className={`text-[10px] uppercase tracking-widest ${t.textMuted}`}>
                {['Row', 'Full Name', 'Email', 'LRN', 'Grade', 'Section', 'Status', 'Validation'].map(h => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}
              </tr>
            </thead>
            <tbody className={`divide-y ${isLightMode ? 'divide-[#F0F4F1]' : 'divide-white/[0.04]'}`}>
              {rows.map((r, idx) => (
                <tr key={`${r._row}-${idx}`} className={!r.valid ? (isLightMode ? 'bg-red-50/60' : 'bg-red-500/5') : ''}>
                  <td className={`px-4 py-3 text-xs font-mono ${t.textMuted}`}>{r._row}</td>
                  <td className={`px-4 py-3 font-semibold ${t.textMain}`}>{r.full_name || '—'}</td>
                  <td className={`px-4 py-3 text-xs ${t.textMuted}`}>{r.email || '—'}</td>
                  <td className={`px-4 py-3 text-xs font-mono ${t.textMuted}`}>{r.lrn || '—'}</td>
                  <td className={`px-4 py-3 text-xs ${t.textMain}`}>{r.grade_level || '—'}</td>
                  <td className={`px-4 py-3 text-xs ${t.textMain}`}>{r.section || '—'}</td>
                  <td className={`px-4 py-3 text-xs ${t.textMain}`}>{r.status || 'Active'}</td>
                  <td className="px-4 py-3">
                    {r.valid ? (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Ready</span>
                    ) : (
                      <div className="space-y-1">
                        {r.errors.map(err => <p key={err} className="text-[10px] font-semibold text-red-500">• {err}</p>)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`px-6 py-4 border-t ${divider} flex flex-wrap gap-2 justify-end`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-xs font-bold border ${isLightMode ? 'bg-white border-[#DDE3DA] text-[#3D4E3A]' : 'bg-white/[0.03] border-white/[0.07] text-[#B0C5AA]'}`}>
            Cancel
          </button>
          <button onClick={onImport} disabled={isImporting || validRows.length === 0} className="px-5 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40" style={{ background: isLightMode ? '#2D6A4F' : '#34D399', color: isLightMode ? '#fff' : '#061008' }}>
            {isImporting ? 'Importing...' : `Import ${validRows.length} Valid Records`}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportLogsModal({ open, onClose, logs, onClear, isLightMode, t }) {
  if (!open) return null;
  const divider = isLightMode ? 'border-[#E3E8E1]' : 'border-white/[0.07]';

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.62)' }} onClick={onClose}>
      <div className={`w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden max-h-[85vh] flex flex-col ${isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#101A12] border-white/[0.08]'}`} onClick={e => e.stopPropagation()}>
        <div className={`px-6 py-5 border-b ${divider} flex items-start justify-between gap-4`}>
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${t.textMuted}`}>Upload Accountability</p>
            <h3 className={`text-lg font-bold ${t.textMain}`}>Import History Logs</h3>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl ${isLightMode ? 'hover:bg-[#F3F6F1] text-[#5E7A67]' : 'hover:bg-white/[0.07] text-[#A8BDA2]'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-3" style={{ scrollbarWidth: 'none' }}>
          {logs.length === 0 ? (
            <div className={`text-center py-10 text-sm italic ${t.textMuted}`}>No import logs yet.</div>
          ) : logs.map(log => (
            <div key={log.id} className={`rounded-2xl border p-4 ${isLightMode ? 'bg-[#F9FBF9] border-[#E3E8E1]' : 'bg-white/[0.03] border-white/[0.06]'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`text-sm font-bold ${t.textMain}`}>{log.fileName}</p>
                  <p className={`text-xs ${t.textMuted} mt-0.5`}>{fmtFull(log.createdAt)} · {log.adminEmail}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${log.failed > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {log.success} saved / {log.failed} failed
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                <div><span className={t.textMuted}>Total rows: </span><span className={t.textMain}>{log.total}</span></div>
                <div><span className={t.textMuted}>Valid: </span><span className={t.textMain}>{log.valid}</span></div>
                <div><span className={t.textMuted}>Invalid: </span><span className={t.textMain}>{log.invalid}</span></div>
              </div>
              {log.message && <p className={`text-[11px] mt-2 ${t.textMuted}`}>{log.message}</p>}
            </div>
          ))}
        </div>

        <div className={`px-6 py-4 border-t ${divider} flex justify-between gap-2`}>
          <button onClick={onClear} disabled={!logs.length} className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500 text-white disabled:opacity-40">Clear Logs</button>
          <button onClick={onClose} className={`px-4 py-2 rounded-xl text-xs font-bold border ${isLightMode ? 'bg-white border-[#DDE3DA] text-[#3D4E3A]' : 'bg-white/[0.03] border-white/[0.07] text-[#B0C5AA]'}`}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function StudentsRecord() {
  const { isLightMode, t } = useTheme();
  const fileInputRef = useRef(null);

  const [students,  setStudents]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [sectionFilter, setSectionFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected,  setSelected]  = useState(null);
  const [page,      setPage]      = useState(1);
  const PAGE_SIZE = 30;

  const [stats, setStats] = useState({ total: 0, active: 0, totalKg: 0, totalFund: 0 });
  const [importPreview, setImportPreview] = useState([]);
  const [importFileName, setImportFileName] = useState('');
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importLogs, setImportLogs] = useState(getImportLogs());
  const [showImportLogs, setShowImportLogs] = useState(false);

  const inputCls = `px-3 py-2 rounded-xl border text-sm outline-none transition-all ${
    isLightMode ? 'bg-white border-[#DDE3DA] text-[#1A2418] placeholder:text-[#A8BCAA]'
                : 'bg-[#0F1512] border-white/[0.07] text-[#E8F0E5] placeholder:text-[#3D5042]'
  }`;

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const [studentsResult, profilesResult, logsResult] = await Promise.all([
        supabase
          .from('students')
          .select('*')
          .order('full_name', { ascending: true }),
        supabase
          .from('profiles')
          .select('*')
          .in('role', ['student', 'Student']),
        supabase
          .from('surrender_logs')
          .select('resident_email, lrn, weight_kg, estimated_credit'),
      ]);

      if (studentsResult.error) throw studentsResult.error;
      if (profilesResult.error) console.warn('profiles merge skipped:', profilesResult.error.message || profilesResult.error);

      const studentRows = studentsResult.data || [];
      const profileRows = profilesResult.error ? [] : (profilesResult.data || []);
      const logs = logsResult.data || [];

      const profilesByLrn = new Map();
      const profilesByEmail = new Map();

      profileRows.forEach(profile => {
        const lrnKey = normalize(profile.lrn);
        if (lrnKey && !profilesByLrn.has(lrnKey)) profilesByLrn.set(lrnKey, profile);

        [profile.email, profile.school_email].forEach(email => {
          const emailKey = normalize(email);
          if (emailKey && !profilesByEmail.has(emailKey)) profilesByEmail.set(emailKey, profile);
        });
      });

      const getMatchedLogs = (record) => {
        const lrnKey = normalize(record.lrn);
        const emailKeys = [record.school_email, record.email, record.profile_email]
          .map(normalize)
          .filter(Boolean);

        return logs.filter(log => {
          const logLrn = normalize(log.lrn);
          const logEmail = normalize(log.resident_email);
          return (lrnKey && logLrn === lrnKey) || (logEmail && emailKeys.includes(logEmail));
        });
      };

      const usedProfileIds = new Set();

      const officialStudents = studentRows.map(student => {
        const lrnKey = normalize(student.lrn);
        const emailKey = normalize(student.school_email || student.email);
        const matchedProfile =
          (lrnKey && profilesByLrn.get(lrnKey)) ||
          (emailKey && profilesByEmail.get(emailKey)) ||
          null;

        if (matchedProfile?.id) usedProfileIds.add(matchedProfile.id);

        const merged = {
          ...(matchedProfile || {}),
          ...student,
          id: student.id,
          student_record_id: student.id,
          profile_id: matchedProfile?.id || null,
          source_table: 'students',
          has_app_account: Boolean(matchedProfile),
          account_label: matchedProfile ? 'Registered' : 'No App Account',
          profile_email: matchedProfile?.email || '',
          email: student.school_email || student.email || matchedProfile?.email || matchedProfile?.school_email || '',
          avatar_url: matchedProfile?.avatar_url || student.avatar_url || '',
          full_name: student.full_name || matchedProfile?.full_name || '',
          lrn: student.lrn || matchedProfile?.lrn || '',
          section: student.section || matchedProfile?.section || '',
          grade_level: student.grade_level || matchedProfile?.grade_level || '',
          status: student.status || 'Active',
          account_status: matchedProfile?.account_status || matchedProfile?.status || '',
        };

        const matchedLogs = getMatchedLogs(merged);
        return {
          ...merged,
          _kg: matchedLogs.reduce((sum, l) => sum + Number(l.weight_kg || 0), 0),
          _fund: matchedLogs.reduce((sum, l) => sum + Number(l.estimated_credit || 0), 0),
          _count: matchedLogs.length,
        };
      });

      const profileOnlyStudents = profileRows
        .filter(profile => !usedProfileIds.has(profile.id))
        .map(profile => {
          const merged = {
            ...profile,
            id: profile.id,
            student_record_id: null,
            profile_id: profile.id,
            source_table: 'profiles',
            has_app_account: true,
            account_label: 'Registered',
            profile_email: profile.email || '',
            school_email: profile.school_email || profile.email || '',
            email: profile.school_email || profile.email || '',
            status: profile.status || profile.account_status || 'Active',
          };

          const matchedLogs = getMatchedLogs(merged);
          return {
            ...merged,
            _kg: matchedLogs.reduce((sum, l) => sum + Number(l.weight_kg || 0), 0),
            _fund: matchedLogs.reduce((sum, l) => sum + Number(l.estimated_credit || 0), 0),
            _count: matchedLogs.length,
          };
        });

      const enriched = [...officialStudents, ...profileOnlyStudents]
        .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

      setStudents(enriched);
      setStats({
        total: enriched.length,
        active: enriched.filter(s => (s.status || 'active').toLowerCase() === 'active').length,
        totalKg: enriched.reduce((a, s) => a + s._kg, 0).toFixed(1),
        totalFund: enriched.reduce((a, s) => a + s._fund, 0).toFixed(2),
      });
    } catch (e) {
      console.error('fetchStudents error:', e);
      alert(`Failed to load students: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const grades = useMemo(() => {
    const set = new Set(students.map(s => s.grade_level).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [students]);

  const sections = useMemo(() => {
    const set = new Set(students.map(s => s.section).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [students]);

  const statuses = useMemo(() => {
    const set = new Set(students.map(s => s.status || s.account_status || 'Active').filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [students]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter(s => {
      const status = s.status || s.account_status || 'Active';
      if (gradeFilter !== 'All' && s.grade_level !== gradeFilter) return false;
      if (sectionFilter !== 'All' && s.section !== sectionFilter) return false;
      if (statusFilter !== 'All' && status !== statusFilter) return false;
      if (q && !s.full_name?.toLowerCase().includes(q) && !s.email?.toLowerCase().includes(q) && !s.school_email?.toLowerCase().includes(q) && !s.lrn?.includes(q) && !s.section?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [students, search, gradeFilter, sectionFilter, statusFilter]);

  useEffect(() => { setPage(1); }, [search, gradeFilter, sectionFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const validateImportRows = useCallback((objects) => {
    const officialRecords = students.filter(s => s.source_table !== 'profiles');
    const existingEmails = new Set(officialRecords.map(s => normalize(s.email || s.school_email)).filter(Boolean));
    const existingLrns = new Set(officialRecords.map(s => normalize(s.lrn)).filter(Boolean));
    const fileEmails = new Set();
    const fileLrns = new Set();

    return objects.map(obj => {
      const full_name = clean(obj.full_name);
      const email = clean(obj.email).toLowerCase();
      const lrn = clean(obj.lrn);
      const grade_level = clean(obj.grade_level);
      const section = clean(obj.section);
      const status = normalizeStatus(obj.status);
      const errors = [];
      const emailKey = normalize(email);
      const lrnKey = normalize(lrn);

      if (!full_name) errors.push('Full Name is required');
      if (!lrn) errors.push('LRN is required');
      if (email && !isValidEmail(email)) errors.push('Invalid email format');
      if (emailKey && existingEmails.has(emailKey)) errors.push('Email already exists');
      if (lrnKey && existingLrns.has(lrnKey)) errors.push('LRN already exists');
      if (emailKey && fileEmails.has(emailKey)) errors.push('Duplicate email in file');
      if (lrnKey && fileLrns.has(lrnKey)) errors.push('Duplicate LRN in file');

      if (emailKey) fileEmails.add(emailKey);
      if (lrnKey) fileLrns.add(lrnKey);

      return {
        _row: obj._row,
        full_name,
        email,
        lrn,
        grade_level,
        section,
        status,
        errors,
        valid: errors.length === 0,
      };
    });
  }, [students]);

  const handleImportFile = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx') {
      alert('For .xlsx import, install and integrate the xlsx package. For now, please save the Excel file as CSV or .xls.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const text = await file.text();
    const tableRows = ext === 'xls' || text.trim().startsWith('<') ? parseHtmlTable(text) : parseCSV(text);
    const objects = rowsToObjects(tableRows);
    const preview = validateImportRows(objects);

    setImportFileName(file.name);
    setImportPreview(preview);
    setShowImportPreview(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportValidRows = async () => {
    const validRows = importPreview.filter(r => r.valid);
    if (!validRows.length) return;

    setIsImporting(true);
    const { data: auth } = await supabase.auth.getUser();
    const adminEmail = auth?.user?.email || 'admin';

    const payload = validRows.map(r => ({
      full_name: r.full_name,
      school_email: r.email || null,
      lrn: r.lrn,
      grade_level: r.grade_level || null,
      section: r.section || null,
      status: r.status || 'Active',
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('students').insert(payload);
    const failed = error ? validRows.length : importPreview.filter(r => !r.valid).length;
    const success = error ? 0 : validRows.length;

    const nextLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      fileName: importFileName || 'student-import.csv',
      createdAt: new Date().toISOString(),
      adminEmail,
      total: importPreview.length,
      valid: validRows.length,
      invalid: importPreview.filter(r => !r.valid).length,
      success,
      failed,
      message: error ? error.message : 'Import completed successfully.',
    };

    const nextLogs = [nextLog, ...getImportLogs()];
    saveImportLogs(nextLogs);
    setImportLogs(nextLogs.slice(0, 30));

    if (error) {
      alert(`Import failed: ${error.message}`);
    } else {
      setShowImportPreview(false);
      setImportPreview([]);
      setImportFileName('');
      await fetchStudents();
    }

    setIsImporting(false);
  };

  const archiveStudent = async (student) => {
    if (!student?.id && !student?.student_record_id && !student?.profile_id) return;

    const currentStatus = student.status || 'Active';
    const isArchived = currentStatus.toLowerCase() === 'archived';
    const nextStatus = isArchived ? 'Active' : 'Archived';
    const actionLabel = isArchived ? 'restore' : 'archive';

    const confirmed = window.confirm(`Are you sure you want to ${actionLabel} ${student.full_name || 'this student'}?`);
    if (!confirmed) return;

    const targetTable = student.source_table === 'profiles' && !student.student_record_id ? 'profiles' : 'students';
    const targetId = targetTable === 'profiles'
      ? (student.profile_id || student.id)
      : (student.student_record_id || student.id);

    const updatePayload = targetTable === 'profiles'
      ? { status: nextStatus, account_status: nextStatus.toLowerCase(), updated_at: new Date().toISOString() }
      : { status: nextStatus, updated_at: new Date().toISOString() };

    const { error } = await supabase
      .from(targetTable)
      .update(updatePayload)
      .eq('id', targetId);

    if (error) {
      alert(`Failed to ${actionLabel} student: ${error.message}`);
      return;
    }

    setSelected(prev => {
      if (!prev) return prev;
      const sameStudent = targetTable === 'profiles'
        ? (prev.profile_id || prev.id) === targetId
        : (prev.student_record_id || prev.id) === targetId;
      return sameStudent ? { ...prev, status: nextStatus } : prev;
    });

    await fetchStudents();
  };

  const downloadImportTemplateCsv = () => {
    downloadCsv('student_import_template.csv', STUDENT_TEMPLATE_ROWS, [
      { label: 'Full Name', value: r => r.full_name },
      { label: 'Email', value: r => r.email },
      { label: 'LRN', value: r => r.lrn },
      { label: 'Grade Level', value: r => r.grade_level },
      { label: 'Section', value: r => r.section },
      { label: 'Status', value: r => r.status },
    ]);
  };


  const exportFilteredCsv = () => downloadCsv('students_record_filtered.csv', filtered, studentExportColumns());

  const clearImportLogs = () => {
    saveImportLogs([]);
    setImportLogs([]);
  };

  const resetFilters = () => {
    setSearch('');
    setGradeFilter('All');
    setSectionFilter('All');
    setStatusFilter('All');
  };

  return (
    <div className={`flex h-screen w-full font-sans ${t.bg} transition-colors duration-300 overflow-hidden`}>
      <Sidebar/>

      <div className="flex-1 h-full overflow-y-auto no-scrollbar">
        <div className="p-6 lg:p-10 max-w-[1700px] mx-auto">

          <div className="flex flex-col lg:flex-row justify-between items-start mb-8 gap-4">
            <div>
              <h2 className={`text-3xl font-bold ${t.textMain} tracking-tight`}>Students Record</h2>
              <p className={`${t.textMuted} mt-1 text-sm font-medium`}>Student directory with full WISHCRAFT submission history</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={fetchStudents} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${t.accentText} ${
                isLightMode ? 'border-[#A8CFBA] bg-[#D8EDDF] hover:bg-[#C4E0CF]' : 'border-[#52B788]/25 bg-[#52B788]/8 hover:bg-[#52B788]/15'
              }`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Refresh
              </button>
              <button onClick={() => fileInputRef.current?.click()} className={`px-3 py-2 rounded-xl text-xs font-bold border ${isLightMode ? 'bg-white border-[#DDE3DA] text-[#2D6A4F] hover:bg-[#F0F9F3]' : 'bg-white/[0.03] border-white/[0.07] text-[#52B788] hover:bg-white/[0.06]'}`}>Import CSV/Excel</button>
              <button onClick={downloadImportTemplateCsv} className={`px-3 py-2 rounded-xl text-xs font-bold border ${isLightMode ? 'bg-white border-[#DDE3DA] text-[#3D4E3A] hover:bg-[#F7F9F6]' : 'bg-white/[0.03] border-white/[0.07] text-[#B0C5AA] hover:bg-white/[0.06]'}`}>CSV Template</button>
              <button onClick={exportFilteredCsv} className={`px-3 py-2 rounded-xl text-xs font-bold border ${isLightMode ? 'bg-white border-[#DDE3DA] text-[#3D4E3A] hover:bg-[#F7F9F6]' : 'bg-white/[0.03] border-white/[0.07] text-[#B0C5AA] hover:bg-white/[0.06]'}`}>Export CSV</button>
              <button onClick={() => setShowImportLogs(true)} className={`px-3 py-2 rounded-xl text-xs font-bold border ${isLightMode ? 'bg-white border-[#DDE3DA] text-[#3D4E3A] hover:bg-[#F7F9F6]' : 'bg-white/[0.03] border-white/[0.07] text-[#B0C5AA] hover:bg-white/[0.06]'}`}>Import Logs</button>
            </div>
            <input ref={fileInputRef} type="file" accept=".csv,.xls,.txt" className="hidden" onChange={e => handleImportFile(e.target.files?.[0])}/>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Students',    value: stats.total,                         iconBg: t.iconBg1, icon: '🎓' },
              { label: 'Active Students',   value: stats.active,                        iconBg: t.iconBg1, icon: '✅' },
              { label: 'Total KG Contributed', value: `${Number(stats.totalKg).toLocaleString()} kg`, iconBg: t.iconBg2, icon: '♻️' },
              { label: 'Total Fund Value',  value: peso(stats.totalFund),               iconBg: t.iconBg1, icon: '💰' },
            ].map(s => (
              <ThemedCard key={s.label} className="flex flex-col gap-3 h-[120px]">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${s.iconBg}`}>{s.icon}</div>
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1`}>{s.label}</p>
                  <p className={`text-2xl font-bold ${t.textMain} leading-none`}>{s.value}</p>
                </div>
              </ThemedCard>
            ))}
          </div>

          <div className={`rounded-2xl border p-4 mb-6 flex flex-wrap gap-3 items-end ${isLightMode ? 'bg-white border-[#E3E8E1]' : 'bg-[#131A16] border-white/[0.05]'}`}>
            <div className="flex-1 min-w-[200px]">
              <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>Search</label>
              <div className="relative">
                <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${t.textMuted}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input className={`${inputCls} pl-8 w-full`} placeholder="Name, email, LRN, or section..." value={search} onChange={e => setSearch(e.target.value)}/>
              </div>
            </div>
            <div className="min-w-[140px]">
              <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>Grade Level</label>
              <select className={`${inputCls} cursor-pointer w-full`} value={gradeFilter} onChange={e => setGradeFilter(e.target.value)}>
                {grades.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="min-w-[160px]">
              <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>Section</label>
              <select className={`${inputCls} cursor-pointer w-full`} value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}>
                {sections.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="min-w-[140px]">
              <label className={`block text-[10px] font-bold uppercase tracking-widest ${t.textMuted} mb-1.5`}>Status</label>
              <select className={`${inputCls} cursor-pointer w-full`} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                {statuses.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            {(search || gradeFilter !== 'All' || sectionFilter !== 'All' || statusFilter !== 'All') && (
              <button onClick={resetFilters} className={`px-3 py-2 rounded-xl text-xs font-bold border ${isLightMode ? 'border-red-200 bg-red-50 text-red-600' : 'border-red-500/20 bg-red-500/8 text-red-400'}`}>Clear</button>
            )}
            <p className={`w-full text-[11px] ${t.textMuted} -mb-1`}>Showing <strong className={t.textMain}>{filtered.length}</strong> of <strong className={t.textMain}>{students.length}</strong> students</p>
          </div>

          <ThemedCard className="!p-0 overflow-hidden mb-6">
            <div className="overflow-x-auto" style={{ minHeight: 320 }}>
              {loading ? (
                <div className={`flex items-center justify-center h-64 text-sm font-bold tracking-widest animate-pulse ${t.accentText}`}>LOADING STUDENTS...</div>
              ) : paginated.length === 0 ? (
                <div className={`flex items-center justify-center h-64 text-sm italic ${t.textMuted}`}>No students match your filters.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`text-[10px] uppercase tracking-widest border-b ${isLightMode ? 'bg-[#F9FBF9] border-[#F0F4F1]' : 'bg-[#0A0F0D] border-white/[0.04]'} ${t.textMuted}`}>
                      <th className="px-6 py-4 font-bold">Student</th>
                      <th className="px-4 py-4 font-bold">LRN</th>
                      <th className="px-4 py-4 font-bold">Section / Grade</th>
                      <th className="px-4 py-4 font-bold">Submissions</th>
                      <th className="px-4 py-4 font-bold">Total KG</th>
                      <th className="px-4 py-4 font-bold">Est. Fund Value</th>
                      <th className="px-4 py-4 font-bold">Status</th>
                      <th className="px-4 py-4 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {paginated.map(s => {
                      const status = s.status || s.account_status || 'Active';
                      const isActive = status.toLowerCase() === 'active';
                      const isArchived = status.toLowerCase() === 'archived';
                      return (
                        <tr
                          key={s.id || s.email || s.lrn}
                          onClick={() => setSelected(s)}
                          className={`border-b cursor-pointer transition-colors ${isLightMode ? 'border-[#F0F4F1] hover:bg-[#F0F9F3]' : 'border-white/[0.03] hover:bg-[#2D6A4F]/10'}`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {s.avatar_url ? (
                                <img src={s.avatar_url} alt={s.full_name} className="w-8 h-8 rounded-full object-cover flex-shrink-0"/>
                              ) : (
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${t.iconBg1}`}>
                                  {(s.full_name || 'S')[0].toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className={`font-bold text-sm ${t.textMain}`}>{s.full_name || '—'}</p>
                                <p className={`text-[11px] ${t.textMuted} mt-0.5 truncate max-w-[180px]`}>{s.email || s.school_email}</p>
                                <span className={`inline-flex mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                  s.has_app_account
                                    ? (isLightMode ? 'bg-blue-50 text-blue-700' : 'bg-blue-500/10 text-blue-400')
                                    : (isLightMode ? 'bg-slate-100 text-slate-600' : 'bg-white/[0.06] text-[#A8BDA2]')
                                }`}>
                                  {s.account_label || (s.has_app_account ? 'Registered' : 'No App Account')}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className={`px-4 py-4 text-xs font-mono ${t.textMuted}`}>{s.lrn || '—'}</td>
                          <td className="px-4 py-4">
                            <p className={`text-sm ${t.textMain}`}>{s.section || '—'}</p>
                            <p className={`text-[11px] ${t.textMuted}`}>{s.grade_level || '—'}</p>
                          </td>
                          <td className={`px-4 py-4 text-sm font-bold ${s._count > 0 ? t.accentText : t.textMuted}`}>{s._count}</td>
                          <td className={`px-4 py-4 text-sm font-bold ${t.textMain}`}>{s._kg.toFixed(2)} kg</td>
                          <td className={`px-4 py-4 text-sm font-bold ${t.accentText}`}>{peso(s._fund)}</td>
                          <td className="px-4 py-4">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                              isActive
                                ? (isLightMode ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20')
                                : isArchived
                                  ? (isLightMode ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-500/10 text-amber-400 border-amber-500/20')
                                  : (isLightMode ? 'bg-red-50 text-red-600 border-red-200' : 'bg-red-500/10 text-red-400 border-red-500/20')
                            }`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); archiveStudent(s); }}
                              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                                isArchived
                                  ? (isLightMode ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15')
                                  : (isLightMode ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/15')
                              }`}
                            >
                              {isArchived ? 'Restore' : 'Archive'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className={`h-1 w-full bg-gradient-to-r from-transparent ${isLightMode ? 'via-[#98BAA3]/40' : 'via-[#2CD87D]/30'} to-transparent`}/>
          </ThemedCard>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mb-10">
              <p className={`text-xs ${t.textMuted}`}>Page {page} of {totalPages}</p>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className={`px-3 py-1.5 rounded-lg text-xs font-bold border disabled:opacity-30 ${isLightMode ? 'border-[#E3E8E1] text-[#3D4E3A]' : 'border-white/[0.07] text-[#B0C5AA]'}`}>← Prev</button>
                <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className={`px-3 py-1.5 rounded-lg text-xs font-bold border disabled:opacity-30 ${isLightMode ? 'border-[#E3E8E1] text-[#3D4E3A]' : 'border-white/[0.07] text-[#B0C5AA]'}`}>Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <StudentDrawer
          student={selected}
          onClose={() => setSelected(null)}
          onArchive={archiveStudent}
          isLightMode={isLightMode}
          t={t}
        />
      )}

      <ImportPreviewModal
        open={showImportPreview}
        onClose={() => setShowImportPreview(false)}
        rows={importPreview}
        onImport={handleImportValidRows}
        isImporting={isImporting}
        isLightMode={isLightMode}
        t={t}
      />

      <ImportLogsModal
        open={showImportLogs}
        onClose={() => setShowImportLogs(false)}
        logs={importLogs}
        onClear={clearImportLogs}
        isLightMode={isLightMode}
        t={t}
      />

      <style dangerouslySetInnerHTML={{ __html: `.no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}` }}/>
    </div>
  );
}
