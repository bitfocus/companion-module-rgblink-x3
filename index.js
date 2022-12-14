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
	PAGE_IS_EMPTY,
	PAGE_IS_NOT_EMPTY,
	SWITCH_TARGET_PREVIEW,
	SWITCH_TARGET_PROGRAM,
	SWITCH_TRANSITION_CUT,
	SWITCH_TRANSITION_DISSOLVE_TAKE,
} = require('./rgblink_x3_connector')

var DEFAULT_X3_PORT = 1000

const FEEDBACK_POWER_STATUS = 'feedback_power_on_off'
const FEEDBACK_CURRENT_PAGE = 'feedback_current_page'
const FEEDBACK_PAGE_IS_EMPTY = 'feedback_page_empty'
const FEEDBACK_PAGE_IS_NOT_EMPTY = 'feedback_page_not_empty'
const FEEDBACK_ALL_PAGES_EMPTY = 'feedback_all_pages_empty'
const FEEDBACK_CURRENT_BANK = 'feedback_current_bank'
const FEEDBACK_LAST_SWITCH_TRANSITION_TARGET = 'feedback_last_switch_transition_target'
const FEEDBACK_LAST_SWITCH_TRANSITION_TARGET_BANK = 'feedback_last_switch_transition_target_bank'

const ACTION_POWER_ON_OFF = 'power_on_or_off'
const ACTION_PAGE_SAVE = 'page_save'
const ACTION_PAGE_LOAD = 'page_load'
const ACTION_PAGE_CLEAR = 'page_clear'
const ACTION_PAGE_CLEAR_ALL = 'page_clear_all'
const ACTION_BANK_LOAD = 'bank_load'
const ACTION_SWITCH_CURRENT_BANK = 'bank_switch_current'
const ACTION_SWITCH_SELECTED_BANK = 'bank_switch_selected'

const CHOICES_PART_POWER_ON_OFF = [
	{ id: POWER_OFF, label: 'Power OFF' },
	{ id: POWER_ON, label: 'Power ON' },
]

const CHOICES_PART_PAGES = [
	//	{ id: 0, label: 'Page 1' },
]
for (var i = 0; i < 16; i++) {
	CHOICES_PART_PAGES.push({ id: i, label: 'Page ' + (i + 1) })
}

const CHOICES_PART_BANKS = [
	//	{ id: 0, label: 'Bank 1' },
]
for (i = 0; i < 16; i++) {
	CHOICES_PART_BANKS.push({ id: i, label: 'Bank ' + (i + 1) })
}

const CHOICES_PART_SWITCH_TARGET = [
	{ id: SWITCH_TARGET_PREVIEW, label: 'Preview' },
	{ id: SWITCH_TARGET_PROGRAM, label: 'Program' },
]

const CHOICES_PART_SWITCH_TRANSITIONS = [
	{ id: SWITCH_TRANSITION_DISSOLVE_TAKE, label: 'Dissolve (take)' },
	{ id: SWITCH_TRANSITION_CUT, label: 'Cut' },
]

class instance extends instance_skel {
	BACKGROUND_COLOR_GREEN
	BACKGROUND_COLOR_RED
	BACKGROUND_COLOR_DEFAULT
	TEXT_COLOR
	apiConnector = new RGBLinkX3Connector() //creation should be overwrited in init()

	constructor(system, id, config) {
		super(system, id, config)
		this.BACKGROUND_COLOR_GREEN = this.rgb(0, 128, 0)
		this.BACKGROUND_COLOR_RED = this.rgb(255, 0, 0)
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
				`,
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
				value: 'Will be used default port ' + DEFAULT_X3_PORT,
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

		actions[ACTION_SWITCH_SELECTED_BANK] = {
			label: 'Switch selected bank',
			options: [
				{
					type: 'dropdown',
					label: 'Bank number',
					id: 'bankNumber',
					default: '0',
					tooltip: 'Choose page',
					choices: CHOICES_PART_BANKS,
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown',
					label: 'Transition',
					id: 'transition',
					default: '0',
					tooltip: 'Choose transition',
					choices: CHOICES_PART_SWITCH_TRANSITIONS,
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown',
					label: 'Target',
					id: 'target',
					default: '0',
					tooltip: 'Choose target',
					choices: CHOICES_PART_SWITCH_TARGET,
					minChoicesForSearch: 0,
				},
			],
			callback: (action /*, bank*/) => {
				this.apiConnector.sendLoadBank(action.options.bankNumber)
				this.apiConnector.sendSwitchPresetBank(action.options.target, action.options.transition)
			},
		}

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
				},
			],
			callback: (action /*, bank*/) => {
				this.apiConnector.sendPowerOnOrOff(action.options.onOrOff)
			},
		}

		actions[ACTION_PAGE_SAVE] = {
			label: 'Save page',
			options: [
				{
					type: 'dropdown',
					label: 'Page number',
					id: 'pageNumber',
					default: '0',
					tooltip: 'Choose page',
					choices: CHOICES_PART_PAGES,
					minChoicesForSearch: 0,
				},
			],
			callback: (action /*, bank*/) => {
				this.apiConnector.sendSavePage(action.options.pageNumber)
			},
		}

		actions[ACTION_PAGE_LOAD] = {
			label: 'Load page',
			options: [
				{
					type: 'dropdown',
					label: 'Page number',
					id: 'pageNumber',
					default: '0',
					tooltip: 'Choose page',
					choices: CHOICES_PART_PAGES,
					minChoicesForSearch: 0,
				},
			],
			callback: (action /*, bank*/) => {
				this.apiConnector.sendLoadPage(action.options.pageNumber)
			},
		}

		actions[ACTION_PAGE_CLEAR] = {
			label: 'Clear page',
			options: [
				{
					type: 'dropdown',
					label: 'Page number',
					id: 'pageNumber',
					default: '0',
					tooltip: 'Choose page',
					choices: CHOICES_PART_PAGES,
					minChoicesForSearch: 0,
				},
			],
			callback: (action /*, bank*/) => {
				this.apiConnector.sendClearPage(action.options.pageNumber)
			},
		}

		actions[ACTION_PAGE_CLEAR_ALL] = {
			label: 'Clear all pages',
			options: [],
			callback: (/*action , bank*/) => {
				this.apiConnector.sendClearAllPages()
			},
		}

		actions[ACTION_BANK_LOAD] = {
			label: 'Load bank',
			options: [
				{
					type: 'dropdown',
					label: 'Bank number',
					id: 'bankNumber',
					default: '0',
					tooltip: 'Choose page',
					choices: CHOICES_PART_BANKS,
					minChoicesForSearch: 0,
				},
			],
			callback: (action /*, bank*/) => {
				this.apiConnector.sendLoadBank(action.options.bankNumber)
			},
		}

		actions[ACTION_SWITCH_CURRENT_BANK] = {
			label: 'Switch current bank',
			options: [
				{
					type: 'dropdown',
					label: 'Transition',
					id: 'transition',
					default: '0',
					tooltip: 'Choose transition',
					choices: CHOICES_PART_SWITCH_TRANSITIONS,
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown',
					label: 'Target',
					id: 'target',
					default: '0',
					tooltip: 'Choose target',
					choices: CHOICES_PART_SWITCH_TARGET,
					minChoicesForSearch: 0,
				},
			],
			callback: (action /*, bank*/) => {
				this.apiConnector.sendSwitchPresetBank(action.options.target, action.options.transition)
			},
		}

		this.setActions(actions)
	}

	checkAllFeedbacks() {
		try {
			this.checkFeedbacks(FEEDBACK_POWER_STATUS)
			this.checkFeedbacks(FEEDBACK_PAGE_IS_EMPTY)
			this.checkFeedbacks(FEEDBACK_PAGE_IS_NOT_EMPTY)
			this.checkFeedbacks(FEEDBACK_CURRENT_PAGE)
			this.checkFeedbacks(FEEDBACK_ALL_PAGES_EMPTY)
			this.checkFeedbacks(FEEDBACK_CURRENT_BANK)
			this.checkFeedbacks(FEEDBACK_LAST_SWITCH_TRANSITION_TARGET)
			this.checkFeedbacks(FEEDBACK_LAST_SWITCH_TRANSITION_TARGET_BANK)
		} catch (ex) {
			this.debug(ex)
		}
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
		} else if (feedback.type == FEEDBACK_CURRENT_PAGE) {
			return feedback.options.pageNumber == this.apiConnector.deviceStatus.currentPage
		} else if (feedback.type == FEEDBACK_PAGE_IS_EMPTY) {
			return this.apiConnector.deviceStatus.pageEmptyState[feedback.options.pageNumber] === PAGE_IS_EMPTY
		} else if (feedback.type == FEEDBACK_PAGE_IS_NOT_EMPTY) {
			return this.apiConnector.deviceStatus.pageEmptyState[feedback.options.pageNumber] === PAGE_IS_NOT_EMPTY
		} else if (feedback.type == FEEDBACK_ALL_PAGES_EMPTY) {
			for (var i = 0; i < 16; i++) {
				if (this.apiConnector.deviceStatus.pageEmptyState[i] !== PAGE_IS_EMPTY) {
					return false
				}
			}
			return true
		} else if (feedback.type == FEEDBACK_CURRENT_BANK) {
			return feedback.options.bankNumber == this.apiConnector.deviceStatus.currentBank
		} else if (feedback.type == FEEDBACK_LAST_SWITCH_TRANSITION_TARGET) {
			return (
				feedback.options.target == this.apiConnector.deviceStatus.lastSwitchTarget &&
				feedback.options.transition == this.apiConnector.deviceStatus.lastSwitchTransition
			)
		} else if (feedback.type == FEEDBACK_LAST_SWITCH_TRANSITION_TARGET_BANK) {
			return (
				feedback.options.target == this.apiConnector.deviceStatus.lastSwitchTarget &&
				feedback.options.transition == this.apiConnector.deviceStatus.lastSwitchTransition &&
				feedback.options.bankNumber == this.apiConnector.deviceStatus.currentBank
			)
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
				bgcolor: this.BACKGROUND_COLOR_RED,
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
				},
			],
		}

		feedbacks[FEEDBACK_CURRENT_PAGE] = {
			type: 'boolean',
			label: 'Current page',
			description: 'Current page with presets',
			style: {
				color: this.rgb(255, 255, 255),
				bgcolor: this.BACKGROUND_COLOR_RED,
			},
			options: [
				{
					type: 'dropdown',
					label: 'Page number',
					id: 'pageNumber',
					default: '0',
					tooltip: 'Choose page',
					choices: CHOICES_PART_PAGES,
					minChoicesForSearch: 0,
				},
			],
		}

		feedbacks[FEEDBACK_PAGE_IS_EMPTY] = {
			type: 'boolean',
			label: 'Page is empty',
			description: 'Feedback, if page is empty',
			style: {
				color: this.rgb(255, 255, 255),
				bgcolor: this.BACKGROUND_COLOR_DEFAULT,
			},
			options: [
				{
					type: 'dropdown',
					label: 'Page number',
					id: 'pageNumber',
					default: '0',
					tooltip: 'Choose page',
					choices: CHOICES_PART_PAGES,
					minChoicesForSearch: 0,
				},
			],
		}

		feedbacks[FEEDBACK_PAGE_IS_NOT_EMPTY] = {
			type: 'boolean',
			label: 'Page is NOT empty',
			description: 'Feedback, if page is NOT empty',
			style: {
				color: this.rgb(255, 255, 255),
				bgcolor: this.BACKGROUND_COLOR_GREEN,
			},
			options: [
				{
					type: 'dropdown',
					label: 'Page number',
					id: 'pageNumber',
					default: '0',
					tooltip: 'Choose page',
					choices: CHOICES_PART_PAGES,
					minChoicesForSearch: 0,
				},
			],
		}

		feedbacks[FEEDBACK_ALL_PAGES_EMPTY] = {
			type: 'boolean',
			label: 'All pages are empty',
			description: 'Feedback, if all pages are empty. Helpfull, if using action: Clear all pages',
			style: {
				color: this.rgb(255, 255, 255),
				bgcolor: this.BACKGROUND_COLOR_GREEN,
			},
			options: [],
		}

		feedbacks[FEEDBACK_CURRENT_BANK] = {
			type: 'boolean',
			label: 'Current bank',
			description: 'Current bank',
			style: {
				color: this.rgb(255, 255, 255),
				bgcolor: this.BACKGROUND_COLOR_RED,
			},
			options: [
				{
					type: 'dropdown',
					label: 'Bank number',
					id: 'bankNumber',
					default: '0',
					tooltip: 'Choose bank',
					choices: CHOICES_PART_BANKS,
					minChoicesForSearch: 0,
				},
			],
		}

		feedbacks[FEEDBACK_LAST_SWITCH_TRANSITION_TARGET] = {
			type: 'boolean',
			label: 'Last switch transition and target',
			description: 'Feedback based on last switch transition and last switch target. Bank no matters.',
			style: {
				color: this.rgb(255, 255, 255),
				bgcolor: this.BACKGROUND_COLOR_RED,
			},
			options: [
				{
					type: 'dropdown',
					label: 'Transition',
					id: 'transition',
					default: '0',
					tooltip: 'Choose transition',
					choices: CHOICES_PART_SWITCH_TRANSITIONS,
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown',
					label: 'Target',
					id: 'target',
					default: '0',
					tooltip: 'Choose target',
					choices: CHOICES_PART_SWITCH_TARGET,
					minChoicesForSearch: 0,
				},
			],
		}

		feedbacks[FEEDBACK_LAST_SWITCH_TRANSITION_TARGET_BANK] = {
			type: 'boolean',
			label: 'Last switch transition and target from selected bank',
			description: 'Feedback based on last switch transition and last switch target from selected bank.',
			style: {
				color: this.rgb(255, 255, 255),
				bgcolor: this.BACKGROUND_COLOR_RED,
			},
			options: [
				{
					type: 'dropdown',
					label: 'Bank number',
					id: 'bankNumber',
					default: '0',
					tooltip: 'Choose page',
					choices: CHOICES_PART_BANKS,
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown',
					label: 'Transition',
					id: 'transition',
					default: '0',
					tooltip: 'Choose transition',
					choices: CHOICES_PART_SWITCH_TRANSITIONS,
					minChoicesForSearch: 0,
				},
				{
					type: 'dropdown',
					label: 'Target',
					id: 'target',
					default: '0',
					tooltip: 'Choose target',
					choices: CHOICES_PART_SWITCH_TARGET,
					minChoicesForSearch: 0,
				},
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
						bgcolor: this.BACKGROUND_COLOR_RED,
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
						bgcolor: this.BACKGROUND_COLOR_GREEN,
					},
				},
			],
		})

		for (var page = 0; page < 16; page++) {
			presets.push({
				category: 'Save page',
				bank: {
					style: 'text',
					text: 'Save page\\n' + (page + 1),
					size: 'auto',
					color: this.TEXT_COLOR,
					bgcolor: this.BACKGROUND_COLOR_DEFAULT,
				},
				actions: [
					{
						action: ACTION_PAGE_SAVE,
						options: {
							pageNumber: page,
						},
					},
				],
				feedbacks: [
					{
						type: FEEDBACK_PAGE_IS_NOT_EMPTY,
						options: {
							pageNumber: page,
						},
						style: {
							color: this.TEXT_COLOR,
							bgcolor: this.BACKGROUND_COLOR_GREEN,
						},
					},
					{
						type: FEEDBACK_CURRENT_PAGE,
						options: {
							pageNumber: page,
						},
						style: {
							color: this.TEXT_COLOR,
							bgcolor: this.BACKGROUND_COLOR_RED,
						},
					},
				],
			})
		}

		for (page = 0; page < 16; page++) {
			presets.push({
				category: 'Load page',
				bank: {
					style: 'text',
					text: 'Load page\\n' + (page + 1),
					size: 'auto',
					color: this.TEXT_COLOR,
					bgcolor: this.BACKGROUND_COLOR_DEFAULT,
				},
				actions: [
					{
						action: ACTION_PAGE_LOAD,
						options: {
							pageNumber: page,
						},
					},
				],
				feedbacks: [
					{
						type: FEEDBACK_PAGE_IS_NOT_EMPTY,
						options: {
							pageNumber: page,
						},
						style: {
							color: this.TEXT_COLOR,
							bgcolor: this.BACKGROUND_COLOR_GREEN,
						},
					},
					{
						type: FEEDBACK_CURRENT_PAGE,
						options: {
							pageNumber: page,
						},
						style: {
							color: this.TEXT_COLOR,
							bgcolor: this.BACKGROUND_COLOR_RED,
						},
					},
				],
			})
		}

		for (page = 0; page < 16; page++) {
			presets.push({
				category: 'Clear page',
				bank: {
					style: 'text',
					text: 'Clear page\\n' + (page + 1),
					size: 'auto',
					color: this.TEXT_COLOR,
					bgcolor: this.BACKGROUND_COLOR_DEFAULT,
				},
				actions: [
					{
						action: ACTION_PAGE_CLEAR,
						options: {
							pageNumber: page,
						},
					},
				],
				feedbacks: [
					{
						type: FEEDBACK_PAGE_IS_NOT_EMPTY,
						options: {
							pageNumber: page,
						},
						style: {
							color: this.TEXT_COLOR,
							bgcolor: this.BACKGROUND_COLOR_GREEN,
						},
					},
					{
						type: FEEDBACK_CURRENT_PAGE,
						options: {
							pageNumber: page,
						},
						style: {
							color: this.TEXT_COLOR,
							bgcolor: this.BACKGROUND_COLOR_RED,
						},
					},
				],
			})
		}

		let clearAllPages = {
			category: 'Clear page',
			bank: {
				style: 'text',
				text: 'Clear all pages',
				size: 'auto',
				color: this.TEXT_COLOR,
				bgcolor: this.BACKGROUND_COLOR_DEFAULT,
			},
			actions: [
				{
					action: ACTION_PAGE_CLEAR_ALL,
					options: {},
				},
			],
			feedbacks: [
				{
					type: FEEDBACK_ALL_PAGES_EMPTY,
					style: {
						color: this.TEXT_COLOR,
						bgcolor: this.BACKGROUND_COLOR_GREEN,
					},
				},
			],
		}
		presets.push(clearAllPages)

		for (var bank = 0; bank < 16; bank++) {
			presets.push({
				category: 'Load bank',
				bank: {
					style: 'text',
					text: 'Load bank\\n' + (bank + 1),
					size: 'auto',
					color: this.TEXT_COLOR,
					bgcolor: this.BACKGROUND_COLOR_DEFAULT,
				},
				actions: [
					{
						action: ACTION_BANK_LOAD,
						options: {
							bankNumber: bank,
						},
					},
				],
				feedbacks: [
					{
						type: FEEDBACK_CURRENT_BANK,
						options: {
							bankNumber: bank,
						},
						style: {
							color: this.TEXT_COLOR,
							bgcolor: this.BACKGROUND_COLOR_RED,
						},
					},
				],
			})
		}

		presets.push({
			category: 'Switch current bank',
			bank: {
				style: 'text',
				text: 'Take to program',
				size: 'auto',
				color: this.TEXT_COLOR,
				bgcolor: this.BACKGROUND_COLOR_DEFAULT,
			},
			actions: [
				{
					action: ACTION_SWITCH_CURRENT_BANK,
					options: {
						transition: SWITCH_TRANSITION_DISSOLVE_TAKE,
						target: SWITCH_TARGET_PROGRAM,
					},
				},
			],
			feedbacks: [
				{
					type: FEEDBACK_LAST_SWITCH_TRANSITION_TARGET,
					options: {
						transition: SWITCH_TRANSITION_DISSOLVE_TAKE,
						target: SWITCH_TARGET_PROGRAM,
					},
					style: {
						color: this.TEXT_COLOR,
						bgcolor: this.BACKGROUND_COLOR_RED,
					},
				},
			],
		})
		presets.push({
			category: 'Switch current bank',
			bank: {
				style: 'text',
				text: 'Cut to program',
				size: 'auto',
				color: this.TEXT_COLOR,
				bgcolor: this.BACKGROUND_COLOR_DEFAULT,
			},
			actions: [
				{
					action: ACTION_SWITCH_CURRENT_BANK,
					options: {
						transition: SWITCH_TRANSITION_CUT,
						target: SWITCH_TARGET_PROGRAM,
					},
				},
			],
			feedbacks: [
				{
					type: FEEDBACK_LAST_SWITCH_TRANSITION_TARGET,
					options: {
						transition: SWITCH_TRANSITION_CUT,
						target: SWITCH_TARGET_PROGRAM,
					},
					style: {
						color: this.TEXT_COLOR,
						bgcolor: this.BACKGROUND_COLOR_RED,
					},
				},
			],
		})
		presets.push({
			category: 'Switch current bank',
			bank: {
				style: 'text',
				text: 'Take to preview',
				size: 'auto',
				color: this.TEXT_COLOR,
				bgcolor: this.BACKGROUND_COLOR_DEFAULT,
			},
			actions: [
				{
					action: ACTION_SWITCH_CURRENT_BANK,
					options: {
						transition: SWITCH_TRANSITION_DISSOLVE_TAKE,
						target: SWITCH_TARGET_PREVIEW,
					},
				},
			],
			feedbacks: [
				{
					type: FEEDBACK_LAST_SWITCH_TRANSITION_TARGET,
					options: {
						transition: SWITCH_TRANSITION_DISSOLVE_TAKE,
						target: SWITCH_TARGET_PREVIEW,
					},
					style: {
						color: this.TEXT_COLOR,
						bgcolor: this.BACKGROUND_COLOR_RED,
					},
				},
			],
		})
		presets.push({
			category: 'Switch current bank',
			bank: {
				style: 'text',
				text: 'Cut to preview',
				size: 'auto',
				color: this.TEXT_COLOR,
				bgcolor: this.BACKGROUND_COLOR_DEFAULT,
			},
			actions: [
				{
					action: ACTION_SWITCH_CURRENT_BANK,
					options: {
						transition: SWITCH_TRANSITION_CUT,
						target: SWITCH_TARGET_PREVIEW,
					},
				},
			],
			feedbacks: [
				{
					type: FEEDBACK_LAST_SWITCH_TRANSITION_TARGET,
					options: {
						transition: SWITCH_TRANSITION_CUT,
						target: SWITCH_TARGET_PREVIEW,
					},
					style: {
						color: this.TEXT_COLOR,
						bgcolor: this.BACKGROUND_COLOR_RED,
					},
				},
			],
		})

		for (bank = 0; bank < 16; bank++) {
			presets.push({
				category: 'Take selected bank to program',
				bank: {
					style: 'text',
					text: 'Take\\nbank ' + (bank + 1) + ' to\\nprogram',
					size: 'auto',
					color: this.TEXT_COLOR,
					bgcolor: this.BACKGROUND_COLOR_DEFAULT,
				},
				actions: [
					{
						action: ACTION_SWITCH_SELECTED_BANK,
						options: {
							transition: SWITCH_TRANSITION_DISSOLVE_TAKE,
							target: SWITCH_TARGET_PROGRAM,
							bankNumber: bank,
						},
					},
				],
				feedbacks: [
					{
						type: FEEDBACK_LAST_SWITCH_TRANSITION_TARGET_BANK,
						options: {
							transition: SWITCH_TRANSITION_DISSOLVE_TAKE,
							target: SWITCH_TARGET_PROGRAM,
							bankNumber: bank,
						},
						style: {
							color: this.TEXT_COLOR,
							bgcolor: this.BACKGROUND_COLOR_RED,
						},
					},
				],
			})
		}

		for (bank = 0; bank < 16; bank++) {
			presets.push({
				category: 'Cut selected bank to program',
				bank: {
					style: 'text',
					text: 'Cut\\nbank ' + (bank + 1) + ' to\\nprogram',
					size: 'auto',
					color: this.TEXT_COLOR,
					bgcolor: this.BACKGROUND_COLOR_DEFAULT,
				},
				actions: [
					{
						action: ACTION_SWITCH_SELECTED_BANK,
						options: {
							transition: SWITCH_TRANSITION_CUT,
							target: SWITCH_TARGET_PROGRAM,
							bankNumber: bank,
						},
					},
				],
				feedbacks: [
					{
						type: FEEDBACK_LAST_SWITCH_TRANSITION_TARGET_BANK,
						options: {
							transition: SWITCH_TRANSITION_CUT,
							target: SWITCH_TARGET_PROGRAM,
							bankNumber: bank,
						},
						style: {
							color: this.TEXT_COLOR,
							bgcolor: this.BACKGROUND_COLOR_RED,
						},
					},
				],
			})
		}

		for (bank = 0; bank < 16; bank++) {
			presets.push({
				category: 'Take selected bank to preview',
				bank: {
					style: 'text',
					text: 'Take\\nbank ' + (bank + 1) + ' to\\npreview',
					size: 'auto',
					color: this.TEXT_COLOR,
					bgcolor: this.BACKGROUND_COLOR_DEFAULT,
				},
				actions: [
					{
						action: ACTION_SWITCH_SELECTED_BANK,
						options: {
							transition: SWITCH_TRANSITION_DISSOLVE_TAKE,
							target: SWITCH_TARGET_PREVIEW,
							bankNumber: bank,
						},
					},
				],
				feedbacks: [
					{
						type: FEEDBACK_LAST_SWITCH_TRANSITION_TARGET_BANK,
						options: {
							transition: SWITCH_TRANSITION_DISSOLVE_TAKE,
							target: SWITCH_TARGET_PREVIEW,
							bankNumber: bank,
						},
						style: {
							color: this.TEXT_COLOR,
							bgcolor: this.BACKGROUND_COLOR_RED,
						},
					},
				],
			})
		}

		for (bank = 0; bank < 16; bank++) {
			presets.push({
				category: 'Cut selected bank to preview',
				bank: {
					style: 'text',
					text: 'Cut\\nbank ' + (bank + 1) + ' to\\npreview',
					size: 'auto',
					color: this.TEXT_COLOR,
					bgcolor: this.BACKGROUND_COLOR_DEFAULT,
				},
				actions: [
					{
						action: ACTION_SWITCH_SELECTED_BANK,
						options: {
							transition: SWITCH_TRANSITION_CUT,
							target: SWITCH_TARGET_PREVIEW,
							bankNumber: bank,
						},
					},
				],
				feedbacks: [
					{
						type: FEEDBACK_LAST_SWITCH_TRANSITION_TARGET_BANK,
						options: {
							transition: SWITCH_TRANSITION_CUT,
							target: SWITCH_TARGET_PREVIEW,
							bankNumber: bank,
						},
						style: {
							color: this.TEXT_COLOR,
							bgcolor: this.BACKGROUND_COLOR_RED,
						},
					},
				],
			})
		}

		this.setPresetDefinitions(presets)
	}
}

exports = module.exports = instance
