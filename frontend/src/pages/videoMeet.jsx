import React, { useState, useRef, useEffect } from "react";
import { TextField, Button, IconButton, Badge } from "@mui/material";
import { io } from "socket.io-client";

import styles from "../styles/videoComponent.module.css";

import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import { useNavigate } from "react-router-dom";
import {servers} from "../environment.js";
const server_url = servers.prod;

var connections = {};

const peerConfigConnections = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ]
};

const VideoMeetComponent = () => {

    var socketRef = useRef();
    let socketIdRef = useRef();
    let localVideoRef = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);
    let [audioAvaliable, setAudioAvailable] = useState(true);

    let [video, setVideo] = useState(undefined);
    let [audio, setAudio] = useState(undefined);

    let [screen, setScreen] = useState(false);
    let [showModal, setShowModal] = useState(true);
    let [screenAvailable, setScreenAvailable] = useState(false);

    let [messages, setMessages] = useState([]);
    let [message, setMessage] = useState("");
    let [newMessages, setNewMessages] = useState(0);

    let [askForUserName, setAskForUserName] = useState(true);
    let [username, setUserName] = useState("");

    const videoRef = useRef([]);

    let [videos, setVideos] = useState([]);


    // ---------------- PERMISSIONS ----------------

    const getPermissions = async () => {
        try {

            const videoPermission =
                await navigator.mediaDevices.getUserMedia({
                    video: true
                });

            if (videoPermission) {
                setVideoAvailable(true);

                videoPermission
                    .getTracks()
                    .forEach(track => track.stop());

            } else {
                setVideoAvailable(false);
            }


            const audioPermission =
                await navigator.mediaDevices.getUserMedia({
                    audio: true
                });

            if (audioPermission) {
                setAudioAvailable(true);

                audioPermission
                    .getTracks()
                    .forEach(track => track.stop());

            } else {
                setAudioAvailable(false);
            }


            if (navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);
            } else {
                setScreenAvailable(false);
            }


            const userMediaStream =
                await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });

            if (userMediaStream) {

                window.localStream = userMediaStream;

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject =
                        window.localStream;
                }
            }

        } catch (err) {
            console.log(err);
        }
    };


    // ---------------- INITIAL PERMISSION ----------------

    useEffect(() => {

        getPermissions();

        return () => {

            if (window.localStream) {

                window.localStream
                    .getTracks()
                    .forEach(track => track.stop());

            }
        };

    }, []);


    // ---------------- LOCAL STREAM ----------------

    let getUserMediaSuccess = (stream) => {

        window.localStream = stream;

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
        }
    };


    let getUserMedia = async () => {

        try {

            if (video !== undefined || audio !== undefined) {

                const stream =
                    await navigator.mediaDevices.getUserMedia({
                        video: video,
                        audio: audio
                    });

                getUserMediaSuccess(stream);

            } else {

                try {

                    let tracks =
                        localVideoRef.current.srcObject.getTracks();

                    tracks.forEach((track) => {
                        track.stop();
                    });

                } catch (e) {
                    console.log(e);
                }
            }

        } catch (e) {
            console.log(e);
        }
    };


    // ---------------- VIDEO / AUDIO TOGGLE ----------------

    useEffect(() => {

        if (window.localStream) {

            let videoTracks =
                window.localStream.getVideoTracks();

            let audioTracks =
                window.localStream.getAudioTracks();


            videoTracks.forEach((track) => {
                track.enabled = video;
            });


            audioTracks.forEach((track) => {
                track.enabled = audio;
            });
        }

    }, [video, audio]);


    // ---------------- LOCAL VIDEO AFTER UI CHANGES ----------------

    useEffect(() => {

        if (!askForUserName) {

            if (
                localVideoRef.current &&
                window.localStream
            ) {

                localVideoRef.current.srcObject =
                    window.localStream;

            }
        }

    }, [askForUserName]);


    // ---------------- CHAT ----------------

let addMessage = (data, sender, socketIdSender) => {
    setMessages((prevMessages) => [
        ...prevMessages,
        {
            sender: sender,
            data: data
        }
    ]);

    if (socketIdSender !== socketIdRef.current) {
        setNewMessages((prevMessages) => prevMessages + 1);
    }
};


    // ---------------- SIGNALING ----------------

    const gotMessageFromServer = (fromId, message) => {

        var signal = JSON.parse(message);

        var peer = connections[fromId];

        if (!peer) return;


        // SDP
        if (signal.sdp) {

            peer
                .setRemoteDescription(
                    new RTCSessionDescription(signal.sdp)
                )

                .then(() => {

                    if (signal.sdp.type === "offer") {
                        return peer.createAnswer();
                    }

                })

                .then((description) => {

                    if (description) {
                        return peer.setLocalDescription(
                            description
                        );
                    }

                })

                .then(() => {

                    if (
                        signal.sdp.type === "offer" &&
                        peer.localDescription
                    ) {

                        socketRef.current.emit(
                            "signal",
                            fromId,
                            JSON.stringify({
                                sdp: peer.localDescription
                            })
                        );
                    }

                })

                .catch(e => console.log(e));
        }


        // ICE
        if (signal.ice) {

            peer
                .addIceCandidate(
                    new RTCIceCandidate(signal.ice)
                )
                .catch(e => console.log(e));
        }
    };


    // ---------------- SOCKET SERVER ----------------

    let connectToSocketServer = () => {

        socketRef.current = io.connect(server_url, {
            secure: false
        });


        socketRef.current.on(
            "signal",
            gotMessageFromServer
        );


        socketRef.current.on("connect", () => {

            console.log(
                "Socket connected:",
                socketRef.current.id
            );


            socketIdRef.current =
                socketRef.current.id;


            socketRef.current.emit(
                "join-call",
                window.location.href
            );


            socketRef.current.on(
                "chat-message",
                addMessage
            );


            // USER LEFT
            socketRef.current.on(
                "user-left",
                (id) => {

                    setVideos((videos) => {

                        const updatedVideos =
                            videos.filter(
                                (video) =>
                                    video.socketId !== id
                            );

                        videoRef.current =
                            updatedVideos;

                        return updatedVideos;
                    });


                    if (connections[id]) {

                        connections[id].close();

                        delete connections[id];
                    }
                }
            );


            // USER JOINED
            socketRef.current.on(
                "user-joined",
                (id, clients) => {

                    clients.forEach(
                        (socketListId) => {

                            if (
                                socketListId ===
                                socketIdRef.current
                            ) {
                                return;
                            }


                            // CREATE PEER CONNECTION
                            connections[socketListId] =
                                new RTCPeerConnection(
                                    peerConfigConnections
                                );


                            // ICE CANDIDATE
                            connections[
                                socketListId
                            ].onicecandidate =
                                (event) => {

                                    if (
                                        event.candidate !=
                                        null
                                    ) {

                                        socketRef.current.emit(
                                            "signal",
                                            socketListId,
                                            JSON.stringify({
                                                ice: event.candidate
                                            })
                                        );
                                    }
                                };


                            // REMOTE STREAM
                            connections[
                                socketListId
                            ].onaddstream =
                                (event) => {

                                    let videoExists =
                                        videoRef.current.find(
                                            video =>
                                                video.socketId ===
                                                socketListId
                                        );


                                    if (videoExists) {

                                        setVideos(
                                            videos => {

                                                const updateVideos =
                                                    videos.map(
                                                        video =>
                                                            video.socketId ===
                                                            socketListId
                                                                ? {
                                                                      ...video,
                                                                      stream:
                                                                          event.stream
                                                                  }
                                                                : video
                                                    );


                                                videoRef.current =
                                                    updateVideos;

                                                return updateVideos;
                                            }
                                        );

                                    } else {

                                        let newVideo = {

                                            socketId:
                                                socketListId,

                                            stream:
                                                event.stream,

                                            autoPlay:
                                                true,

                                            playinline:
                                                true
                                        };


                                        setVideos(
                                            videos => {

                                                const updateVideos =
                                                    [
                                                        ...videos,
                                                        newVideo
                                                    ];


                                                videoRef.current =
                                                    updateVideos;

                                                return updateVideos;
                                            }
                                        );
                                    }
                                };


                            // ADD LOCAL STREAM TO PEER
                            if (
                                window.localStream !==
                                    undefined &&
                                window.localStream !==
                                    null
                            ) {

                                connections[
                                    socketListId
                                ].addStream(
                                    window.localStream
                                );
                            }

                        }
                    );


                    // CREATE OFFER
                    if (
                        id === socketIdRef.current
                    ) {

                        for (
                            let id2 in connections
                        ) {

                            if (
                                id2 ===
                                socketIdRef.current
                            ) {
                                continue;
                            }


                            connections[id2]
                                .createOffer()

                                .then(
                                    (description) => {

                                        return connections[
                                            id2
                                        ].setLocalDescription(
                                            description
                                        );
                                    }
                                )

                                .then(() => {

                                    socketRef.current.emit(
                                        "signal",
                                        id2,
                                        JSON.stringify({
                                            sdp:
                                                connections[
                                                    id2
                                                ].localDescription
                                        })
                                    );

                                })

                                .catch(
                                    e =>
                                        console.log(e)
                                );
                        }
                    }
                }
            );
        });


        socketRef.current.on(
            "connect_error",
            (error) => {

                console.log(
                    "Socket connection error:",
                    error.message
                );
            }
        );
    };


  

    let getMedia = () => {

        setVideo(videoAvailable);

        setAudio(audioAvaliable);
    };


    let routTo=useNavigate();

    const connect = () => {

        setAskForUserName(false);

        getMedia();

        connectToSocketServer();
    };


    let handleVideo = () => {

        setVideo(!video);
    };



    let handleAudio = () => {

        setAudio(!audio);
    }
   
    let sendMessage=()=>{
        socketRef.current.emit("chat-message",message,username);
        setMessage("");
    }

    let getDisplayMediaSuccess = async (stream) => {
    try {

        const screenTrack = stream.getVideoTracks()[0];

        // Show screen locally
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
        }

        // Replace camera track with screen track
        for (let id in connections) {

            if (id === socketIdRef.current) continue;

            const senders =
                connections[id].getSenders();

            const videoSender =
                senders.find(
                    sender =>
                        sender.track &&
                        sender.track.kind === "video"
                );

            if (videoSender) {
                await videoSender.replaceTrack(screenTrack);
            }
        }

        // When screen sharing is stopped
        screenTrack.onended = async () => {

            setScreen(false);

            try {

                // Get camera back
                const cameraStream =
                    await navigator.mediaDevices.getUserMedia({
                        video: video,
                        audio: audio
                    });

                window.localStream = cameraStream;

                // Show camera locally
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject =
                        cameraStream;
                }

                const cameraTrack =
                    cameraStream.getVideoTracks()[0];

                // Replace screen track with camera track
                for (let id in connections) {

                    if (id === socketIdRef.current) {
                        continue;
                    }

                    const senders =
                        connections[id].getSenders();

                    const videoSender =
                        senders.find(
                            sender =>
                                sender.track &&
                                sender.track.kind === "video"
                        );

                    if (videoSender) {
                        await videoSender.replaceTrack(
                            cameraTrack
                        );
                    }
                }

            } catch (e) {
                console.log(
                    "Error restoring camera:",
                    e
                );
            }
        };

    } catch (e) {
        console.log(
            "Screen share error:",
            e
        );
    }
};

    let getDisplayMedia = () => {

    if (screen === true) {

        if (navigator.mediaDevices.getDisplayMedia) {

            navigator.mediaDevices
                .getDisplayMedia({
                    video: true,
                    audio: true
                })
                .then(getDisplayMediaSuccess)
                .catch(e => {
                    console.log(
                        "Screen share cancelled:",
                        e
                    );

                    setScreen(false);
                });
        }
    }
};

  useEffect(() => {
        if (screen !== undefined) {
            getDisplayMedia();
        }
    }, [screen]);

    let handleScreen=()=>{
        setScreen(!screen)
    }
    let handleEndCall=()=>{
        try{
            let tracks=localVideoRef.current.srcObject.getTracks();
            tracks.forEach(track=>track.stop());
        }
        catch(e){

        }
        routTo("/home")
    }

    return (

        <div>

            {askForUserName === true ? (

                <div>

                    <h2>
                        Enter into Lobby
                    </h2>


                    <TextField
                        id="outlined-basic"
                        label="Username"
                        variant="outlined"
                        value={username}
                        onChange={(e) => {
                            setUserName(
                                e.target.value
                            );
                        }}
                    />


                    <Button
                        variant="contained"
                        onClick={connect}
                    >
                        Connect
                    </Button>


                    <div>

                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                        />

                    </div>

                </div>

            ) : (

                <div
                    className={
                        styles.meetVideoContainer
                    }
                >
                    {showModal ? 
                    <div className={styles.chatRoom}>
                        
                         <div className={styles.chatContainer}>
                        <h1>Chat</h1>

                     
                        <div className={styles.chattingDisplay}>
                             {messages.length>0 ?   
                            messages.map((item,index)=>{
                                return (<div style={{marginBottom:"20px"}} key={index}>
                                    <p style={{fontWeight:"bold"}}>{item.sender}</p>
                                    <p>{item.data}</p>
                                </div>)
                            }):<><p>No Messages Yet</p></>} 
                        </div> 

                        <div className={styles.chattingArea}>
                        <TextField  value={message} onChange={e=> {setMessage(e.target.value)}} id="outlined-basic" label="Enter New Message" variant="outlined" />
                        <Button variant="contained" onClick={sendMessage}>Send</Button>
                        </div>
                        </div>   



                    </div>
                    :<></>
                        }
                  

                    <div
                        className={
                            styles.buttonContainers
                        }
                    >


                        <IconButton
                            onClick={handleVideo}
                            style={{
                                color: "white"
                            }}
                        >

                            {video === true
                                ? <VideocamIcon />
                                : <VideocamOffIcon />
                            }

                        </IconButton>



                        <IconButton
                            style={{
                                color: "red"
                            }}
                            onClick={handleEndCall}
                        >

                            <CallEndIcon  />

                        </IconButton>



                        <IconButton
                            onClick={handleAudio}
                            style={{
                                color: "white"
                            }}
                        >

                            {audio === true
                                ? <MicIcon />
                                : <MicOffIcon />
                            }

                        </IconButton>


                  

                        {screenAvailable === true
                            ? (

                                <IconButton onClick={handleScreen}>
                                
                                    {screen === true
                                        ? <ScreenShareIcon />
                                        : <StopScreenShareIcon />
                                    }

                                </IconButton>

                            )
                            : <></>
                        }


                        {/* CHAT */}

                        <Badge
                            badgeContent={newMessages}
                            max={999}
                            color="secondary"
                        >

                            <IconButton
                                onClick={()=>{setShowModal(!showModal)}}
                                style={{
                                    color: "white"
                                }}
                            >

                                <ChatIcon />

                            </IconButton>

                        </Badge>

                    </div>


                    {/* LOCAL VIDEO */}

                    <video
                        className={
                            styles.meetUserVideo
                        }
                        ref={localVideoRef}
                        autoPlay
                        muted
                        playsInline
                    />


                    {/* REMOTE USERS */}

                    <div
                        className={
                            styles.conferenceView
                        }
                    >

                        {videos.map((video) => (

                            <div
                                key={video.socketId}
                            >

                                {/* <h2>
                                    {video.socketId}
                                </h2> */}


                                <video
                                    data-socket={
                                        video.socketId
                                    }

                                    ref={(ref) => {

                                        if (
                                            ref &&
                                            video.stream
                                        ) {

                                            ref.srcObject =
                                                video.stream;
                                        }

                                    }}

                                    autoPlay
                                    playsInline
                                />

                            </div>

                        ))}

                    </div>

                </div>
            )}

        </div>
    );
};

export default VideoMeetComponent;