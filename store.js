/**
 * store.js — データ管理・LocalStorage永続化
 */
window.Store = (function () {
  const STORAGE_KEY = 'gantt_todo_app_v1';

  const DEFAULT_STATE = {
    tasks: [],
    filter: {
      status: 'all',
      priority: 'all',
      assignee: ''
    },
    view: {
      current: 'gantt',
      ganttScale: 'week'
    },
    gantt: {
      startDate: _todayStr()
    }
  };

  let state = _load();

  // ========== プライベートユーティリティ ==========

  function _todayStr() {
    const d = new Date();
    return _dateToStr(d);
  }

  function _dateToStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return _deepClone(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      // マージ（新フィールド追加に対応）
      return _deepMerge(_deepClone(DEFAULT_STATE), parsed);
    } catch (e) {
      console.warn('[Store] ロード失敗、デフォルト状態を使用', e);
      return _deepClone(DEFAULT_STATE);
    }
  }

  function _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        console.error('[Store] LocalStorageの容量が不足しています');
        if (window.Toast) window.Toast.show('ストレージ容量が不足しています', 'error');
      } else {
        throw e;
      }
    }
  }

  function _deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function _deepMerge(target, source) {
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        target[key] = _deepMerge(target[key] || {}, source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  function _generateId() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function _listeners() {
    return state._listeners || (state._listeners = []);
  }

  function _notify() {
    const ls = state._listeners || [];
    ls.forEach(fn => fn());
  }

  // ========== タスク CRUD ==========

  function getTasks() {
    return _deepClone(state.tasks);
  }

  function getTaskById(id) {
    const t = state.tasks.find(t => t.id === id);
    return t ? _deepClone(t) : null;
  }

  function addTask(data) {
    const now = new Date().toISOString();
    const task = {
      id: _generateId(),
      name: data.name.trim(),
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status || 'not_started',
      priority: data.priority || 'medium',
      assignee: (data.assignee || '').trim(),
      description: (data.description || '').trim(),
      createdAt: now,
      updatedAt: now
    };
    state.tasks.push(task);
    _save();
    _notify();
    return _deepClone(task);
  }

  function updateTask(id, data) {
    const idx = state.tasks.findIndex(t => t.id === id);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    state.tasks[idx] = {
      ...state.tasks[idx],
      name: data.name !== undefined ? data.name.trim() : state.tasks[idx].name,
      startDate: data.startDate !== undefined ? data.startDate : state.tasks[idx].startDate,
      endDate: data.endDate !== undefined ? data.endDate : state.tasks[idx].endDate,
      status: data.status !== undefined ? data.status : state.tasks[idx].status,
      priority: data.priority !== undefined ? data.priority : state.tasks[idx].priority,
      assignee: data.assignee !== undefined ? data.assignee.trim() : state.tasks[idx].assignee,
      description: data.description !== undefined ? data.description.trim() : state.tasks[idx].description,
      updatedAt: now
    };
    _save();
    _notify();
    return _deepClone(state.tasks[idx]);
  }

  function deleteTask(id) {
    const idx = state.tasks.findIndex(t => t.id === id);
    if (idx === -1) return false;
    state.tasks.splice(idx, 1);
    _save();
    _notify();
    return true;
  }

  function setTaskStatus(id, status) {
    return updateTask(id, { status });
  }

  // ========== フィルター ==========

  function getFilter() {
    return _deepClone(state.filter);
  }

  function setFilter(partial) {
    Object.assign(state.filter, partial);
    _save();
    _notify();
  }

  function resetFilter() {
    state.filter = { status: 'all', priority: 'all', assignee: '' };
    _save();
    _notify();
  }

  // ========== ビュー状態 ==========

  function getView() {
    return _deepClone(state.view);
  }

  function setView(partial) {
    Object.assign(state.view, partial);
    _save();
    _notify();
  }

  // ========== ガントチャート表示位置 ==========

  function getGanttStartDate() {
    return state.gantt.startDate;
  }

  function setGanttStartDate(dateStr) {
    state.gantt.startDate = dateStr;
    _save();
  }

  // ========== サブスクリプション ==========

  function subscribe(fn) {
    if (!state._listeners) state._listeners = [];
    state._listeners.push(fn);
    return () => {
      state._listeners = state._listeners.filter(l => l !== fn);
    };
  }

  // ========== 統計 ==========

  function getStats() {
    const tasks = state.tasks;
    return {
      total: tasks.length,
      notStarted: tasks.filter(t => t.status === 'not_started').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      highPriority: tasks.filter(t => t.priority === 'high').length,
      mediumPriority: tasks.filter(t => t.priority === 'medium').length,
      lowPriority: tasks.filter(t => t.priority === 'low').length
    };
  }

  // ========== 担当者一覧 ==========

  function getAssignees() {
    const set = new Set();
    state.tasks.forEach(t => { if (t.assignee) set.add(t.assignee); });
    return Array.from(set).sort();
  }

  return {
    getTasks,
    getTaskById,
    addTask,
    updateTask,
    deleteTask,
    setTaskStatus,
    getFilter,
    setFilter,
    resetFilter,
    getView,
    setView,
    getGanttStartDate,
    setGanttStartDate,
    subscribe,
    getStats,
    getAssignees
  };
})();
