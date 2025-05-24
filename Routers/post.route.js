const express = require("express")
const router = express.Router()
const isAuthenticated = require("../Middleware/isAuthenticated")
const upload = require("../Middleware/multer")
const{addNewPost, getAllPost, getUserPost, likePost, dislikePost, addComment, getComment, deletePost, bookmarkPost, updatePost} = require("../Controllers/post.controller")

router.post("/addpost",isAuthenticated,upload.single('img'),addNewPost)
router.get("/all",isAuthenticated,getAllPost)
router.get("/userpost/all",isAuthenticated,getUserPost)
router.get("/like/:id",isAuthenticated,likePost)
router.get("/dislike/:id",isAuthenticated,dislikePost)
router.post("/comment/:id",isAuthenticated,addComment)
router.post("/comment/all/:id",isAuthenticated,getComment)
router.delete("/delete/:id",isAuthenticated,deletePost)
router.post("/bookmark/:id",isAuthenticated,bookmarkPost)
router.put("/update/:id",isAuthenticated,upload.single('img'),updatePost)

module.exports = router