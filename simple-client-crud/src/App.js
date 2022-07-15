import './App.css';
import {Navbar, Table, Controller} from './components/index'

function App() {
  return (
    <div className="App">
      <Navbar />
      <Controller />
      <br /> <br />
      <Table />
    </div>
  );
}

export default App;