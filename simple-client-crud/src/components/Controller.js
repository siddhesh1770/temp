import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux';
import { addTask } from '../redux/reducers/tasks';

const Controller = () => {
  const [task, setTask] = useState();
  const { tasks } = useSelector(state => state)
  const dispatch = useDispatch();
  const onClickHandler = (e) => {
    e.preventDefault()
    const newTask = document.getElementById("newtask")
    dispatch(addTask(newTask.value))
  }
  const onChangeHandler = (e) => {
    setTask(e.target.value);
  }
  return (
    <div>
      <form>
        <input id='newtask' onChange={(e) => onChangeHandler(e)} type="text" placeholder="Enter task" />
        <button type='submit' onClick={(e) => {
          onClickHandler(e);
        }}>Save</button>
      </form>
    </div>
  )
}

export default Controller