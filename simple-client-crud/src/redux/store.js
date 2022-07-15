import {configureStore} from '@reduxjs/toolkit'
import tasksReducer from './reducers/tasks'


export default configureStore({
    reducer: {
        tasks: tasksReducer
    }
})