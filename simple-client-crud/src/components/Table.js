import React from 'react'
import { useSelector } from 'react-redux'
import TaskRow from './TaskRow'

const Table = () => {
  const { tasks } = useSelector(state => state.tasks)
  return (
    <div>
      <table>
        <thead>
          <tr>
            <th>Sr. No.</th>
            <th>Task</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody>
          {
            (tasks.length === 0) ? <h4>No data available</h4> :
            tasks.map((item) => {
              return (
                <tr key={item.id}>
                  <TaskRow data={item}/>
                </tr>
              )
            })
          }
        </tbody>
      </table>
    </div>
  )
}

export default Table