const { expect } = require("chai");
const { ethers } = require("hardhat");
const { describe } = require("mocha");

const tokens = (n) => {
	return ethers.utils.parseUnits(n.toString(), "ether");
};

describe("Escrow", () => {
	let buyer, seller, inspector, lender;
	let realEstate, escrow, result;

	beforeEach(async () => {
		//? Get the signers from ethers hardhat - 20 different fake metamask accounts on the blockchain network
		const signers = await ethers.getSigners();

		//? Setup accounts
		[buyer, seller, inspector, lender] = signers;

		//? Deploy Real Estate
		const RealEstate = await ethers.getContractFactory("RealEstate");
		realEstate = await RealEstate.deploy();

		//? Mint
		let transaction = await realEstate
			.connect(seller)
			.mint(
				"https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS"
			); //? minting the NFT token with the metadata on behalf of the seller
		await transaction.wait();

		const Escrow = await ethers.getContractFactory("Escrow");
		escrow = await Escrow.deploy(
			realEstate.address,
			seller.address,
			inspector.address,
			lender.address
		);

		//? Approve the property
		transaction = await realEstate
			.connect(seller)
			.approve(escrow.address, 1); //? approving the escrow contract to transfer the NFT token
		await transaction.wait(); //? waiting for the transaction to be mined

		//? List the property
		transaction = await escrow
			.connect(seller)
			.list(1, buyer.address, tokens(10), tokens(5)); //? listing the property
		await transaction.wait(); //? waiting for the transaction to be mined
	});

	describe("Deployment", () => {
		it("Returns NFT Address", async () => {
			result = await escrow.nftAddress();
			expect(result).to.be.equal(realEstate.address);
		});

		it("Returns Seller Address", async () => {
			result = await escrow.seller();
			expect(result).to.be.equal(seller.address);
		});

		it("Returns Inspector Address", async () => {
			result = await escrow.inspector();
			expect(result).to.be.equal(inspector.address);
		});

		it("Returns Lender Address", async () => {
			result = await escrow.lender();
			expect(result).to.be.equal(lender.address);
		});
	});

	describe("Listing", () => {
		it("Updates as Listed", async () => {
			//? Check Listing
			result = await escrow.isListed(1);
			expect(result).to.be.equal(true);
		});

		it("Updates Ownership", async () => {
			//? Check Ownership
			expect(await realEstate.ownerOf(1)).to.be.equal(escrow.address);
		});

		it("Returns Buyer Address", async () => {
			//? Check Buyer
			result = await escrow.buyer(1);
			expect(result).to.be.equal(buyer.address);
		});

		it("Returns Purchase Price", async () => {
			//? Check Purchase Price
			result = await escrow.purchasePrice(1);
			expect(result).to.be.equal(tokens(10));
		});

		it("Returns Escrow Amount", async () => {
			//? Check Escrow Amount
			result = await escrow.escrowAmount(1);
			expect(result).to.be.equal(tokens(5));
		});
	});

	describe("Deposit Earnest", () => {
		it("Updates as Earnest Deposited or Contract Balance", async () => {
			const transaction = await escrow
				.connect(buyer)
				.depositEarnest(1, { value: tokens(5) }); //? depositing the earnest money to the escrow contract for the property, curly bracket contains the value to be sent as a meta data
			await transaction.wait();

			result = await escrow.getBalance();
			expect(result).to.be.equal(tokens(5));
		});
	});

	describe("Inspection", () => {
		it("Updates as Inspected", async () => {
			const transaction = await escrow
				.connect(inspector)
				.updateInspectionStatus(1, true); //? inspecting the property
			await transaction.wait();

			result = await escrow.inspectionPassed(1);
			expect(result).to.be.equal(true);
		});
	});

	describe("Approval", () => {
		it("Updates as Approved", async () => {
			let transaction = await escrow.connect(buyer).approve(1); //? approving the property as buyer
			await transaction.wait();

			transaction = await escrow.connect(seller).approve(1); //? approving the property as seller
			await transaction.wait();

			transaction = await escrow.connect(lender).approve(1); //? approving the property as lender
			await transaction.wait();

			expect(await escrow.approval(1, buyer.address)).to.be.equal(true);
			expect(await escrow.approval(1, seller.address)).to.be.equal(true);
			expect(await escrow.approval(1, lender.address)).to.be.equal(true);
		});
	});

	describe("Sale", () => {
		beforeEach(async () => {
			let transaction = await escrow
				.connect(buyer)
				.depositEarnest(1, { value: tokens(5) });
			await transaction.wait();

			transaction = await escrow
				.connect(inspector)
				.updateInspectionStatus(1, true);
			await transaction.wait();

			transaction = await escrow.connect(buyer).approve(1);
			await transaction.wait();

			transaction = await escrow.connect(seller).approve(1);
			await transaction.wait();

			transaction = await escrow.connect(lender).approve(1);
			await transaction.wait();

			await lender.sendTransaction({
				to: escrow.address,
				value: tokens(5),
			}); //? sending the loan amount to the escrow contract

			transaction = await escrow.connect(seller).finalizeSale(1);
			await transaction.wait();
		});

		it("Updates Ownership", async () => {
			expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address);
		});

		it("Updates balance", async () => {
			expect(await escrow.getBalance()).to.be.equal(0);
		});
	});
});
