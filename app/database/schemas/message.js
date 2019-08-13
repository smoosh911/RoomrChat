'use strict';

var Mongoose = require('mongoose');

/**
 * Each connection object represents a user connected through a unique socket.
 * Each connection object composed of {userId + socketId}. Both of them together are unique.
 *
 */
var MessageSchema = new Mongoose.Schema({
    content: {
        type: String,
        required: true
    },
    dateCreated: {
        type: Date,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    roomId: {
        type: String,
        required: true
    }
});

var messageModel = Mongoose.model('message', MessageSchema);

module.exports = messageModel;