pragma solidity >=0.8.0;

contract GuessAndWin {
  uint storedData;
  uint balance;

  constructor() payable {
    storedData = 123;
    balance = 0;
  }

  function set(uint x) public payable {
    storedData = x;
  }

  function get() public view returns (uint) {
    return storedData;
  }

  function setBalance(uint x) public {
    balance = x;
  }

  function getBalance() public view returns (uint) {
    return balance;
  }
}