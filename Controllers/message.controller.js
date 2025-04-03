const Conversation = require("../Schemas/conversation.schema")
const Message = require("../Schemas/message.schema")
const { getReceiverSocketId, io } = require("../Utils/Socket")
const sendMessage = async(req,res)=>{
    try{
        const senderId = req.id 
        const receiverId = req.params.id 
        const{message} = req.body
        let conversation = await Conversation.findOne({
            participants :{$all:[senderId,receiverId]}
        })
        if(!conversation){
            conversation = await Conversation.create({
                participants : [senderId,receiverId],
            })
        }
        const newMessage = await Message.create({
            senderId : senderId,
            receiverId : receiverId,
            message : message
        })
        if(newMessage){
            conversation.messages.push(newMessage._id)
        }
        await Promise.all(
            [
                 conversation.save(),
                 newMessage.save()
            ]
        )

        const receiverSocketId = getReceiverSocketId(receiverId)
        if(receiverSocketId){
            io.to(receiverSocketId).emit('newMessage',newMessage)
        }

        res.status(200).json({message:"message sent successfully",newMessage})
    }catch(err){
        return res.status(401).json({
            message : err.message
        })
    }
}

const getMessage = async(req,res)=>{
    try{
        const senderId = req.id
        const receiverId = req.params.id
        const conversation = await Conversation.findOne({
            participants:{$all:[senderId,receiverId]}
        }).populate('messages')
        if(!conversation){
            return res.status(200).json({messages:[]})
        }
        return res.status(200).json({
            messages : conversation?.messages
        })
    }catch(err){
        return res.status(401).json({
            message : err.message
        })
    }
}

module.exports = {
    sendMessage,
    getMessage
}