const express = require("express")
const router = express.Router()
const isAuthenticated = require("../Middleware/isAuthenticated")
const { sendMessage, getMessage } = require("../Controllers/message.controller")


router.post("/send/:id",isAuthenticated,sendMessage)
router.get("/all/:id",isAuthenticated,getMessage)

module.exports = router