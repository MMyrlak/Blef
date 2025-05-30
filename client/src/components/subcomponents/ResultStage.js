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
    // Jeśli dane są przekazane w props, użyj ich
    if (propResult) {
      setResult(propResult);
      setIsLoading(false);
      return;
    }

    // Jeśli nie ma danych w props, spróbuj pobrać z localStorage
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

  const getPlayerVote = (playerId) => {
    const vote = result.votes.find(v => v.voterId === playerId);
    return  vote.votedNickname;
  };

  if (isLoading || !result || !Array.isArray(result.scores)) {
    return (
      <div className="result-container">
        <h2>Trwa ładowanie wyników...</h2>
      </div>
    );
  }


  const handleReady = () => {
    setReady(!ready);
    socket.emit('nextRoundReady', {lobbyId})
  }
  
  return (
    <div className="result-container">
      
      <div className="players-list">
        {result.scores.map(player => {
          const isImpostor = player.id === result.impostor;
          const voteText = getPlayerVote(player.id);
          const isFlipped = flippedCards[player.id];
          return (
            <div 
              key={player.id} 
              className={`card-container ${isFlipped ? 'flipped' : ''} ${isImpostor ? 'impostor' : ''}`}
              onClick={() => toggleCard(player.id)}
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
                  <div 
                    className="player-card"
                  >
                    <div className='cardHeader fonts'>
                      <h1>{player.nickname}</h1>
                    </div>
                    {isImpostor ? (
                      <p>
                        <span className={`vote-text fonts`}>
                          Oszust
                        </span>
                      </p>
                    ) : (<p>
                        Głos na: <br/>
                        <span className={`vote-text fonts`}>
                          {voteText}
                        </span>
                      </p>)
                      }                      
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
            <div className="sign-text">
              {ready ? 'Nie gotowy' : 'Gotowy!'}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default ResultStage;