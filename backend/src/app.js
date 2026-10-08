import express from "express";
import {createServer} from "node:http";

import { Server } from "socket.io";



import cors from "cors";
import userRoutes from "./routes/user.routes.js"
import mongoose from "mongoose";
import {connectToSocket} from "./controllers/socketManager.js"


const app= express();
const server=createServer(app);
const io=connectToSocket(server);
app.set("port",(process.env.PORT||8000));
app.use(cors());
app.use(express.json({limit:"40kb"}));
app.use(express.urlencoded({limit:"40kb",extended:true}))
app.get("/home",(req,res)=>{
    res.send("HI ra puka");
});


app.use("/api/v1/users",userRoutes)
const start = async()=>{
    const connectionDb=await mongoose.connect("mongodb+srv://psai68481_db_user:XOqy65I58lOmBi2W@cluster0.x61eqio.mongodb.net/?appName=Cluster0")
    console.log("connection host:",connectionDb.connection.host)
    server.listen(app.get("port"),()=>{
        console.log("listening on port 8000");
    });
}


start();