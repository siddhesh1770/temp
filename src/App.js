import { useDispatch, useSelector } from 'react-redux';
import './App.css';
import React from 'react';
import {decrement, increment} from './store/reducer'
import Bottom from './components/Bottom';


function App() {
  const count = useSelector((state) => state.counter.value)
  const dispatch = useDispatch()
  return (
    <div className="App">
      <div>
        <h1>{count}</h1>
      </div>
      <div>
        <button onClick={
          () => dispatch(increment())
        }>+</button>
        <button onClick={
          () => dispatch(decrement())
        }>-</button>
      </div>
        <br></br>
      <Bottom />
    </div>
  );
}

export default App;
