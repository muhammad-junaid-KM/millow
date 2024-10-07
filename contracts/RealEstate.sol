// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract RealEstate is ERC721URIStorage {
  using Counters for Counters.Counter;
  Counters.Counter private _tokenIds;

  constructor() ERC721("Real Estate", "REAL") {} //? It takes first argument as name and second as symbol

  function mint(string memory tokenURI) public returns (uint256) { //? mint function is used to create a new token for the NFT contract
    _tokenIds.increment();

    uint256 newItemId = _tokenIds.current();
    _mint(msg.sender, newItemId);
    _setTokenURI(newItemId, tokenURI);

    return newItemId;
  }

  function totalSupply() public view returns (uint256) { //? totalSupply function is used to get the total number of tokens that have been minted
    return _tokenIds.current();
  }
}
