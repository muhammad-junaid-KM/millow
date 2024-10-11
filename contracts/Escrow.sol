// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract Escrow is IERC721Receiver {
    address public lender;
    address public inspector;
    address payable public seller;
    address public nftAddress;

    bool private locked;

    mapping(uint256 => bool) public isListed;
    mapping(uint256 => uint256) public purchasePrice;
    mapping(uint256 => uint256) public escrowAmount;
    mapping(uint256 => address) public buyer;
    mapping(uint256 => bool) public inspectionPassed;
    mapping(uint256 => mapping(address => bool)) public approval;

    constructor(
        address _nftAddress,
        address payable _seller,
        address _inspector,
        address _lender
    ) {
        lender = _lender;
        inspector = _inspector;
        seller = _seller;
        nftAddress = _nftAddress;
    }

    // Implement the onERC721Received function to allow receiving NFTs
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    modifier onlyBuyer(uint256 _nftID) {
        require(msg.sender == buyer[_nftID], "Only the buyer can call this function");
        _;
    }

    modifier onlyInspector() {
        require(msg.sender == inspector, "Only the inspector can call this function");
        _;
    }

    modifier noReentrancy() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }

    function list(
        uint256 _nftID,
        address _buyer,
        uint256 _purchasePrice,
        uint256 _escrowAmount
    ) public payable {
        IERC721(nftAddress).safeTransferFrom(msg.sender, address(this), _nftID);

        isListed[_nftID] = true;
        purchasePrice[_nftID] = _purchasePrice;
        escrowAmount[_nftID] = _escrowAmount;
        buyer[_nftID] = _buyer;
    }

    function depositEarnest(uint256 _nftID) public payable onlyBuyer(_nftID) {
        require(isListed[_nftID], "NFT is not listed for sale");
        require(msg.value >= escrowAmount[_nftID], "Insufficient escrow amount");
    }

    function updateInspectionStatus(uint256 _nftID, bool _inspectionPassed) public onlyInspector {
        inspectionPassed[_nftID] = _inspectionPassed;
    }

    function approveSale(uint256 _nftID) public {
        approval[_nftID][msg.sender] = true;
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {}

    function finalizeSale(uint256 _nftID) public noReentrancy {
        require(inspectionPassed[_nftID], "Inspection has not passed");
        require(approval[_nftID][buyer[_nftID]], "Buyer has not approved the sale");
        require(approval[_nftID][seller], "Seller has not approved the sale");
        require(approval[_nftID][lender], "Lender has not approved the sale");
        require(address(this).balance >= purchasePrice[_nftID], "Insufficient funds for this NFT");

        isListed[_nftID] = false;

        // Transfer the purchase price to the seller
        (bool success, ) = seller.call{value: purchasePrice[_nftID]}("");
        require(success, "Transfer to seller failed.");

        // Transfer the NFT to the buyer
        IERC721(nftAddress).safeTransferFrom(address(this), buyer[_nftID], _nftID);
    }

    function cancelSale(uint256 _nftID) public noReentrancy {
        require(isListed[_nftID], "NFT is not listed for sale");

        isListed[_nftID] = false;

        if (!inspectionPassed[_nftID]) {
            // Refund the buyer if the inspection failed
            (bool success, ) = buyer[_nftID].call{value: escrowAmount[_nftID]}("");
            require(success, "Refund to buyer failed.");
        } else {
            // Refund the seller if the inspection passed
            (bool success, ) = seller.call{value: escrowAmount[_nftID]}("");
            require(success, "Refund to seller failed.");
        }
    }
}
