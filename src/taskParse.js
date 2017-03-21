taskParser = {

  priority: function(task){
    let priority = cleanTask.match(/^\(([A-Z])\)/)
    task.priority = priority[1];
    return task;
  }


}

module.exports = taskParser;
