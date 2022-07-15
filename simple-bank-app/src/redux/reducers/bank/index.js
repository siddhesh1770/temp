import { createSlice } from "@reduxjs/toolkit";

export const bankSlice = createSlice({
    name: "bank",
    initialState: {
        accounts: []
    },
    reducers: {
        createAccount: (state, action) => {
            console.log("hello from reducer")
        },
        deposit: (state, action) => {
            console.log("hello from reducer")
        },
        withdraw: (state, action) => {
            console.log("hello from reducer")
        },
        closeAccount: (state, action) => {
            console.log("hello from reducer")
        }
    }
});

export const { createAccount, deposit, withdraw, closeAccount } = bankSlice.actions;
export default bankSlice.reducer;