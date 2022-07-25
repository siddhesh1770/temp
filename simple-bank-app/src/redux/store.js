import { configureStore } from "@reduxjs/toolkit";
import bankReducer from "./reducers/bank/index";

export default configureStore({
  reducer: {
    bank: bankReducer,
  },
});

const hell = {
  a: "published",
  msg: [
    {
      T: "O",
      GD: "25072022",
      GT: "063738",
      F: 3,
      G: "1832.5555 N,07354.8414 E",
      NS: 8,
      HD: 0.0,
      DP: 0.7,
      DC: 1,
      DC3: 2213,
      ALT: 557.6,
      SP: 0,
      ST: 24,
      REG: "1,1",
      MTP: "22,1,0,1,0",
      SIM: 2,
    },
  ],
  t: 1658731064021,
  c: "868960065153104",
  tp: "obd",
};
