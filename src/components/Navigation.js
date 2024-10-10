import { toast } from "react-toastify";
import logo from "../assets/logo.svg";

const Navigation = ({ account, setAccount }) => {
	const connectHandler = async () => {
		try {
			const [account] = await window.ethereum.request({
				method: "eth_requestAccounts",
			});
			setAccount(account);
			toast.success("Metamask account connected successfully!");
		} catch (error) {
			console.error(error);
		}
	};

	return (
		<nav>
			<ul className="nav__links">
				<li>
					<a href="#">Buy</a>
				</li>
				<li>
					<a href="#">Rent</a>
				</li>
				<li>
					<a href="#">Sell</a>
				</li>
			</ul>

			<div className="nav__brand">
				<img src={logo} alt="Millow" />
				<h1>Millow</h1>
			</div>

			{account ? (
				<button type="button" className="nav__connect">
					{account.slice(0, 6)}...{account.slice(-4)}
				</button>
			) : (
				<button
					type="button"
					onClick={connectHandler}
					className="nav__connect"
				>
					Connect
				</button>
			)}
		</nav>
	);
};

export default Navigation;
