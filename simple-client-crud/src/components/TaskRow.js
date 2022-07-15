import React from 'react'
import { useDispatch } from 'react-redux';
import { removeTask } from '../redux/reducers/tasks';

const TaskRow = ({ data }) => {
    const { id, task } = data;
    const dispatch = useDispatch();
    const deleteHandle = () => {
        dispatch(removeTask(id))
    }
    return (
        <>
            <td>{id}</td>
            <td>{task}</td>
            <td><button onClick={deleteHandle}>X</button></td>
        </>
    )
}

export default TaskRow