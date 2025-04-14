const sharp = require("sharp")
const cloudinary = require("../Utils/Cloudinary")
const Conversation = require("../Schemas/conversation.schema")
const Message = require("../Schemas/message.schema")
const UserSchema = require("../Schemas/user.schema")
const { getReceiverSocketId, io } = require("../Utils/Socket")
const sendMessage = async(req,res)=>{
    try {
        const senderId = req.id;
        const receiverId = req.params.id;
        const { message } = req.body;
        const image = req?.file;
        let cloudRes;

        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] }
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, receiverId],
                messages: [] 
            });
        }

        let imageUrl = "";
        if (image) {
            try {
                const optimizedImg = await sharp(image?.buffer)
                    .resize({ width: 800, height: 800, fit: 'inside' })
                    .toFormat('jpeg', { quality: 80 })
                    .toBuffer();

                const fileUri = `data:image/jpeg;base64,${optimizedImg.toString('base64')}`;
                cloudRes = await cloudinary.uploader.upload(fileUri);
                imageUrl = cloudRes?.secure_url;
            } catch (uploadErr) {
                console.error("Error uploading image:", uploadErr);
                return res.status(500).json({ message: "Failed to upload image" });
            }
        }

        const newMessage = await Message.create({
            senderId: senderId,
            receiverId: receiverId,
            message: message,
            image: imageUrl
        });

        if (newMessage) {
            conversation.messages.push(newMessage._id);
        }

        await Promise.all([
            conversation.save(),
            newMessage.save()
        ]);

        const receiverSocketId = getReceiverSocketId(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('newMessage', newMessage);
        }

        const senderUser = await UserSchema.findById(senderId).select("username profilePicture").lean();
        if (receiverSocketId && senderUser) {
            io.to(receiverSocketId).emit('notiMessage', {
                type: 'newMessage',
                senderId: senderId,
                senderUsername: senderUser.username,
                senderProfilePicture: senderUser.profilePicture
            });
        }

        res.status(200).json({ message: "message sent successfully", newMessage });

    } catch (err) {
        console.error("Error sending message:", err);
        return res.status(500).json({
            message: err.message
        });
    }
}

const sendAudio = async(req,res)=>{
    try{
        const senderId = req.id 
        const receiverId = req.params.id;
        const audio = req?.file;
        // const {message} = req.body 

        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] }
        })
       
        let cloudRes 
        let audioUrl 
        const fileUri = `data:audio/mp3;base64,${audio?.buffer.toString('base64')}`;
        
        res.json({
            audio
        })
        // if(audio){
          
        //     cloudRes = await cloudinary.uploader.upload(fileUri, { 
        //         resource_type: "auto",
        //     });
        //     audioUrl = cloudRes.secure_url
        // }
      
        
        // const newMessage = await Message.create({
        //     senderId: senderId,
        //     receiverId: receiverId,
        //     // message: message ,
        //     audio: audioUrl 
        // })
        // if (newMessage) {
        //     conversation.messages.push(newMessage._id);
        // }
        // await Promise.all([
        //     conversation.save(),
        //     newMessage.save()
        // ])

        // const receiverSocketId = getReceiverSocketId(receiverId);
        // if (receiverSocketId) {
        //     io.to(receiverSocketId).emit('newMessage', newMessage);
        // }

        // const senderUser = await UserSchema.findById(senderId).select("username profilePicture").lean();
        // if (receiverSocketId && senderUser) {
        //     io.to(receiverSocketId).emit('notiMessage', {
        //         type: 'newMessage',
        //         senderId: senderId,
        //         senderUsername: senderUser.username,
        //         senderProfilePicture: senderUser.profilePicture
        //     });
        // }
        
        // res.status(200).json({ message: "message sent successfully", newMessage });
    }catch(err){
        return res.status(500).json({
            message: err.message
        });
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
    getMessage,
    sendAudio
}