'use strict';

var config = require('../config');
var express = require('express');
var router = express.Router();
var passport = require('passport');

var User = require('../models/user');
var Room = require('../models/room');
var Message = require('../models/message');

var init = function (io) {

	router.use(function (req, res, next) {
		res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
		res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
		next();
	});

	// Home page
	router.get('/', function (req, res, next) {
		// If user is already logged in, then redirect to rooms page
		if (req.isAuthenticated()) {
			res.redirect('/rooms');
		} else {
			res.render('login', {
				success: req.flash('success')[0],
				errors: req.flash('error'),
				showRegisterForm: req.flash('showRegisterForm')[0]
			});
		}
	});

	// Login
	router.post('/login', passport.authenticate('local', {
		successRedirect: '/rooms',
		failureRedirect: '/',
		failureFlash: true
	}));

	// Register via username and password
	router.post('/register', function (req, res, next) {

		var credentials = {
			'username': req.body.username,
			'password': req.body.password
		};

		if (credentials.username === '' || credentials.password === '') {
			req.flash('error', 'Missing credentials');
			req.flash('showRegisterForm', true);
			res.redirect('/');
		} else {

			// Check if the username already exists for non-social account
			User.findOne({
				'username': new RegExp('^' + req.body.username + '$', 'i'),
				'socialId': null
			}, function (err, user) {
				if (err) throw err;
				if (user) {
					req.flash('error', 'Username already exists.');
					req.flash('showRegisterForm', true);
					res.redirect('/');
				} else {
					User.create(credentials, function (err, newUser) {
						if (err) throw err;
						req.flash('success', 'Your account has been created. Please log in.');
						res.redirect('/');
					});
				}
			});
		}
	});

	function initialAgentText(From, Body, Agent, user, room) {
		user.sendToAgent = true
		user.save()
		const client = require('twilio')(config.twilio.accountSid, config.twilio.authToken);
		// const leesPhone = "9288216645";
		// const mikesPhone = "2086951457";
		const twilioPhone = '+12085041779';
		client.messages.create({
			body: `From: ${From}\nMessage: ${Body}\nAgent Chat: http://chat.roomr.io/chat/${room.id}\nTwilio Logs: https://www.twilio.com/console/studio/flows/FWafb5b1354d5ea598afba40a74c4548a5/executions"`,
			from: twilioPhone,
			to: Agent
		}).then(message => console.log(message));

	}

	// Twilio APIs
	router.post('/lead', function (req, res, next) {
		const leesPhone = "9288216645";
		const mikesPhone = "2086951457";
		const {
			From,
			Body,
			sendToAgent,
			chatFlow
		} = req.body;
		User.findOne({
			'phone': From
		}, (err, user) => {
			if (err) throw err;
			if (!user) {
				User.create({
					'phone': From,
					'sendToAgent': false
				}, function (err, newUser) {
					if (err) throw err;
					user = newUser
				})
				res.send(500, {
					message: "sendToAgent false"
				});
			}
			if (!user.sendToAgent && !sendToAgent) {
				res.send(500, {
					message: "sendToAgent false"
				});
			} else {
				// io.of('/rooms').emit('createRoom', From, user.id);
				// io.of('/rooms').on('updateRoomsList', function (room) {
				// 	if (sendToAgent) {
				// 		initialAgentText(From, Body, user, room);
				// 		Message.create({
				// 			content: chatFlow,
				// 			dateCreated: Date.now(),
				// 			userId: user.id,
				// 			roomId: room.id
				// 		}, function (err, message) {
				// 			if (err) throw err;
				// 			io.of('/chatroom').to(room.id).emit('addMessage', message);
				// 		});
				// 	}
				// 	Message.create({
				// 		content: Body,
				// 		dateCreated: Date.now(),
				// 		userId: user.id,
				// 		roomId: room.id
				// 	}, function (err, message) {
				// 		if (err) throw err;
				// 		console.log('room.id :', room.id);
				// 		io.of('/chatroom').to(room.id).emit('addMessage', message);
				// 		res.status(200).end();
				// 	});
				// });
				Room.findOne({
					'title': From
				}, function (err, room) {
					if (err) throw err;
					if (room) {
						if (sendToAgent) {
							initialAgentText(From, Body, mikesPhone, user, room);
							initialAgentText(From, Body, leesPhone, user, room);
							Message.create({
								content: chatFlow,
								dateCreated: Date.now(),
								userId: user.id,
								roomId: room.id
							}, function (err, message) {
								if (err) throw err;
								io.of('/chatroom').to(room.id).emit('addMessage', message);
							});
						}
						Message.create({
							content: Body,
							dateCreated: Date.now(),
							userId: user.id,
							roomId: room.id
						}, function (err, message) {
							if (err) throw err;
							console.log('room.id :', room.id);
							io.of('/chatroom').to(room.id).emit('addMessage', message);
							res.status(200).end();
						});
					} else {
						Room.create({
							'title': From,
							'userId': user.id,
							'messages': []
						}, function (err, room) {
							if (err) throw err;
							io.of('/rooms').emit('updateRoomsList', room);
							if (sendToAgent) {
								initialAgentText(From, Body, user, room);
								Message.create({
									content: chatFlow,
									dateCreated: Date.now(),
									userId: user.id,
									roomId: room.id
								}, function (err, message) {
									if (err) throw err;
									io.of('/chatroom').to(room.id).emit('addMessage', message);
								});
							}
							Message.create({
								content: Body,
								dateCreated: Date.now(),
								userId: user.id,
								roomId: room.id
							}, function (err, message) {
								if (err) throw err;
								io.of('/chatroom').to(room.id).emit('addMessage', message);
								res.status(200).end();
							});
						});
					}
				});
			}
		})
	});

	// Social Authentication routes
	// 1. Login via Facebook
	router.get('/auth/facebook', passport.authenticate('facebook'));
	router.get('/auth/facebook/callback', passport.authenticate('facebook', {
		successRedirect: '/rooms',
		failureRedirect: '/',
		failureFlash: true
	}));

	// 2. Login via Twitter
	router.get('/auth/twitter', passport.authenticate('twitter'));
	router.get('/auth/twitter/callback', passport.authenticate('twitter', {
		successRedirect: '/rooms',
		failureRedirect: '/',
		failureFlash: true
	}));

	// Rooms
	router.get('/rooms', [User.isAuthenticated, function (req, res, next) {
		Room.find(function (err, rooms) {
			if (err) throw err;
			res.render('rooms', {
				rooms
			});
		});
	}]);

	router.get('/data/rooms', [function (req, res, next) {
		Room.find(function (err, rooms) {
			if (err) throw err;
			res.json(rooms);
		});
	}]);

	// Chat Room 
	router.get('/chat/:id', [User.isAuthenticated, function (req, res, next) {
		var roomId = req.params.id;
		Room.findById(roomId, function (err, room) {
			if (err) throw err;
			if (!room) {
				return next();
			}
			res.render('chatroom', {
				user: req.user,
				room: room
			});
		});

	}]);

	// Logout
	router.get('/logout', function (req, res, next) {
		// remove the req.user property and clear the login session
		req.logout();

		// destroy session data
		req.session = null;

		// redirect to homepage
		res.redirect('/');
	});
	return router;
}
module.exports = init;