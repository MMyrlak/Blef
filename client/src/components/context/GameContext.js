import React, { createContext, useContext, useState, useEffect } from 'react';
import socket from '../subcomponents/socket';

const GameContext = createContext();

export const GameProvider = ({ children }) => {
    const [gameData, setGameData] = useState({
        stage: 'lobby',
        players: [],
        me: null,
        question: null,
        answers: [],
        roundResult: null,
        answeredCount: 0,
        votedCount: 0
    });

    useEffect(() => {
        socket.on('playerUpdate', (players) => {
            setGameData(prev => ({ ...prev, players }));
        });

        socket.on('stageUpdate', (stage) => {
            setGameData(prev => ({ ...prev, stage }));
        });

        socket.on('playerActionUpdate', (data) => {
            setGameData(prev => ({ 
                ...prev, 
                answeredCount: data.answeredCount, 
                votedCount: data.votedCount 
            }));
        });

        return () => socket.off();
    }, []);

    return (
        <GameContext.Provider value={{ gameData, setGameData }}>
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => useContext(GameContext);