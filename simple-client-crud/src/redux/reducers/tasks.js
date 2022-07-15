import { createSlice } from "@reduxjs/toolkit";

export const tasksSlice = createSlice({
    name: "tasks",
    initialState: {
        tasks: []
    },
    reducers: {
        addTask: (state, action) => {
            const temp = {}
            temp.id = state.tasks.length + 1;
            temp.task = action.payload;
            state.tasks.push(temp)
        },
        removeTask: (state, action) => {
            const temp = [...state.tasks]
            const newTasks = temp.filter((data) => {
                return data.id !== parseInt(action.payload)
            })
            state.tasks = newTasks
        }
    }
})

export const { addTask, removeTask } = tasksSlice.actions;
export default tasksSlice.reducer;