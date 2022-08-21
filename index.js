/*

usefull commands
* yarn format
* yarn headless
* yarn dev-headless

*/

const instance_skel = require('../../instance_skel')

const {
	RGBLinkX3Connector,
	POWER_OFF,
	POWER_ON,
} = require('./rgblink_x3_connector')

var DEFAULT_X3_PORT = 1000

const FEEDBACK_POWER_STATUS = 'feedback_power_on_off'

const ACTION_POWER_ON_OFF = 'power_on_or_off'

const CHOICES_PART_POWER_ON_OFF = [
	{ id: POWER_OFF, label: 'Power OFF' },
	{ id: POWER_ON, label: 'Power ON' },
]

// const SWITCH_MODE_CHOICES_PART = [
// 	{ id: SWITCH_MODE_AUTO, label: 'Quick/Auto (Live output)' },
// 	{ id: SWITCH_MODE_TBAR, label: 'T-BAR (Preview)' },
// ]

// const PIP_MODE_CHOICES_PART = []
// for (let id in PIP_MODES) {
// 	PIP_MODE_CHOICES_PART.push({ id: id, label: PIP_MODES[id] })
// }

// const PART_CHOICES_SWITCH_EFFECTS = []
// for (let id in SWITCH_EFFECT) {
// 	PART_CHOICES_SWITCH_EFFECTS.push({ id: id, label: SWITCH_EFFECT[id] })
// }

// const PART_CHOICES_PIP_LAYERS = [
// 	{ id: PIP_LAYER_A, label: 'A (main/first)' },
// 	{ id: PIP_LAYER_B, label: 'B (additional/second)' },
// ]

class instance extends instance_skel {
	BACKGROUND_COLOR_PREVIEW
	BACKGROUND_COLOR_PROGRAM
	BACKGROUND_COLOR_DEFAULT
	TEXT_COLOR
	apiConnector = new RGBLinkX3Connector() //creation should be overwrited in init()

	constructor(system, id, config) {
		super(system, id, config)
		this.BACKGROUND_COLOR_PREVIEW = this.rgb(0, 255, 0)
		this.BACKGROUND_COLOR_PROGRAM = this.rgb(255, 0, 0)
		this.BACKGROUND_COLOR_DEFAULT = this.rgb(0, 0, 0)
		this.TEXT_COLOR = this.rgb(255, 255, 255)
		this.initActions()
		this.initPresets()
	}

	config_fields() {
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
				`
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'IP address of RGBlink VENUS X3 device',
				width: 12,
				regex: this.REGEX_IP,
			},
			{
				type: 'text',
				id: 'info',
				width: 12,
				label: 'Port',
				value: 'Will be used default port ' + this.config.port,
			},
			{
				type: 'checkbox',
				label: 'Status polling (ask for status every second)',
				id: 'polling',
				width: 12,
				default: true,
			},
		]
	}

	destroy() {
		this.debug('RGBlink X3: destroy')
		this.apiConnector.onDestroy()
		this.debug('destroy', this.id)
	}

	init() {
		try {
			this.debug('RGBlink X3: init')
			this.initApiConnector()
			this.initFeedbacks()
		} catch (ex) {
			this.status(this.STATUS_ERROR, ex)
			this.debug(ex)
		}
	}

	initApiConnector() {
		let self = this
		this.apiConnector = new RGBLinkX3Connector(this.config.host, DEFAULT_X3_PORT, this.debug, this.config.polling)
		this.apiConnector.on(this.apiConnector.EVENT_NAME_ON_DEVICE_STATE_CHANGED, () => {
			self.checkAllFeedbacks()
		})
		this.apiConnector.on(this.apiConnector.EVENT_NAME_ON_CONNECTION_OK, (message) => {
			self.status(self.STATUS_OK, message)
		})
		this.apiConnector.on(this.apiConnector.EVENT_NAME_ON_CONNECTION_WARNING, (message) => {
			self.status(self.STATUS_WARNING, message)
		})
		this.apiConnector.on(this.apiConnector.EVENT_NAME_ON_CONNECTION_ERROR, (message) => {
			self.status(self.STATUS_ERROR, message)
		})
		this.status(this.STATUS_WARNING, 'Connecting')
		this.apiConnector.askAboutStatus()
	}

	initActions() {
		let actions = {}

		actions[ACTION_POWER_ON_OFF] = {
			label: 'Power ON/OFF device',
			options: [
				{
					type: 'dropdown',
					label: 'On or off',
					id: 'onOrOff',
					default: '1',
					tooltip: 'Choose, what should be done',
					choices: CHOICES_PART_POWER_ON_OFF,
					minChoicesForSearch: 0,
				}
			],
			callback: (action /*, bank*/) => {
				this.apiConnector.sendPowerOnOrOff(action.options.onOrOff)
			},
		}

		this.setActions(actions)
	}

	checkAllFeedbacks() {
		this.checkFeedbacks(FEEDBACK_POWER_STATUS)
		// this.checkFeedbacks('set_source_preview')
		// this.checkFeedbacks('set_mode')
		// this.checkFeedbacks('set_pip_mode')
		// this.checkFeedbacks('set_pip_layer')
		// this.checkFeedbacks('set_switch_effect')
	}

	updateConfig(config) {
		this.debug('RGBlink X3: updateConfig')
		let resetConnection = false

		if (this.config.host != config.host) {
			resetConnection = true
		}

		this.config = config

		if (resetConnection === true) {
			this.apiConnector.createSocket(config.host, DEFAULT_X3_PORT)
		}

		this.apiConnector.setPolling(config.polling)
	}

	feedback(feedback /*, bank*/) {
		if (feedback.type == FEEDBACK_POWER_STATUS) {
			return feedback.options.onOrOff == this.apiConnector.deviceStatus.powerStatus
			// } else if (feedback.type == 'set_source_preview') {
			// 	return feedback.options.sourceNumber == this.apiConnector.deviceStatus.prevSource
			// } else if (feedback.type == 'set_mode') {
			// 	return feedback.options.mode == this.apiConnector.deviceStatus.switchMode
			// } else if (feedback.type == 'set_pip_mode') {
			// 	return feedback.options.mode == this.apiConnector.deviceStatus.pipMode
			// } else if (feedback.type == 'set_switch_effect') {
			// 	return feedback.options.mode == this.apiConnector.deviceStatus.switchEffect
			// } else if (feedback.type == 'set_pip_layer') {
			// 	return feedback.options.layer == this.apiConnector.deviceStatus.pipLayer
		}

		return false
	}

	initFeedbacks() {
		const feedbacks = {}
		feedbacks[FEEDBACK_POWER_STATUS] = {
			type: 'boolean',
			label: 'Power status',
			description: 'Power status (ON or OFF)',
			style: {
				color: this.rgb(255, 255, 255),
				bgcolor: this.BACKGROUND_COLOR_PROGRAM,
			},
			options: [
				{
					type: 'dropdown',
					label: 'On or off',
					id: 'onOrOff',
					default: '1',
					tooltip: 'Choose power status',
					choices: CHOICES_PART_POWER_ON_OFF,
					minChoicesForSearch: 0,
				}
			],
		}

		this.setFeedbackDefinitions(feedbacks)
	}

	initPresets() {
		let presets = []

		presets.push({
			category: 'Power ON/OFF device',
			bank: {
				style: 'text',
				text: 'Power ON',
				size: 'auto',
				color: this.TEXT_COLOR,
				bgcolor: this.BACKGROUND_COLOR_DEFAULT,
			},
			actions: [
				{
					action: ACTION_POWER_ON_OFF,
					options: {
						onOrOff: POWER_ON,
					},
				},
			],
			feedbacks: [
				{
					type: FEEDBACK_POWER_STATUS,
					options: {
						onOrOff: POWER_ON,
					},
					style: {
						color: this.TEXT_COLOR,
						bgcolor: this.BACKGROUND_COLOR_PROGRAM,
					},
				},
			],
		})
		presets.push({
			category: 'Power ON/OFF device',
			bank: {
				style: 'text',
				text: 'Power OFF',
				size: 'auto',
				color: this.TEXT_COLOR,
				bgcolor: this.BACKGROUND_COLOR_DEFAULT,
			},
			actions: [
				{
					action: ACTION_POWER_ON_OFF,
					options: {
						onOrOff: POWER_OFF,
					},
				},
			],
			feedbacks: [
				{
					type: FEEDBACK_POWER_STATUS,
					options: {
						onOrOff: POWER_OFF,
					},
					style: {
						color: this.TEXT_COLOR,
						bgcolor: this.BACKGROUND_COLOR_PREVIEW,
					},
				},
			],
		})		

		this.setPresetDefinitions(presets)
	}
}

exports = module.exports = instance
