import { createContext, useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { setSessionLostHandler } from '../services/api';
import { settingsService } from '../services/settingsService';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { conversationService } from '../services/conversationService';
import { chatService, newClientMessageId } from '../services/chatService';
import { sourceService } from '../services/sourceService';
import { groupOf } from '../data/config';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

/** Thread key for a chat that has not been saved on the server yet. */
export const NEW_CHAT = '__new';

const INITIAL_UI = settings => ({
  draft: '', scope: settings.defaultScope, panel: null, lpSeen: false,
  setTab: 'general', sideQ: '',
  hist: { q: '', view: 'list' }
});

/* Question prompts built from real indexed source titles. */
const PROMPT = {
  youtube: t => `Summarize the main ideas from "${t}".`,
  document: t => `What are the key points in "${t}"?`,
  text: t => `What does "${t}" say?`,
  conversation: t => `What was agreed in "${t}"?`
};
export const promptFor = s => (PROMPT[groupOf(s)] || PROMPT.text)(s.title);

export function AppProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathRef = useRef(location.pathname); pathRef.current = location.pathname;

  const [session, setSession] = useState(() => authService.session());
  const [user, setUser] = useState(() => (authService.session() || {}).user || null);
  const [publicSettings, setPublicSettings] = useState(null);
  const [settings, setSettings] = useState(() => settingsService.resolve((((authService.session() || {}).user) || {}).preferences));
  const [convVer, bumpConvs] = useReducer(x => x + 1, 0);
  const [threads, setThreads] = useState({});
  const [pending, setPending] = useState(() => new Set());
  const [suggest, setSuggest] = useState({ status: 'idle', items: [] });
  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);
  const [ui, setUiState] = useState(() => INITIAL_UI(settings));
  const composerRef = useRef(null);
  const pendingRef = useRef(pending); pendingRef.current = pending;
  const scopeRef = useRef(ui.scope); scopeRef.current = ui.scope;
  const userRef = useRef(user); userRef.current = user;
  const settingsRef = useRef(settings); settingsRef.current = settings;
  const threadsRef = useRef(threads); threadsRef.current = threads;

  const setUi = useCallback(patch => setUiState(u => ({ ...u, ...(typeof patch === 'function' ? patch(u) : patch) })), []);

  const toast = useCallback((msg, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3600);
  }, []);

  const openModal = useCallback(cfg => setModal(cfg), []);
  const closeModal = useCallback(() => setModal(null), []);
  const confirmDialog = useCallback((title, text, ok, onOk) => setModal({ title, text, ok, danger: true, onOk }), []);
  const promptDialog = useCallback((title, label, value, onOk) => setModal({ title, ok: 'Save', prompt: { label, value }, onOk }), []);

  /* theme + density on <html>, following the device when theme = system */
  useEffect(() => {
    settingsService.apply(settings);
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => settingsService.apply(settings);
    mq && mq.addEventListener && mq.addEventListener('change', on);
    return () => mq && mq.removeEventListener && mq.removeEventListener('change', on);
  }, [settings]);

  /* ---------- session ---------- */
  const resetState = useCallback(() => {
    setSession(null); setUser(null); setPublicSettings(null); setThreads({}); setPending(new Set());
    setSuggest({ status: 'idle', items: [] }); setUi({ draft: '', panel: null, sideQ: '' });
  }, [setUi]);

  const applyUser = useCallback(u => {
    setUser(u);
    const s = settingsService.resolve(u.preferences || {});
    setSettings(s); settingsService.cache(s);
  }, []);

  useEffect(() => {
    setSessionLostHandler(() => {
      resetState();
      if (pathRef.current.startsWith('/app')) navigate('/login', { replace: true, state: { from: pathRef.current, notice: 'Your session has ended. Sign in again.' } });
    });
  }, [navigate, resetState]);

  /** GET /auth/me: restores the user and the public workspace settings. */
  const refreshMe = useCallback(async () => {
    const r = await authService.me();
    applyUser(r.user); setPublicSettings(r.settings || null);
    return r;
  }, [applyUser]);

  useEffect(() => {
    if (!session) return;
    refreshMe().catch(e => { if (e.status !== 401) toast(e.message, 'err'); });
  }, [session && session.accessToken ? 'in' : 'out']); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email, pw, remember) => {
    const s = await authService.login(email, pw, remember);
    applyUser(s.user); setSession(s);
    return s;
  }, [applyUser]);
  const acceptInvitation = useCallback(async data => {
    const s = await authService.acceptInvitation(data);
    applyUser(s.user); setSession(s);
    return s;
  }, [applyUser]);
  const logout = useCallback(async () => {
    try { await authService.logout(); } catch (e) { /* the local session is cleared either way */ }
    resetState(); toast('Signed out.', 'info'); navigate('/login');
  }, [navigate, resetState, toast]);

  /** PATCH /users/me with profile fields; returns the saved profile. */
  const saveProfile = useCallback(async changes => {
    const p = await userService.update(changes);
    applyUser(p);
    return p;
  }, [applyUser]);

  /** Preferences are saved to the profile; language and time zone are profile fields. Throws on failure. */
  const setSetting = useCallback(async (k, v) => {
    if (k === 'language' || k === 'timezone') return saveProfile({ [k]: v });
    const prev = settingsRef.current, next = { ...prev, [k]: v };
    setSettings(next); settingsService.cache(next);
    if (k === 'defaultScope') setUi({ scope: v });
    const prefs = { ...((userRef.current && userRef.current.preferences) || {}) };
    settingsService.keys().forEach(key => { prefs[key] = next[key]; });
    try { const p = await settingsService.save(prefs); setUser(p); return p; }
    catch (e) { setSettings(prev); settingsService.cache(prev); throw e; }
  }, [saveProfile, setUi]);

  /* ---------- suggestions from real indexed sources ---------- */
  const loadSuggestions = useCallback(async (force = false) => {
    if (!force && suggest.status !== 'idle') return;
    setSuggest(s => ({ ...s, status: 'loading' }));
    try {
      const { data } = await sourceService.list({ sort: 'updated', pageSize: 4 });
      setSuggest({ status: 'ready', items: data.map(s => ({ id: s.id, group: groupOf(s), title: s.title, prompt: promptFor(s) })) });
    } catch (e) { setSuggest({ status: 'error', items: [], error: e.message }); }
  }, [suggest.status]);

  /* ---------- chat threads ---------- */
  const updateThread = (key, fn) => setThreads(ts => ({ ...ts, [key]: fn(ts[key] || { conv: null, messages: [] }) }));
  const moveThread = (from, to, fn) => setThreads(ts => { const n = { ...ts }; const base = n[from] || { conv: null, messages: [] }; delete n[from]; n[to] = fn ? fn(base) : base; return n; });
  const addPending = key => setPending(p => new Set(p).add(key));
  const dropPending = key => setPending(p => { const n = new Set(p); n.delete(key); return n; });
  const clearPending = useCallback(key => (key ? dropPending(key) : setPending(new Set())), []);

  /** GET /conversations/:id into the thread cache. */
  const loadThread = useCallback(async (id, force = false) => {
    const t = threadsRef.current[id];
    if (t && !force && (t.loading || (t.messages && !t.error))) return;
    updateThread(id, x => ({ ...x, loading: true, error: null }));
    try {
      const { messages, ...conv } = await conversationService.get(id);
      updateThread(id, x => ({ ...x, conv, messages: messages || [], loading: false, error: null }));
    } catch (e) {
      updateThread(id, x => ({ ...x, loading: false, error: e }));
    }
  }, []);

  const resetNewChat = useCallback(() => { if (!pendingRef.current.has(NEW_CHAT)) setThreads(ts => { const n = { ...ts }; delete n[NEW_CHAT]; return n; }); }, []);

  /**
   * Send a question. `currentId` is the open conversation (if any).
   * opts.clientMessageId + opts.retry re-send a failed question with the same id (server de-duplicates).
   */
  const send = useCallback(async (text, currentId, opts = {}) => {
    text = (text || '').trim(); if (!text) return;
    const u = userRef.current;
    if (u && u.role === 'readonly') { toast('Your account is read-only, so you cannot send questions.', 'err'); return; }
    const key = currentId || NEW_CHAT;
    if (pendingRef.current.has(key)) { toast('Wait for the current response to finish.', 'info'); return; }
    const max = (publicSettings && publicSettings.chat && publicSettings.chat.maxQuestionLength) || 2000;
    if (text.length > max) { toast(`Questions can be at most ${max} characters.`, 'err'); return; }

    const cmid = opts.clientMessageId || newClientMessageId();
    const scope = opts.scope || scopeRef.current;
    const localId = 'local-' + cmid, errId = 'err-' + cmid;
    if (opts.retry) updateThread(key, t => ({ ...t, messages: t.messages.filter(m => m.id !== errId) }));
    else {
      const userMsg = { id: localId, role: 'user', content: text, createdAt: new Date().toISOString(), clientMessageId: cmid, local: true };
      if (key === NEW_CHAT) setThreads(ts => ({ ...ts, [NEW_CHAT]: { conv: null, messages: [userMsg] } }));
      else updateThread(key, t => ({ ...t, messages: [...t.messages, userMsg] }));
    }
    if (!opts.keepDraft) setUi({ draft: '' });
    addPending(key);
    if (key === NEW_CHAT && pathRef.current !== '/app/chat') navigate('/app/chat');

    // live preview of the answer while it streams; replaced by the saved message when the stream ends
    const streamId = 'stream-' + cmid;
    const upsertStream = fn => updateThread(key, t => {
      const i = t.messages.findIndex(m => m.id === streamId);
      const base = i >= 0 ? t.messages[i] : { id: streamId, role: 'assistant', outcome: 'answered', content: '', citations: [], followups: [], createdAt: new Date().toISOString(), local: true, streaming: true };
      const next = fn(base);
      return { ...t, messages: i >= 0 ? t.messages.map((m, j) => (j === i ? next : m)) : [...t.messages, next] };
    });
    const dropStream = t => ({ ...t, stage: null, messages: t.messages.filter(m => m.id !== streamId) });
    updateThread(key, t => ({ ...t, stage: 'searching' }));

    try {
      const r = await chatService.stream({ message: text, conversationId: currentId, clientMessageId: cmid, scope }, {
        onStatus: stage => updateThread(key, t => ({ ...t, stage })),
        onText: chunk => upsertStream(m => ({ ...m, content: m.content + chunk })),
        onCitation: c => upsertStream(m => ({ ...m, citations: [...m.citations, c] }))
      });
      const id = r.conversationId;
      const merge = t => {
        const keep = t.messages.filter(m => m.id !== localId && m.id !== errId && m.id !== streamId && m.id !== r.userMessage.id && m.id !== r.message.id);
        return { ...t, stage: null, conv: { ...(t.conv || {}), ...r.conversation }, messages: [...keep, r.userMessage, r.message], loading: false, error: null };
      };
      if (key === NEW_CHAT) moveThread(NEW_CHAT, id, merge); else updateThread(key, merge);
      dropPending(key); bumpConvs();
      if (key === NEW_CHAT && pathRef.current === '/app/chat') navigate('/app/chat/' + id, { replace: true });
      return r;
    } catch (e) {
      dropPending(key);
      updateThread(key, dropStream);
      if (e.status === 403) {
        // read-only accounts (or a role change since sign-in): take the question back out
        updateThread(key, t => ({ ...t, messages: t.messages.filter(m => m.id !== localId) }));
        setUi({ draft: text });
        toast(e.code === 'FORBIDDEN' ? 'Your account is read-only, so you cannot send questions.' : e.message, 'err');
        refreshMe().catch(() => {});
        return;
      }
      const convId = (e.details && e.details.conversationId) || currentId || null;
      const failed = {
        id: errId, role: 'assistant', outcome: 'error', content: e.message, createdAt: new Date().toISOString(), citations: [], followups: [], local: true,
        failed: { text, clientMessageId: cmid, scope, conversationId: convId, code: e.code, retryable: e.status === 503 || e.status === 0 || !!(e.details && e.details.retryable) }
      };
      const add = t => ({ ...t, messages: [...t.messages.filter(m => m.id !== errId), failed] });
      if (key === NEW_CHAT && convId) {
        moveThread(NEW_CHAT, convId, t => add({ ...t, conv: t.conv || { id: convId, title: text.length > 70 ? text.slice(0, 67).trim() + '…' : text } }));
        bumpConvs();
        if (pathRef.current === '/app/chat') navigate('/app/chat/' + convId, { replace: true });
      } else updateThread(key, add);
    }
  }, [navigate, publicSettings, refreshMe, setUi, toast]);

  /** Retry a failed question with the same clientMessageId so the server does not duplicate it. */
  const retry = useCallback(m => {
    const f = m.failed; if (!f) return;
    return send(f.text, f.conversationId, { clientMessageId: f.clientMessageId, scope: f.scope, retry: true, keepDraft: true });
  }, [send]);

  /** Regenerate = ask the last user question again as a new message. */
  const regenerate = useCallback(convId => {
    const t = threadsRef.current[convId]; if (!t) return;
    const q = [...t.messages].reverse().find(x => x.role === 'user');
    if (q) send(q.content, convId, { keepDraft: true });
  }, [send]);

  /** POST /messages/:id/feedback; null removes it. */
  const setFeedback = useCallback(async (convId, m, rating, comment) => {
    const r = await chatService.feedback(m.id, rating, comment);
    const value = r && 'feedback' in r ? r.feedback : rating;
    const fb = value && typeof value === 'object' ? value.rating : value;
    updateThread(convId, t => ({ ...t, messages: t.messages.map(x => (x.id === m.id ? { ...x, feedback: fb ?? null } : x)) }));
    return fb ?? null;
  }, []);

  const renameConv = useCallback(async (id, title) => {
    const c = await conversationService.rename(id, title);
    if (threadsRef.current[id]) updateThread(id, t => ({ ...t, conv: { ...(t.conv || {}), ...c } }));
    bumpConvs();
    return c;
  }, []);
  const deleteConv = useCallback(async id => {
    await conversationService.remove(id);
    setThreads(ts => { const n = { ...ts }; delete n[id]; return n; });
    dropPending(id); bumpConvs();
  }, []);
  const clearAllConvs = useCallback(async () => {
    const r = await conversationService.clearAll();
    setThreads({}); setPending(new Set()); bumpConvs();
    return r;
  }, []);

  const value = {
    settings, setSetting, session, user, publicSettings, refreshMe, saveProfile, login, acceptInvitation, logout,
    canChat: !!user && user.role !== 'readonly',
    convVer, bumpConvs, threads, loadThread, pending, clearPending, send, retry, regenerate, setFeedback, resetNewChat,
    renameConv, deleteConv, clearAllConvs, suggest, loadSuggestions,
    toasts, toast, modal, openModal, closeModal, confirmDialog, promptDialog,
    ui, setUi, composerRef
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
