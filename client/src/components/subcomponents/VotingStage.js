import '../style/VotingStage.css';
import React, { useEffect, useState } from 'react';
import socket from './socket';

function VotingStage({ question, answer, lobbyId }) {
  const [localQuestion, setLocalQuestion] = useState(question || null);
  const [localAnswer, setLocalAnswer] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

  useEffect(() => {
    if (question) setLocalQuestion(question);
  }, [question]);

  useEffect(() => {
    if (Array.isArray(answer)) {
      setLocalAnswer(answer);
    } else if (answer?.answers && Array.isArray(answer.answers)) {
      setLocalAnswer(answer.answers);
    }
  }, [answer]);

  const handleSelect = (nickname) => {
    setSelectedPlayerId(nickname);
    socket.emit('sendVote', { lobbyId, votedNickname: nickname });
  };

  return (
    <div className='votingLobby'>
      <div className='questionHeader'>
        <h1 className='fonts'> {localQuestion} </h1>
      </div>
      <div className='playersAnswers'>
        {localAnswer.map(a => (
          <div 
            key={a.nickname}
            className={`answerCard ${selectedPlayerId === a.nickname ? 'selected' : ''}`}
            onClick={() => handleSelect(a.nickname)} 
          > 
            <div className="answerWrapper">
              <h1 className='answer fonts'>{a.playerAnswer}</h1> 
            </div>
            <h1 className='nickname robot'>{a.nickname}</h1> 
          </div>
        ))}
      </div>
    </div>
  );
}

export default VotingStage;