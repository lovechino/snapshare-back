const user = require("../Schemas/user.schema")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const cloudinary = require("../Utils/Cloudinary")
const dataUri = require("../Utils/Datauri")
const PostSchema = require("../Schemas/post.schema")
const UserSchema = require("../Schemas/user.schema")
const { SendEmail } = require("../Utils/Nodemailer")
const ResetSchema = require("../Schemas/reset.schema")
const Register = async(req,res)=>{
    try{
        const {username,email,password,gender} = req.body
        if(!username || !email || !password){
            return res.status(400).json({msg:"Please fill in all fields"})
        }
        const userExist = await user.findOne({email : email})
        if(userExist){
            return res.status(400).json({msg:"Email already exists"})
            }
        const hassPass = await bcrypt.hash(password,10)
        const createNewUser = await user.create({
            username : username,
            email : email,
            password : hassPass,
            gender : gender
        })
        return res.status(201).json({msg:"User created successfully"})
        console.log(userExist)
        
    }catch(err){
        return res.status(401).json({
            message:err.message
        })
    }
}

const Login = async(req,res)=>{
    try{
        const {email,password} = req.body
        if(!email || !password){
            return res.status(400).json({msg:"Please fill in all fields"})
        }
        let getUser = await user.findOne({email : email})
        if(!getUser){
            return res.status(400).json({msg:"Invalid email or password"})
        }
        const isMatch = await bcrypt.compare(password,getUser.password)
        if(!isMatch){
            return res.status(400).json({msg:"Invalid password"})
        }
        const token = await jwt.sign({userId : getUser._id},process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1d'})
        const popolatedPosts = await Promise.all(
            getUser.posts.map(async(postId)=>{
                const post = await PostSchema.findById(postId)
                if(post?.author.equals(getUser._id)){
                    return post
                }
                return null
            })
        )
        const populateBookmarks = await Promise.all(
            getUser.bookmarks.map(async(postId)=>{
                const post = await PostSchema.findById(postId) 
                if(post?.author.equals(getUser._id)){
                    return post
                }
                return null
            })
        )
        getUser = {
            _id :getUser._id,
            username : getUser.username,
            email : getUser.email,
            posts : popolatedPosts,
            bookmarks : populateBookmarks ,
            bookmarksId : getUser.bookmarks,
            profilePicture : getUser.profilePicture,
            bio : getUser.bio,
            gender : getUser.gender,
            following : getUser.following
        }
        return res.cookie('token',token,
            { 
            //  httpOnly: true, 
              sameSite: 'none', 
              maxAge: 1 * 24 * 60 * 60 * 1000,
              secure: true,
              domain : ".onrender.com",
              path: '/'
            }
        ).json({
           user: getUser
        })
    }catch(err){
        return res.status(401).json({
            message:err.message
        })
    }
}
const logout = async(req,res)=>{
    try{
        return res.cookie("token","",{maxAge : 0}).json({
            msg : "Logged out successfully"
        })
    }catch(err){
        return res.status(401).json({
            message:err.message
        })
    }
}

const getProfile = async(req,res)=>{
    try{
        const userId = req.params.id 
        let getUser = await user.findById(userId).select('-password').populate({
            path : 'posts',
            createdAt : -1
        }).populate('bookmarks')
        return res.status(200).json({
            getUser
        })
    }catch(err){
        return res.status(401).json({
            message:err.message
        })
    }
}

const editProfile = async(req,res)=>{
    try{
        const userId = req.id
        const{bio,gender} = req.body 
        const profilePicture = req.file 
        let cloudResponse
        if(profilePicture){
            const fileUri = dataUri(profilePicture)
            cloudResponse = await cloudinary.uploader.upload(fileUri)
        }
        const getUser = await user.findById(userId).select('-password')
        if(!user){
            return res.status(404).json({
                message : "User not found"
            })
        }
        if(bio) getUser.bio =bio
        if(gender) getUser.gender = gender
        if(profilePicture) getUser.profilePicture = cloudResponse.secure_url
        await getUser.save()
        return res.status(200).json({
            getUser
        }) 
    }catch(err){
        return res.status(401).json({
            message:err.message
        })                          
    }
}

const getSuggestUsers = async(req,res)=>{
    try{
        // const suggestedUsers = await user.find({_id : {$ne : req.id}}).select("-password")
        // if(!suggestedUsers){
        //     return res.status(404).json({
        //         message : "No users found"
        //     })
        // }
        // return res.status(200).json({
        //     users : suggestedUsers
        // })
        const currentUser = await UserSchema.findById(req.id)
        if(!currentUser){
            return res.status(404).json({
                message : "User not found"
            })
        }
        const followingIds = currentUser.following.map((id)=>id.toString())
        const suggestUser = await UserSchema.find({
            _id : { $ne : req.id , $nin : followingIds }
        }).limit(10)
        return res.status(200).json({
            users : suggestUser
        })
    }catch(err){
        return res.status(401).json({
            message:err.message
        })
    }
}
const followOrunfollow = async(req,res)=>{
    try{
        const yourId = req.id 
        const connectId = req.params.id 
        if(yourId === connectId){
            return res.status(400).json({
                message : "You can't follow yourself"
            })
        }
        const yourAcc = await user.findById(yourId).select("-password")
        const targetUser = await user.findById(connectId).select("-password")
        if(!yourAcc || !targetUser){
            return res.status(404).json({
                message : "User not found"
            })
        }
        const isFollowing = yourAcc.following.includes(connectId)
        if(isFollowing){
            //unfollow
            await Promise.all([
                user.updateOne({_id : yourId},{$pull : {following : connectId}}),
                user.updateOne({_id:connectId},{$pull : {followers : yourId}})
            ])
            return res.status(200).json({
                message : "Unfollowed successfully"
            })
        }
        else{{
            //follow 
            await Promise.all([
                user.updateOne({_id:yourId},{$push : {following :connectId}}),
                user.updateOne({_id:connectId},{$push :{followers : yourId}})
            ])
            return res.status(200).json({
                message : "Followed successfully"
            })
        }}
    }catch(err){
        return res.status(401).json({
            message : err.message
        })
    }
}

const mutualFollowers = async (req,res)=>{
    try{
        const userId = req.id 
        const user = await UserSchema.findById(userId).select('-password')
        .populate(
            {
                path : 'following',
                select : 'username profilePicture'
            }
        ).populate(
            {
                path : 'followers',
                select : 'username profilePicture'
            }
        )

        const mutualFollowers = user.following.filter(followed =>{
            return user.followers.some(follower => follower._id.equals(followed._id))
        })

        return res.status(200).json({
            mutual: mutualFollowers  
        })
    }catch(err){
        return res.status(401).json({
            message : err.message
        })
    }
}


const SearchUser = async(req,res)=>{
    try{
        const searchUser = req.body.username
        const currentId = req.id
        const currentUsername = await UserSchema.findById(currentId).select("username")
        const user = await UserSchema.find({
            username : { $regex : searchUser , $options: 'i' , $ne : currentUsername.username }
        }).select("username profilePicture")
        return res.status(200).json({
            user
        })
    }catch(err){
        return res.status(401).json({
            message : err.message
        })
    }
}

const getFolloworFler = async(req,res)=>{
    try{
        const userId = req.id
        const action = req.body.action 
        const id = req.params.id 
        const userResponse = await UserSchema.findById(id).populate({
            path : action,
            select : "username profilePicture"
        })
        return res.status(200).json({
            user : userResponse
        })
    }catch(err){
        return res.status(401).json({
            message : err.message
        })
    }
}



const ResetPassword = async(req,res)=>{
    const {email} = req.body
    const subject = "Reset Password"
 const user = await UserSchema.findOne({email:email}).select("_id")
 if(user){
    const data = await ResetSchema.create({
        res : user._id
     })
     const message = `<!DOCTYPE html>
     <html lang="vi">
     <head>
         <meta charset="UTF-8">
         <meta name="viewport" content="width=device-width, initial-scale=1.0">
         <title>Liên Kết Đặt Lại Mật Khẩu</title>
         <style>
             body {
                 font-family: Arial, sans-serif;
                 background-color: #f4f4f4;
                 display: flex;
                 justify-content: center;
                 align-items: center;
                 min-height: 100vh;
                 margin: 0;
             }
             .container {
                 background-color: #fff;
                 padding: 30px;
                 border-radius: 8px;
                 box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                 text-align: center;
             }
             h1 {
                 color: #333;
                 margin-bottom: 20px;
             }
             .link-box {
                 background-color: #e3f2fd;
                 padding: 15px;
                 border-radius: 5px;
                 margin-bottom: 20px;
                 font-size: 1.1em;
             }
             .link-box a {
                 color: #1976d2;
                 text-decoration: none;
                 font-weight: bold;
             }
             .link-box a:hover {
                 text-decoration: underline;
             }
             p {
                 color: #555;
                 margin-bottom: 10px;
             }
             .important {
                 font-weight: bold;
                 color: #d32f2f;
             }
             .note {
                 font-size: 0.9em;
                 color: #777;
                 margin-top: 20px;
             }
         </style>
     </head>
     <body>
         <div class="container">
             <h1>Yêu Cầu Đặt Lại Mật Khẩu</h1>
             <p>Xin chào,</p>
             <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản của mình.</p>
             <p>Vui lòng nhấp vào liên kết dưới đây để tiến hành đặt lại mật khẩu:</p>
             <div class="link-box">
                 <a href="http://localhost:5173/change-password/${data?._id}">${email}</a>
             </div>
             <p><span class="important">Lưu ý quan trọng:</span> Liên kết này sẽ hết hạn sau một khoảng thời gian nhất định. Vui lòng thực hiện đặt lại mật khẩu trong thời gian quy định.</p>
             <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Tài khoản của bạn vẫn an toàn.</p>
             <div class="note">
                 Đây là email được gửi tự động, vui lòng không trả lời.
             </div>
         </div>
     </body>
     </html>`;
    await SendEmail({message,subject,email})
    return res.status(200).send({message: 'Email is sent'});
 }else{
    return res.status(401).json({
        message: "Email isn't exist"
    })
 }
//  const data = await ResetSchema.create({
//     res : user._id
//  })
//  console.log(data)
}

const ChangePassword = async(req,res)=>{
    const password = req.body.password 
    const id = req.params.id 
    const resetValue = await ResetSchema.findById(id).populate({
        path: 'res',
        select : "_id"
    })
    // console.log(resetValue.res._id)
    if(resetValue){
        const hassPass = await bcrypt.hash(password,10)
        await UserSchema.findByIdAndUpdate(resetValue.res._id,{$set:{password:hassPass}})
        await ResetSchema.findByIdAndDelete(id)
        return res.status(200).json({
            message : "Password changed successfully"
        })
    }else{
        return res.status(401).json({
            message: "Reset Value isn't exist"
        })
    }
}


module.exports = {
    Register,
    Login,
    getProfile,
    logout,
    editProfile,
    followOrunfollow,
    getSuggestUsers,
    mutualFollowers,
    SearchUser,
    getFolloworFler,
    ResetPassword,
    ChangePassword
}


//67d8304e75e6b3d97a4d831e


//67d92da62363af48c83b5d6a