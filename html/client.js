// Подключение к серверу Socket.IO
const socket = io();

//let localStream;
//let peerConnection;

// Запрос разрешения на использование видео и аудио
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then((stream) => {
    // Отображение локального видео
    const localVideo = document.createElement('video');
    localVideo.srcObject = stream;
    localVideo.autoplay = true;
    document.getElementById('localVideoContainer').appendChild(localVideo);

    // Отправка сигнала серверу о наличии локального потока
    socket.emit('localStreamAvailable');

    // Подключение к удаленному потоку при его наличии
    socket.on('remoteStreamAvailable', () => {
      // Установка соединения WebRTC
      peerConnection = new RTCPeerConnection(configuration);

      // Добавление локального потока
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // Обработка удаленного потока
      peerConnection.ontrack = (event) => {
        const remoteVideo = document.createElement('video');
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.autoplay = true;
        document.getElementById('remoteVideoContainer').appendChild(remoteVideo);
      };

      // Обработка кандидатов для установки соединения
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('iceCandidate', event.candidate);
        }
      };

      // Создание и отправка оффера
      peerConnection.createOffer()
        .then((offer) => {
          return peerConnection.setLocalDescription(offer);
        })
        .then(() => {
          socket.emit('offer', peerConnection.localDescription);
        });
    });
  })
  .catch((error) => {
    console.error('Ошибка получения доступа к видео и аудио:', error);
  });

// Обработка оффера от удаленного участника
socket.on('offer', (offer) => {
  // Установка соединения WebRTC
  peerConnection = new RTCPeerConnection(configuration);

  // Запрос разрешения на использование видео и аудио
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
      // Добавление локального потока
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });

      // Обработка удаленного потока
      peerConnection.ontrack = (event) => {
        const remoteVideo = document.createElement('video');
        remoteVideo.srcObject = event.streams[0];
        remoteVideo.autoplay = true;
        document.getElementById('remoteVideoContainer').appendChild(remoteVideo);
      };

      // Обработка кандидатов для установки соединения
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('iceCandidate', event.candidate);
        }
      };

      // Создание и отправка ответа
      const remoteDescription = new RTCSessionDescription(offer);
      peerConnection.setRemoteDescription(remoteDescription);
      peerConnection.createAnswer()
        .then((answer) => {
          return peerConnection.setLocalDescription(answer);
        })
        .then(() => {
          socket.emit('answer', peerConnection.localDescription);
        });
    })
    .catch((error) => {
      console.error('Ошибка получения доступа к видео и аудио:', error);
    });
});

// Обработка кандидатов для установки соединения
socket.on('iceCandidate', (event) => {
  const candidate = new RTCIceCandidate(event);
  console.log(event);
  peerConnection.addIceCandidate(candidate);
});
