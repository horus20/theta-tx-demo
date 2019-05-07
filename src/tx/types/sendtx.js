import {Tx} from './tx'
import {TxInput} from './txinput'
import {TxOutput} from './txoutput'
import {TxType} from './txtype'
import {Coins} from './coins'
import {EthereumTx} from './ethereumtx'
import BigNumber from "bignumber.js"
import RLP from 'rlp';
import Bytes from 'eth-lib/lib/bytes';

export class SendTx extends Tx{
    constructor(senderAddr, receiverAddr, thetaWei, tfuelWei, feeInTFuelWei, senderSequence){
        super();

        this.fee = new Coins(new BigNumber(0), new BigNumber(feeInTFuelWei));

        let txInput = new TxInput(senderAddr, new BigNumber(thetaWei), new BigNumber(tfuelWei).plus(new BigNumber(feeInTFuelWei)), senderSequence);
        this.inputs = [txInput];

        let txOutput = new TxOutput(receiverAddr, new BigNumber(thetaWei), new BigNumber(tfuelWei));
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

        let encodedChainID = RLP.encode(Bytes.fromString(chainID)).toString('hex');
        let encodedTxType = RLP.encode(Bytes.fromNumber(this.getType())).toString('hex');
        let encodedTx = RLP.encode(this.rlpInput()).toString('hex');

        let payload = '0x' + encodedChainID + encodedTxType + encodedTx

        // For ethereum tx compatibility, encode the tx as the payload
        let ethTxWrapper = new EthereumTx(payload);
        let signedBytes = RLP.encode(ethTxWrapper.rlpInput()).toString('hex'); // the signBytes conforms to the Ethereum raw tx format

        //console.log("SendTx :: signBytes :: txRawBytes = " + signedBytes);

        // Attach the original signature back to the inputs
        input.signature = originalSignature;

        return '0x' + signedBytes;
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
