import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import './App.css';
import { CONTACT_ABI, CONTACT_ADDRESS } from './config';

function App() {
  const [input, setInput] = useState("");
  const [words, setWords] = useState([]);
  const [currentRow, setCurrentRow] = useState(0);
  const [balance, setBalance] = useState();
  const [targetWord, setTargetWord] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    // async function load() {
    //   if (window.ethereum) {
    //     try {
    //       await window.ethereum.request({ method: 'eth_requestAccounts' });
    //       const web3 = new Web3(window.ethereum);
    //       const accounts = await web3.eth.getAccounts();
    //       setAccount(accounts[0]);
    //     } catch (error) {
    //       console.error("User denied account access");
    //     }
    //   } else if (window.web3) {
    //     const web3 = new Web3(window.web3.currentProvider);
    //     const accounts = await web3.eth.getAccounts();
    //     setAccount(accounts[0]);
    //   } else {
    //     console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
    //   }
    // }

    // load();
    start_game_user();
  }, []);

  async function start_game_user() {
    try {
      const web3 = new Web3(window.ethereum);
      const contract = new web3.eth.Contract(CONTACT_ABI, CONTACT_ADDRESS);
      const accounts = await web3.eth.getAccounts();

      if (accounts.length === 0) {
        console.error("No Ethereum account connected");
        return;
      }

      setMessage("서명 요청 중... MetaMask를 확인하세요.");

      await contract.methods.startGame().send({
        from: accounts[0],
        value: web3.utils.toWei('0.1', 'ether')
      });
      setMessage("게임이 성공적으로 시작되었습니다!");

      startNewGame(); //게임 시작 셋팅
      await getContractBalance(); //컨트랙트 계좌 잔액 반환
      await get_curr_word_owner(); //게임 정답 단어 받아오기

    } catch (error) {
      if (error.code === 4001) {
        console.error("User denied transaction signature.");
        setMessage("트랜잭션 서명이 거부되었습니다. 다시 시도하세요.");
      } else {
        console.error("Error starting game:", error);
        setMessage("게임 시작 중 오류가 발생했습니다. 나중에 다시 시도하세요.");
      }
    }
  }

  async function get_curr_word_owner() {
    try {
      const web3 = new Web3(window.ethereum);
      const contract = new web3.eth.Contract(CONTACT_ABI, CONTACT_ADDRESS);
      const accounts = await web3.eth.getAccounts();

      if (accounts.length === 0) {
        console.error("No Ethereum account connected");
        return;
      }

      const currentWord = await contract.methods.getCurrentWord().call({
        from: accounts[0]
      });

      console.log("Current word:", currentWord);
      setTargetWord(currentWord);
    } catch (error) {
      console.error("Error fetching current word:", error);
    }
  }

  async function check_word_user(_input) {
    try {
      const web3 = new Web3(window.ethereum);
      const contract = new web3.eth.Contract(CONTACT_ABI, CONTACT_ADDRESS);
      const accounts = await web3.eth.getAccounts();

      if (accounts.length === 0) {
        console.error("No Ethereum account connected");
        return;
      }

      const word = _input;

      setMessage("서명 요청 중... MetaMask를 확인하세요.");

      await contract.methods.guessWord(word).send({
        from: accounts[0]
      });

      console.log("Answer checked successfully!");
    } catch (error) {
      if (error.code === 4001) {
        console.error("User denied transaction signature.");
        setMessage("트랜잭션 서명이 거부되었습니다. 다시 시도하세요.");
      } else {
        console.error("Error checking answer:", error);
        setMessage("정답 확인 중 오류가 발생했습니다. 나중에 다시 시도하세요.");
      }
    }
  }

  async function getContractBalance() {
    try {
      const web3 = new Web3(window.ethereum);
      const contract = new web3.eth.Contract(CONTACT_ABI, CONTACT_ADDRESS);
      const accounts = await web3.eth.getAccounts();
  
      if (accounts.length === 0) {
        console.error("No Ethereum account connected");
        return;
      }
  
      const balance = await contract.methods.getContractBalance().call({
        from: accounts[0]
      });

      setBalance(web3.utils.fromWei(balance, 'ether'));
  
      console.log("Contract balance:", balance);
    } catch (error) {
      console.error("Error fetching contract balance:", error);
    }
  }

  function startNewGame() {
    setWords([]);
    setCurrentRow(5);
    setMessage("");
    setInput("");
  }

  async function handleEnter() {
    if (input === "") return;
    if (currentRow == -1) return;
    if (input.length !== targetWord.length) {
      setMessage(`입력한 알파벳이 ${targetWord.length}개 가 아니에요!!!`);
      return;
    }

    const newWords = [...words, input];
    setWords(newWords);
    setInput("");

    setMessage("답을 확인중 입니다, 잠시만 기다려 주세요.");
    await check_word_user(input);

    setCurrentRow(currentRow - 1);

    if (input === targetWord) {
      setMessage("정답입니다!");
      await getContractBalance(); //컨트랙트 계좌 잔액 갱신
    } else if (currentRow <= 1) {
      setMessage(`게임이 종료되었습니다, 정답은 (${targetWord})이 었습니다`);

      setCurrentRow(-1);
      await getContractBalance(); //컨트랙트 계좌 잔액 갱신
    }else{
      setMessage("답이 틀렸습니다!");
    }
    
  }

  return (
    <div className="app-container">
      <h1>Crypto - Wordle</h1>
      <h3>영단어 맞추기 게임</h3>
      <button className="restart-button" onClick={start_game_user}>재시작</button>

      <div className="game-board">
        <button className="difficulty-button">난이도 올리기</button>

        <table>
          <tbody>
            {Array.from({ length: 5 }, (_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: targetWord.length }, (_, colIndex) => (
                  <td key={colIndex} className={
                    words[rowIndex] && words[rowIndex][colIndex] === targetWord[colIndex]
                      ? "correct"
                      : ""
                  }>
                    {words[rowIndex] ? words[rowIndex][colIndex] : ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="input-container">
        <input
          type="text"
          placeholder="단어를 입력하세요"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button onClick={handleEnter}>입력</button>
      </div>

      <div className="message">{message}</div>

      <div className="fixed-bottom-left">
        game balance is: {balance} ETH
      </div>
    </div>
  );
}

export default App;
