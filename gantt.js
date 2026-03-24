/**
 * gantt.js — ガントチャートビューのレンダリング
 */
window.GanttView = (function () {
  const DAY_MS = 86400000;

  // ========== 日付ユーティリティ ==========

  function _parseDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  function _dateToStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function _today() {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function _addDays(d, n) {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  }

  function _daysBetween(a, b) {
    return Math.round((b - a) / DAY_MS);
  }

  // ========== スケール設定 ==========

  function _getScaleConfig(scale) {
    if (scale === 'month') {
      return { totalDays: 60, cellWidth: 30 };  // 2ヶ月分
    }
    return { totalDays: 28, cellWidth: 44 };    // 4週間
  }

  // ========== ガントチャート描画 ==========

  function render() {
    const tasks     = Store.getTasks();
    const filter    = Store.getFilter();
    const view      = Store.getView();
    const scale     = view.ganttScale;
    const startStr  = Store.getGanttStartDate();
    const startDate = _parseDate(startStr);
    const config    = _getScaleConfig(scale);
    const today     = _today();

    // フィルター適用
    const filtered = Filter.applyFilter(tasks, filter);

    // 表示範囲の日付配列を生成
    const dates = [];
    for (let i = 0; i < config.totalDays; i++) {
      dates.push(_addDays(startDate, i));
    }

    // タスク列
    const taskCol      = document.getElementById('gantt-task-list');
    // グリッド
    const dateHeader   = document.getElementById('gantt-date-header');
    const ganttBody    = document.getElementById('gantt-body');

    if (!taskCol || !dateHeader || !ganttBody) return;

    // ナビゲーションラベル更新
    _updateNavLabel(startDate, _addDays(startDate, config.totalDays - 1), scale);

    // 幅を設定
    const totalWidth = config.totalDays * config.cellWidth;
    ganttBody.style.width = totalWidth + 'px';
    dateHeader.style.width = totalWidth + 'px';

    // --- 日付ヘッダー描画 ---
    _renderDateHeader(dateHeader, dates, config, today);

    // --- タスク列とボディ描画 ---
    if (filtered.length === 0) {
      taskCol.innerHTML = '<div class="gantt-empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg><span>タスクがありません</span></div>';
      ganttBody.innerHTML = '';
      return;
    }

    // タスク行のHTML
    let taskHTML = '';
    let bodyHTML = '';

    filtered.forEach((task, idx) => {
      const isCompleted = task.status === 'completed';

      // タスク名セル
      taskHTML += `
        <div class="gantt-task-item" data-task-id="${task.id}">
          <div class="gantt-task-name ${isCompleted ? 'completed' : ''}" title="${_esc(task.name)}">${_esc(task.name)}</div>
          <div class="gantt-task-actions">
            <button class="btn btn-ghost btn-icon btn-sm" onclick="Modal.open('${task.id}')" data-tooltip="編集">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
        </div>
      `;

      // ガントバー行
      const barInfo = _calcBar(task, startDate, config.totalDays, config.cellWidth);
      const priorityClass = task.priority.replace('_', '-');
      const statusClass   = task.status.replace('_', '-');

      let barContent = '';
      if (barInfo.visible && barInfo.width > 20) {
        barContent = _esc(task.name);
      }

      const popup = `${_esc(task.name)}<br>${_formatDate(task.startDate)} 〜 ${_formatDate(task.endDate)}`;

      bodyHTML += `<div class="gantt-row">`;
      // セル（背景グリッド）
      dates.forEach(d => {
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const isToday   = _daysBetween(today, d) === 0;
        let cls = 'gantt-cell';
        if (isWeekend) cls += ' weekend';
        if (isToday)   cls += ' today-col';
        bodyHTML += `<div class="${cls}" style="width:${config.cellWidth}px"></div>`;
      });

      if (barInfo.visible) {
        bodyHTML += `
          <div class="gantt-bar-wrapper">
            <div class="gantt-bar ${priorityClass} ${statusClass}"
                 style="left:${barInfo.left}px; width:${barInfo.width}px"
                 onclick="Modal.open('${task.id}')"
                 title="${_esc(task.name)} | ${_formatDate(task.startDate)} 〜 ${_formatDate(task.endDate)}">
              ${barContent}
            </div>
          </div>
        `;
      }

      bodyHTML += `</div>`;
    });

    taskCol.innerHTML = taskHTML;
    ganttBody.innerHTML = bodyHTML;

    // 今日のライン
    _renderTodayLine(ganttBody, startDate, config, today);
  }

  function _renderDateHeader(container, dates, config, today) {
    let monthHTML = '';
    let dayHTML   = '';

    // 月ヘッダー（連続する月をまとめる）
    let curMonth = -1, curMonthStart = 0, monthCount = 0;
    const months = [];
    dates.forEach((d, i) => {
      const m = d.getMonth();
      if (m !== curMonth) {
        if (curMonth !== -1) {
          months.push({ label: `${dates[curMonthStart].getFullYear()}年${curMonth+1}月`, count: monthCount });
        }
        curMonth = m;
        curMonthStart = i;
        monthCount = 1;
      } else {
        monthCount++;
      }
    });
    months.push({ label: `${dates[curMonthStart].getFullYear()}年${curMonth+1}月`, count: monthCount });

    months.forEach(m => {
      monthHTML += `<div class="gantt-month-cell" style="width:${m.count * config.cellWidth}px">${m.label}</div>`;
    });

    // 日ヘッダー
    const dayNames = ['日','月','火','水','木','金','土'];
    dates.forEach(d => {
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const isToday   = _daysBetween(today, d) === 0;
      let cls = 'gantt-day-cell';
      if (isWeekend) cls += ' weekend';
      if (isToday)   cls += ' today';
      dayHTML += `
        <div class="${cls}" style="width:${config.cellWidth}px">
          <span class="gantt-day-num">${d.getDate()}</span>
          <span class="gantt-day-name">${dayNames[d.getDay()]}</span>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="gantt-month-row">${monthHTML}</div>
      <div class="gantt-day-row">${dayHTML}</div>
    `;
  }

  function _calcBar(task, viewStart, totalDays, cellWidth) {
    const taskStart = _parseDate(task.startDate);
    const taskEnd   = _parseDate(task.endDate);
    const viewEnd   = _addDays(viewStart, totalDays - 1);

    // 完全に範囲外
    if (taskEnd < viewStart || taskStart > viewEnd) {
      return { visible: false };
    }

    const clampedStart = taskStart < viewStart ? viewStart : taskStart;
    const clampedEnd   = taskEnd   > viewEnd   ? viewEnd   : taskEnd;

    const leftDays  = _daysBetween(viewStart, clampedStart);
    const widthDays = _daysBetween(clampedStart, clampedEnd) + 1;

    return {
      visible: true,
      left:  leftDays  * cellWidth + 2,
      width: widthDays * cellWidth - 4
    };
  }

  function _renderTodayLine(container, viewStart, config, today) {
    const dayOffset = _daysBetween(viewStart, today);
    if (dayOffset < 0 || dayOffset >= config.totalDays) return;

    const leftPx = dayOffset * config.cellWidth + config.cellWidth / 2;
    const line = document.createElement('div');
    line.className = 'gantt-today-line';
    line.style.left = leftPx + 'px';
    container.appendChild(line);
  }

  function _updateNavLabel(start, end, scale) {
    const label = document.getElementById('gantt-range-label');
    if (!label) return;
    const fmt = d => `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
    label.textContent = `${fmt(start)} 〜 ${fmt(end)}`;
  }

  function _syncScroll() {
    const taskList   = document.getElementById('gantt-task-list');
    const scrollArea = document.getElementById('gantt-scroll-area');
    if (!taskList || !scrollArea) return;

    scrollArea.removeEventListener('scroll', _onGanttScroll);
    scrollArea.addEventListener('scroll', _onGanttScroll);
  }

  function _onGanttScroll(e) {
    const taskList = document.getElementById('gantt-task-list');
    if (taskList) taskList.scrollTop = e.target.scrollTop;
  }

  // ========== ナビゲーション ==========

  function navigate(direction) {
    const view     = Store.getView();
    const config   = _getScaleConfig(view.ganttScale);
    const startStr = Store.getGanttStartDate();
    const startDate = _parseDate(startStr);
    const step = direction === 'prev' ? -config.totalDays : config.totalDays;
    const newStart = _addDays(startDate, step);
    Store.setGanttStartDate(_dateToStr(newStart));
    render();
  }

  function goToToday() {
    Store.setGanttStartDate(_dateToStr(_today()));
    render();
  }

  // ========== 共通ユーティリティ ==========

  function _syncScroll() {} // app.js で管理

  function _onGanttScroll() {}

  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _formatDate(str) {
    if (!str) return '';
    const [y, m, d] = str.split('-');
    return `${y}/${m}/${d}`;
  }

  return { render, navigate, goToToday };
})();
