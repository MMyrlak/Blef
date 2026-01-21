import '../style/GetLobby.css';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@chakra-ui/react"
import { Input } from '@chakra-ui/react';
import { LightMode } from '../ui/color-mode';
import posterArt from '../img/PosterART.png'

function GetInLobby() {
    const { lobbyId } = useParams();
    const [nickname, setNickname] = useState('');
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // 1. AUTOMATYCZNE SPRAWDZANIE PRZY WEJŚCIU
    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem('lobbyData') || '{}');
        
        // Jeśli lobbyId się zgadza i mamy zapisany nick, leć od razu do gry
        if (stored.lobbyId === lobbyId && stored.nickname) {
            navigate(`/lobby/${lobbyId}`, { 
                state: { nickname: stored.nickname, lobbyId },
                replace: true 
            });
        }
    }, [lobbyId, navigate]);

    const handleGetInLobby = () => {
        if(!nickname.trim()) {
            setError('Podaj nick');
            return;
        }
        if(nickname.length > 13){
            setError('Nick za długi, maksymalnie 13 znaków');
            return;
        }
        setError(null);
        
        // 2. ZAPISZ DANE, ABY NASTĘPNYM RAZEM WEJŚĆ AUTOMATYCZNIE
        localStorage.setItem('lobbyData', JSON.stringify({ lobbyId, nickname }));

        navigate(`/lobby/${lobbyId}`, { state: { nickname, lobbyId } });
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
                                <Input 
                                    className='Body-Input fonts' 
                                    placeholder='Podaj nick' 
                                    variant="flushed" 
                                    value={nickname} 
                                    onChange={e => setNickname(e.target.value)}
                                />
                            </div>
                            <Button variant="outline" className='fonts' onClick={handleGetInLobby}> 
                                Dołącz do stołu 
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </LightMode>
    );
}

export default GetInLobby;