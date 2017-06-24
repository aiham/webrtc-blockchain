import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import registerServiceWorker from './registerServiceWorker';
import './index.css';
import RTC from './RTC.js';

RTC.init();
ReactDOM.render(<App />, document.getElementById('root'));
registerServiceWorker();
