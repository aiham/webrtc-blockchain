import RTC from './RTC.js';
import uuid from 'uuid';

const REQUEST_TIMEOUT = 3000;

const peers = {};
const listeners = {};

const trigger = (type, event, callback) => {
  if (Array.isArray(listeners[type])) {
    listeners[type].forEach(listener => listener(event, callback));
  }
};

const listen = (type, listener) => {
  if (!(type in listeners)) {
    listeners[type] = [];
  }
  const typeListeners = listeners[type];
  typeListeners.push(listener);
  return () => {
    if (typeListeners.includes(listener)) {
      typeListeners.splice(typeListeners.indexOf(listener), 1);
    }
  };
};

const onRequest = listener => listen('request', listener);
const onInfo = listener => listen('info', listener);
const onConnected = listener => listen('connected', listener);
const onDisconnected = listener => listen('disconnected', listener);

const addPeer = id => {
  peers[id] = {
    requests: {},
    addRequest(requestId, deferred) {
      const timeoutId = setTimeout(() => {
        if (peers[id] && this.requests[requestId]) {
          this.requests[requestId].reject(new Error(`Request timed out: ${requestId}`));
          delete this.requests[requestId];
        }
      }, REQUEST_TIMEOUT);
      this.requests[requestId] = Object.assign({ timeoutId }, deferred);
    },
    respond(requestId, response) {
      if (peers[id] && this.requests[requestId]) {
        const request = this.requests[requestId];
        clearTimeout(request.timeoutId);
        request.resolve(response);
        delete this.requests[requestId];
      }
    },
    destroy() {
      if (peers[id] && this.requests) {
        Object.keys(this.requests).forEach(requestId => {
          const request = this.requests[requestId];
          clearTimeout(request.timeoutId);
          request.reject(new Error(`Peer disconnected while waiting for response to request: ${requestId}`));
          delete this.requests[requestId];
        });
      }
    },
  };
};

const removePeer = id => {
  if (peers[id]) {
    peers[id].destroy();
    delete peers[id];
  }
};

const isPeer = id => !!peers[id];

const onRTCEvent = event => {
  console.log('Peers.onRTCEvent', event);
  switch (event.type) {
    case 'dataChannelOpen':
      addPeer(event.id);
      trigger('connected', event.id, Object.keys(peers));
      break;

    case 'dataChannelClose':
      removePeer(event.id);
      trigger('disconnected', event.id, Object.keys(peers));
      break;

    case 'message':
      const { id, time, from, data } = event.message;
      switch (data.type) {
        case 'info':
          trigger('info', {
            id,
            time,
            from,
            info: data.info,
          });
          break;

        case 'request':
          trigger('request', {
            id,
            time,
            from,
            request: data.request,
          }, response => {
            if (isPeer(from)) {
              RTC.send(from, {
                type: 'response',
                requestId: data.requestId,
                response,
              });
            }
          });
          break;

        case 'response':
          if (isPeer(from)) {
            peers[from].respond(data.requestId, data.response);
          }
          break;

        default:
          break;
      }
      break;

    default:
      break;
  }
};

const init = () => {
  RTC.init();
  RTC.listen(onRTCEvent);
};

const sendRequest = (to, request) => {
  if (!isPeer(to)) {
    return Promse.reject(new Error(`Cannot send request to disconnected peer: ${to}`));
  }

  const deferred = {};
  const promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });

  const requestId = uuid();
  peers[to].addRequest(requestId, deferred);

  RTC.send(to, {
    type: 'request',
    requestId,
    request,
  });

  return promise;
};

const broadcastRequest = request => new Promise((resolve, reject) => {
  const results = {};
  const promises = Object.keys(peers).map(peerId => {
    const clear = promise => {
      promises.splice(promise.indexOf(promise), 1);
    };
    const resolveIfComplete = () => {
      if (!promises.length) {
        if (Object.keys(results).length > 0) {
          resolve(results);
        } else {
          reject(new Error('Broadcast request failed with no results'));
        }
      }
    };
    const promise = sendRequest(peerId, request);
    promise.then(result => {
      clear(promise);
      results[peerId] = result;
      resolveIfComplete();
    }, err => {
      clear(promise);
      resolveIfComplete();
    });
    return promise;
  });
  if (!promises.length) {
    reject(new Error('Cannot broadcast request without any connected peers'));
  }
});

const sendInfo = (to, info) => {
  if (isPeer(to)) {
    RTC.send(to, {
      type: 'info',
      info,
    });
  }
};

const broadcastInfo = info => {
  RTC.broadcast({ type: 'info', info });
};

export default {
  init,
  sendRequest,
  sendInfo,
  broadcastRequest,
  broadcastInfo,
  onRequest,
  onInfo,
  onConnected,
  onDisconnected,
};
