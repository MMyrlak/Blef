import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import GetLobby from './components/page/GetLobby';
import CreateLobby from './components/page/CreateLobby';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GetLobby />} />
        <Route path="/createLobby" element={<CreateLobby />} />
      </Routes>
    </Router>
  );
}

export default App;
