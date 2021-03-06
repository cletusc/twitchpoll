var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment');
var utils = require('../libs/utils');
var ShortId = require('mongoose-shortid-nodeps');

var PollSchema = new Schema({
	_id: ShortId,
	answers: [{
		id: Schema.Types.ObjectId,
		text: String,
		description: String,
		votes: {
			normal: {
				type: Number,
				default: 0
			},
			versus: {
				type: Number,
				default: 0
			}
		}
	}],
	creator: {
		type: Schema.Types.ObjectId,
		ref: 'Account'
	},
	closeNum: Number,
	closeType: String,
	isClosed: {
		type: Boolean,
		default: false
	},
	created: {
		type: Date,
		default: moment.utc,
		get: function (time) {
			return moment.utc(time);
		}
	},
	allowSameIP: Boolean,
	voterIPs: [String],
	voterIDs: [Schema.Types.ObjectId],
	mustFollow: Boolean,
	mustSub: Boolean,
	isVersus: Boolean,
	question: String,
	minChoices: Number,
	maxChoices: Number
});

PollSchema.virtual('closeTime').get(function () {
	return moment(this.created).add(this.closeNum, this.closeType);
});

PollSchema.virtual('unevenChoices').get(function () {
	return (this.maxChoices != this.minChoices);
});

PollSchema.virtual('isOpenable').get(function () {
	if (!this.isCreator) return false;
	return this.isClosed && moment().isBefore(this.closeTime);
});

PollSchema.virtual('totalVotes').get(function () {
	var data = {
		total: 0,
		normal: 0,
		versus: 0
	};
	this.answers.forEach(function (answer) {
		for (var type in answer.votes) {
			if (type == 'normal' || type == 'versus') {
				if (answer.votes.hasOwnProperty(type) && typeof answer.votes[type] === 'number') {
					data[type] += answer.votes[type];
					data.total += answer.votes[type];
				}
			}
		}
	});
	return data;
});

PollSchema.methods.isCreator = function (user) {
	if (!this.creator || !user) {
		return false;
	}

	user = user._id ? user._id.toString() : user.toString();
	var creator = this.creator._id ? this.creator._id.toString() : this.creator.toString();

	return creator === user;
};

PollSchema.methods.hasVoted = function (request) {
	if (request.user && this.voterIDs.indexOf(request.user._id) >= 0) {
		return true;
	}
	if (!this.allowSameIP && this.voterIPs.indexOf(utils.getIp(request)) >= 0) {
		return true;
	}
	if (request.session.pollsVotedIn && request.session.pollsVotedIn.indexOf(this._id) >= 0) {
		return true;
	}
	return false;
};

PollSchema.plugin(require('./_migrations/migration-plugin'), {
	path: 'poll',
	version: 3
});

module.exports = mongoose.model('Poll', PollSchema);
