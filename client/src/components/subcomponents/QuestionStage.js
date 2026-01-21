import { useEffect, useRef, useState } from 'react';
import '../style/QuestionStage.css';
import { Button, Textarea   } from '@chakra-ui/react';
import { Toaster, toaster } from "../ui/toaster";
import socket from './socket';
import textFit from 'textfit';

function QuestionStage( { question, lobbyId } ) {
  const [localQuestion, setLocalQuestion] = useState(question ?? null);
  const [answer, setAnswer] = useState(null);
  const [answerSend, setAnswerSend] = useState(false);
    useEffect(() => {
    if (!localQuestion) {
      const stored = localStorage.getItem('questionData');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setLocalQuestion(parsed.question);
        } catch (e) {
          console.error('Błąd parsowania danych z localStorage', e);
        }
      }
    }
  }, [localQuestion]);


  const boxRef = useRef(null);
  useEffect(() => {
    if (localQuestion) {
      textFit(boxRef.current, {
        alignHoriz: true,
        alignVert: true,
        multiLine: true,
        maxFontSize: 200,
        minFontSize: 10,
        detectMultiLine: true,
      });
    }
  }, [localQuestion]);

    const handleSendAnswer = () => {
    // Nie blokuj przycisku na stałe, pozwól na "poprawkę"
    socket.emit('sendAnswer', {
        lobbyId,
        playerAnswer: answer.trim(),
    });
    setAnswerSend(true)
    toaster.create({ title: "Odpowiedź wysłana/zaktualizowana", type: "success" });
    };
    
  return (
    <div className={`questionCard ${answerSend ? 'sended' : null}`}> 
    <Toaster />
    <div className='questionContainer'  ref={boxRef}>
      <h1 className='fonts'> {localQuestion?.question || ''} </h1>
    </div>
        <Textarea  value={answer} resize="none" placeholder='...' className='fonts' onChange={(e) => {setAnswer(e.target.value)}}></Textarea  >
        <Button variant='ghost' className='fonts' onClick={handleSendAnswer}> Zatwierdź </Button>
    </div>
  );
}

export default QuestionStage;
