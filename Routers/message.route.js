const express = require("express")
const router = express.Router()
const isAuthenticated = require("../Middleware/isAuthenticated")
const { sendMessage, getMessage, sendAudio } = require("../Controllers/message.controller")
const upload = require("../Middleware/multer")

router.use(isAuthenticated)

router.post("/send/:id",upload.single("image"),sendMessage)
router.get("/all/:id",getMessage)
router.post("/audio/:id",upload.single("audio"),sendAudio)
module.exports = router