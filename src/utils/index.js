import Web3 from "web3";
import realEstateAbi from "../abis/RealEstate.json";
import escrowAbi from "../abis/Escrow.json";
import { toast } from "react-toastify";

export const connectWallet = async ({
	setError,
	setWeb3Provider,
	setAccount,
}) => {
	// Check if MetaMask is available
	if (
		typeof window !== "undefined" &&
		typeof window.ethereum !== "undefined"
	) {
		try {
			// Create Web3 instance
			const web3 = new Web3(window.ethereum);

			// Request account access
			const accounts = await window.ethereum.request({
				method: "eth_requestAccounts",
			});

			if (accounts.length === 0) {
				throw new Error("No accounts found");
			}

			// Set the initial account
			setAccount(accounts[0]);
			setWeb3Provider(web3); // Set the Web3 provider

			// Listen for account changes
			window.ethereum.on("accountsChanged", (accounts) => {
				if (accounts.length === 0) {
					setError("Please connect to MetaMask");
					toast.error("Please connect to MetaMask");
				} else {
					setAccount(accounts[0]); // Set the new active account
					toast.success("Account switched!");
				}
			});

			toast.success("Wallet connected successfully!");
		} catch (err) {
			setError(err.message);
			toast.error(`Wallet connection failed: ${err.message}`);
		}
	} else {
		setError("MetaMask not installed");
		toast.error("MetaMask not installed");
	}
};

export const loadDataToBlockchain = async ({
	setError,
	setHomes,
	setEscrow,
}) => {
	try {
		const web3 = new Web3("http://127.0.0.1:8545/");
		const networkId = await web3.eth.net.getId();
		const realEstateContract = new web3.eth.Contract(
			realEstateAbi,
			"0x5FbDB2315678afecb367f032d93F642f64180aa3"
		);
		const escrowContract = new web3.eth.Contract(
			escrowAbi,
			"0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
		);
		const totalSupply = await realEstateContract.methods
			.totalSupply()
			.call();
		const homes = [];
		for (let i = 1; i <= totalSupply; i++) {
			const uri = await realEstateContract.methods.tokenURI(i).call();
			const response = await fetch(uri);
			const metaData = await response.json();
			homes.push(metaData);
		}
		setHomes(homes);
		setEscrow(escrowContract);
		console.log("homes: ", homes);
		toast.success("Load data successfully!");
	} catch (error) {
		setError("Load data error");
	}
};
