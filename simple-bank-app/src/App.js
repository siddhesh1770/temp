import './App.css';
import Balance from './components/Balance';

function App() {
  return (
    <div className="App">
      <h1>
        Bank of Siddhesh
      </h1>
      <input type="number"></input>
      <button>Withdraw</button>
      <button>Deposit</button>
      <br /><br /><br />
      <Balance />
    </div>
  );
}

export default App;
