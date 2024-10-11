import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import BigNumber from "bignumber.js";

import close from "../assets/close.svg";

const Home = ({ home, provider, account, escrowContract, togglePop }) => {
	const [hasBought, setHasBought] = useState(false);
	const [hasLended, setHasLended] = useState(false);
	const [hasInspected, setHasInspected] = useState(false);
	const [hasSold, setHasSold] = useState(false);

	const [buyer, setBuyer] = useState(null);
	const [lender, setLender] = useState(null);
	const [inspector, setInspector] = useState(null);
	const [seller, setSeller] = useState(null);

	const [owner, setOwner] = useState(null);

	const fetchDetails = async () => {
		try {
			console.log("account: ", account);
			// Fetch buyer address for the specific home
			const buyer = await escrowContract.methods.buyer(home.id).call();
			setBuyer(buyer);
			console.log("buyer: ", buyer);

			// Check if buyer has approved the sale
			const hasBought = await escrowContract.methods
				.approval(home.id, buyer)
				.call();
			setHasBought(hasBought);
			console.log("hasBought: ", hasBought);

			// Fetch seller address (constant for all homes)
			const seller = await escrowContract.methods.seller().call();
			setSeller(seller);
			console.log("seller: ", seller);

			// Check if seller has approved the sale
			const hasSold = await escrowContract.methods
				.approval(home.id, seller)
				.call();
			setHasSold(hasSold);
			console.log("hasSold: ", hasSold);

			// Fetch lender address (constant for all homes)
			const lender = await escrowContract.methods.lender().call();
			setLender(lender);
			console.log("lender: ", lender);

			// Check if lender has approved the sale
			const hasLended = await escrowContract.methods
				.approval(home.id, lender)
				.call();
			setHasLended(hasLended);
			console.log("hasLended: ", hasLended);

			// Fetch inspector address (constant for all homes)
			const inspector = await escrowContract.methods.inspector().call();
			setInspector(inspector);
			console.log("inspector: ", inspector);

			// Check if the inspection has passed for the given home ID
			const hasInspected = await escrowContract.methods
				.inspectionPassed(home.id)
				.call();
			setHasInspected(hasInspected);
			console.log("hasInspected: ", hasInspected);
		} catch (error) {
			toast.error("Failed to load details.");
			console.error(error);
		}
	};

	const fetchOwner = async () => {
		try {
			// Check if the home is listed
			const isListed = await escrowContract.methods
				.isListed(home.id)
				.call();
			console.log("isListed: ", isListed);

			// If the home is still listed, return early (no owner yet)
			if (isListed) return;

			// Fetch the buyer (who becomes the owner after purchase)
			const owner = await escrowContract.methods.buyer(home.id).call();
			console.log("owner: ", owner);
			setOwner(owner);
		} catch (error) {
			toast.error("Failed to fetch owner details.");
			console.error(error);
		}
	};

	const buyHandler = async () => {
		try {
			// Ensure account and web3 are available (wallet is connected)
			if (!account || !provider) {
				toast.error("Wallet not connected.");
				return;
			}

			// Get the escrow amount required for the home
			const escrowAmount = await escrowContract.methods
				.escrowAmount(home.id)
				.call();
			console.log("escrowAmount (in wei): ", escrowAmount.toString());

			// Estimate gas for depositing earnest money
			const gasEstimateEarnest = await escrowContract.methods
				.depositEarnest(home.id)
				.estimateGas({ from: account, value: escrowAmount });
			console.log("gasEstimateEarnest: ", gasEstimateEarnest);

			// Perform the transaction for depositing earnest money
			const earnestTransaction = await escrowContract.methods
				.depositEarnest(home.id)
				.send({
					from: account,
					value: escrowAmount, // Ensure value is sent in wei
					gas: gasEstimateEarnest || 3000000, // Set a manual gas limit if needed
				});
			console.log("Earnest deposit transaction: ", earnestTransaction);

			// Ensure earnest deposit transaction was successful before proceeding
			if (earnestTransaction) {
				// Estimate gas for approving the sale
				const gasEstimateApprove = await escrowContract.methods
					.approveSale(home.id)
					.estimateGas({ from: account });
				console.log("gasEstimateApprove: ", gasEstimateApprove);

				// Approve the sale
				const approveTransaction = await escrowContract.methods
					.approveSale(home.id)
					.send({
						from: account,
						gas: gasEstimateApprove || 3000000, // Set a manual gas limit if needed
					});
				console.log("Approve sale transaction: ", approveTransaction);

				// Optional: Refresh wallet balance after transaction
				const newBalance = await provider.eth.getBalance(account);
				console.log("New balance: ", newBalance);

				// Display success message
				toast.success("Successfully bought the property!");
				setHasBought(true);
			} else {
				toast.error(
					"Failed to deposit earnest money. Transaction aborted."
				);
			}
		} catch (error) {
			// Detailed error handling
			if (error.code === 4001) {
				// User rejected the transaction
				toast.error("Transaction rejected by the user.");
			} else {
				toast.error("Buying failed. Please try again.");
			}
			console.error("Error during transaction: ", error);
		}
	};

	const inspectHandler = async () => {
		try {
			// Log the connected account
			console.log("account: ", account);

			// Fetch the inspector address from the contract
			const inspector = await escrowContract.methods.inspector().call();
			console.log("inspector: ", inspector);

			// Check if the connected account is the inspector
			if (account.toLowerCase() !== inspector.toLowerCase()) {
				toast.error("Only the inspector can approve the inspection.");
				return;
			}

			// Estimate gas for updating inspection status
			const gasEstimate = await escrowContract.methods
				.updateInspectionStatus(home.id, true)
				.estimateGas({ from: account });
			console.log("gasEstimate: ", gasEstimate);

			// Approve the inspection if the gas estimate succeeds
			const inspectionTransaction = await escrowContract.methods
				.updateInspectionStatus(home.id, true)
				.send({ from: account, gas: gasEstimate });
			console.log("Inspection transaction: ", inspectionTransaction);

			// Ensure transaction was successful before proceeding
			if (inspectionTransaction) {
				toast.success("Inspection approved successfully!");
				setHasInspected(true);
			} else {
				toast.error("Inspection approval failed. Please try again.");
			}
		} catch (error) {
			toast.error("Failed to approve inspection.");
			console.error("Error during inspection approval: ", error);
		}
	};

	const lendHandler = async () => {
		try {
			// Get the total purchase price and the escrow amount for the home
			const purchasePrice = await escrowContract.methods
				.purchasePrice(home.id)
				.call();
			console.log("purchasePrice (in wei): ", purchasePrice.toString());

			const escrowAmount = await escrowContract.methods
				.escrowAmount(home.id)
				.call();
			console.log("escrowAmount (in wei): ", escrowAmount.toString());

			// Use BigNumber to subtract large values safely
			const lendAmount = new BigNumber(purchasePrice).minus(
				new BigNumber(escrowAmount)
			);
			console.log("lendAmount (in wei): ", lendAmount.toString());

			// Estimate gas for sending funds
			const gasEstimateSendFunds = await provider.eth.estimateGas({
				to: escrowContract.options.address,
				from: account,
				value: lendAmount.toString(), // Ensure this is in wei
			});
			console.log("gasEstimateSendFunds: ", gasEstimateSendFunds);

			// Send the loan funds
			const sendFundsTransaction = await provider.eth.sendTransaction({
				from: account,
				to: escrowContract.options.address,
				value: lendAmount.toString(), // Ensure value is in wei
				gas: gasEstimateSendFunds || 3000000, // Set a higher gas limit if needed
			});
			console.log("sendFundsTransaction: ", sendFundsTransaction);

			// If sending funds is successful, proceed to approve the sale
			if (sendFundsTransaction) {
				// Estimate gas for approving the sale as the lender
				const gasEstimateApprove = await escrowContract.methods
					.approveSale(home.id)
					.estimateGas({ from: account });
				console.log("gasEstimateApprove: ", gasEstimateApprove);

				// Approve the sale as the lender
				const approveTransaction = await escrowContract.methods
					.approveSale(home.id)
					.send({ from: account, gas: gasEstimateApprove });
				console.log("approveTransaction: ", approveTransaction);

				toast.success("Successfully lent funds and approved the sale!");
				setHasLended(true);
			} else {
				toast.error("Sending funds failed. Sale not approved.");
			}
		} catch (error) {
			toast.error("Lending failed. Please try again.");
			console.error(error);
		}
	};

	const sellHandler = async () => {
		try {
			// Estimate gas for approving the sale as the seller
			const gasEstimateApprove = await escrowContract.methods
				.approveSale(home.id)
				.estimateGas({ from: account });
			console.log("gasEstimateApprove: ", gasEstimateApprove);

			// Approve the sale as the seller
			const approveTransaction = await escrowContract.methods
				.approveSale(home.id)
				.send({ from: account, gas: gasEstimateApprove });
			console.log("Approve sale transaction: ", approveTransaction);

			// Ensure approve transaction was successful before finalizing the sale
			if (approveTransaction) {
				// Estimate gas for finalizing the sale
				const gasEstimateFinalize = await escrowContract.methods
					.finalizeSale(home.id)
					.estimateGas({ from: account });
				console.log("gasEstimateFinalize: ", gasEstimateFinalize);

				// Finalize the sale
				const finalizeTransaction = await escrowContract.methods
					.finalizeSale(home.id)
					.send({ from: account, gas: gasEstimateFinalize });
				console.log("Finalize sale transaction: ", finalizeTransaction);

				// If finalize transaction is successful
				if (finalizeTransaction) {
					toast.success("Successfully sold the property!");
					setHasSold(true);
				}
			} else {
				toast.error("Failed to approve the sale. Transaction aborted.");
			}
		} catch (error) {
			toast.error("Selling failed. Please try again.");
			console.error("Error during transaction: ", error);
		}
	};

	useEffect(() => {
		fetchDetails();
		fetchOwner();
	}, [hasSold, home]);

	return (
		<div className="home">
			<div className="home__details">
				<div className="home__image">
					<img src={home.image} alt="Home" />
				</div>
				<div className="home__overview">
					<h1>{home.name}</h1>
					<p>
						<strong>{home.attributes[2].value}</strong> bds |
						<strong>{home.attributes[3].value}</strong> ba |
						<strong>{home.attributes[4].value}</strong> sqft
					</p>
					<p>{home.address}</p>

					<h2>{home.attributes[0].value} ETH</h2>

					{owner ? (
						<div className="home__owned">
							Owned by{" "}
							{owner.slice(0, 6) + "..." + owner.slice(38, 42)}
						</div>
					) : (
						<div>
							{account &&
							inspector &&
							account.toLowerCase() ===
								inspector.toLowerCase() ? (
								<button
									className="home__buy"
									onClick={inspectHandler}
									disabled={hasInspected}
								>
									Approve Inspection
								</button>
							) : account &&
							  lender &&
							  account.toLowerCase() === lender.toLowerCase() ? (
								<button
									className="home__buy"
									onClick={lendHandler}
									disabled={hasLended}
								>
									Approve & Lend
								</button>
							) : account &&
							  seller &&
							  account.toLowerCase() === seller.toLowerCase() ? (
								<button
									className="home__buy"
									onClick={sellHandler}
									disabled={hasSold}
								>
									Approve & Sell
								</button>
							) : account &&
							  buyer &&
							  account.toLowerCase() === buyer.toLowerCase() ? (
								<button
									className="home__buy"
									onClick={buyHandler}
									disabled={hasBought}
								>
									Buy
								</button>
							) : (
								<div>
									<p>Not authorized for any action.</p>
								</div>
							)}

							<button className="home__contact">
								Contact agent
							</button>
						</div>
					)}

					<hr />

					<h2>Overview</h2>

					<p>{home.description}</p>

					<hr />

					<h2>Facts and features</h2>

					{home && home.attributes ? (
						<ul>
							{home.attributes.map((attribute, index) => (
								<li key={index}>
									<strong>{attribute.trait_type}</strong>:{" "}
									{attribute.value}
								</li>
							))}
						</ul>
					) : (
						<p>Loading home details...</p>
					)}
				</div>

				<button onClick={togglePop} className="home__close">
					<img src={close} alt="Close" />
				</button>
			</div>
		</div>
	);
};

export default Home;
