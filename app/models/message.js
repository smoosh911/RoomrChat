'use strict';

var messageModel = require('../database').models.message;

var create = function (data, callback) {
	var newMessage = new messageModel(data);
	newMessage.save(callback);
};

var find = function (data, callback) {
	messageModel.find(data, callback);
}

var findById = function (id, callback) {
	messageModel.findById(id, callback);
}

module.exports = {
	create,
	find,
	findById
};