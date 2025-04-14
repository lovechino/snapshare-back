const mongoose = require("mongoose")

const userSchema = mongoose.Schema({
    username:{type:String, required:true, unique:true},
    email:{
        type:String
        ,required:true
        ,unique:true,
        match: [
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            'Please enter a valid email address'
          ]
    },
    password:{
        type:String
        ,required:true},
    profilePicture:{
        type:String
        ,default:''},
    bio:{type:String
        , default:''},
    gender:{type:String
        ,enum:['male','female','other']},
    followers:[
        {type:mongoose.Schema.Types.ObjectId, 
        ref:'User'
        }
    ],
    following:[
        {
            type:mongoose.Schema.Types.ObjectId,
             ref:'User'
        }
    ],
    posts:[
        {
            type:mongoose.Schema.Types.ObjectId,
             ref:'Post'
        }
    ],
    bookmarks:[
        {
            type:mongoose.Schema.Types.ObjectId,
             ref:'Post'
        }
    ]
})

const UserSchema = mongoose.model("User",userSchema)
module.exports = UserSchema;