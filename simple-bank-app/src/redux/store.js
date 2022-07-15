import { configureStore } from '@reduxjs/toolkit'
import bankReducer from './reducers/bank/index'


export default configureStore({
    reducer: {
        bank: bankReducer
    }
})