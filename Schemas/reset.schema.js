const mongoose = require("mongoose")

const resetSchema = mongoose.Schema({
    res : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User"
    }
})

const ResetSchema = mongoose.model("Reset",resetSchema)

module.exports = ResetSchema