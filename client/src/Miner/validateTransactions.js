import CryptoHelper from '../CryptoHelper.js';
import PublicKeys from '../PublicKeys.js';
import BytesHex from '../BytesHex.js';

const validateTransactions = transactions => Promise.all(
  transactions.map(({ from, transaction, signature }) => (
    PublicKeys.getKey(from)
      .then(publicKey => {
        const encodedTransaction = new TextEncoder().encode(JSON.stringify(transaction));
        return CryptoHelper.verify(
          publicKey,
          BytesHex.hexToBytes(signature),
          encodedTransaction
        );
      })
  ))
);

export default validateTransactions;
