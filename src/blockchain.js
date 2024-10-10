import { ethers } from "ethers";
import RealEstate from "./abis/RealEstate.json";
import Escrow from "./abis/Escrow.json";
import config from "./config.json";
import { toast } from "react-toastify";

// Initialize contracts and fetch data
export const loadBlockchainData = async (
	setHomes,
	setEscrow,
	setAccount,
	setProvider
) => {
	try {
		const provider = new ethers.providers.Web3Provider(window.ethereum);
		setProvider(provider);

		const network = await provider.getNetwork();
		const realEstate = new ethers.Contract(
			config[network.chainId].realEstate.address,
			RealEstate,
			provider
		);

		const totalSupply = await realEstate.totalSupply();
		const homes = [];

		for (let i = 1; i <= totalSupply; i++) {
			const uri = await realEstate.tokenURI(i);
			const response = await fetch(uri);
			const metaData = await response.json();
			homes.push(metaData);
		}
		setHomes(homes);

		const escrow = new ethers.Contract(
			config[network.chainId].escrow.address,
			Escrow,
			provider
		);
		setEscrow(escrow);

		// Handle account change
		window.ethereum.on("accountsChanged", async () => {
			const accounts = await window.ethereum.request({
				method: "eth_accounts",
			});
			const account = ethers.utils.getAddress(accounts[0]);
			setAccount(account);
			toast.success("Account changed successfully!");
		});
	} catch (error) {
		console.error("Error loading blockchain data: ", error);
		throw new Error("Failed to load blockchain data.");
	}
};
