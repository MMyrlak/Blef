import '../style/GetLobby.css';
import React, { useState } from 'react';
import { Button } from "@chakra-ui/react"
import { useNavigate } from 'react-router-dom';
import { Input } from '@chakra-ui/react';
import axios from 'axios';
import { LightMode } from '../ui/color-mode';
import posterArt from '../img/PosterART.png'

function GetLobby() {
  const [nickname, setNickname] = useState('');
    const navigate = useNavigate();

      const handleCreateLobby = async () => {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname.includes('192.168');
      
      const BACKEND_URL = isLocal 
        ? `http://${window.location.hostname}:3001` 
        : "https://twoja-nazwa-na-render.onrender.com";

      try {
          const res = await axios.post(`${BACKEND_URL}/api/lobby/create`, {
              nickname: nickname
          });
          const {lobbyId} = res.data;
          navigate(`/lobby/${lobbyId}`, {state: {nickname, lobbyId} });
        } catch (error) {
        console.error("Błąd podczas tworzenia lobby:", error);
          }
      };
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
            <Input className='Body-Input fonts' placeholder='Podaj nick' variant="flushed" value={nickname} onChange={e => setNickname(e.target.value)}></Input>
            </div>
            <Button variant="outline" className='fonts' onClick={handleCreateLobby}> Zacznij grę </Button>
            </div>
          </div>
        </div>
      </div>
    </LightMode>
  );
}

export default GetLobby;
