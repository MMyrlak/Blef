import React, { createContext, useContext, useState, useEffect } from 'react';
import socket from './socket';

const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [gameState, setGameState] = useState({
    stage: 'lobby',
    players: [],
    me: null,
    question: null,
    answers: [],
    roundResult: null,
    answeredCount: 0,
    votedCount: 0,
  });

  useEffect(() => {
    socket.on('playerInfo', (me) => setGameState(prev => ({ ...prev, me })));
    socket.on('playerUpdate', (players) => setGameState(prev => ({ ...prev, players })));
    socket.on('stageUpdate', (stage) => setGameState(prev => ({ ...prev, stage })));
    socket.on('giveQuestion', (q) => setGameState(prev => ({ ...prev, question: q })));
    socket.on('startVoting', (data) => setGameState(prev => ({ ...prev, answers: data.answers })));
    socket.on('roundResult', (res) => setGameState(prev => ({ ...prev, roundResult: res })));
    
    socket.on('playerActionUpdate', (data) => {
      setGameState(prev => ({ 
        ...prev, 
        answeredCount: data.answeredCount ?? prev.answeredCount,
        votedCount: data.votedCount ?? prev.votedCount 
      }));
    });

    socket.on('gameStateRecovered', (data) => {
      setGameState(prev => ({ ...prev, ...data }));
    });

    return () => {
      socket.off('playerInfo');
      socket.off('playerUpdate');
      socket.off('stageUpdate');
      socket.off('playerActionUpdate');
      socket.off('gameStateRecovered');
    };
  }, []);

  return (
    <GameContext.Provider value={{ gameState, setGameState }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => useContext(GameContext);