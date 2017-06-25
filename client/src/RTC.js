import Socket from './Socket.js';
import uuid from 'uuid';

const peers = {};
const dataChannels = {};
const listeners = [];

const trigger = event => {
  listeners.forEach(listener => listener(event));
};

const listen = callback => {
  listeners.push(callback);
  return () => {
    listeners.splice(listeners.indexOf(callback), 1);
  };
};

const pcConfig = {
  'iceServers': [
    {'urls': 'stun:stun.services.mozilla.com'},
    {'urls': 'stun:stun.l.google.com:19302'},
  ],
};

const errorHandler = error => {
  console.error(error);
};

const handleLocalDescription = (to, description) => {
  const pc = peers[to];
  return pc.setLocalDescription(description)
    .then(() => {
      const sdp = pc.localDescription;
      Socket.signal({ type: 'sdp', to, sdp });
    });
};

const addDataChannel = (id, channel) => {
  channel.onopen = event => {
    trigger({ type: 'dataChannelOpen', id });
    console.log(`Data channel opened with ${id}`, event);
  };
  channel.onerror = event => {
    console.error(`Error on data channel with ${id}`, event);
  };
  channel.onclose = () => {
    trigger({ type: 'dataChannelClose', id });
    console.log(`Data channel with ${id} closed`);
  };
  channel.onmessage = event => {
    console.log(`Received message on data channel from ${id}`, event);
    let data
    try {
      data = JSON.parse(event.data);
    } catch (e) {
      console.error('Failed to parse message data', event.data);
      return;
    }
    trigger({
      type: 'message',
      message: { id: uuid(), time: +new Date(), from: id, data }
    });
  };
  dataChannels[id] = channel;
};

const createPeerConnection = (to, withOffer) => {
  console.log(`Creating peer connection with ${to} ${withOffer ? 'with' : 'without'} offer`);
  const pc = new RTCPeerConnection(pcConfig);

  const generateOffer = () => {
    if (!dataChannels[to]) {
      const channel = pc.createDataChannel('messages');
      addDataChannel(to, channel);
    }
    pc.createOffer()
      .then(description => handleLocalDescription(to, description))
      .catch(errorHandler);
  };

  pc.addEventListener('icecandidate', event => {
    const { candidate } = event;
    if (candidate) {
      Socket.signal({ type: 'candidate', to, candidate });
    }
  });

  pc.addEventListener('iceconnectionstatechange', (...args) => (
    console.log('iceconnectionstatechange', ...args)
  ));
  pc.addEventListener('error', (...args) => console.log('error', ...args));
  pc.addEventListener('icegatheringstatechange', (...args) => (
    console.log('icegatheringstatechange', ...args)
  ));
  pc.addEventListener('signalingstatechange', (...args) => (
    console.log('signalingstatechange', ...args)
  ));
  pc.addEventListener('close', (...args) => console.log('close', ...args));

  if (withOffer) {
    pc.addEventListener('negotiationneeded', generateOffer);
    generateOffer();
  } else {
    pc.addEventListener('datachannel', ({ channel }) => {
      console.log('ondatachannel');
      addDataChannel(to, channel);
    });
  }

  peers[to] = pc;
  trigger({ type: 'peers', peers });
  return pc;
};

const destroyPeerConnection = (to) => {
  console.log(`Destroying peer connection with ${to}`);
  if (dataChannels[to]) {
    dataChannels[to].close();
    delete dataChannels[to];
  }
  if (peers[to]) {
    peers[to].close();
    delete peers[to];
    trigger({ type: 'peers', peers });
  }
};

const handleRemoteSdp = (to, sdp) => {
  if (sdp.type === 'offer' && !peers[to]) {
    createPeerConnection(to, false);
  }
  const pc = peers[to];
  pc.setRemoteDescription(new RTCSessionDescription(sdp))
    .then(() => {
      if (sdp.type === 'offer') {
        return pc.createAnswer()
          .then(description => handleLocalDescription(to, description));
      }
    })
    .catch(errorHandler);
};

const handleCandidate = (to, candidate) => {
  const pc = peers[to];
  pc.addIceCandidate(new RTCIceCandidate(candidate))
    .catch(errorHandler);
};

const init = () => {
  Socket.init();
  Socket.onReady(() => {
    Socket.listen(({ type, from, to, candidate, sdp }) => {
      console.log(`Got message of type ${type} from ${from} to ${to}`);
      switch (type) {
        case 'join':
          createPeerConnection(from, true);
          break;

        case 'leave':
          destroyPeerConnection(from);
          break;

        default:
          if (to !== Socket.getId()) {
            return;
          }
          switch (type) {
            case 'candidate':
              handleCandidate(from, candidate);
              break;

            case 'sdp':
              handleRemoteSdp(from, sdp);
              break;

            default:
              console.warn(`Unknown signal type ${type}`);
          }
      }
    });

    trigger({ type: 'ready' });
  });

  window.addEventListener('unload', () => {
    Object.keys(peers).concat(Object.keys(dataChannels)).forEach(destroyPeerConnection);
  });
};

const send = (to, data) => {
  const channel = dataChannels[to];
  if (channel) {
    channel.send(JSON.stringify(data));
  }
};

const broadcast = data => {
  Object.keys(dataChannels).forEach(to => send(to, data));
};

export default { init, listen, send, broadcast, getId: Socket.getId };
