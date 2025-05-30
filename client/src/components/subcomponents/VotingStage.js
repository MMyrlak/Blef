import '../style/VotingStage.css';
import React, { useEffect, useState} from 'react';
import socket from './socket';

function VotingStage( { question, answer, lobbyId } ) {
  const [localQuestion, setLocalQuestion] = useState(() => {
    if (question) return question;
    try {
      const stored = localStorage.getItem('questionData');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.question.question || null;
      }
    } catch (e) {
      console.error('Błąd przy ładowaniu question z localStorage:', e);
    }
    return null;
  });
  const [localAnswer, setLocalAnswer] = useState(() => {
    if (answer?.answers && Array.isArray(answer.answers)) {
      return answer.answers; // z propsów: wyciągnij answers
    }
    try {
      const stored = localStorage.getItem('votingData');
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed.answer?.answers) ? parsed.answer.answers : [];
      }
    } catch (e) {
      console.error('Błąd przy ładowaniu answer z localStorage:', e);
    }
    return [];
  });
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);

  const handleSelect = (playerId) => {
    setSelectedPlayerId(playerId);
    socket.emit('sendVote', {lobbyId, votedId: playerId});
  }

  return (
    <div className='votingLobby'>
      <div className='questionHeader'>
        <h1 className='fonts'> {localQuestion} </h1>
      </div>
      <div className='playersAnswers'>
      {localAnswer.map( a => (
        <div 
          key={a.playerId}
          className={`answerCard ${selectedPlayerId === a.playerId ? 'selected' : ''}`}
          onClick={() => handleSelect(a.playerId)} > 
            <h1 className='answer fonts'>{a.playerAnswer}</h1> 
            <h1 className='nickname robot'> {a.nickname}</h1> 
        </div>
        ))}
      </div>
    </div>
  );
}

export default VotingStage;
