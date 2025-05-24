const express = require("express")
const router = express.Router()
const isAuthenticated = require("../Middleware/isAuthenticated")
const { sendMessage, getMessage, sendAudio, getConversations } = require("../Controllers/message.controller")
const upload = require("../Middleware/multer")

router.use(isAuthenticated)

router.post("/send/:id",upload.array("images"),sendMessage)
router.get("/all/:id",getMessage)
router.post("/audio/:id",upload.single("audio"),sendAudio)
router.get("/conversations",getConversations)
module.exports = router