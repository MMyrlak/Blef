import '../style/GameLobby.css';
import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Button, Icon } from '@chakra-ui/react';
import { Toaster, toaster } from "../ui/toaster";
import axios from 'axios';
import { FiLink } from "react-icons/fi";
// import io from 'socket.io-client'
import socket from '../subcomponents/socket';

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
    return () => {
      socket.off('playerInfo');
      socket.off('playerUpdate');
      socket.off('disconnect');
    };
  }, [])


  const handleInviteLink = () => {
    navigator.clipboard.writeText(`http://localhost:3000/getIn/${lobbyId}`);
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
  
  console.log(players);
  return (
        <div style={{ padding: '2rem' }}>
          <Toaster />
          {error ? <p> {error} </p> : null}
      <h2>Lobby: {lobbyId}</h2>
      {me.isHost ? (
        <Button onClick={handleInviteLink}> Zaproś  
          <Icon size="lg" color="#f05053">
            <FiLink />
          </Icon>
        </Button>
      ) : null}
      <ul>
        {players.map(p => (
          <li key={p.id}>
           Name: {p.nickname} {p.id === me.id && <em>(Ty)</em>} ID: {p.id} {p.isHost && <strong>[host]</strong>}
          </li>
        ))}
      </ul>
      {/* ...tutaj później przycisk startRound dla hosta itd. */}
    </div>
    );
}

export default GameLobby;
