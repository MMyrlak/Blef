import '../style/GetLobby.css';
import React, { useState } from 'react';
import { Button } from "@chakra-ui/react"
import { useNavigate } from 'react-router-dom';
import { Input } from '@chakra-ui/react';
import axios from 'axios';
import LobbySlider from '../subcomponents/LobbySlider';
import { LightMode } from '../ui/color-mode';
import posterArt from '../img/PosterART.png'

function GetLobby() {
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleCreateLobby = async () => {
        if(!nickname.trim()) {
          setError('Podaj nick');
          return;
        }
        if(nickname.length > 13){
          setError('Nick za długi, maksymalnie 13 znaków');
          return;
        }
        setError(null);

        try {
          const res = await axios.post(`${process.env.REACT_APP_BACKEND_IP}/api/lobby/create`, {
            name: nickname
          });
          const {lobbyId} = res.data;
          navigate(`/lobby/${lobbyId}`, {state: {nickname, lobbyId} });
        } catch (err) {
           console.error(err);
           setError(err.response?.data?.error || "Błąd serwera Front");
        }
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
            <Button variant="outline" className='fonts' onClick={handleCreateLobby}> Zacznij grę </Button>
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

export default GetLobby;
