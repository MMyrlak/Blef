import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './components/style/Global.css';
import GetLobby from './components/page/GetLobby';
import GameLobby from './components/page/GameLobby';
import GetInLobby from './components/page/GetInLobby';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<GetLobby />} />
        <Route path="/lobby/:lobbyId" element={<GameLobby />} />
        <Route path='/getIn/:lobbyId' element={<GetInLobby />} />
      </Routes>
    </Router>
  );
}

export default App;
