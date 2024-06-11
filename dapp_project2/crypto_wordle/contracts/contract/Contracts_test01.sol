// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract Contracts_test01 {
   address public owner; // 계약을 소유한 소유자의 주소입니다.
    uint256 public entryFee; // 게임 참가비로 설정된 0.1 이더입니다.
    
    string[] public words; // 게임에서 사용될 단어 목록입니다.
    string public currentWord; // 현재 게임의 정답 단어입니다.
    uint256 public currentWordIndex; // 현재 게임의 정답 단어의 인덱스입니다.
    
    mapping(address => uint256) public attempts; // 각 플레이어의 시도 횟수를 저장하는 매핑입니다.
    mapping(address => bool) public hasGuessed; // 각 플레이어가 정답을 맞췄는지 여부를 저장하는 매핑입니다.
    mapping(address => uint256) public rewardMultiplier; // 각 플레이어의 보상 배율을 저장하는 매핑입니다.

    event GameStarted(address player); // 게임이 시작될 때 발생하는 이벤트입니다.
    event GameWon(address player, uint256 prize); // 플레이어가 게임에서 이겼을 때 발생하는 이벤트입니다.
    event GameLost(address player);// 플레이어가 게임에서 졌을 때 발생하는 이벤트입니다.

    // 오직 소유자만 특정 기능을 실행할 수 있도록 제한하는 수식어입니다.
    modifier onlyOwner() { 
        require(msg.sender == owner, "Not the owner");
        _;
    }

    // 소유자는 게임에 참가할 수 없도록 제한하는 수식어입니다.
    modifier onlyPlayer() { 
        require(msg.sender != owner, "Owner cannot play");
        _;
    }

    // 계약이 배포될 때 실행되는 생성자입니다. 소유자를 설정합니다.
    constructor() public { 
        owner = msg.sender;
        entryFee = 0.1 ether; // 참가비는 0.1 이더
        words = ["banana", "rabbit", "monkey", "happy", "Angry", "lemon", "sadness", "joyful", "orange", "cherry", "crypto"];
    }

    // 단어 목록에서 랜덤하게 단어를 선택하여 현재 단어로 설정합니다.
    function selectRandomWord() internal { 
        uint256 index = uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty))) % words.length;
        currentWordIndex = index;
        currentWord = words[index];
    }

    // 게임을 시작하는 함수입니다. 참가비를 지불하고 시도 횟수를 초기화합니다.
    function startGame() public payable onlyPlayer {
        require(msg.value == entryFee, "Incorrect entry fee");
        // require(attempts[msg.sender] == 0, "Game already started");

        attempts[msg.sender] = 5; // 사용자의 기회를 5번으로 설정합니다.
        hasGuessed[msg.sender] = false;
        rewardMultiplier[msg.sender] = 200; // 기본 보상 배율을 2배로 설정합니다.

        selectRandomWord();
        emit GameStarted(msg.sender);
    }

    // 사용자가 단어를 추측하고 결과에 따라 처리합니다. 맞추면 상금을 지급하고, 틀리면 시도 횟수를 감소시킵니다.
    function guessWord(string memory guessedWord) public onlyPlayer {
        require(attempts[msg.sender] > 0, "Game not started");
        require(!hasGuessed[msg.sender], "Already guessed the word");

        if (keccak256(abi.encodePacked(guessedWord)) == keccak256(abi.encodePacked(currentWord))) {
            hasGuessed[msg.sender] = true;
            uint256 multiplier = rewardMultiplier[msg.sender]; // 사용자가 선택한 보상 배율을 가져옵니다.
            uint256 prize = entryFee * multiplier / 100; // 보상을 계산합니다.
            payable(msg.sender).transfer(prize);

            attempts[msg.sender] = 0;
            emit GameWon(msg.sender, prize);
        } else {
            attempts[msg.sender]--; // 사용자의 기회를 감소시킵니다.
            if (attempts[msg.sender] < 1) {
                attempts[msg.sender] = 0;
                emit GameLost(msg.sender);
            }
        }
    }

    // 사용자가 기회를 줄이고 보상 배율을 변경하는 함수입니다.
    function reduceAttemptsAndChangeMultiplier() public onlyPlayer {
        require(attempts[msg.sender] >= 5, "Cannot reduce attempts further"); //처음 딱 한번만 실행
        
        // 기존 보상 배율에서 1.5배를 계산합니다.
        uint256 newMultiplier = rewardMultiplier[msg.sender] * 150 / 100;
        rewardMultiplier[msg.sender] = newMultiplier; // 보상 배율을 변경합니다.
        attempts[msg.sender]--; // 사용자의 기회를 감소시킵니다.
    }

    // 사용자가 기회를 늘리고 보상 배율을 줄이는 함수입니다.
    function increaseAttemptsAndChangeMultiplier() public onlyPlayer {        
        // 기존 보상 배율에서 0.5배를 계산합니다.
        uint256 newMultiplier = rewardMultiplier[msg.sender] * 50 / 100;
        rewardMultiplier[msg.sender] = newMultiplier; // 보상 배율을 변경합니다.
        attempts[msg.sender]++; // 사용자의 기회를 증가시킵니다.
    }

    // 소유자가 계약의 잔액을 출금할 수 있는 함수입니다.
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner).transfer(balance);
    }
    
    // 현재 단어를 반환하는 함수입니다. 
    function getCurrentWord() public view returns (string memory) {
        return currentWord;
    }

    // function getUserAttempts() public view returns (uint256) {
    //     return attempts[msg.sender];
    // }

    // 사용자가 선택한 보상 배율을 반환하는 함수입니다.
    function getRewardMultiplier(address player) public view returns (uint256) {
        return rewardMultiplier[player];
    }

    // 컨트랙트 잔액을 반환하는 함수입니다.
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
}