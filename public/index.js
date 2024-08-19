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

async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        document.getElementById("video").srcObject = stream;
        peer = await createPeer();
        stream.getTracks().forEach(track => peer.addTrack(track, stream));
    } catch (error) {
        console.error('Erreur lors de l\'initialisation du flux média:', error);
        document.getElementById("text-container").innerHTML = "Erreur: Impossible d'initialiser le flux média.";
    }
}

async function handleNegotiationNeededEvent(peer) {
    try {
        const offer = await peer.createOffer({ 'offerToReceiveVideo': 1 });
        await peer.setLocalDescription(offer);

        const payload = {
            sdp: peer.localDescription,
            socket_id: socket_id
        };

        const { data } = await axios.post('/broadcast', payload);
        console.log(data.message);
        const desc = new RTCSessionDescription(data.data.sdp);
        broadcast_id = data.data.id;
        document.getElementById("text-container").innerHTML = "Streaming ID: " + broadcast_id;
        await peer.setRemoteDescription(desc).catch(e => console.log(e));

        // add local candidate to server
        localCandidates.forEach((e) => {
            socket.emit("add-candidate-broadcast", {
                id: broadcast_id,
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
        const connectionStatus = peer.connectionState;
        if (["disconnected", "failed", "closed"].includes(connectionStatus)) {
            console.log("Connexion perdue");
            document.getElementById("text-container").innerHTML = "Erreur: Connexion perdue.";
        } else {
            console.log("Connecté");
        }
    } catch (e) {
        console.error('Erreur lors du changement d\'état de la connexion:', e);
    }
};
