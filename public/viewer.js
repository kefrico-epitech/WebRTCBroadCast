const configurationPeerConnection = {
    iceServers: [
        { urls: "stun:stun.stunprotocol.org" },  // Serveur STUN
        {
            urls: "turn:numb.viagenie.ca",  // Serveur TURN
            username: "webrtc@live.com",
            credential: "muazkh"
        }
    ]
};

async function handleNegotiationNeededEvent(peer) {
    try {
        const offer = await peer.createOffer({ 'offerToReceiveVideo': 1 });
        await peer.setLocalDescription(offer);
        const payload = {
            sdp: peer.localDescription,
            broadcast_id: broadcast_id,
            socket_id: socket_id
        };
        const { data } = await axios.post('/consumer', payload);
        console.log(data.message);
        consumer_id = data.data.id;

        const desc = new RTCSessionDescription(data.data.sdp);
        await peer.setRemoteDescription(desc).catch(e => console.log(e));

        // send local candidate to server
        localCandidates.forEach((e) => {
            socket.emit("add-candidate-consumer", {
                id: consumer_id,
                candidate: e
            });
        });

        // add remote candidate to local
        remoteCandidates.forEach((e) => {
            peer.addIceCandidate(new RTCIceCandidate(e));
        });

    } catch (error) {
        console.error('Erreur lors de la négociation SDP:', error);
        document.getElementById("text-container").innerHTML = "Erreur: Impossible de négocier la connexion.";
    }
}

peer.onicecandidateerror = (e) => {
    console.error('Erreur lors de la collecte des ICE candidates:', e);
    document.getElementById("text-container").innerHTML = "Erreur: Problème avec les ICE candidates.";
};

peer.oniceconnectionstatechange = (e) => {
    try {
        const connectionStatus = peer.iceConnectionState;
        if (["disconnected", "failed", "closed"].includes(connectionStatus)) {
            console.log("ICE Connection failed");
            document.getElementById("text-container").innerHTML = "Erreur: Connexion ICE échouée.";
        } else {
            console.log("ICE Connection state:", connectionStatus);
        }
    } catch (e) {
        console.error('Erreur lors du changement d\'état de la connexion ICE:', e);
    }
};
