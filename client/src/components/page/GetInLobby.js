import '../style/GameLobby.css';
import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@chakra-ui/react"
import { Input } from '@chakra-ui/react';

function GetInLobby() {
  const { lobbyId } = useParams();
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

    const handleGetInLobby = async () => {
        if(!nickname.trim()) {
          setError('Podaj nick');
          return;
        }
        setError(null);
        
        navigate(`/lobby/${lobbyId}`, {state: {nickname, lobbyId} });
      }
  return (

    <div className='LobbyCointainer'>
      <div className='Header'>
      <h1> Blef</h1> 
      <p className='fonts'>gra, w której kłamstwo to sztuka!</p>  
      </div>
      <div className='Body'>
      <div className='Body-Input-Container'>
      {error && <p className='Error'>{error}</p>}
      <Input className='Body-Input fonts' placeholder='Podaj nick' variant="flushed" value={nickname} onChange={e => setNickname(e.target.value)}></Input>
      </div>
      <Button variant="outline" className='fonts' onClick={handleGetInLobby}> Dołącz do gry </Button>
      </div>
    </div>
  );
}

export default GetInLobby;