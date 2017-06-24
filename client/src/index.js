import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import './index.css';
import Socket from './Socket.js';

Socket.init();
ReactDOM.render(<App />, document.getElementById('root'));
registerServiceWorker();
