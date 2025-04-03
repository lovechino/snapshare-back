const mongoose = require("mongoose")

const connectDb =  ()=>{
    try{
        mongoose.connect(process.env.DB_URI)
        console.log("Connected to MongoDB")
    }catch(err){
        console.error(err)
    }
}

module.exports = {connectDb}