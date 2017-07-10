import uuid from 'uuid';

const createTaskPool = () => {
  const tasks = {};

  const addTask = (type, createPromise) => {
    const task = {
      id: uuid(),
      type,
      active: true,
      abort: () => {
        if (task.active) {
          task.active = false;
          delete tasks[task.id];
        }
      },
    };
    const complete = (arg, isError) => {
      if (task.active) {
        task.abort();
        return isError ? Promise.reject(arg) : arg;
      }
      return Promise.reject(new Error('Task cancelled'));
    };
    task.promise = createPromise(() => !task.active).then(
      result => complete(result),
      err => complete(err, true)
    );
    tasks[task.id] = task;
    return task;
  };

  const abortAllTasks = () => (
    Object.keys(tasks).forEach(id => tasks[id].abort())
  );

  const abortAllOtherTasks = ignoreId => (
    Object.keys(tasks)
      .filter(id => id !== ignoreId)
      .forEach(id => tasks[id].abort())
  );

  const abortTasksOfType = type => (
    Object.keys(tasks)
      .filter(id => tasks[id].type === type)
      .forEach(id => tasks[id].abort())
  );

  const hasTaskOfType = type => (
    Object.keys(tasks).some(id => tasks[id].type === type)
  );

  return {
    addTask,
    abortAllTasks,
    abortAllOtherTasks,
    abortTasksOfType,
    hasTaskOfType,
  };
};

export default { createTaskPool };
