import React  from 'react';
import '../style/PlayerCard.css'

function PlayerCard( {player} ) {
  return (
    <div
      className={player.isHost ? 'isHost card' : 'card'}
      style={{
        backgroundImage: `url(/PlayerCard/${player.playerCardId}.png)`,
      }}
    >
      <div className='cardHeader fonts'>
        <h1>
          {player.nickname}
        </h1>
      </div>
      <div className='cardFooter'>
        <h1>{player.score}</h1>
      </div>
    </div>
  );
};

export default PlayerCard
