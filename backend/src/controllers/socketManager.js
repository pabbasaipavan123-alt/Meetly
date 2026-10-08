import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};

export const connectToSocket = (server) => {

    const io = new Server(server,{
        cors:{
            origin:"*",
            methods:["GET","POST"],
            allowedHeaders:["*"],
            credentials:true
        }
    });

    io.on("connection", (socket) => {
        console.log("SOMETHING CONNECTED");

        socket.on("join-call", (path) => {

            
            if (connections[path] === undefined) {
                connections[path] = [];
            }

            connections[path].push(socket.id);


            timeOnline[socket.id] = new Date();

            
            for (let a = 0; a < connections[path].length; a++) {

                io.to(connections[path][a]).emit(
                    "user-joined",
                    socket.id,
                    connections[path]
                );
            }

            if (messages[path]) {

                for (let a = 0; a < messages[path].length; a++) {

                    io.to(socket.id).emit(
                        "chat-message",
                        messages[path][a].data,
                        messages[path][a].sender,
                        messages[path][a]["socket-id-sender"]
                    );
                }
            }
        });


    
        socket.on("signal", (toId, message) => {

            io.to(toId).emit(
                "signal",
                socket.id,
                message
            );
        });


        socket.on("chat-message", (data, sender) => {

            const [matchingRoom, found] =
                Object.entries(connections).reduce(
                    ([room, isFound], [roomKey, roomValue]) => {

                        if (!isFound && roomValue.includes(socket.id)) {
                            return [roomKey, true];
                        }

                        return [room, isFound];

                    },
                    ["", false]
                );


        
            if (found) {

                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = [];
                }

                messages[matchingRoom].push({
                    sender: sender,
                    data: data,
                    "socket-id-sender": socket.id
                });

                console.log(
                    "message",
                    matchingRoom,
                    ":",
                    sender,
                    data
                );


                
                connections[matchingRoom].forEach((elem) => {

                    io.to(elem).emit(
                        "chat-message",
                        data,
                        sender,
                        socket.id
                    );

                });
            }
        });


      
        socket.on("disconnect", () => {

            
            const diffTime =
                Math.abs(
                    timeOnline[socket.id] - new Date()
                );

            console.log(
                "User was online for:",
                diffTime,
                "ms"
            );


            let key;

            for (const [roomKey, roomUsers] of Object.entries(connections)) {

                if (roomUsers.includes(socket.id)) {

                    key = roomKey;
                    break;
                }
            }


            if (key !== undefined) {

                connections[key].forEach((userId) => {

                    if (userId !== socket.id) {

                        io.to(userId).emit(
                            "user-left",
                            socket.id
                        );
                    }
                });


                const index =
                    connections[key].indexOf(socket.id);

                if (index !== -1) {
                    connections[key].splice(index, 1);
                }


                if (connections[key].length === 0) {
                    delete connections[key];
                }
            }


            delete timeOnline[socket.id];
        });

       });
    return io;
};