import '../style/GameLobby.css';
import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@chakra-ui/react';
import { Toaster, toaster } from "../ui/toaster";
import { FiLink, FiXCircle } from "react-icons/fi";
import { GiSawedOffShotgun } from "react-icons/gi";
import socket from '../subcomponents/socket';
import { LightMode } from '../ui/color-mode';

import QuestionStage from '../subcomponents/QuestionStage';
import ResultStage from '../subcomponents/ResultStage';
import VotingStage from '../subcomponents/VotingStage';
import PlayerCard from '../subcomponents/PlayerCard';

function GameLobby() {
  const { lobbyId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [players, setPlayers] = useState([]);
  const [me, setMe] = useState(null);
  const [gameStage, setGameStage] = useState('lobby');
  
  const [question, setQuestion] = useState(null);
  const [questionForAll, setQuestionForAll] = useState(null);
  const [answer, setAnswer] = useState([]);
  const [roundResult, setRoundResult] = useState(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [votedCount, setVotedCount] = useState(0);

  useEffect(() => {
    const stateNickname = location.state?.nickname;
    const storedData = JSON.parse(localStorage.getItem('lobbyData') || '{}');
    const nickname = stateNickname || (storedData.lobbyId === lobbyId ? storedData.nickname : null);

    if (!nickname) {
      navigate('/', { replace: true });
      return;
    }

    localStorage.setItem('lobbyData', JSON.stringify({ lobbyId, nickname }));

    socket.emit('joinLobby', { lobbyId, nickname });
    socket.emit('getGameState', { lobbyId });

    socket.on('playerInfo', playerObj => {
        setMe(playerObj);
    });

    socket.on('playerUpdate', (updatedPlayers) => {
        setPlayers(updatedPlayers);
    });
    
    socket.on('stageUpdate', stage => {
      setGameStage(stage);

      if (stage === 'lobby') {
        setAnsweredCount(0);
        setVotedCount(0);
      }
    });

    socket.on('giveQuestion', q => setQuestion(q));
    socket.on('giveQuestions', q => setQuestionForAll(q.questionForAll));

    socket.on('startVoting', data => {
      setAnswer(data);
      setVotedCount(0);
    });

    socket.on('roundResult', setRoundResult);

    socket.on('playerActionUpdate', data => {
      setAnsweredCount(data.answeredCount || 0);
      setVotedCount(data.votedCount || 0);
    });


    socket.on('gameStateRecovered', data => {
      setGameStage(data.stage);
      setAnsweredCount(data.answeredCount);
      setVotedCount(data.votedCount);
      
      if (data.question) setQuestion(data.question);
      
      if (data.answers) setAnswer(data.answers);
      if (data.roundResult) setRoundResult(data.roundResult);
    });

    return () => {
      socket.off('playerInfo');
      socket.off('playerUpdate');
      socket.off('stageUpdate');
      socket.off('playerActionUpdate');
      socket.off('gameStateRecovered');
      socket.off('giveQuestion');
      socket.off('giveQuestions');
      socket.off('startVoting');
      socket.off('roundResult');
    };
  }, [lobbyId, location.state, navigate]);

  const handleGameStart = () => {
    socket.emit('startRound', { lobbyId });
  };

  const handleCancelRound = () => {
    if (window.confirm("Czy na pewno chcesz anulować obecną rundę?")) {
      socket.emit('cancelRound', { lobbyId });
    }
  };

  const handleInviteLink = () => {

  const baseUrl = window.location.origin;
  const inviteLink = `${baseUrl}/getIn/${lobbyId}`;

  const copyToClipboard = (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise((resolve, reject) => {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) resolve();
        else reject(new Error("Nie udało się skopiować"));
      } catch (err) {
        reject(err);
      }
    });
  };

  copyToClipboard(inviteLink)
    .then(() => {
      toaster.create({
        title: "Link skopiowany do schowka!",
        description: "Wyślij go znajomym, aby dołączyli do saloonu.",
        type: "success"
      });
    })
    .catch((err) => {
      console.error("Błąd kopiowania:", err);
      toaster.create({
        title: "Błąd kopiowania",
        description: "Skopiuj link ręcznie z paska adresu przeglądarki.",
        type: "error"
      });
    });
};
  if (!me) return <p className="fonts" style={{textAlign: 'center', marginTop: '20%'}}>Łączenie z saloonem...</p>;

  return (
    <LightMode>
      <div className='GameLobby'>
        <Toaster />
        <div className='GameLobby-Body'>
          <div className='GameLobby-Header'>
            {me.isHost && gameStage === 'lobby' ? (
              <div className="lobby-actions">
                <Button size="sm" onClick={handleInviteLink} className='inviteButton'>
                  Zaproś <FiLink />
                </Button>
                
                <h1 className='fonts header'>Saloon Złotego Węża</h1>
                
                <Button size="sm" onClick={handleGameStart} className='startButton'>
                  Pojedynek! <GiSawedOffShotgun />
                </Button>
              </div>
            ) : (
              <div className="game-status-container">
                <h1 className='fonts header'>Saloon Złotego Węża</h1>
                <div className="status-stack">
                  {me.isHost && gameStage !== 'lobby' && (
                    <Button size="xs" variant="ghost" onClick={handleCancelRound} className="cancelButton">
                      <FiXCircle /> Anuluj rundę
                    </Button>
                  )}

                  {gameStage === 'question' && (
                    <div className="statusBadge question">
                      Gotowe: {answeredCount}/{players.length}
                    </div>
                  )}
                  
                  {gameStage === 'vote' && (
                    <div className="statusBadge vote">
                      Głosy: {votedCount}/{players.length}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className='GameLobby-Card'>
            {
              {
                'lobby': players.map(p => <PlayerCard key={p.id} player={p} />),
                'question': <QuestionStage question={question} lobbyId={lobbyId} />,
                'vote': <VotingStage question={questionForAll} lobbyId={lobbyId} answer={answer} />,
                'result': <ResultStage result={roundResult} lobbyId={lobbyId} />,
              }[gameStage]
            }
          </div>
        </div>
      </div>
    </LightMode>
  );
}

export default GameLobby;