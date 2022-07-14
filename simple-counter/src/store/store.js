import { configureStore } from "@reduxjs/toolkit";
import counterReducer from './reducer';
import balanceReducer from './reducer';


export default configureStore({
    reducer: {
        counter: counterReducer,
    },
    
})