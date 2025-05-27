import '../style/GetLobby.css';
import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@chakra-ui/react"
import { Input } from '@chakra-ui/react';
import LobbySlider from '../subcomponents/LobbySlider';
import { LightMode } from '../ui/color-mode';
import posterArt from '../img/PosterART.png'

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
        if(nickname.length > 13){
          setError('Nick za długi, maksymalnie 13 znaków');
          return;
        }
        setError(null);
        
        navigate(`/lobby/${lobbyId}`, {state: {nickname, lobbyId} });
      }
return (
    <LightMode>
      <div className='LobbyCointainer'>
        <div className='LobbyCointainer-left'>
          <div className='Poster'>
            <div className='Header fonts'>
            <h1> Blef</h1> 
            <p className='fonts'>gra, w której kłamstwo to sztuka!</p>  
            </div>
            <img src={posterArt} alt='Poster'/>
            <div className='Body'>
            <div className='Body-Input-Container'>
            {error && <p className='Error'>{error}</p>}
            <Input className='Body-Input fonts' placeholder='Podaj nick' variant="flushed" value={nickname} onChange={e => setNickname(e.target.value)}></Input>
            </div>
            <Button variant="outline" className='fonts' onClick={handleGetInLobby}> Dołącz do stołu </Button>
            </div>
          </div>
        </div>
        <div className='LobbyCointainer-right'>
          <LobbySlider />
        </div>
      </div>
    </LightMode>
  );
}
export default GetInLobby;