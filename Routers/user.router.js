const express = require("express")
const { Register, Login, logout, getProfile, editProfile, getSuggestUsers, followOrunfollow, mutualFollowers, SearchUser, getFolloworFler , ResetPassword, ChangePassword} = require("../Controllers/user.controller")
const isAuthenticated = require("../Middleware/isAuthenticated")
const upload = require("../Middleware/multer")
const router = express.Router()

router.post("/register",Register)
router.post("/login",Login)
router.get("/logout",logout)
router.post("/reset-password",ResetPassword)
router.post("/change-pw/:id",ChangePassword)
router.get("/profile/:id",isAuthenticated,getProfile)
router.post("/profile/edit",isAuthenticated,upload.single('profilePicture'),editProfile)
router.get("/suggested",isAuthenticated,getSuggestUsers)
router.post("/florunfl/:id",isAuthenticated,followOrunfollow)
router.get("/mutual",isAuthenticated,mutualFollowers)
router.post("/search",isAuthenticated,SearchUser)
router.post("/action/:id",isAuthenticated,getFolloworFler)


module.exports = router