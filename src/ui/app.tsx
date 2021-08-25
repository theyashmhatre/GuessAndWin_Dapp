/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import { ToastContainer, toast } from 'react-toastify';
import './app.scss';
import 'react-toastify/dist/ReactToastify.css';
import { PolyjuiceHttpProvider } from '@polyjuice-provider/web3';
import { AddressTranslator } from 'nervos-godwoken-integration';

import { Button, Navbar, Container, Modal } from 'react-bootstrap';
import { GuessAndWinWrapper } from '../lib/contracts/GuessAndWinWrapper';
import { CONFIG } from '../config';

async function createWeb3() {
    // Modern dapp browsers...
    if ((window as any).ethereum) {
        const godwokenRpcUrl = CONFIG.WEB3_PROVIDER_URL;
        const providerConfig = {
            rollupTypeHash: CONFIG.ROLLUP_TYPE_HASH,
            ethAccountLockCodeHash: CONFIG.ETH_ACCOUNT_LOCK_CODE_HASH,
            web3Url: godwokenRpcUrl
        };

        const provider = new PolyjuiceHttpProvider(godwokenRpcUrl, providerConfig);
        const web3 = new Web3(provider || Web3.givenProvider);

        try {
            // Request account access if needed
            await (window as any).ethereum.enable();
        } catch (error) {
            // User denied account access...
        }

        return web3;
    }

    console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
    return null;
}

export function App() {
    const [web3, setWeb3] = useState<Web3>(null);
    const [contract, setContract] = useState<GuessAndWinWrapper>();
    const [accounts, setAccounts] = useState<string[]>();
    const [l2Balance, setL2Balance] = useState<bigint>();
    const [existingContractIdInputValue, setExistingContractIdInputValue] = useState<string>();
    const [storedValue, setStoredValue] = useState<number | undefined>();
    const [gameBalance, setGameBalance] = useState<number | undefined>();
    const [deployTxHash, setDeployTxHash] = useState<string | undefined>();
    const [polyjuiceAddress, setPolyjuiceAddress] = useState<string | undefined>();
    const [transactionInProgress, setTransactionInProgress] = useState(false);
    const [modalShow, setModalShow] = useState(false);
    const toastId = React.useRef(null);
    const [newStoredNumberInputValue, setNewStoredNumberInputValue] = useState<
        number | undefined
    >();

    useEffect(() => {
        if (accounts?.[0]) {
            const addressTranslator = new AddressTranslator();
            setPolyjuiceAddress(addressTranslator.ethAddressToGodwokenShortAddress(accounts?.[0]));
        } else {
            setPolyjuiceAddress(undefined);
        }
    }, [accounts?.[0]]);

    useEffect(() => {
        if (transactionInProgress && !toastId.current) {
            toastId.current = toast.info(
                'Transaction in progress. Confirm MetaMask signing dialog and please wait...',
                {
                    position: 'top-right',
                    autoClose: false,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    closeButton: false
                }
            );
        } else if (!transactionInProgress && toastId.current) {
            toast.dismiss(toastId.current);
            toastId.current = null;
        }
    }, [transactionInProgress, toastId.current]);

    const account = accounts?.[0];

    async function deployContract() {
        const _contract = new GuessAndWinWrapper(web3);

        try {
            setDeployTxHash(undefined);
            setTransactionInProgress(true);

            const transactionHash = await _contract.deploy(account);

            setDeployTxHash(transactionHash);
            setExistingContractAddress(_contract.address);
            toast(
                'Successfully deployed a smart-contract. You can now proceed to get or set the value in a smart contract.',
                { type: 'success' }
            );
        } catch (error) {
            console.error(error);
            toast.error(
                'There was an error sending your transaction. Please check developer console.'
            );
        } finally {
            setTransactionInProgress(false);
            getBalance();
        }
    }

    async function getStoredValue() {
        const value = await contract.getStoredValue(account);
        toast('Successfully read latest stored value.', { type: 'success' });

        setStoredValue(value);
        return value;
    }
    async function generateRandomNumber() {
        const random = Math.floor(Math.random() * 1000);
        setNewStoredValue(random);
        getBalance();
    }
    async function getBalance() {
        const value = await contract.getBalance(account);
        console.log(value);
        // toast('Successfully read latest stored value.', { type: 'success' });

        setGameBalance(value);
    }

    async function setExistingContractAddress(contractAddress: string) {
        const _contract = new GuessAndWinWrapper(web3);
        _contract.useDeployed(contractAddress.trim());

        setContract(_contract);
        setStoredValue(undefined);
        getBalance();
    }

    async function setNewStoredValue(x: number) {
        try {
            setTransactionInProgress(true);
            await contract.setStoredValue(Number(x), account);
            toast(
                'Successfully generated and stored a random value. You can refresh the read value now manually.',
                { type: 'success' }
            );
        } catch (error) {
            console.error(error);
            toast.error(
                'There was an error sending your transaction. Please check developer console.'
            );
        } finally {
            setTransactionInProgress(false);
        }
    }

    async function setNewBalance(x: number) {
        try {
            setTransactionInProgress(true);
            await contract.setBalance(x, account);
            toast(
                'Successfully updated your balance. You can refresh the read value now manually.',
                { type: 'success' }
            );
        } catch (error) {
            console.error(error);
            toast.error(
                'There was an error sending your transaction. Please check developer console.'
            );
        } finally {
            setTransactionInProgress(false);
            getBalance();
        }
    }

    async function checkResult() {
        console.log(newStoredNumberInputValue);
        const randomNumber = await getStoredValue();
        const userGuess = newStoredNumberInputValue;
        const difference = Math.abs(Number(userGuess) - Number(randomNumber));
        console.log(randomNumber, userGuess, difference);
        let reward = 0;

        if (difference === 0) {
            reward = 1000;
        } else if (difference <= 10) {
            reward = 100;
        } else if (difference <= 100) {
            reward = 10;
        } else {
            reward = 1;
        }

        setNewBalance(reward);
    }

    useEffect(() => {
        if (web3) {
            return;
        }

        (async () => {
            const _web3 = await createWeb3();
            setWeb3(_web3);

            const _accounts = [(window as any).ethereum.selectedAddress];
            setAccounts(_accounts);
            console.log({ _accounts });

            if (_accounts && _accounts[0]) {
                const _l2Balance = BigInt(await _web3.eth.getBalance(_accounts[0]));
                setL2Balance(_l2Balance);
            }
        })();
    });

    const LoadingIndicator = () => <span className="rotating-icon">⚙️</span>;

    return (
        <div>
            <Navbar bg="dark" variant="dark">
                <Container>
                    <Navbar.Brand href="#home"> <h1>Guess and Win 🎉</ h1> </Navbar.Brand>
                    <Navbar.Toggle />
                    <Navbar.Collapse className="justify-content-end">
                        <Navbar.Text>
                            Your ETH address: <b>{accounts?.[0]}</b>
                            <br />
                            Your Polyjuice address: <b>{polyjuiceAddress || ' - '}</b>
                            <br />
                            Nervos Layer 2 balance:{' '}
                            <b>{l2Balance ? (l2Balance / 10n ** 8n).toString() : <LoadingIndicator />} CKB</b>
                        </Navbar.Text>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
            <br />
            <div className="secondaryBody">
                <h2 className="text-center">
                    Game Balance:{' '}
                    <b>{gameBalance || gameBalance === 0 ? gameBalance.toString() : <LoadingIndicator />} GUESS</b>
                </h2>
                <br />
                <br />
                Deployed contract address: <b>{contract?.address || '-'}</b> <br />
                Deploy transaction hash: <b>{deployTxHash || '-'}</b>
                <br />
                <hr />
                <p>
                    The 'Deploy Contract' button will deploy a new contract of the game. If you already own a contract, feel free to use it below. &nbsp;&nbsp;
                </p>
                <h3 className="text-center">Rules 👇</h3>
                <ul class="text-center">
                    Next, you choose a number and click on 'Guess' button.<br />
                    You generate a random number first.<br />
                    You earn GUESS tokens according to how close your chosen number was to the actual number<br />
                    <br />
                    <li>
                        Correct Answer: <b>1000 GUESS</b><br />
                        A difference of 10 or less: <b>100 GUESS</b><br />
                        A difference of 100 or less: <b>10 GUESS</b><br />
                        Anything greater, you earn <b>1 GUESS</b> token<br />
                        <b>Nobody loses 😋</b>
                    </li>
                </ul>
                <br />
                <br />
                <div className="text-center">
                    <Button onClick={deployContract} disabled={!l2Balance}>
                        Deploy contract
                    </Button>
                    &nbsp;or&nbsp;
                    <input
                        placeholder="Existing contract id"
                        onChange={e => setExistingContractIdInputValue(e.target.value)}
                    />
                    <Button
                        disabled={!existingContractIdInputValue || !l2Balance}
                        variant="primary"
                        onClick={() => setExistingContractAddress(existingContractIdInputValue)}
                    >
                        Use existing contract
                    </Button>
                    <br />
                    <br />
                    <br />
                    <Button onClick={generateRandomNumber} variant="dark" disabled={!contract}>
                        Generate a random number
                    </Button>
                    {storedValue ? <>&nbsp;&nbsp;Last generated value: {storedValue.toString()}</> : null}
                    <br />
                    <br />
                    <br />
                    <input
                        type="number"
                        onChange={e => setNewStoredNumberInputValue(parseInt(e.target.value, 10))}
                    />
                    <Button onClick={checkResult} disabled={!contract}>
                        Guess!
                    </Button>
                </div>
                <br />
                <br />
                <br />
                <br />
                <hr />
                The contract is deployed on Nervos Layer 2 - Godwoken + Polyjuice. After each
                transaction you might need to wait up to 120 seconds for the status to be reflected.
                <ToastContainer />
            </div>
        </div>
    );
}
