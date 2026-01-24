import React, { useState, useEffect } from 'react';
import '../style/ResultStage.css'
import socket from './socket';

const ResultStage = ({ result: propResult, lobbyId }) => {
  const defaultResult = { scores: [], votes: [], impostor: null };
  const [result, setResult] = useState(propResult || defaultResult);
  const [isLoading, setIsLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [flippedCards, setFlippedCards] = useState({});

  useEffect(() => {
    if (propResult) {
      setResult(propResult);
      localStorage.setItem('resultData', JSON.stringify(propResult));
      setIsLoading(false);
      return;
    }

    const savedData = localStorage.getItem('resultData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setResult(parsedData);
      } catch (error) {
        console.error('Błąd parsowania danych z localStorage:', error);
      }
    }
    setIsLoading(false);
  }, [propResult]);

  const toggleCard = (playerId) => {
    setFlippedCards(prev => ({
      ...prev,
      [playerId]: !prev[playerId]
    }));
  };

  const getPlayerVote = (nickname) => {
    if (!result.votes) return "Brak głosu";

    const vote = result.votes.find(v => v.voterNickname === nickname);
    return vote ? vote.votedNickname : "Brak głosu";
  };

  if (isLoading || !result || !Array.isArray(result.scores)) {
    return (
      <div className="result-container">
        <h2 className='fonts'>Trwa ładowanie wyników...</h2>
      </div>
    );
  }

  const handleReady = () => {
    const newReadyState = !ready;
    setReady(newReadyState);
    socket.emit('nextRoundReady', { lobbyId });
  }
  
  return (
    <div className="result-container">
      <div className="players-list">
        {result.scores.map(player => {
          const isImpostor = player.nickname === result.impostor;
          const voteText = getPlayerVote(player.nickname);
          const isFlipped = flippedCards[player.nickname];

          return (
            <div 
              key={player.nickname} 
              className={`card-container ${isFlipped ? 'flipped' : ''} ${isImpostor ? 'impostor' : ''}`}
              onClick={() => toggleCard(player.nickname)}
            >
              <div className="card">
                <div className="card-front">
                  <div 
                    className="player-card"
                    style={{
                      backgroundImage: `url(/PlayerCard/${player.playerCardId}.png)`,
                    }}
                  >
                    <div className={`cardHeader fonts`}>
                      <h1>{player.nickname}</h1>
                    </div>
                    <div className='cardFooter'>
                      <h1>{player.score}</h1>
                    </div>
                  </div>
                </div>
              
                <div className="card-back">
                  <div className="player-card">
                    <div className='cardHeader fonts'>
                      <h1>{player.nickname}</h1>
                    </div>
                    
                    <div className='vote-info'>
                      {isImpostor ? (
                        <p>
                          <span className={`vote-text fonts impostor-label`}>
                            Oszust
                          </span>
                        </p>
                      ) : (
                        <p>
                          Głos na: <br/>
                          <span className={`vote-text fonts`}>
                            {voteText}
                          </span>
                        </p>
                      )}
                    </div>

                    <div className='cardFooter'>
                      <h1>{player.score}</h1>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className='button-list'>
        <button 
          onClick={handleReady} 
          className={`western-ready-button ${ready ? "notReady" : "ready"}`}
        >
          <div className="sign-board">
            <div className="sign-text fonts">
              {ready ? 'Nie gotowy' : 'Gotowy!'}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default ResultStage;