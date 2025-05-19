import '../style/GetLobby.css';
import React, {useEffect, useState} from 'react';
import axios from 'axios';
import { Button } from "@chakra-ui/react"
import { Table } from "@chakra-ui/react"
import { FaArrowRightToBracket } from "react-icons/fa6";
import { IconButton } from "@chakra-ui/react"
import { PasswordInput } from "../ui/password-input"
import { useNavigate } from 'react-router-dom';

function GetLobby() {
  const [lobbies, setLobbies] = useState([]);
  const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleCreateLobby = () => {
        navigate('/createLobby');
    }
  useEffect(()=>{
    const fetchLobbies = async () => {
      try {
        const res = await axios.get('http://localhost:3001/api/lobby/getLobby');
        setLobbies(res.data.rows); 
      } catch (err) {
        setError(err.response?.data?.error || 'Wystąpił błąd front');
      }
    };

    fetchLobbies();
  }, []);

  return (

    <div className='LobbyCointainer'>
      <div className='LobbyCointainer-Header'>
      <h1>Lista lobby</h1> 
      <Button variant="outline" onClick={handleCreateLobby}> Stwórz lobby </Button>
      </div>
      
      {error ? ( <p className='LobbyCointainer-Center'>{error}</p>) : lobbies.length === 0 ? 
      ( <p className='LobbyCointainer-Center' >Ładowanie lobby...</p> ) : (
        <Table.ScrollArea borderWidth="1px" rounded="md" height="160px">
      <Table.Root size="sm" stickyHeader>
          <Table.Body>
            {lobbies.map((lobby) => (
              <Table.Row key={lobby.id}>
                <Table.Cell>{lobby.name}</Table.Cell>
                <Table.Cell>< PasswordInput /></Table.Cell>
                <Table.Cell textAlign="end">
                  <IconButton aria-label="Call support" rounded="full">
                    <FaArrowRightToBracket />
                  </IconButton> 
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Table.ScrollArea>
      )}
    </div>
  );
}

export default GetLobby;
