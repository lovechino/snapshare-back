const sharp = require('sharp');
const cloudinary = require("../Utils/Cloudinary")
const Post = require("../Schemas/post.schema")
const User = require("../Schemas/user.schema")
const Comment = require("../Schemas/comment.schema");
const UserSchema = require('../Schemas/user.schema');
const { getReceiverSocketId, io } = require('../Utils/Socket');
const addNewPost = async(req,res)=>{
    try{
        const {caption} = req.body 
        const img = req.file 
        const authorId = req.id 
        if(!img){
            return res.status(400).json({
                message: "Please upload an image"
            })
        }
        const optimizedImg = await sharp(img.buffer)
        .resize({width:800,height:800,fit:'inside'})
        .toFormat('jpeg',{quality:80})
        .toBuffer()
        
        const fileUri = `data:image/jpeg;base64,${optimizedImg.toString('base64')}`
        const cloudRes = await cloudinary.uploader.upload(fileUri)
        const post = await Post.create({
            caption : caption,
            image : cloudRes.secure_url,
            author : authorId
        })
        const user = await User.findById(authorId)
        if(user){
            user.posts.push(post._id)
            await user.save()
        }
        await post.populate({path:'author',select:'-password'})
        res.status(200).json({
            post
        })
       
    }catch(err){
        return res.status(401).json({
            message : err.message
        })
    }
}

const getAllPost = async(req,res)=>{
    try{
        // const posts = await Post.find().sort({createdAt:-1})
        // .populate({path:'author',select:'username profilePicture'})
        // .populate({
        //     path :'comments',
        //     sort : {createdAt : -1},
        //     populate :{
        //         path : 'author',
        //         select : 'username profilePicture'
        //     }
        // })
        // return res.status(200).json({
        //     posts
        // })

        const currentId = req.id

        const currentUser = await UserSchema.findById(currentId).select("-password").populate("following")
        const followingIds = currentUser.following.map((user)=>user?._id)

        const followers = await UserSchema.find({following : currentId}).select("-password")
        const mutualFollowings = followers.filter((followers)=> followingIds.some((followingId)=>followingId.equals(followers._id)))

        const mutualIds = mutualFollowings.map((user)=>user._id)
        const nonMutualFlws = followingIds.filter((followingId)=> !mutualIds.some((user)=>user.equals((followingId))))

        const mutualPost = await Post.find({author : {$in : mutualFollowings}})
        .sort({createdAt : -1}).populate({
            path : "author",
            select : "username profilePicture"
        }).populate({
            path : "comments",
            sort : {createdAt : -1},
            populate :{
                path : "author",
                select : "username profilePicture"
            }
        })

        const nonMutualPosts = await Post.find({author : {$in : nonMutualFlws}}).sort({createdAt : -1}).populate({
            path : "author",
            select : "username profilePicture"
        }).populate({
            path : "comments",
            sort : {createdAt : -1},
            populate :{
                path : "author",
                select : "username profilePicture"
            }
        })
        const otherPosts = await Post.find({author : {$nin : followingIds}}).sort({createdAt : -1}).populate({
            path : "author",
            select : "username profilePicture"
        }).populate({
            path : "comments",
            sort : {createdAt : -1},
            populate :{
                path : "author",
                select : "username profilePicture"
            }
        })
        const posts = [...mutualPost,...nonMutualPosts,...otherPosts]
        return res.status(200).json({
            posts
        })

    }catch(err){
        return res.status(401).json({
            message : err.message
        })
    }
}

const getUserPost = async(req,res)=>{
    try{
        const authorId = req.id 
        const posts = await Post.find({author : authorId}).sort({createdAt:-1}).populate({
            path:'author',
            select : 'username,profilePicture'
        }).populate(
            {
                path :'comments',
                sort : {createdAt : -1},
                populate :{
                    path : 'author',
                    select : 'username ,profilePicture'
                }
            }
        )
        return res.status(200).json({
            posts
        })
    }catch(err){
        return res.status(401).json({
            message : err.message
        })
    }
}

const likePost = async(req,res)=>{
    try{
        const yourId = req.id 
        const postId = req.params.id 
        const post = await Post.findById(postId)
        if(!post) return res.status(404).json({message : 'Post not found'})
        
        await post.updateOne({$addToSet:{likes : yourId}})
        await post.save()

        const user = await User.findById(yourId).select('username profilePicture')
        const postOwerId = post.author.toString()
        if(postOwerId !== yourId){
            const notification = {
                type : "like",
                userId : yourId,
                userDetails : user,
                postId,
                message : "your post was liked"
            }
            const postOwenerSocketio = getReceiverSocketId(postOwerId)
            io.to(postOwenerSocketio).emit('notification',notification)
        }

        return res.status(200).json({
            message :'Post liked'
        })
    }catch(err){
        return res.status(401).json({
            message : err.message
        })
    }
}

const dislikePost = async(req,res)=>{
    try{
        const yourId = req.id 
        const postId = req.params.id 
        const post = await Post.findById(postId)
        if(!post) return res.status(404).json({message : 'Post not found'})
        
        await post.updateOne({$pull:{likes : yourId}})
        await post.save()

        const user = await User.findById(yourId).select('username profilePicture')
        const postOwerId = post.author.toString()
        if(postOwerId !== yourId){
            const notification = {
                type : "dislike",
                userId : yourId,
                userDetails : user,
                postId,
                message : "your post was disliked"
            }
            const postOwenerSocketio = getReceiverSocketId(postOwerId)
            io.to(postOwenerSocketio).emit('notification',notification)
        }

        return res.status(200).json({
            message :'Post liked'
        })
    }catch(err){
        return res.status(401).json({
            message : err.message
        })
    }
}

const bookmarkPost = async(req,res)=>{
    try{
        const postId = req.params.id 
        const authorId = req.id 
        const post = await Post.findById(postId)
        if(!post) return res.status(404).json({message : 'Post not found'})
        
        const user = await User.findById(authorId)
        if(user.bookmarks.includes(post._id)){
            await user.updateOne({$pull :{bookmarks : post_.id}})
            await user.save()
            return res.status(200).json({message : 'Post unbookmarked'})
        }
        else{
            await user.updateOne({$addToSet :{bookmarks : post._id}})
            await user.save()
            return res.status(200).json({message : 'Post bookmarked'})
        }
    }catch(err){
        return res.status(401).json({
            message : err.message
        })
    }
}

const deletePost = async(req,res)=>{
    try{
        const postId = req.params.id 
        const authorId = req.id 
        const post = await Post.findById(postId)
        if(!post){
            return res.status(404).json({message : 'Post not found'})
        }
        if(post.author.toString() !== authorId){
            return res.status(401).json({message : 'You are not the author of this post'})
        }
        await Post.findByIdAndDelete(postId)
        let user = await UserSchema.findById(authorId)
        user.posts = user.posts.filter(id=>id.toString() !== postId)
        await user.save()

        await Comment.deleteMany({post : postId})
        return res.status(200).json({
            message : 'Post deleted'
        })
    }catch(err){
        return res.status(401).json({
            message : err.message
        })
    }
}

const addComment = async(req,res)=>{
    try{
        const postId = req.params.id 
        const commentYourId = req.id 
        const {text} = req.body 
        const post = await Post.findById(postId)
        if(!text){
            return res.status(400).json({message : 'Comment text is required'})
        }
        const comment = await Comment.create({
            text : text,
            author : commentYourId,
            post : postId
        })
        await comment.populate({
            path :'author',
            select :'username profilePicture'
        })
        post.comments.push(comment._id)
        await post.save()

        const userDetail = await UserSchema.findById(commentYourId).select('username profilePicture')
        const postOwerId = post?.author.toString()
        if(postOwerId !== commentYourId){
            const notification = {
                type : "comment",
                userId : commentYourId,
                userDetails : userDetail,
                postId,
                message : "comment"
            }
            const postOwenerSocketio = getReceiverSocketId(postOwerId)
            io.to(postOwenerSocketio).emit('notification',notification)
        }


        return res.status(200).json({
            comment
        })
    }catch(err){
        return res.status(401).json({
            message : err.message
        })
    }
}

const getComment = async(req,res)=>{
    try{
        const postId = req.params.id 
        const comments = await Comment.find({post : postId}).populate({
            path :'author',
            select : 'username profilePicture'
        })
        if(!comments){
            return res.status(404).json({message : 'No comments found for this post'})
        }
        return res.status(200).json({comments})
    }catch(err){
        return res.status(401).json({
            message : err.message
        })
    }
}

module.exports = {
    addNewPost,
    getAllPost,
    getUserPost,
    likePost,
    dislikePost,
    bookmarkPost,
    deletePost,
    addComment,
    getComment
}