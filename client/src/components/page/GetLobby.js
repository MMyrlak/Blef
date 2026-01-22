import '../style/GetLobby.css';
import React, { useState, useEffect } from 'react';
import { Button } from "@chakra-ui/react"
import { useNavigate } from 'react-router-dom';
import { Input } from '@chakra-ui/react';
import axios from 'axios';
import { LightMode } from '../ui/color-mode';
import posterArt from '../img/PosterART.png'

function GetLobby() {
  const [nickname, setNickname] = useState('');
  const navigate = useNavigate();
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname.includes('192.168');
      
      const BACKEND_URL = isLocal 
        ? `http://${window.location.hostname}:3001` 
        : "https://blef-7tj3.onrender.com";

      const handleCreateLobby = async () => {
      
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

      const [isBackendReady, setIsBackendReady] = useState(false);
      const [isWakingUp, setIsWakingUp] = useState(false);

      useEffect(() => {
    const wakeUpServer = async () => {
      try {
        await axios.get(`${BACKEND_URL}/health`, { timeout: 5000 });
        setIsBackendReady(true);
        setIsWakingUp(false);
      } catch (error) {
        setIsWakingUp(true);
        setTimeout(wakeUpServer, 3000);
      }
    };

    wakeUpServer();
  }, [BACKEND_URL]);

return (
    <LightMode>
      <div className='LobbyCointainer'>
        <div className='LobbyCointainer-left'>
          <div className='Poster'>
            <div className='Header fonts'>
              <h1>Blef</h1> 
              <p className='fonts'>gra, w której kłamstwo to sztuka!</p>  
            </div>
            
            <img src={posterArt} alt='Poster'/>

            <div className='Body'>
              {!isBackendReady && isWakingUp ? (
                <div className='WakingUpContainer'>
                  <p className='fonts opening-text'>Salon się otwiera...</p>
                  <span className='fonts opening-subtext'>Szeryf przygotowuje karty (ok. 60s)</span>
                  <div className="tumbleweed-loader"></div>
                </div>
              ) : (
                <>
                  <div className='Body-Input-Container'>
                    <Input 
                      className='Body-Input fonts' 
                      placeholder='Podaj nick' 
                      variant="flushed" 
                      value={nickname} 
                      onChange={e => setNickname(e.target.value)}
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    className='fonts start-button' 
                    onClick={handleCreateLobby}
                    isDisabled={!isBackendReady}
                  > 
                    Zacznij grę 
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </LightMode>
  );
};

export default GetLobby;
