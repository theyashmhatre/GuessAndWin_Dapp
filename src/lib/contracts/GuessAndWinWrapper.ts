import Web3 from 'web3';
import * as GuessAndWinJSON from '../../../build/contracts/GuessAndWin.json';
import { GuessAndWin } from '../../types/GuessAndWin';

const DEFAULT_SEND_OPTIONS = {
    gas: 6000000
};

export class GuessAndWinWrapper {
    web3: Web3;

    contract: GuessAndWin;

    address: string;

    constructor(web3: Web3) {
        this.web3 = web3;
        this.contract = new web3.eth.Contract(GuessAndWinJSON.abi as any) as any;
    }

    get isDeployed() {
        return Boolean(this.address);
    }

    async getStoredValue(fromAddress: string) {
        const data = await this.contract.methods.get().call({ from: fromAddress });

        return parseInt(data, 10);
    }

    async setStoredValue(value: number, fromAddress: string) {
        const tx = await this.contract.methods.set(value).send({
            ...DEFAULT_SEND_OPTIONS,
            from: fromAddress,
            value
        });

        return tx;
    }

    async getBalance(fromAddress: string) {
        const data = await this.contract.methods.getBalance().call({ from: fromAddress });

        return Number(data);
    }

    async setBalance(value: number, fromAddress: string) {
        const data = await this.contract.methods.getBalance().call({ from: fromAddress });

        const tx = await this.contract.methods.setBalance(Number(data) + Number(value)).send({
            ...DEFAULT_SEND_OPTIONS,
            from: fromAddress
        });

        return tx;
    }

    async deploy(fromAddress: string) {
        const tx = this.contract
            .deploy({
                data: GuessAndWinJSON.bytecode,
                arguments: []
            })
            .send({
                ...DEFAULT_SEND_OPTIONS,
                from: fromAddress
            });

        let transactionHash: string = null;
        tx.on('transactionHash', (hash: string) => {
            transactionHash = hash;
        });

        const contract = await tx;

        this.useDeployed(contract.options.address);

        return transactionHash;
    }

    useDeployed(contractAddress: string) {
        this.address = contractAddress;
        this.contract.options.address = contractAddress;
    }
}
