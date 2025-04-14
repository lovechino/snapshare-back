const {Server} = require("socket.io")
const express = require("express")
const htpp = require("http")
const app = express()

const server = htpp.createServer(app)
const io = new Server(server,{
    cors: {
        origin: "https://snapsharemd.netlify.app",
        methods: ["GET", "POST"],
    }
})

const userSocketMap = {}

const getReceiverSocketId = (receiverId)=> userSocketMap[receiverId]

io.on('connection',(socket)=>{
    const userId = socket.handshake.query.userId
    if(userId){
        userSocketMap[userId] = socket.id
        console.log(`userId = ${userId},socketId = ${socket.id}`)
    }

    io.emit('getOnlineUsers',Object.keys(userSocketMap))

    socket.on('disconnect',()=>{
        if(userId){
            console.log(`userId = ${userId},socketId = ${socket.id}`)
            delete userSocketMap[userId]
        }
    })
})

module.exports = {app,server,io,getReceiverSocketId}