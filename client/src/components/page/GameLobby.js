import '../style/GameLobby.css';
import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Button, Icon} from '@chakra-ui/react';
import { Toaster, toaster } from "../ui/toaster";
import { FiLink } from "react-icons/fi";
import { GiSawedOffShotgun } from "react-icons/gi";
import socket from '../subcomponents/socket';
import { LightMode } from '../ui/color-mode';
import { GiSandSnake } from "react-icons/gi";

import QuestionStage from '../subcomponents/QuestionStage';
import ResultStage from '../subcomponents/ResultStage';
import VotingStage from '../subcomponents/QuestionStage';
import PlayerCard from '../subcomponents/PlayerCard';
function GameLobby() {

  const getLocalStorageData = () => {
  try {
    const data = localStorage.getItem('lobbyData');
    return data ? JSON.parse(data) : {};
  } catch (error) {
    return {};
  }
};
  const { lobbyId } = useParams();
  const location = useLocation();
  const state = location.state || getLocalStorageData();
  const {nickname, lobbyId: stateLobbyId } = state;
  const [players, setPlayers] = useState([]);
  const [me, setMe] = useState(null)
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [gameStage, setGameStage] = useState();

  const [question, setQuestion] = useState();
  const [answer, setAnswer] = useState([]);
  
  useEffect( () => {
    if (!nickname || stateLobbyId !== lobbyId) {
      navigate('/', {replace: true})
      return;
    }
    
    // const socket = io.connect('http://localhost:3001', {
    //   transports: ['websocket', 'polling']
    // });

    socket.emit('joinLobby', {lobbyId, nickname});
    socket.on('playerInfo', playerObj => {
      setMe(playerObj);
    });

    socket.on('playerUpdate', players => {
      setPlayers(players);
    });
    socket.on('stageUpdate', gameStage => {
      setGameStage(gameStage);
    })
    return () => {
      socket.off('playerInfo');
      socket.off('playerUpdate');
      socket.off('disconnect');
    };
  }, [])

  const handleGameStart = () => {
    socket.on('connection', (socket) => {
    console.log('User connected: ', socket.id);
  });
    socket.emit('startRound', {lobbyId} );
    socket.on('stageUpdate', gameStage => {
      setGameStage(gameStage);
      console.log(gameStage);
    })
  }
  const handleInviteLink = () => {
    const ipAddres = "localhost:3000";
    // const ipAddres = "192.168.100.119:3000";
    navigator.clipboard.writeText(`http://${ipAddres}/getIn/${lobbyId}`);
    toaster.create({
      title: "Link skopiowany",
      type: "info"
    })
  }
  if (!me) {
    return (
      <p> Łącznie z lobby...</p>
    )
  }
  if (me) {
    localStorage.setItem(
      'lobbyData',
      JSON.stringify({
        lobbyId,
        socketId: me.playerId,
        nickname: me.nickname
      })
    );
  }
  
  switch (gameStage) {
    case 'question':
      return <QuestionStage {...question} />;
    case 'vote':
      return <VotingStage {...answer} />;
    case 'result':
      return <ResultStage />;
    default:
      return (
        <LightMode>
        <div className='GameLobby'> 
          <Toaster />
          <div className='GameLobby-Body'>
            <div className='GameLobby-Header'>
            {me.isHost ? ( 
              <>
              <Button size="lg" onClick={handleInviteLink}>
                Zaproś
                <Icon size="lg" color="#f05053">
                  <FiLink />
                </Icon>
              </Button>
              <h1 className='fonts header'>Saloon Złotego Węża <GiSandSnake /></h1>
              <Button size="lg" onClick={handleGameStart}>
                Zacznij pojedynek
                <Icon size="lg" color="#f05053">
                  <GiSawedOffShotgun />
                </Icon>
              </Button>
              </>
            ) : (
              <>
                <h1 className='fonts header'>Saloon Złotego Węża <GiSandSnake /></h1>
              </>
            )}
            </div>
            <div className='GameLobby-Card'>
                {players
                .filter(p => p.playerId !== null) // filtruje graczy z null ID
                .map(p => (
                  <PlayerCard key={p.playerId} player={p} />
                ))}
            </div>
          </div>
        </div>
        </LightMode>
      );
  }
}

export default GameLobby;
