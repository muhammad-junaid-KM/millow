//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IERC721 { //? skelton for the smart contract that tells the type of functions inside of it
    function transferFrom(
        address _from,
        address _to,
        uint256 _id
    ) external;
}

contract Escrow {
    address public lender; //? address is the datatype for ethereum addresses, public makes it accessible from outside the contract, lender is the state variable name that stores the lender's address into the contract on the blockchain
    address public inspector;
    address payable public seller; //? payable is a modifier that allows the contract to receive and hold ether or cryptocurrency
    address public nftAddress; //? nftAddress is the state variable that stores the address of the NFT contract

    modifier onlySeller() { //? modifier is a special type of function that is used to modify the behavior of other functions in the contract by adding some additional functionality to them
        require(msg.sender == seller, "Only seller can call this function");
        _;
    }
    modifier onlyBuyer(uint256 _nftID) { //? onlyBuyer is a modifier that allows only the buyer to call this function
        require(msg.sender == buyer[_nftID], "Only buyer can call this function");
        _;
    }
    modifier onlyInspector() { //? onlyInspector is a modifier that allows only the inspector to call this function
        require(msg.sender == inspector, "Only inspector can call this function");
        _;
    }

    mapping(uint256 => bool) public isListed; //? mapping is a key-value pair data structure, uint256 is the key and bool is the value, isListed is the state variable that stores the status of the NFT
    mapping(uint256 => uint256) public purchasePrice; //? purchasePrice is the state variable that stores the purchase price of the NFT
    mapping(uint256 => uint256) public escrowAmount; //? escrowAmount is the state variable that stores the amount of money in escrow
    mapping(uint256 => address) public buyer; //? buyer is the state variable that stores the address of the buyer
    mapping(uint256 => bool) public inspectionPassed; //? inspectionPassed is the state variable that stores the status of the inspection
    mapping(uint256 => mapping(address => bool)) public approval; //? approval is the nested state variable that stores the address of the person who approved the transaction and the status of the approval

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

    function list(
        uint256 _nftID,
        address _buyer,
        uint256 _purchasePrice,
        uint256 _escrowAmount
    ) public payable onlySeller { //? payable is a modifier that allows the contract to receive and hold ether or cryptocurrency and onlySeller is a modifier that allows only the seller to call this function and this whole function is used to list the NFT for sale
        IERC721(nftAddress).transferFrom(msg.sender, address(this), _nftID); //? transferFrom is a function that transfers the NFT from the user's wallet to the escrow contract

        isListed[_nftID] = true; //? set the status of the NFT to true
        purchasePrice[_nftID] = _purchasePrice; //? set the purchase price of the NFT
        escrowAmount[_nftID] = _escrowAmount; //? set the amount of money in escrow
        buyer[_nftID] = _buyer; //? set the address of the buyer
    }

    //? Put the property under contract (only buyer - payable escrow)
    function depositEarnest(uint256 _nftID) public payable onlyBuyer(_nftID) { //? onlyBuyer is a modifier that allows only the buyer to call this function and this whole function is used to deposit the earnest money into the escrow
        require(isListed[_nftID], "NFT is not listed for sale");
        require(msg.value >= escrowAmount[_nftID], "Insufficient escrow amount");	//? require is a function that checks the condition and if the condition is false then it throws an error and stops the execution of the function
    }

    //? Update the Inspection status (only inspector)
    function updateInspectionStatus(uint256 _nftID, bool _inspectionPassed) public onlyInspector { //? this function is used to update the inspection status of the NFT
        inspectionPassed[_nftID] = _inspectionPassed;
    }

    //? Approve the Sale
    function approveSale(uint256 _nftID) public { //? this function is used to approve the sale transaction
        approval[_nftID][msg.sender] = true;
    }

    function getBalance() public view returns (uint256) { //? getBalance is a function that returns the balance of the contract
        return address(this).balance;
    }

    receive() external payable {} //? receive is a function that is called when the contract receives ether or cryptocurrency

    //? Finalize the Sale
    //: - Require inspection status (add more items here, like appraisal)
    //: - Require sale to be authorized
    //: - Require funds to be of correct amount
    //: - Transfer NFT to buyer
    //: - Transfer funds to seller
    function finalizeSale(uint256 _nftID) public {
        require(inspectionPassed[_nftID]);
        require(approval[_nftID][buyer[_nftID]]);
        require(approval[_nftID][seller]);
        require(approval[_nftID][lender]);
        require(address(this).balance >= purchasePrice[_nftID]);

        isListed[_nftID] = false; //? set the status of the NFT to false

        (bool success, ) = payable(seller).call{value: address(this).balance}(""); //? call is a function that calls the seller's address and transfers the funds to the seller
        require(success, "Transfer failed.");

        IERC721(nftAddress).transferFrom(address(this), buyer[_nftID], _nftID); //? transferFrom is a function that transfers the NFT from the escrow contract to the buyer's wallet
    }

    //? Cancel the Sale
    //: - If the inspection fails, then refund the buyer, otherwise send to seller
    function cancelSale(uint256 _nftID) public {
        if (inspectionPassed[_nftID] == false) {
            payable(buyer[_nftID]).transfer(address(this).balance); //? transfer is a function that transfers the funds from the escrow contract to the buyer's wallet
        } else {
            payable(seller).transfer(address(this).balance); //? transfer is a function that transfers the funds from the escrow contract to the seller's wallet
        }
    }
}
