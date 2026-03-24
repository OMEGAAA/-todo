/**
 * filter.js — フィルタリング・ソートロジック
 */
window.Filter = (function () {

  function applyFilter(tasks, filter) {
    return tasks.filter(task => {
      if (filter.status !== 'all' && task.status !== filter.status) return false;
      if (filter.priority !== 'all' && task.priority !== filter.priority) return false;
      if (filter.assignee && task.assignee !== filter.assignee) return false;
      return true;
    });
  }

  function sortTasks(tasks, sortKey, sortDir) {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...tasks].sort((a, b) => {
      switch (sortKey) {
        case 'startDate':
          return dir * a.startDate.localeCompare(b.startDate);
        case 'endDate':
          return dir * a.endDate.localeCompare(b.endDate);
        case 'priority': {
          const order = { high: 0, medium: 1, low: 2 };
          return dir * (order[a.priority] - order[b.priority]);
        }
        case 'status': {
          const order = { in_progress: 0, not_started: 1, completed: 2 };
          return dir * (order[a.status] - order[b.status]);
        }
        case 'name':
          return dir * a.name.localeCompare(b.name, 'ja');
        default:
          return dir * a.createdAt.localeCompare(b.createdAt);
      }
    });
  }

  function getFilteredAndSorted(tasks, filter, sortKey, sortDir) {
    const filtered = applyFilter(tasks, filter);
    return sortTasks(filtered, sortKey, sortDir);
  }

  return { applyFilter, sortTasks, getFilteredAndSorted };
})();
