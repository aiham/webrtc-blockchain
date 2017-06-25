import React, { Component } from 'react';
import './App.css';
import RTC from './RTC.js';
import Wallet from './Wallet.js';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      walletId: '',
      peers: [],
      messages: [],
    };
    this.cancelListen = RTC.listen(this.onRTC);
  }

  componentDidMount() {
    Wallet.getId().then(walletId => this.setState({ walletId }));
  }

  onRTC = ({ type, peers, message }) => {
    switch (type) {
      case 'ready':
        this.setState({}); // force render so we can display the ID
        break;

      case 'peers':
        this.setState({ peers: Object.keys(peers) });
        break;

      case 'message':
        this.setState({ messages: this.state.messages.concat(message) });
        break;

      default:
        console.warn(`Unknown RTC event type ${type}`);
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

  render() {
    return (
      <div className="App">
        <div className="App-header">
          <h2>Peer ID: {RTC.getId()}</h2>
          <h2>Wallet ID: {this.state.walletId}</h2>
        </div>
        <h3>Peers</h3>
        {this.state.peers.map(peerId => (
          <div key={peerId}>{peerId} <button onClick={() => this.sendMessage(peerId)}>Send Message</button></div>
        ))}
        <h3>Messages</h3>
        {this.state.messages.map(message => (
          <div key={message.id}><pre>{JSON.stringify(message)}</pre></div>
        ))}
      </div>
    );
  }
}

export default App;
