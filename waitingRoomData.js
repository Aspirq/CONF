let waitingRooms = {};

function getWaitingRooms() {
    return waitingRooms;
}

function setWaitingRoom(roomId, roomData) {
    waitingRooms[roomId] = roomData;
}

module.exports = { getWaitingRooms, setWaitingRoom };