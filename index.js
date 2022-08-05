// RGBlink Venus X3

/*

* bank - it's configuration of video sourses (which inputs and how are displayed)
* page - there is 16 pages, in everty page exists different banks
* select bank to show in future
* CUT/TAKe => show selected earlier bank on prieview/live output

*/

var udp = require('../../udp')
var instance_skel = require('../../instance_skel')
var debug
var log

function instance(system, id, config) {
	var self = this

	// super-constructor
	instance_skel.apply(this, arguments)

	self.actions() // export actions

	return self
}

instance.prototype.updateConfig = function (config) {
	var self = this

	if (self.udp !== undefined) {
		self.udp.destroy()
		delete self.udp
	}

	self.config = config
	self.init_udp()
}

instance.prototype.init = function () {
	var self = this

	debug = self.debug
	log = self.log
	self.init_udp()
	self.init_feedbacks()
}

instance.prototype.init_udp = function () {
	var self = this

	if (self.udp !== undefined) {
		self.udp.destroy()
		delete self.udp
	}

	self.status(self.STATE_WARNING, 'Connecting')

	if (self.config.host !== undefined) {
		self.udp = new udp(self.config.host, 1000)

		self.udp.on('error', function (err) {
			debug('Network error', err)
			self.status(self.STATE_ERROR, err)
			self.log('error', 'Network error: ' + err.message)
		})

		// If we get data, thing should be good
		self.udp.on('data', function (message, metadata) {
			self.status(self.STATE_OK)
			let readableMsg = message.toString('utf8').toUpperCase()
			//console.log(readableMsg)
			if (readableMsg.length == 19) {
				readableMsg = readableMsg.replace(/F/g, 'T')
				//console.log('\t ' + readableMsg)
				for (var i = 0; i < self.CHOICES_BANK.length; i++) {
					if (self.CHOICES_BANK[i].id == readableMsg) {
						//console.log('\thit bank:' + readableMsg)
						self.device_status.bank = readableMsg
						break
					}
				}
			}
			self.checkFeedbacks('set_bank_and_transition')
		})

		self.udp.on('status_change', function (status, message) {
			self.status(status, message)
		})
	}
}

// Return config fields for web config
instance.prototype.config_fields = function () {
	var self = this

	return [
		{
			type: 'text',
			id: 'info',
			label: 'Information',
			width: 12,
			value: `
				<div class="alert alert-danger">
					<h3> RGBlink VENUS X3</h3>
					This module will connect to a RGBlink Processor Venus X3.
				</div>
			`,
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Target IP',
			width: 6,
			regex: self.REGEX_IP,
		},
	]
}

instance.prototype.device_status = {
	bank: undefined,
}

// When module gets deleted
instance.prototype.destroy = function () {
	var self = this

	if (self.udp !== undefined) {
		self.udp.destroy()
	}

	debug('destroy', self.id)
}

instance.prototype.CHOICES_BANK = [
	{ id: '<T0000681800000080>', label: 'Bank 1' },
	{ id: '<T0000681801000081>', label: 'Bank 2' },
	{ id: '<T0000681802000082>', label: 'Bank 3' },
	{ id: '<T0000681803000083>', label: 'Bank 4' },
	{ id: '<T0000681804000084>', label: 'Bank 5' },
	{ id: '<T0000681805000085>', label: 'Bank 6' },
	{ id: '<T0000681806000086>', label: 'Bank 7' },
	{ id: '<T0000681807000087>', label: 'Bank 8' },
	{ id: '<T0000681808000088>', label: 'Bank 9' },
	{ id: '<T0000681809000089>', label: 'Bank 10' },
	{ id: '<T000068180a00008a>', label: 'Bank 11' },
	{ id: '<T000068180b00008b>', label: 'Bank 12' },
	{ id: '<T000068180c00008c>', label: 'Bank 13' },
	{ id: '<T000068180d00008d>', label: 'Bank 14' },
	{ id: '<T000068180e00008e>', label: 'Bank 15' },
	{ id: '<T000068180f00008f>', label: 'Bank 16' },
]

instance.prototype.CHOICES_TRANSMISION = [
	{ id: '<T0000780000010079>', label: 'CUT' },
	{ id: '<T0000780000000078>', label: 'TAKE' },
]

instance.prototype.actions = function (system) {
	var self = this

	self.system.emit('instance_actions', self.id, {
		send: {
			label: 'Select Bank',
			options: [
				{
					type: 'dropdown',
					id: 'id_send',
					label: 'Select Bank:',
					default: '<T0000681800000080>',
					choices: self.CHOICES_BANK,
				},
				{
					type: 'dropdown',
					id: 'id_trans',
					label: 'Select Transition:',
					default: '<T0000780000000078>',
					choices: self.CHOICES_TRANSMISION,
				},
			],
		},
	})
}

instance.prototype.init_feedbacks = function () {
	var self = this

	const feedbacks = {}
	feedbacks['set_bank_and_transition'] = {
		type: 'boolean',
		label: 'Feedback for bank and transition',
		//description: 'Longer description of the feedback',
		style: {
			// The default style change for a boolean feedback
			// The user will be able to customise these values as well as the fields that will be changed
			color: this.rgb(0, 0, 0),
			bgcolor: this.rgb(0, 255, 0),
		},
		// options is how the user can choose the condition the feedback activates for
		options: [
			{
				type: 'dropdown',
				id: 'id_bank',
				label: 'Select Bank:',
				default: '<T0000681800000080>',
				choices: self.CHOICES_BANK,
			},
		],
		callback: function (feedback) {
			// This callback will be called whenever companion wants to check if this feedback is 'active' and should affect the button style
			if (self.device_status.bank == feedback.options.id_bank) {
				return true
			} else {
				return false
			}
		},
	}
	self.setFeedbackDefinitions(feedbacks)
}

instance.prototype.action = function (action) {
	var self = this
	var cmd
	var tra

	switch (action.action) {
		case 'send':
			cmd = action.options.id_send
			tra = action.options.id_trans
			break
	}

	if (cmd !== undefined) {
		if (self.udp !== undefined) {
			debug('sending', cmd + tra, 'to', self.config.host)

			self.udp.send(cmd + tra)
		}
	}
}

instance_skel.extendedBy(instance)
exports = module.exports = instance
