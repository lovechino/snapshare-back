const express = require("express")
const dotenv = require("dotenv")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const { connectDb } = require("./Utils/Mongodb")
const cloudinary = require("./Utils/Cloudinary")
const userRouter = require("./Routers/user.router")
const postRouter = require("./Routers/post.route")
const messageRouter = require("./Routers/message.route")
const {app,server} = require("./Utils/Socket")



dotenv.config()

app.use(express.json())
app.use(cookieParser())
app.set("trust proxy", 1);
app.use(cors({
    origin :'https://snapshare-front.onrender.com',
     credentials: true
    }))
app.use(express.urlencoded({extended:true}))


app.use("/api/user",userRouter)
app.use("/api/post",postRouter)
app.use("/api/message",messageRouter)

server.listen(3000,()=>{
    connectDb()
})