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
  constructor(){
    super();
    this.state = {
      filterValue: ""
    }
    this.handleFilter = this.handleFilter.bind(this);
    this.writeToFile = this.writeToFile.bind(this);
  }

  handleFilter(val){
    this.setState({filterValue: val})
  }

  writeToFile(valToUpdate) {
    console.log("going to write " + valToUpdate);
  }


  render() {
    return (
      <div className="App">
        <Search passUp={this.handleFilter} />
        <TodoList filterData={this.state.filterValue} passToFile={this.writeToFile}/>
      </div>
    );
  }
}

class Search extends Component {
  constructor() {
    super();
    this.state = {
      filterString: "test"
    }

    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event) {
    this.setState({filterString: event.target.value});
    this.props.passUp(event.target.value);
  }

  render(){
    return (
      <div>
        <label>Filter</label>
        <input type="text" name="filter" onChange={this.handleChange}/>
      </div>
    )
  }
}

class TodoList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      itemSet:[]
    }
    this.passToFile = this.passToFile.bind(this);
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
          if(rawTasks[item].length === 0) continue;
          var t = taskParser.parseTask(rawTasks[item]);
          t.order = item;
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

  passToFile(valToPass){
    this.props.passToFile(valToPass);
  }

  render() {
    let _this = this;

    const filteredItemSet = this.state.itemSet
      .filter(function(t){
        let reg = new RegExp(_this.props.filterData,'i');
        let match = t.raw.match(reg) != null;
        return (match);
      })

      //Sort by priority
      filteredItemSet.sort(function(a,b){
        if(a.priority < b.priority) return -1;
        if(a.priority > b.priority) return 1;
        return 0;
      });

    let todoItems = filteredItemSet.map(function(t){
      return <TodoItem key={t.order} item={t} passToFile={_this.passToFile} />;
    })
    return <ul>
        {todoItems}
      </ul>
  }
}

class TodoItem extends Component {
  constructor(props){
    super(props);
    this.state = this.props.item;

    this.checkboxHandler = this.checkboxHandler.bind(this);
    this.toggleHandler = this.toggleHandler.bind(this);
    this.editHandler = this.editHandler.bind(this);
    this.keyHandler = this.keyHandler.bind(this);
  }

  checkboxHandler(event) {
    var done = event.target.checked;
    this.setState({
      done: done
    });
    this.props.passToFile((done)? "x " + this.state.raw: this.state.raw);
  }

  toggleHandler(event){
    this.setState({edit:!this.state.edit});
  }

  keyHandler(event){
    if(event.charCode == 27){
      console.log("Escape");
    }else if(event.charCode == 13){
      console.log("Return");
      this.props.passToFile(this.state.raw);
    }
  }

  editHandler(event){
    console.log(event.target.value);
    this.setState({raw:event.target.value});
  }

  render() {
    var done = (this.state.done)? "done" : "";
    const editing = this.state.edit;
    return (
      <li className={done} >
        {!editing ? (
          <div>
            <input type="checkbox" checked={this.state.done} onChange={this.checkboxHandler}/>
            <b>{this.state.priority}</b>
            <span onDoubleClick={this.toggleHandler}> {this.state.clean}</span>
          </div>
        ) : (
          <div>
            <input className="editRaw" value={this.state.raw} onDoubleClick={this.toggleHandler} onKeyPress={this.keyHandler} onChange={this.editHandler} />
            <br />
          </div>
        )}
      </li>
    )
  }
}

export default App;
