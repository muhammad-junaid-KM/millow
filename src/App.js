import { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { loadBlockchainData } from "./blockchain";

// Components
import Navigation from "./components/Navigation";
import Search from "./components/Search";
import Home from "./components/Home";

function App() {
	const [account, setAccount] = useState(null);
	const [provider, setProvider] = useState(null);
	const [escrow, setEscrow] = useState(null);
	const [homes, setHomes] = useState([]);
	const [home, setHome] = useState(null);
	const [toggle, setToggle] = useState(false);

	// Load blockchain data
	const initializeBlockchainData = async () => {
		try {
			await loadBlockchainData(
				setHomes,
				setEscrow,
				setAccount,
				setProvider
			);
			toast.success("Blockchain data loaded successfully!");
		} catch (error) {
			toast.error("Failed to load blockchain data. Please try again.");
		}
	};

	useEffect(() => {
		initializeBlockchainData();
	}, []);

	const togglePop = (home) => {
		setHome(home);
		setToggle(!toggle);
	};

	return (
		<div>
			<ToastContainer position="bottom-left" autoClose={3000} />
			<Navigation account={account} setAccount={setAccount} />
			<Search />

			<div className="cards__section">
				<h3>Homes for you</h3>
				<hr />
				<div className="cards">
					{homes.map((home, index) => (
						<div
							className="card"
							key={index}
							onClick={() => togglePop(home)}
						>
							<div className="card__image">
								<img src={home.image} alt="Home" />
							</div>
							<div className="card__info">
								<h4>{home.attributes[0].value} ETH</h4>
								<p>
									<strong>{home.attributes[2].value}</strong>{" "}
									bds |{" "}
									<strong>{home.attributes[3].value}</strong>{" "}
									ba |{" "}
									<strong>{home.attributes[4].value}</strong>{" "}
									sqft
								</p>
								<p>{home.address}</p>
							</div>
						</div>
					))}
				</div>
			</div>

			{toggle && (
				<Home
					home={home}
					escrow={escrow}
					provider={provider}
					togglePop={togglePop}
					account={account}
				/>
			)}
		</div>
	);
}

export default App;
