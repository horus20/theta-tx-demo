import {Tx} from './tx'
import {TxInput} from './txinput'
import {TxOutput} from './txoutput'
import {TxType} from './txtype'
import {Coins} from './coins'
import {EthereumTx} from './ethereumtx'
import BigNumber from "bignumber.js"
import RLP from 'eth-lib/lib/rlp';
import Bytes from 'eth-lib/lib/bytes';

export class SendTx extends Tx{
    constructor(senderAddr, receiverAddr, theta, tfuel, feeInTFuel, senderSequence){
        super();

        const ten18 = (new BigNumber(10)).pow(18) // 10^18, 1 Theta = 10^18 ThetaWei, 1 Gamma = 10^ TFuelWei
        const thetaWei = (new BigNumber(theta)).multipliedBy(ten18)
        const tfuelWei = (new BigNumber(tfuel)).multipliedBy(ten18)
        const feeInTFuelWei  = (new BigNumber(feeInTFuel)).pow(12) // Any fee >= 10^12 TFuelWei should work, higher fee yields higher priority

        this.fee = new Coins(new BigNumber(0), feeInTFuelWei);

        let txInput = new TxInput(senderAddr, thetaWei, tfuelWei.plus(feeInTFuelWei), senderSequence);
        this.inputs = [txInput];

        let txOutput = new TxOutput(receiverAddr, thetaWei, tfuelWei);
        this.outputs = [txOutput];
    }

    setSignature(signature){
        //TODO support multiple inputs
        let input = this.inputs[0];

        input.setSignature(signature);
    }

    signBytes(chainID){
        let input = this.inputs[0];

        // Detach the existing signatures from the input if any, so that we don't sign the signature
        let originalSignature = input.signature;
        input.signature = "";

        let encodedChainID = RLP.encode(Bytes.fromString(chainID));
        let encodedTxType = RLP.encode(Bytes.fromNumber(this.getType()));
        let encodedTx = RLP.encode(this.rlpInput());
        let payload = encodedChainID + encodedTxType.slice(2) + encodedTx.slice(2)

        // For ethereum tx compatibility, encode the tx as the payload
        let ethTxWrapper = new EthereumTx(payload);
        let signedBytes = RLP.encode(ethTxWrapper.rlpInput()); // the signBytes conforms to the Ethereum raw tx format

        //console.log("SendTx :: signBytes :: txRawBytes = " + signedBytes);

        // Attach the original signature back to the inputs
        input.signature = originalSignature;

        return signedBytes;
    }

    getType(){
        return TxType.TxTypeSend;
    }

    rlpInput(){
        let numInputs = this.inputs.length;
        let numOutputs = this.outputs.length;
        let inputBytesArray = [];
        let outputBytesArray = [];

        for(let i = 0; i < numInputs; i ++) {
            inputBytesArray[i] = this.inputs[i].rlpInput();
        }

        for (let i = 0; i < numOutputs; i ++) {
            outputBytesArray[i] = this.outputs[i].rlpInput();
        }

        let rlpInput = [
            this.fee.rlpInput(),
            inputBytesArray,
            outputBytesArray
        ];

        return rlpInput;
    }
}
