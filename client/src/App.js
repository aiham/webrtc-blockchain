import React, { Component } from 'react';
import './App.css';
import RTC from './RTC.js';
import Blockchain from './Blockchain';
import CreateTransaction from './CreateTransaction.js';
import Wallet from './Wallet.js';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      walletId: '',
      peers: [],
    };
    this.cancelListen = Blockchain.listen(this.onBlockchainEvent);
  }

  componentDidMount() {
    Wallet.getId().then(walletId => this.setState({ walletId }));
  }

  onBlockchainEvent = event => {
    switch (event.type) {
      case 'peers':
        this.setState({ peers: event.peers });
        break;

      default:
        break;
    }
  }

  componentWillUnmount() {
    if (this.cancelListen) {
      this.cancelListen();
      delete this.cancelListen;
    }
  }

  sendMessage = id => {
    RTC.send(id, { foo: 'bar' });
  }

  onSubmitCreate = transaction => {
    Blockchain.addTransaction(transaction);
  }

  render() {
    return (
      <div className="App">
        <div className="App-header">
          <h2>Peer ID: {RTC.getId()}</h2>
          <h2>Wallet ID: {this.state.walletId}</h2>
        </div>
        <h3>Peers</h3>
        <div>
          {this.state.peers.map(({ peerId, walletId }) => (
            <div key={peerId} style={{marginBottom: '2em'}}>
              <div>Peer ID: {peerId}</div>
              <div>Wallet ID: {walletId}</div>
              <div><button onClick={() => this.sendMessage(peerId)}>Send Message</button></div>
            </div>
          ))}
        </div>
        <h3>Create Transaction</h3>
        <CreateTransaction onSubmit={this.onSubmitCreate} />
      </div>
    );
  }
}

export default App;
