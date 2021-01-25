const express = require('express');
const router = new express.Router();
const Message = require('../models/message');
const { ensureLoggedIn } = require('../middleware/auth');
const ExpressError = require('../expressError');

/** GET /:id - get detail of message.
 *
 * => {message: {id,
 *               body,
 *               sent_at,
 *               read_at,
 *               from_user: {username, first_name, last_name, phone},
 *               to_user: {username, first_name, last_name, phone}}
 *
 * Make sure that the currently-logged-in users is either the to or from user.
 *
 **/
router.get('/:id', ensureLoggedIn, async function(req, res, next) {
	try {
		const message = await Message.get(req.params.id);
		const { from_user, to_user } = message;
		if (req.user.username === from_user.username || req.user.username === to_user.username) {
			return res.json({ message });
		} else {
			throw new ExpressError('Unauthorized. This is not your message.', 401);
		}
	} catch (err) {
		return next(err);
	}
});

/** POST / - post message.
 *
 * {to_username, body} =>
 *   {message: {id, from_username, to_username, body, sent_at}}
 *
 **/
router.post('/', ensureLoggedIn, async function(req, res, next) {
	try {
		const { to_username, body } = req.body;
		const from_username = req.user.username;
		const message = await Message.create({ from_username, to_username, body });
		return res.json({ message });
	} catch (err) {
		if (err.code === '23503') {
			return next(new ExpressError(`Cannot send message. User '${req.body.to_username}' not found.`));
		}
		return next(err);
	}
});

/** POST/:id/read - mark message as read:
 *
 *  => {message: {id, read_at}}
 *
 * Make sure that the only the intended recipient can mark as read.
 *
 **/
router.post('/:id/read', ensureLoggedIn, async function(req, res, next) {
	try {
		const { to_user } = await Message.get(req.params.id);
		if (to_user.username !== req.user.username) {
			throw new ExpressError('Unauthorized. You are not the recipient of this message.', 401);
		}
		const message = await Message.markRead(req.params.id);
		return res.json({ message });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
