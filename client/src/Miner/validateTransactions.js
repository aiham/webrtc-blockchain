import CryptoHelper from '../CryptoHelper.js';
import PublicKeys from '../PublicKeys.js';
import BytesHex from '../BytesHex.js';

const validateTransactions = transactions => Promise.all(
  transactions.map(({ from, isMinerFee, transaction, signature }, index) => (
    PublicKeys.getKey(from)
      .then(publicKey => {
        const encodedTransaction = new TextEncoder().encode(JSON.stringify(transaction));
        return CryptoHelper.verify(
          publicKey,
          BytesHex.hexToBytes(signature),
          encodedTransaction
        );
      })
      .then(result => {
        if (result && isMinerFee && index !== (transactions.length - 1)) {
          return false;
        }
        return result;
      })
  ))
);

export default validateTransactions;
