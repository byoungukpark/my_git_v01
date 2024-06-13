// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract Contracts_test01 {
   address public owner; // 컨트랙트를 배포한 배포자의 주소
    uint256 public entryFee; // 게임 참가비
    
    string[] public words; // 게임에서 사용될 단어 목록
    string public currentWord; // 현재 게임의 정답 단어
    uint256 public currentWordIndex; // 현재 게임의 정답 단어의 인덱스
    
    mapping(address => uint256) public attempts; // 각 플레이어의 시도 횟수를 저장하는 매핑
    mapping(address => bool) public hasGuessed; // 각 플레이어가 정답을 맞췄는지 여부를 저장하는 매핑
    mapping(address => uint256) public rewardMultiplier; // 각 플레이어의 보상 배율을 저장하는 매핑

    event GameStarted(address player); // 게임이 시작될 때 발생하는 이벤트
    event GameWon(address player, uint256 prize); // 플레이어가 게임에서 이겼을 때 발생하는 이벤트
    event GameLost(address player);// 플레이어가 게임에서 졌을 때 발생하는 이벤트

    // 배포자만 실행 힐수 있도록 제한하는 모디파이어
    modifier onlyOwner() { 
        require(msg.sender == owner, "Not the owner");
        _;
    }

    // 컨트렉트가 배포될 때 실행되는 생성자, 배포자, 참가비, 정답 단어목록 지정
    constructor() public { 
        owner = msg.sender;
        entryFee = 0.1 ether; // 참가비는 0.1 이더
        words = ["banana", "rabbit", "monkey", "happy", "Angry", "lemon", "sadness", "joyful", "orange", "cherry", "crypto"];
    }

    // 랜덤 정답 단어 생성 함수, 단어 목록에서 랜덤하게 단어를 선택하여 현재 정답 단어로 설정
    function selectRandomWord() internal { 
        uint256 index = uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty))) % words.length;
        currentWordIndex = index;
        currentWord = words[index];
    }

    // 게임을 시작하는 함수, 참가비 지불, 초기값 셋팅
    function startGame() public payable {
        require(msg.value == entryFee, "Incorrect entry fee"); //참가비 만큼 이더를 지불하지 않으면 실행 불가

        attempts[msg.sender] = 5; // 사용자의 기회는 기본 5번
        hasGuessed[msg.sender] = false;
        rewardMultiplier[msg.sender] = 200; // 사용자의 기본 보상 배율은 2배

        selectRandomWord();
        emit GameStarted(msg.sender);
    }

    // 사용자 입력힌 단어 검사 함수, 맞추면 상금을 지급, 틀리면 시도 횟수를 감소, 시도횟수를 모두 소진하면 게임종료
    function guessWord(string memory guessedWord) public {
        require(attempts[msg.sender] > 0, "Game not started");
        require(!hasGuessed[msg.sender], "Already guessed the word");

        if (keccak256(abi.encodePacked(guessedWord)) == keccak256(abi.encodePacked(currentWord))) { //정답을 맞힌경우
            hasGuessed[msg.sender] = true; 
            uint256 multiplier = rewardMultiplier[msg.sender]; // 사용자의 현재 보상 배율
            uint256 prize = entryFee * multiplier / 100; // 사용자에게 줘야할 상금 계산
            payable(msg.sender).transfer(prize); //상금 지급

            attempts[msg.sender] = 0;
            emit GameWon(msg.sender, prize);
        } else { // 답이 틀린 경우
            attempts[msg.sender]--; // 사용자의 기회를 감소시킵니다.
            if (attempts[msg.sender] < 1) { //모든 기회가 소진 된 경우
                attempts[msg.sender] = 0;
                emit GameLost(msg.sender);
            }
        }
    }

    // 사용자가 주어진 기회를 줄이고 보상 배율을 올리는 함수
    function reduceAttemptsAndChangeMultiplier() public {
        require(attempts[msg.sender] >= 4, "Cannot reduce attempts further"); //두번 째 입력 전 까지만 난이도 조절 허용
        
        uint256 newMultiplier = rewardMultiplier[msg.sender] * 150 / 100; // 현재 보상 배울의 1.5배
        rewardMultiplier[msg.sender] = newMultiplier; 
        attempts[msg.sender]--; // 사용자의 기회 감소
    }

    // 사용자가 기회를 늘리고 보상 배율을 줄이는 함수입니다.
    function increaseAttemptsAndChangeMultiplier() public {        
        // 기존 보상 배율에서 0.5배를 계산합니다.
        uint256 newMultiplier = rewardMultiplier[msg.sender] * 50 / 100;
        rewardMultiplier[msg.sender] = newMultiplier; // 보상 배율을 변경합니다.
        attempts[msg.sender]++; // 사용자의 기회를 증가시킵니다.
    }

    // 컨트랙트의 잔액을 출금하는 함수, 배포자만이 실행 가능
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(owner).transfer(balance);
    }
    
    // 현재 정답 단어를 반환하는 함수 
    function getCurrentWord() public view returns (string memory) {
        return currentWord;
    }

    // 사용자의 현재 보상 배율을 반환 하는 함수
    function getRewardMultiplier(address player) public view returns (uint256) {
        return rewardMultiplier[player];
    }

    // 컨트랙트 잔액을 반환하는 함수
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
}