const RGBLinkApiConnector = require('./../companion-module-rgblink-mini/rgblinkapiconnector')

const POWER_OFF = 0
const POWER_ON = 1

const PAGE_IS_EMPTY = 0
const PAGE_IS_NOT_EMPTY = 1

class RGBLinkX3Connector extends RGBLinkApiConnector {
	EVENT_NAME_ON_DEVICE_STATE_CHANGED = 'on_device_state_changed'

	deviceStatus = {
		powerStatus: undefined,
		lastSavedPage: undefined,
		lastLoadedPage: undefined,
		lastClearedPage: undefined,
		isPageEmpty: []
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
			this.sendCommand('68', '10', this.byteToTwoSignHex(onOrOff), '00', '00')
		} else {
			this.debug('Wrong power mode:' + onOrOff)
		}
	}

	sendSavePage(pageNumber) {
		if (this.isValidPageNumber(pageNumber)) {
			this.sendCommand('68', '12' /* save */, this.byteToTwoSignHex(pageNumber), '00', '00')
		} else {
			this.debug('Wrong page number:' + pageNumber)
		}
	}

	sendLoadPage(pageNumber) {
		if (this.isValidPageNumber(pageNumber)) {
			this.sendCommand('68', '13' /* load */, this.byteToTwoSignHex(pageNumber), '00', '00')
		} else {
			this.debug('Wrong page number:' + pageNumber)
		}
	}

	sendClearPage(pageNumber) {
		if (this.isValidPageNumber(pageNumber)) {
			this.sendCommand('68', '14' /* clear */, this.byteToTwoSignHex(pageNumber), '00', '00')
		} else {
			this.debug('Wrong page number:' + pageNumber)
		}
	}

	sendClearAllPages() {
		this.sendCommand('68', '14' /* clear */, 'FF', '00', '00')
	}

	sendIsPageEmpty(pageNumber) {
		if (this.isValidPageNumber(pageNumber)) {
			this.sendCommand('68', '15' /* query whether the page empty */, this.byteToTwoSignHex(pageNumber), '00', '00')
		} else {
			this.debug('Wrong page number:' + pageNumber)
		}
	}

	askAboutStatus() {
		this.sendCommand('68', '11', '00', '00', '00') // read power status
		for (var i = 0; i < 15; i++) {
			this.sendCommand('68', '15', this.byteToTwoSignHex(i), '00', '00') // query page 1 status (empty or not)
		}
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
				// power on/off
				if (DAT2 == '00') {
					this.emitConnectionStatusOK()
					this.deviceStatus.powerStatus = POWER_OFF
					return this.logFeedback(redeableMsg, 'Power status OFF')
				} else if (DAT2 == '01') {
					this.emitConnectionStatusOK()
					this.deviceStatus.powerStatus = POWER_ON
					return this.logFeedback(redeableMsg, 'Power status ON')
				}
			} else if (DAT1 == '12') {
				// save page
				let savedPage = parseInt(DAT2, this.PARSE_INT_HEX_MODE)
				if (this.isValidPageNumber(savedPage)) {
					this.emitConnectionStatusOK()
					this.deviceStatus.lastSavedPage = savedPage
					return this.logFeedback(redeableMsg, 'Page saved:' + savedPage)
				}
			} else if (DAT1 == '13') {
				// load page
				let loadedPage = parseInt(DAT2, this.PARSE_INT_HEX_MODE)
				if (this.isValidPageNumber(loadedPage)) {
					this.emitConnectionStatusOK()
					this.deviceStatus.lastLoadedPage = loadedPage
					return this.logFeedback(redeableMsg, 'Page loaded:' + loadedPage)
				}
			} else if (DAT1 == '14') {
				let clearedPage = parseInt(DAT2, this.PARSE_INT_HEX_MODE)
				if (this.isValidPageNumber(clearedPage)) {
					// cleared one, selected page
					this.emitConnectionStatusOK()
					this.deviceStatus.lastClearedPage = clearedPage
					return this.logFeedback(redeableMsg, 'Page cleared:' + clearedPage)
				} else if (clearedPage == 255 /* DAT2 == 'FF */) {
					// cleared all pages
					this.emitConnectionStatusOK()
					this.deviceStatus.lastClearedPage = undefined
					return this.logFeedback(redeableMsg, 'All pages cleared')
				}
			} else if (DAT1 == '15') {
				// Query whether the page empty (0x15)
				let queredPage = parseInt(DAT2, this.PARSE_INT_HEX_MODE)
				if (this.isValidPageNumber(queredPage)) {
					let pageStatus = parseInt(DAT3, this.PARSE_INT_HEX_MODE)
					if (pageStatus == PAGE_IS_EMPTY || pageStatus == PAGE_IS_NOT_EMPTY) {
						this.deviceStatus.isPageEmpty[queredPage] = pageStatus
					}
				}
			}
		}

		this.debug('Unrecognized feedback message:' + redeableMsg)
	}

	isValidPageNumber(pageNumber) {
		return (pageNumber >= 0 && pageNumber <= 15)
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
