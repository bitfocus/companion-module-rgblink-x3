const RGBLinkApiConnector = require('./../companion-module-rgblink-mini/rgblinkapiconnector')

const POWER_OFF = 0
const POWER_ON = 1

const PAGE_IS_EMPTY = 0
const PAGE_IS_NOT_EMPTY = 1

const CARD_TURN_OFF = 0
const CARD_TURN_ON = 1

const SWITCH_TARGET_PROGRAM = 0
const SWITCH_TARGET_PREVIEW = 1

const SWITCH_TRANSITION_DISSOLVE_TAKE = 0
const SWITCH_TRANSITION_CUT_ = 1

const BLACKOUT_OFF = 0
const BLACKOUT_ON = 1

class RGBLinkX3Connector extends RGBLinkApiConnector {
	EVENT_NAME_ON_DEVICE_STATE_CHANGED = 'on_device_state_changed'

	deviceStatus = {
		powerStatus: undefined,
		lastSavedPage: undefined,
		lastLoadedPage: undefined,
		lastClearedPage: undefined,
		currentPage:undefined,
		currentBank: undefined,
		isPageEmpty: [],
		card1Status: undefined,
		card2Status: undefined,
		blackoutStatus: undefined
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

	sendLoadBank(bankNumber) {
		if (this.isValidBankNumber(bankNumber)) {
			this.sendCommand('68', '18' /* load bank */, this.byteToTwoSignHex(bankNumber), '00', '00')
		} else {
			this.debug('Wrong bank number:' + bankNumber)
		}
	}

	sendCardOnOrOff(cardNumber, turnOnorOff) {
		if (cardNumber == 1 || cardNumber == 1) {
			let cardAddr = 4 + cardNumber // 0x05(card 1), 0x06(card 2)
			cardAddr = this.byteToTwoSignHex(cardAddr)
			if (turnOnorOff == CARD_TURN_ON || turnOnorOff == CARD_TURN_OFF) {
				this.sendCommandWithAddr(cardAddr, '68', '48', this.byteToTwoSignHex(turnOnorOff), '00', '00')
			} else {
				this.debug("Wrong turn on/off parameter:" + turnOnorOff)
			}
		} else {
			this.debug('Wrong card number:' + cardNumber)
		}
	}

	sendSwitchPresetBank(programOrPreview, switchTransitionEffect) {
		if (programOrPreview == SWITCH_TARGET_PREVIEW || programOrPreview == SWITCH_TARGET_PROGRAM) {
			let target = this.byteToTwoSignHex(programOrPreview)
			if (switchTransitionEffect == SWITCH_TRANSITION_CUT_ || switchTransitionEffect == SWITCH_TRANSITION_DISSOLVE_TAKE) {
				let transition = this.byteToTwoSignHex(switchTransitionEffect)
				this.sendCommand('78', '00', target, transition, '00')
			} else {
				this.debug('Wrong transition:' + switchTransitionEffect)
			}
		} else {
			this.debug('Wrong target:' + programOrPreview)
		}
	}

	sendSwitchToBlackout(blackoutOnOrOff) {
		if (blackoutOnOrOff == BLACKOUT_ON || blackoutOnOrOff == BLACKOUT_OFF) {
			this.sendCommand('78', '06', this.byteToTwoSignHex(blackoutOnOrOff), '00', '00')
		} else {
			this.debug('Wrong blackout status:' + blackoutOnOrOff)
		}
	}

	askAboutStatus() {
		this.sendCommand('68', '11', '00', '00', '00') // read power status
		for (var i = 0; i < 15; i++) {
			this.sendCommand('68', '15', this.byteToTwoSignHex(i), '00', '00') // query page 1 status (empty or not)
		}
		this.sendCommand('68', '23', '00', '00', '00',) // Query Which Page is Current(0x23)
		this.sendCommand('68', '19', '00', '00', '00',) // Query Which Bank is Current(0x19)
		this.sendCommand('78', '07', '00', '00', '00', '00') // undocummented query blackout effect
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
					this.deviceStatus.currentPage = savedPage
					return this.logFeedback(redeableMsg, 'Page saved:' + savedPage)
				}
			} else if (DAT1 == '13') {
				// load page
				let loadedPage = parseInt(DAT2, this.PARSE_INT_HEX_MODE)
				if (this.isValidPageNumber(loadedPage)) {
					this.emitConnectionStatusOK()
					this.deviceStatus.lastLoadedPage = loadedPage
					this.deviceStatus.currentPage = loadedPage
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
						this.emitConnectionStatusOK()
						this.deviceStatus.isPageEmpty[queredPage] = pageStatus
						return this.logFeedback(redeableMsg, 'Page status:' + (pageStatus == PAGE_IS_EMPTY ? "empty" : "not empty"))
					}
				}
			} else if (DAT1 == '18') {
				// load bank
				let loadedBank = parseInt(DAT2, this.PARSE_INT_HEX_MODE)
				if (this.isValidBankNumber(loadedBank)) {
					this.emitConnectionStatusOK()
					this.deviceStatus.currentBank = loadedBank
					return this.logFeedback(redeableMsg, 'Bank loaded:' + loadedBank)
				}
			} else if (DAT1 == '19') {
				// which bank is current
				let currentBank = parseInt(DAT2, this.PARSE_INT_HEX_MODE)
				if (this.isValidBankNumber(currentBank)) {
					this.emitConnectionStatusOK()
					this.deviceStatus.currentBank = currentBank
					return this.logFeedback(redeableMsg, 'Current bank:' + currentBank)
				}
			} else if (DAT1 == '23') {
				// which page is current
				let currentPage = parseInt(DAT2, this.PARSE_INT_HEX_MODE)
				if (this.isValidPageNumber(currentPage)) {
					this.emitConnectionStatusOK()
					this.deviceStatus.currentPage = currentPage
					return this.logFeedback(redeableMsg, 'Current page:' + currentPage)
				}
			} else if (DAT1 == '48' || DAT1 == '49') {
				// Turn off and on output card (0x48)
				if (ADDR == '05' || ADDR == '06') {
					let turnStatus = parseInt(DAT2, this.PARSE_INT_HEX_MODE)
					if (turnStatus == CARD_TURN_ON || turnStatus == CARD_TURN_OFF) {
						this.emitConnectionStatusOK()
						if (ADDR == '05') {
							this.deviceStatus.card1Status = turnStatus
							return this.logFeedback(redeableMsg, 'Card 1 status:' + (turnStatus == CARD_TURN_OFF ? "off" : "on"))
						} else if (ADDR == '06') {
							this.deviceStatus.card2Status = turnStatus
							return this.logFeedback(redeableMsg, 'Card 2 status:' + (turnStatus == CARD_TURN_OFF ? "off" : "on"))
						}
					}
				}
			}
		} else if (CMD == '78') {
			if (DAT1 == '00' || DAT1 == '01') {
				//Switch Preset Bank(0x00)
				if (DAT2 == SWITCH_TARGET_PROGRAM || DAT2 == SWITCH_TARGET_PREVIEW) {
					if (DAT3 == SWITCH_TRANSITION_CUT_ || DAT3 == SWITCH_TRANSITION_DISSOLVE_TAKE) {
						let target = parseInt(DAT2, this.PARSE_INT_HEX_MODE)
						let transition = parseInt(DAT3, this.PARSE_INT_HEX_MODE)
						this.emitConnectionStatusOK()
						return this.logFeedback(redeableMsg, 'Switch done:' + (target == SWITCH_TARGET_PREVIEW ? "preview" : "program") + ' ' + (transition == SWITCH_TRANSITION_CUT_ ? "cut" : "dissolve"))
					}
				}
			} else if (DAT1 == '06' || DAT1 == '07') {
				// Switch to blackout(0x06)
				if (DAT2 == '00') {
					this.emitConnectionStatusOK()
					this.deviceStatus.blackoutStatus = BLACKOUT_OFF
					return this.logFeedback(redeableMsg, 'Blackout OFF')
				} else if (DAT2 == '01') {
					this.emitConnectionStatusOK()
					this.deviceStatus.blackoutStatus = BLACKOUT_ON
					return this.logFeedback(redeableMsg, 'Blackout ON')
				}
			}
		}

		this.debug('Unrecognized feedback message:' + redeableMsg)
	}

	isValidPageNumber(pageNumber) {
		return (pageNumber >= 0 && pageNumber <= 15)
	}

	isValidBankNumber(bankNumber) {
		return (bankNumber >= 0 && bankNumber <= 15)
	}

	logFeedback(redeableMsg, info) {
		this.debug('Feedback:' + redeableMsg + ' ' + info)
	}

	emitConnectionStatusOK() {
		this.emit(this.EVENT_NAME_ON_CONNECTION_OK, [])
	}
}

module.exports.RGBLinkX3Connector = RGBLinkX3Connector
module.exports.POWER_ON = POWER_ON
module.exports.POWER_OFF = POWER_OFF
