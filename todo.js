/**
 * todo.js — TODOリストビューのレンダリング
 */
window.TodoView = (function () {
  let _sortKey = 'startDate';
  let _sortDir = 'asc';

  const STATUS_LABEL = {
    not_started: '未着手',
    in_progress: '進行中',
    completed:   '完了'
  };

  const PRIORITY_LABEL = {
    high:   '高',
    medium: '中',
    low:    '低'
  };

  function render() {
    const tasks  = Store.getTasks();
    const filter = Store.getFilter();
    const stats  = Store.getStats();

    // フィルター & ソート
    const sorted = Filter.getFilteredAndSorted(tasks, filter, _sortKey, _sortDir);

    // 進捗セクション
    _renderProgress(stats);

    // ソートボタン更新
    _updateSortButtons();

    // タスクリスト
    const container = document.getElementById('todo-list');
    if (!container) return;

    if (sorted.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
          </svg>
          <div class="empty-state-title">タスクがありません</div>
          <div class="empty-state-desc">「+ タスクを追加」ボタンからタスクを作成してください</div>
        </div>
      `;
      return;
    }

    const today = _todayStr();
    container.innerHTML = sorted.map(task => _renderCard(task, today)).join('');

    // イベント
    container.querySelectorAll('.todo-check').forEach(el => {
      el.addEventListener('click', function () {
        const id = this.closest('[data-task-id]').dataset.taskId;
        const task = Store.getTaskById(id);
        const newStatus = task.status === 'completed' ? 'not_started' : 'completed';
        Store.setTaskStatus(id, newStatus);
        Toast.show(newStatus === 'completed' ? 'タスクを完了にしました' : '未着手に戻しました', 'success');
      });
    });
  }

  function _renderCard(task, today) {
    const isCompleted = task.status === 'completed';
    const isOverdue   = !isCompleted && task.endDate < today;
    const isDueSoon   = !isCompleted && !isOverdue && _daysDiff(today, task.endDate) <= 3;
    const priorityClass = task.priority;
    const statusClass   = task.status.replace('_', '-');

    let deadlineHtml = '';
    if (isOverdue) {
      deadlineHtml = `<span class="todo-deadline-indicator overdue">⚠ 期限超過</span>`;
    } else if (isDueSoon) {
      deadlineHtml = `<span class="todo-deadline-indicator due-soon">⏰ 期限間近</span>`;
    }

    const assigneeHtml = task.assignee
      ? `<span class="todo-assignee"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${_esc(task.assignee)}</span>`
      : '';

    const descHtml = task.description
      ? `<div class="todo-description">${_esc(task.description)}</div>`
      : '';

    return `
      <div class="todo-card ${isCompleted ? 'completed' : ''}" data-task-id="${task.id}">
        <div class="todo-check ${isCompleted ? 'checked' : ''}" role="checkbox" aria-checked="${isCompleted}" tabindex="0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div class="todo-card-body">
          <div class="todo-card-top">
            <div class="todo-task-name">${_esc(task.name)}</div>
            <span class="badge badge-${priorityClass}">${PRIORITY_LABEL[task.priority]}</span>
            <span class="badge badge-${statusClass}">${STATUS_LABEL[task.status]}</span>
            ${deadlineHtml}
          </div>
          <div class="todo-card-meta">
            <span class="todo-date ${isOverdue ? 'overdue' : ''}">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${_formatDate(task.startDate)} 〜 ${_formatDate(task.endDate)}
            </span>
            ${assigneeHtml}
          </div>
          ${descHtml}
        </div>
        <div class="todo-card-actions">
          <button class="btn btn-ghost btn-icon btn-sm" onclick="Modal.open('${task.id}')" data-tooltip="編集">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="TodoView.deleteTask('${task.id}')" data-tooltip="削除">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  function _renderProgress(stats) {
    const section = document.getElementById('todo-progress');
    if (!section) return;
    const pct = stats.total > 0 ? Math.round(stats.completed / stats.total * 100) : 0;
    section.querySelector('.todo-progress-bar').style.width = pct + '%';
    section.querySelector('.todo-progress-pct').textContent = pct + '%';
    section.querySelector('.todo-progress-label').textContent =
      `完了 ${stats.completed} / ${stats.total} タスク`;
  }

  function _updateSortButtons() {
    document.querySelectorAll('.sort-btn').forEach(btn => {
      const key = btn.dataset.sort;
      btn.classList.toggle('active', key === _sortKey);
      const arrow = btn.querySelector('.sort-arrow');
      if (arrow && key === _sortKey) {
        arrow.textContent = _sortDir === 'asc' ? '↑' : '↓';
      }
    });
  }

  function setSort(key) {
    if (_sortKey === key) {
      _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      _sortKey = key;
      _sortDir = 'asc';
    }
    render();
  }

  function deleteTask(id) {
    if (!confirm('このタスクを削除しますか？')) return;
    Store.deleteTask(id);
    Toast.show('タスクを削除しました', 'success');
  }

  // ========== ユーティリティ ==========

  function _todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function _daysDiff(a, b) {
    const da = new Date(a.replace(/-/g, '/'));
    const db = new Date(b.replace(/-/g, '/'));
    return Math.round((db - da) / 86400000);
  }

  function _formatDate(str) {
    if (!str) return '';
    const [y, m, d] = str.split('-');
    return `${y}/${m}/${d}`;
  }

  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return { render, setSort, deleteTask };
})();
