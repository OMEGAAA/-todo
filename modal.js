/**
 * modal.js — タスク追加・編集モーダル
 */
window.Modal = (function () {
  let _overlay, _form, _titleEl, _editId = null;
  let _onSave = null;

  function _init() {
    _overlay = document.getElementById('task-modal-overlay');
    _form    = document.getElementById('task-form');
    _titleEl = document.getElementById('modal-title');

    // 閉じるボタン
    document.getElementById('modal-close-btn').addEventListener('click', close);
    document.getElementById('modal-cancel-btn').addEventListener('click', close);

    // オーバーレイクリックで閉じる
    _overlay.addEventListener('click', function (e) {
      if (e.target === _overlay) close();
    });

    // Escキー
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && _overlay.classList.contains('open')) close();
    });

    // フォーム送信
    _form.addEventListener('submit', _handleSubmit);

    // 日付バリデーション（終了日が開始日より前なら自動修正）
    document.getElementById('field-start-date').addEventListener('change', _validateDates);
    document.getElementById('field-end-date').addEventListener('change', _validateDates);
  }

  function _validateDates() {
    const startInput = document.getElementById('field-start-date');
    const endInput   = document.getElementById('field-end-date');
    if (startInput.value && endInput.value && endInput.value < startInput.value) {
      endInput.value = startInput.value;
    }
  }

  function _handleSubmit(e) {
    e.preventDefault();
    const errors = _validate();
    if (errors.length > 0) {
      _showErrors(errors);
      return;
    }
    _clearErrors();

    const data = {
      name:        document.getElementById('field-name').value.trim(),
      startDate:   document.getElementById('field-start-date').value,
      endDate:     document.getElementById('field-end-date').value,
      status:      document.getElementById('field-status').value,
      priority:    document.getElementById('field-priority').value,
      assignee:    document.getElementById('field-assignee').value.trim(),
      description: document.getElementById('field-description').value.trim()
    };

    if (_editId) {
      Store.updateTask(_editId, data);
      Toast.show('タスクを更新しました', 'success');
    } else {
      Store.addTask(data);
      Toast.show('タスクを追加しました', 'success');
    }

    if (_onSave) _onSave();
    close();
  }

  function _validate() {
    const errors = [];
    const name      = document.getElementById('field-name').value.trim();
    const startDate = document.getElementById('field-start-date').value;
    const endDate   = document.getElementById('field-end-date').value;

    if (!name)      errors.push({ field: 'name',       msg: 'タスク名を入力してください' });
    else if (name.length > 100) errors.push({ field: 'name', msg: '100文字以内で入力してください' });

    if (!startDate) errors.push({ field: 'start-date', msg: '開始日を選択してください' });
    if (!endDate)   errors.push({ field: 'end-date',   msg: '終了日を選択してください' });

    if (startDate && endDate && endDate < startDate) {
      errors.push({ field: 'end-date', msg: '終了日は開始日以降にしてください' });
    }

    return errors;
  }

  function _showErrors(errors) {
    _clearErrors();
    errors.forEach(err => {
      const input = document.getElementById(`field-${err.field}`);
      if (input) {
        input.classList.add('error');
        const errEl = document.createElement('div');
        errEl.className = 'form-error';
        errEl.textContent = err.msg;
        input.parentNode.appendChild(errEl);
      }
    });
    // 最初のエラーフィールドにフォーカス
    const first = document.querySelector('.form-input.error');
    if (first) first.focus();
  }

  function _clearErrors() {
    document.querySelectorAll('.form-input.error').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.form-error').forEach(el => el.remove());
  }

  function _todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function open(taskId, callback) {
    _editId  = taskId || null;
    _onSave  = callback || null;
    _clearErrors();

    if (_editId) {
      const task = Store.getTaskById(_editId);
      _titleEl.textContent = 'タスクを編集';
      document.getElementById('field-name').value        = task.name;
      document.getElementById('field-start-date').value  = task.startDate;
      document.getElementById('field-end-date').value    = task.endDate;
      document.getElementById('field-status').value      = task.status;
      document.getElementById('field-priority').value    = task.priority;
      document.getElementById('field-assignee').value    = task.assignee;
      document.getElementById('field-description').value = task.description;
    } else {
      _titleEl.textContent = 'タスクを追加';
      _form.reset();
      document.getElementById('field-start-date').value = _todayStr();
      document.getElementById('field-end-date').value   = _todayStr();
      document.getElementById('field-status').value     = 'not_started';
      document.getElementById('field-priority').value   = 'medium';
    }

    _overlay.classList.add('open');
    setTimeout(() => document.getElementById('field-name').focus(), 100);

    // フォーカストラップ
    _trapFocus(_overlay);
  }

  function close() {
    _overlay.classList.remove('open');
    _editId = null;
    _onSave = null;
  }

  function _trapFocus(container) {
    const focusable = container.querySelectorAll(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    function handler(e) {
      if (e.key !== 'Tab') return;
      if (!container.classList.contains('open')) {
        container.removeEventListener('keydown', handler);
        return;
      }
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    }
    container.addEventListener('keydown', handler);
  }

  // DOMContentLoaded後に初期化
  document.addEventListener('DOMContentLoaded', _init);

  return { open, close };
})();
