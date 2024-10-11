import { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { loadBlockchainData } from "./blockchain";

// Components
import Navigation from "./components/Navigation";
import Search from "./components/Search";
import Home from "./components/Home";
import { connectWallet, loadDataToBlockchain } from "./utils";

function App() {
	const [account, setAccount] = useState(null);
	const [web3Provider, setWeb3Provider] = useState(null);
	const [escrow, setEscrow] = useState(null);
	const [homes, setHomes] = useState([]);
	const [home, setHome] = useState(null);
	const [toggle, setToggle] = useState(false);
	const [error, setError] = useState(null);

	useEffect(() => {
		connectWallet({ setError, setWeb3Provider, setAccount });
		loadDataToBlockchain({ setError, setHomes, setEscrow });
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
					escrowContract={escrow}
					provider={web3Provider}
					togglePop={togglePop}
					account={account}
				/>
			)}
		</div>
	);
}

export default App;
