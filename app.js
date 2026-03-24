/**
 * app.js — アプリケーション初期化・統合
 */
window.Toast = (function () {
  let container;

  function show(message, type = '') {
    if (!container) {
      container = document.getElementById('toast-container');
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = message;
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 2800);
  }

  return { show };
})();

document.addEventListener('DOMContentLoaded', function () {

  // ========== ビュー切替 ==========

  function switchView(viewName) {
    Store.setView({ current: viewName });

    // ビューパネル切替
    document.querySelectorAll('.view-panel').forEach(el => {
      el.classList.toggle('active', el.id === viewName + '-view');
    });

    // ヘッダーボタン
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    // ツールバー表示切替
    document.getElementById('gantt-toolbar').style.display = viewName === 'gantt' ? 'flex' : 'none';
    document.getElementById('todo-toolbar').style.display  = viewName === 'todo'  ? 'flex' : 'none';

    renderCurrent();
  }

  // ========== 描画 ==========

  function renderCurrent() {
    const view = Store.getView();
    if (view.current === 'gantt') {
      GanttView.render();
    } else {
      TodoView.render();
    }
    updateSidebar();
  }

  // ========== サイドバー更新 ==========

  function updateSidebar() {
    const stats  = Store.getStats();
    const filter = Store.getFilter();

    const countMap = {
      'all':          stats.total,
      'not_started':  stats.notStarted,
      'in_progress':  stats.inProgress,
      'completed':    stats.completed,
      'priority-all':    stats.total,
      'priority-high':   stats.highPriority,
      'priority-medium': stats.mediumPriority,
      'priority-low':    stats.lowPriority
    };

    document.querySelectorAll('.sidebar-filter-item[data-filter-status]').forEach(el => {
      const val = el.dataset.filterStatus;
      el.classList.toggle('active', filter.status === val);
      const cnt = el.querySelector('.sidebar-filter-count');
      if (cnt) cnt.textContent = countMap[val] ?? 0;
    });

    document.querySelectorAll('.sidebar-filter-item[data-filter-priority]').forEach(el => {
      const val = el.dataset.filterPriority;
      el.classList.toggle('active', filter.priority === val);
      const cnt = el.querySelector('.sidebar-filter-count');
      if (cnt) cnt.textContent = countMap['priority-' + val] ?? 0;
    });

    // フィルターセレクト同期
    const statusSel   = document.getElementById('filter-status');
    const prioritySel = document.getElementById('filter-priority');
    if (statusSel)   statusSel.value   = filter.status;
    if (prioritySel) prioritySel.value = filter.priority;
  }

  // ========== イベント登録 ==========

  // ビュー切替
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // タスク追加
  document.getElementById('add-task-btn').addEventListener('click', () => {
    Modal.open(null, renderCurrent);
  });

  // ガントスケール切替
  document.querySelectorAll('.scale-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const scale = this.dataset.scale;
      Store.setView({ ganttScale: scale });
      document.querySelectorAll('.scale-btn').forEach(b => b.classList.toggle('active', b === this));
      GanttView.render();
    });
  });

  // ガントナビゲーション
  document.getElementById('gantt-prev').addEventListener('click', () => GanttView.navigate('prev'));
  document.getElementById('gantt-next').addEventListener('click', () => GanttView.navigate('next'));
  document.getElementById('gantt-today').addEventListener('click', () => GanttView.goToToday());

  // ツールバーフィルター
  document.getElementById('filter-status').addEventListener('change', function () {
    Store.setFilter({ status: this.value });
    renderCurrent();
  });
  document.getElementById('filter-priority').addEventListener('change', function () {
    Store.setFilter({ priority: this.value });
    renderCurrent();
  });

  // サイドバーフィルター（ステータス）
  document.querySelectorAll('.sidebar-filter-item[data-filter-status]').forEach(el => {
    el.addEventListener('click', function () {
      Store.setFilter({ status: this.dataset.filterStatus });
      renderCurrent();
    });
  });

  // サイドバーフィルター（優先度）
  document.querySelectorAll('.sidebar-filter-item[data-filter-priority]').forEach(el => {
    el.addEventListener('click', function () {
      Store.setFilter({ priority: this.dataset.filterPriority });
      renderCurrent();
    });
  });

  // TODOソートボタン
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => TodoView.setSort(btn.dataset.sort));
  });

  // Storeの変更を購読
  Store.subscribe(renderCurrent);

  // ========== ガントチャートスクロール同期 ==========
  const ganttScrollArea = document.getElementById('gantt-scroll-area');
  const ganttTaskList   = document.getElementById('gantt-task-list');
  if (ganttScrollArea && ganttTaskList) {
    ganttScrollArea.addEventListener('scroll', function () {
      ganttTaskList.scrollTop = this.scrollTop;
    });
  }

  // ========== 初期表示 ==========
  const view = Store.getView();
  switchView(view.current);

  // スケールボタン初期状態
  document.querySelectorAll('.scale-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.scale === view.ganttScale);
  });

  // サンプルデータ（初回のみ）
  if (Store.getTasks().length === 0) {
    _insertSampleData();
  }
});

function _insertSampleData() {
  const today = new Date();
  function d(offset) {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + offset);
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  }

  Store.addTask({ name: '要件定義・仕様策定',     startDate: d(-10), endDate: d(-3),  status: 'completed',   priority: 'high',   assignee: '山田',   description: '顧客ヒアリングと要件整理' });
  Store.addTask({ name: 'UI/UXデザイン',           startDate: d(-5),  endDate: d(2),   status: 'in_progress', priority: 'high',   assignee: '鈴木',   description: 'ワイヤーフレームとプロトタイプ作成' });
  Store.addTask({ name: 'フロントエンド実装',       startDate: d(0),   endDate: d(10),  status: 'in_progress', priority: 'high',   assignee: '田中',   description: 'React + TypeScriptで実装' });
  Store.addTask({ name: 'バックエンドAPI開発',      startDate: d(2),   endDate: d(12),  status: 'not_started', priority: 'medium', assignee: '佐藤',   description: 'REST API設計・実装' });
  Store.addTask({ name: 'データベース設計',         startDate: d(-2),  endDate: d(4),   status: 'in_progress', priority: 'medium', assignee: '伊藤',   description: 'スキーマ設計とマイグレーション' });
  Store.addTask({ name: 'テスト・QA',              startDate: d(12),  endDate: d(18),  status: 'not_started', priority: 'medium', assignee: '渡辺',   description: '単体・結合・E2Eテスト' });
  Store.addTask({ name: 'ドキュメント整備',         startDate: d(8),   endDate: d(15),  status: 'not_started', priority: 'low',    assignee: '',       description: 'API仕様書・ユーザーガイド作成' });
  Store.addTask({ name: 'リリース準備・本番デプロイ', startDate: d(18), endDate: d(20),  status: 'not_started', priority: 'high',   assignee: '山田',   description: '本番環境セットアップ・デプロイ' });
}
