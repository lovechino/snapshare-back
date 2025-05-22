const mongoose = require("mongoose")

const messageSchema = mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    message: {
        type: String,
        // required: true
    },
    image: [{ 
        type: String,
        default: [] 
    }],
    audio : {
        type: String,
        default : ""
    }
})

const MessageSchema = mongoose.model("Message",messageSchema)
module.exports = MessageSchema