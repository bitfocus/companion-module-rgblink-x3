const RGBLinkApiConnector = require('./../companion-module-rgblink-mini/rgblinkapiconnector')

const POWER_OFF = 0
const POWER_ON = 1

class RGBLinkX3Connector extends RGBLinkApiConnector {
	EVENT_NAME_ON_DEVICE_STATE_CHANGED = 'on_device_state_changed'

	deviceStatus = {
		powerStatus: undefined,
	}

	constructor(host, port, debug, polling) {
		super(host, port, debug, polling)
		var self = this

		this.on(this.EVENT_NAME_ON_DATA_API_NOT_STANDARD_LENGTH, (message, metadata) => {
			this.debug(message)
			this.debug(metadata)
			// if (metadata.size == 22) {
			// 	self.consume22(message)
			// 	this.emit(this.EVENT_NAME_ON_DEVICE_STATE_CHANGED, [])
			// } else {
			// 	//self.status(this.STATUS_WARNING, "Unknown message length:" + metadata.size)
			// }
		})

		this.on(this.EVENT_NAME_ON_DATA_API, (ADDR, SN, CMD, DAT1, DAT2, DAT3, DAT4) => {
			self.consumeFeedback(ADDR, SN, CMD, DAT1, DAT2, DAT3, DAT4)
			this.emit(this.EVENT_NAME_ON_DEVICE_STATE_CHANGED, [])
		})
	}

	sendPowerOnOrOff(onOrOff) {
		if (onOrOff == POWER_ON || onOrOff == POWER_OFF) {
			this.sendCommand('68', '10', this.byteToTwoSignHex(), '00', '00')
		} else {
			this.debug('Wrong power mode:' + onOrOff)
		}
	}

	sendSavePage(pageNumber) {
		if (pageNumber >= 0 && pageNumber <= 15) {
			this.sendCommand('68', '12', this.byteToTwoSignHex(pageNumber), '00', '00')
		} else {
			this.debug('Wrong page number:' + pageNumber)
		}
	}

	askAboutStatus() {
		this.sendCommand('68', '11', '00', '00', '00') // read power status
		// this.sendCommand('78', '13', '00', '00', '00') // asking about switch setting
		// this.sendCommand('75', '1F', '00', '00', '00') // asking about PIP mode
		// this.sendCommand('78', '07', '00', '00', '00') // asking about switch effect
		// this.sendCommand('75', '1B', '00', '00', '00') // asking about PIP layer (A or B)
		// this.sendCommand('F1', '40', '01', '00', '00') // asking about special status 22
		//<T00c3f103000000b7> // special status2
	}

	consumeFeedback(ADDR, SN, CMD, DAT1, DAT2, DAT3, DAT4) {
		let redeableMsg = [ADDR, SN, CMD, DAT1, DAT2, DAT3, DAT4].join(' ')

		//let importantPart = CMD + DAT1 + DAT2 + DAT3 + DAT4
		// if ('F140011600' == importantPart) {
		// 	// readed status, it's ok
		// 	this.emitConnectionStatusOK()
		// 	return this.logFeedback(redeableMsg, 'Status readed')
		// } else if (CMD == 'A2' && DAT1 == '18') {
		// 	// t-bar position update
		// 	this.emitConnectionStatusOK()
		// 	return this.logFeedback(redeableMsg, 'T-BAR position changed')
		// }

		if (CMD == '68') {
			if (DAT1 == '10' || DAT1 == '11') {
				if (DAT2 == '00') {
					this.emitConnectionStatusOK()
					this.deviceStatus.powerStatus = POWER_OFF
					return this.logFeedback(redeableMsg, 'Power status OFF')
				} else if (DAT2 == '01') {
					this.emitConnectionStatusOK()
					this.deviceStatus.powerStatus = POWER_ON
					return this.logFeedback(redeableMsg, 'Power status ON')
				}
			}
		}

		this.debug('Unrecognized feedback message:' + redeableMsg)
	}

	logFeedback(redeableMsg, info) {
		this.debug('Feedback:' + redeableMsg + ' ' + info)
	}

	emitConnectionStatusOK() {
		this.emit(this.EVENT_NAME_ON_CONNECTION_OK, [])
	}
}

module.exports.RGBLinkMiniConnector = RGBLinkX3Connector
module.exports.POWER_ON = POWER_ON
module.exports.POWER_OFF = POWER_OFF
