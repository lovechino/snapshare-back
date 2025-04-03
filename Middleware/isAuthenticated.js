const jwt = require("jsonwebtoken")
const isAuthenticated = async(req,res,next)=>{
    try{
        const token = req.cookies.token
        if(!token) return res.status(401).json({msg:"Please login to access this"})
        const decode = await jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
        if(!decode){
            return res.status(401).json({msg:"Please login to access this"})
        }
        req.id = decode.userId 
        next()    
    }catch(err){
        res.status(401).json({message:err.message})
    }
}

module.exports = isAuthenticated