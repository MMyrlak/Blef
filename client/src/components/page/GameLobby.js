import '../style/GameLobby.css';
import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Button, Icon} from '@chakra-ui/react';
import { Toaster, toaster } from "../ui/toaster";
import { FiLink } from "react-icons/fi";
import { GiSawedOffShotgun } from "react-icons/gi";
import socket from '../subcomponents/socket';
import { LightMode } from '../ui/color-mode';

import QuestionStage from '../subcomponents/QuestionStage';
import ResultStage from '../subcomponents/ResultStage';
import VotingStage from '../subcomponents/VotingStage';
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
  const [me, setMe] = useState(null);
  const navigate = useNavigate();
  const [gameStage, setGameStage] = useState();

  const [questionForImpostor, setQuestionForImpostor] = useState();
  const [questionForAll, setQuestionForAll] = useState();
  const [question, setQuestion] = useState();
  const [answer, setAnswer] = useState([]);
  const [roundResult, setRoundResult] = useState(null);
  useEffect( () => {
    if (!nickname || stateLobbyId !== lobbyId) {
      navigate('/', {replace: true})
      return;
    }

    socket.emit('joinLobby', {lobbyId, nickname});

    socket.on('playerInfo', playerObj => {
      setMe(playerObj);
    });

    socket.on('playerUpdate', players => {
      setPlayers(players);
    });

    socket.on('giveQuestion', question => {
      setQuestion(question);
      localStorage.setItem('questionData', JSON.stringify({ question }));
    });

    socket.on('giveQuestions', question => {
      setQuestionForAll(question.questionForAll);
      setQuestionForImpostor(question.questionForImpostor);
    })

    socket.on('startVoting', answer => {
      setAnswer(answer);
      localStorage.setItem('votingData', JSON.stringify({ question: questionForAll, answer }));
    });

    socket.on('roundResult', (data) => {
      setRoundResult(data);
      localStorage.setItem('resultData', JSON.stringify(data))
    });

    return () => {
      socket.off('playerInfo');
      socket.off('playerUpdate');
      socket.off('disconnect');
    };
  }, [nickname, stateLobbyId, lobbyId, navigate])

  useEffect(() => {
    const handleStageUpdate = (gameStage) => {
      setGameStage(gameStage);
    };
    socket.on('stageUpdate', handleStageUpdate);
    socket.on('clearLocalStorage', () => {
      localStorage.removeItem('questionData');
      localStorage.removeItem('resultData');
      localStorage.removeItem('votingData');
    })
    return () => {
      socket.off('stageUpdate', handleStageUpdate);
    };
  }, []);


  const handleGameStart = () => {
    socket.on('connection', (socket) => {
    console.log('User connected: ', socket.id);
  });
    socket.emit('startRound', {lobbyId} );
    socket.on('stageUpdate', gameStage => {
      setGameStage(gameStage);
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

      return (
        <LightMode>
        <div className='GameLobby'> 
          <Toaster />
          <div className='GameLobby-Body'>
            <div className='GameLobby-Header'>
            {me.isHost && gameStage === 'lobby' ? ( 
              <>
              <Button size="lg" onClick={handleInviteLink} className='inviteButton'>
                Zaproś
                <Icon size="lg" color="#f05053">
                  <FiLink />
                </Icon>
              </Button>
              <h1 className='fonts header'>Saloon Złotego Węża</h1>
              <Button size="lg" onClick={handleGameStart} className='startButton'>
                Zacznij pojedynek
                <Icon size="lg" color="#f05053">
                  <GiSawedOffShotgun />
                </Icon>
              </Button>
              </>
            ) : (
              <>
                <h1 className='fonts header'>Saloon Złotego Węża</h1>
              </>
            )}
            </div>
            <div className='GameLobby-Card'>
              {
                {
                  'lobby': (players
                          .filter(p => p.playerId !== null) // filtruje graczy z null ID
                          .map(p => (
                            <PlayerCard key={p.playerId} player={p} />
                          ))),
                  'question': <QuestionStage question={question} lobbyId={lobbyId} />,
                  'vote': <VotingStage question={questionForAll} lobbyId={lobbyId} answer={answer} />,
                  'result': <ResultStage result={roundResult} lobbyId={lobbyId}/>,
                }[gameStage]
              }


                {}
            </div>
          </div>
        </div>
        </LightMode>
      );
}

export default GameLobby;
