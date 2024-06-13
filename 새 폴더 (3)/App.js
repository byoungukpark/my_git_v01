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
  const [difficultyDisabled, setDifficultyDisabled] = useState(false);
  const [multiplier, setMultiplier] = useState(0);
  const [opportunity, setOpportunity] = useState(0);

  useEffect(() => {
    setDifficultyDisabled(true);
  }, []);

  // 사용자가 입력한 알파벳을 검사 후 "correct", "similar" 클래스를 추가하는 함수
  const addCorrectClass = (rowIndex, colIndex) => {
    if (words[rowIndex] && words[rowIndex][colIndex] === targetWord[colIndex]) {
      return "correct";
    } else if (words[rowIndex] && targetWord.includes(words[rowIndex][colIndex])) {
      return "similar";
    } else {
      return "";
    }
  };

  //게임을 시작하는 함수, 사용자의 계좌에서 0.1이더를 송금
  //호출 될 때 마다 시작 셋팅, 컨트랙트 잔액 갱신, 정답 단어 갱신, 보상 배율 갱신
  //가스비 있음
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

      const Multiplier = await contract.methods.getRewardMultiplier(accounts[0]).call({
        from: accounts[0]
      });
      if(Multiplier > 0){
        setMultiplier(Number(Multiplier) / 100)
      }else{
        setMultiplier(0)
      }

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

  //컨트랙트에서 랜덤하게 정한 정답 단어를 가져오는 함수
  //가스비 없음
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

  //사용자의 입력 단어를 검사하는 함수
  //웹에서 검사, 컨트랙트의 입력 값 검사 함수 실행
  //가스비 있음
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

  //컨트랙트의 계좌 잔액 갱신 함수
  //가스비 없음
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

  //난이도 올리는 함수, 기회를 줄이고 보상 배율 증가, 남은 기회가 4회 이상 일 때만 실행 가능 
  //컨트랙트의 난이도 올리는 함수 실행, 보상 배율 갱신
  //가스비 있음
  async function difficulty_up() {
    if(currentRow < 4 || opportunity <= 3){
      setDifficultyDisabled(true);
      return;
    }

    try {
      const web3 = new Web3(window.ethereum);
      const contract = new web3.eth.Contract(CONTACT_ABI, CONTACT_ADDRESS);
      const accounts = await web3.eth.getAccounts();

      if (accounts.length === 0) {
        console.error("No Ethereum account connected");
        return;
      }

      await contract.methods.reduceAttemptsAndChangeMultiplier().send({
        from: accounts[0]
      });

      const Multiplier = await contract.methods.getRewardMultiplier(accounts[0]).call({
        from: accounts[0]
      });
      if(Multiplier > 0){
        setMultiplier(Number(Multiplier) / 100)
      }else{
        setMultiplier(0)
      }
      setOpportunity(opportunity - 1);
      setCurrentRow(currentRow - 1);

      
      setMessage("기회가 1회 줄어든 대신 보상이 1.5배 올랐어요!!!");

      if((opportunity - 1) <= 3){
        setDifficultyDisabled(true);
      }

    } catch (error) {
      if (error.code === 4001) {
        console.error("User denied transaction signature.");
        setMessage("트랜잭션 서명이 거부되었습니다. 다시 시도하세요.");
      } else {
        console.error("Error checking answer:", error);
        setMessage("오류가 발생했습니다. 나중에 다시 시도하세요.");
      }
    }
  }

  //셋팅 초기화 함수
  function startNewGame() {
    setWords([]);
    setCurrentRow(5);
    setOpportunity(5);
    setMessage("");
    setInput("");
    setMultiplier(0)

    setDifficultyDisabled(false);
  }

  //사용자의 입력을 제어하는 함수, 게임의 종료여부 판단
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

    if((currentRow - 1) < 4 || opportunity <= 3){
      setDifficultyDisabled(true);
    }

    setMessage("답을 확인중 입니다, 잠시만 기다려 주세요.");

    await check_word_user(input);

    setCurrentRow(currentRow - 1);

    if (input === targetWord) {
      setMessage("정답입니다!");

      await getContractBalance(); //컨트랙트 계좌 잔액 갱신
    } else if ((currentRow - 1) < 1) {
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
      <h3>영단어 맞추기 게임, 참가비의 {multiplier}배를 보상으로 드려요</h3>
      <button className="restart-button" onClick={start_game_user}>시작하기</button>

      <div className="game-board">
        <button className={`difficulty-button ${difficultyDisabled ? 'disabled' : ''}`} 
          disabled={difficultyDisabled} onClick={difficulty_up}>난이도 올리기</button>

        <table>
          <tbody>
            {Array.from({ length: opportunity }, (_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: targetWord.length }, (_, colIndex) => (
                  <td key={colIndex} className={addCorrectClass(rowIndex, colIndex)}>
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
        아직 가져가지 못한 상금 : {balance} ETH
      </div>
    </div>
  );
}

export default App;
