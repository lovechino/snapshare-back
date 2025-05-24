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
        const images = req.files; 
        const imageUrls = [];

        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, receiverId] }
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, receiverId],
                messages: []
            });
        }

        if (images && images.length > 0) {
            try {
                const uploadPromises = images.map(async (imageFile) => {
                    const optimizedImg = await sharp(imageFile.buffer)
                        .resize({ width: 800, height: 800, fit: 'inside' })
                        .toFormat('jpeg', { quality: 80 })
                        .toBuffer();

                    const fileUri = `data:image/jpeg;base64,${optimizedImg.toString('base64')}`;
                    const cloudRes = await cloudinary.uploader.upload(fileUri);
                    return cloudRes.secure_url;
                });

                const uploadedUrls = await Promise.all(uploadPromises);
                imageUrls.push(...uploadedUrls); 
            } catch (uploadErr) {
                console.error("Error processing and uploading images:", uploadErr);
                return res.status(500).json({ message: "Failed to process and upload images", error: uploadErr.message });
            }
        }

        const newMessage = new Message({
            senderId: senderId,
            receiverId: receiverId,
            message: message,
            image: imageUrls.length > 0 ? imageUrls : undefined // Lưu mảng URLs hoặc undefined nếu không có ảnh
        });

        try {
            await Promise.all([
                conversation.save(),
                newMessage.save()
            ]);
            conversation.messages.push(newMessage._id);
            await conversation.save();
        } catch (saveError) {
            console.error("Error saving message or conversation:", saveError);
            return res.status(500).json({ message: "Failed to save message or conversation", error: saveError.message });
        }

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

        res.status(200).json({ message: "Message sent successfully", newMessage });

    } catch (err) {
        console.error("Error sending message:", err);
        return res.status(500).json({ message: "Failed to send message", error: err.message });
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
        cloudRes = await cloudinary.uploader.upload(fileUri, { 
                resource_type: "auto",
            });
        audioUrl = cloudRes.secure_url
          
        const newMessage = await Message.create({
            senderId: senderId,
            receiverId: receiverId,
          
            audio: audioUrl
        })
        
        if (newMessage) {
            conversation.messages.push(newMessage._id);
        }
        await Promise.all([
            conversation.save(),
            newMessage.save()
        ])

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
        res.status(200).json({ message: "message sent successfully", newMessage});
      
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

const getConversations = async(req,res)=>{
    try{
        const userId = req.id;
        const conversations = await Conversation.find({
            participants: userId
        })
        .populate({
            path: 'participants',
            select: 'username profilePicture'
        })
        .populate({
            path: 'messages',
            options: { sort: { createdAt: -1 }, limit: 1 }
        })
        .sort({ updatedAt: -1 });

        // Transform conversations to only include other participant's info
        const transformedConversations = conversations.map(conversation => {
            const otherParticipant = conversation.participants.find(
                participant => participant._id.toString() !== userId
            );
            
            return {
                _id: conversation._id,
                participant: otherParticipant,
                // lastMessage: conversation.messages[0] || null,
                // updatedAt: conversation.updatedAt
            };
        });

        return res.status(200).json({
            conversations: transformedConversations
        });
    }catch(err){
        return res.status(500).json({
            message: err.message
        });
    }
}

module.exports = {
    sendMessage,
    getMessage,
    sendAudio,
    getConversations
}