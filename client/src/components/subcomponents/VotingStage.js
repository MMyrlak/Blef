import '../style/VotingStage.css';
import React, { useEffect, useState } from 'react';
import socket from './socket';

function VotingStage({ question, answer, lobbyId }) {
  // Inicjalizacja może zostać, ale dodajemy useEffect poniżej
  const [localQuestion, setLocalQuestion] = useState(question || null);
  const [localAnswer, setLocalAnswer] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

  // Synchronizacja z propsami (kluczowe po odświeżeniu strony)
  useEffect(() => {
    if (question) setLocalQuestion(question);
  }, [question]);

  useEffect(() => {
    // Sprawdzamy różne formaty danych, które mogą przyjść z serwera
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
            key={a.nickname} // Nickname jest stały, id socketu nie!
            className={`answerCard ${selectedPlayerId === a.nickname ? 'selected' : ''}`}
            onClick={() => handleSelect(a.nickname)} 
          > 
            <h1 className='answer fonts'>{a.playerAnswer}</h1> 
            <h1 className='nickname robot'>{a.nickname}</h1> 
          </div>
        ))}
      </div>
    </div>
  );
}

export default VotingStage;