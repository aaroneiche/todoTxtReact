import React, { Component } from 'react';
import './App.css';

var stringToDate = function(inputDate){

    //remove existing special tag, if it exists
    var d = (inputDate.length > 10)? inputDate.split(":")[1] : inputDate;
    var da = d.split("-");
    return new Date(da[0],da[1]-1,da[2]);
}

var taskParser = {
  parseDone: function(task){
    let done = task.raw.match(/^x /);
    if(done != null){
      task.done = true;
    }else{
      task.done = false;
    }
    return task;
  },
  parsePriority: function(task){
    let priority = task.raw.match(/\(([A-Z])\)/);
    if(priority != null){
      task.priority = priority[1];
      task.clean = task.clean.split(priority[0])[1]
    }else{
      task.priority = "";
    }

    return task;
  },
  parseDates: function(task){

    let dates = task.raw.match(/^x? ?(?:\(.\))? ?(\d{4}-\d{2}-\d{2}) (\d{4}-\d{2}-\d{2})?/);

    if(dates !== null) {

      if(dates[2] !== undefined){
        //Creation & completion
        task.completion = stringToDate(dates[1]);
        task.creation = stringToDate(dates[2]);
        // task.clean = task.clean.substring(1,pos) + task.clean.substring(pos + 11, task.clean.length);
        let pos = task.clean.indexOf(dates[1]);
        task.clean = (task.clean.substring(0,pos) + task.clean.substring(pos + 21, task.clean.length)).trim();

      }else{
        //Just the creation date.
        task.creation = stringToDate(dates[1]);

        let pos = task.clean.indexOf(dates[1]);
        task.clean = (task.clean.substring(0,pos) + task.clean.substring(pos + 11, task.clean.length)).trim();
      }
    }
    return task;
  },
  parseProjects: function(task){
    var projects = task.raw.match(/(\+.+?\b)/g);
    if(projects != null){
       task.projects = [];
        for(let i = 0; i < projects.length; i++){
          task.projects.push(projects[i].substring(1,projects[i].length));
        }
    }
    return task;
  },
  parseContexts: function(task){
    var contexts = task.raw.match(/(@.+?\b)/g);
    if(contexts != null){
       task.contexts = [];
        for(let i = 0; i < contexts.length; i++){
          task.contexts.push(contexts[i].substring(1,contexts[i].length));
        }
    }
    return task;
  },
  parseDue: function(task){
    var dueDate = task.raw.match(/due:\d{4}-\d{2}-\d{2}/);
    if(dueDate != null){
        task.due = stringToDate(dueDate[0]);
        task.clean = task.clean.replace(dueDate[0],"");
    }


    return task;
  },
  parseThreshold: function(task){
    var thresholdDate = task.raw.match(/t:\d{4}-\d{2}-\d{2}/);
    if(thresholdDate != null){
        task.threshold = stringToDate(thresholdDate[0]);
        task.clean = task.clean.replace(thresholdDate[0],"");
    }

    return task;
  },
  /*
  TODO:
  parse due date
  parse threshold
  */

  parseTask: function(task){
    let taskObject = {
      raw: task,
      clean: task
    }
    taskObject = this.parsePriority(taskObject);
    taskObject = this.parseDone(taskObject);
    taskObject = this.parseDates(taskObject);
    taskObject = this.parseProjects(taskObject);
    taskObject = this.parseContexts(taskObject);
    taskObject = this.parseDue(taskObject);
    taskObject = this.parseThreshold(taskObject);

    return taskObject;
  }
}

var dropbox = require('dropbox');
var dbx = new dropbox({ accessToken: 'XFPdWJ3F-p4AAAAAAAAJWqM8Udy4H2drBW0HvzlkNnCzDoH8PUFoqm3S-Z6OD243' });

var getFileData = function(file){
  console.log("getting File data");

  return new Promise(function(resolve,reject){
    let f = new FileReader();

    f.onerror = function(){
      console.log("cannot read file");
    }

    f.onloadend = function(){
        resolve(f.result);
    }

    f.readAsText(file);
  })
}

class App extends Component {
  render() {
    return (
      <div className="App">
        <TodoList />
      </div>
    );
  }
}

class TodoList extends Component {
  constructor() {
    super();
    this.state = {
      itemSet:[]
    }
  }
  componentDidMount(){

    let _this = this;

    dbx.filesDownload({path: "/Development/todoTest.txt"})
    .then(function(fileData){
      // console.log(fileData);
      return getFileData(fileData.fileBlob);
    },function(err){ throw new Error("Bad Bad Bad") })
    .then(function(fileData){

        let rawTasks = fileData.split("\n");
        var processed = [];

        for(let item = 0; item < rawTasks.length; item++){
          var t = taskParser.parseTask(rawTasks[item]);
          processed.push(t);
        }

        _this.setState({
          itemSet: processed
        });

        // throw new Error("This is bad!");
    },function(err){ throw new Error("Bad Bad Bad") })
    .catch(function(error){
      console.error(error)
    })
  }
  render() {
    let todoItems = this.state.itemSet.map(function(t){
      return <TodoItem item={t}/>;
    })
    return <ul>
        {todoItems}
      </ul>
  }
}

class TodoItem extends Component {

  render() {
    let t = this.props.item;
    var done = "";
    if(t.done){
      done = "done";
    }
    return (
      <li className={done} ><b>{t.priority}</b> {t.clean}<br/></li>
    )
  }
}

export default App;
