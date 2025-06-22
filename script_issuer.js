/*
 *   Copyright 
 *               	neaPay.com
 * 		                                contact@neapay.com
 * Registration: neaSoft NL
 * KvK 72447931 Vestigingsnr. 000040557146
 * All rights reserved, all third party software mentioned
 * 
 */
/*
 *                          FREE version
 * The purpose of this version is for learning, peparation, POC, Business Assessment
 * This cannot be used for anything commercial or with financial or business impact.
 * 
 * Free versions are usually BETA tests and have absolutely NO GUARANTEE.
 * 
 * Free versions are NOT tested enough to be used in a production or business-impacting environment.
 * 
 *        Thank you!
 *
 */
 
var issuerMute = false;
var normalLog = true;
var extraLog = false;
var isoMessageIssRq;
var isoMessageIssRs;
var previousisoMessageIssRs;
var issuerDataFromCsv;
var currentIssuerTestCase;
var currentCard;
var currentKey;
var bitmapIss;
var cryptogramToValidate;
var emvScheme="VISA";// 
var displayInfo = true;


// function startServer starts a TCPIP listener with the connection details
// specified in the first parameter and invokes the function specified in the
// second parameter
// printLine('ISS: starting server listener on port ' + TCPChannel.port)
// startServer(TCPChannel, "parserFunction");

printLine("ISS: Issuer starting, TCP Server starting");
startConnection(TCPChannel, ISOMessage, "processRequest");




function processRequest(isoMessageIssRq) {
	isoMessageIssRq=JSON.parse(isoMessageIssRq);
	
	issBusy = true;

	if (displayInfo == true)
		displayIssuerRequest(isoMessageIssRq)

	var issuerDataFound = findIssuerData(isoMessageIssRq);
	var cardFound=findCard(isoMessageIssRq.F02_PAN.value,
			isoMessageIssRq.F35_Track2Data.value);
	if (cardFound==0) {printLine("ISS: Card number not found! Processing stopped."); return;}
	printLine("ISS: Card record found:"+currentCard.CardID.value+":"+currentCard.Description.value);
	//if no key is used, skip the search
	var keyFound=0;
	if (currentIssuerTestCase.EncryptionKey.value=="NO_KEY") {
		printLine("ISS: NO_KEY used");
		keyFound=1;
	} else{
		keyFound=findKey();
		if (keyFound==1)
			printLine("ISS: Key record found:"+currentKey.KeyID.value+":"+currentKey.Description.value);
		else printLine("ISS: Key Not found for:"+currentIssuerTestCase.EncryptionKey.value);
	}
		
	if (issuerDataFound == 1) {
		var validateResult = validateIsoMessage(isoMessageIssRq)
			// printLine("ISS:issuerDataFromCsv:" + issuerDataFromCsv.Description.value)
		buildIssRsMessage(currentIssuerTestCase,isoMessageIssRq)
		
		send(isoMessageIssRs, TCPChannel);
		displayIssuerResponse(isoMessageIssRs);
		writeAnalyticsRowIss(isoMessageIssRs,currentIssuerTestCase);
		//writeCSVLogRowIss(isoMessageIssRs, currentIssuerTestCase);
		
		issBusy = false;
		previousisoMessageIssRs=isoMessageIssRs;
	}
	else printLine("ISS: Key not found! Processing stopped.")

}
function displayIssuerRequest(isoMessageIssRq) {
	printLine('-  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -');
	printLine('ISS: Message received by Issuer')
	printMessage('ISS: ', isoMessageIssRq, 50)
	printLine('-  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -');
}
function displayIssuerResponse(isoMessageIssRs) {
	printLine('-  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -');
	printLine('ISS: Message response sent  by Issuer')
	printMessage('ISS: ', isoMessageIssRs, 50)
	printLine('-  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -  -');
}
function buildIssRsMessage(currentIssuerTestCase,isoMessageIssRq) {
	// currentIssuerTestCase is the test case that is used to populate the
	// response

	isoMessageIssRs = ISOMessage;// copy the structure from the message
	clearValues(isoMessageIssRs);
	// printLine('ISS: whaaat?' + currentIssuerTestCase.MessageType.value)
	setVal(isoMessageIssRs.MessageType, currentIssuerTestCase.MessageType.value);
	bitmapIss = getBits("0000000000000000");
	// printMessage('ISS hereeee>', isoMessageIssRs)
	for ( var key in isoMessageIssRs) {
		if ((key == "MessageType") || (key == "Bitmap") || (key == "F128_MAC"))
			continue;

		buildField(key, isoMessageIssRs[key], currentIssuerTestCase[key],isoMessageIssRq);
	}
	setVal(isoMessageIssRs.Bitmap, getChar(bitmapIss));
	
}
function buildField(name, field, testCaseField,isoMessageIssRq) {
	if (displaySetValue)
		printLine("ISS: populate "+name+" with "+testCaseField.value);

	// the field is a structure that has everything for its build
	if (testCaseField.value == "**NOVALUE**") {
		return;
	} else if (testCaseField.value == "**ECHO**") {
		if (isoMessageIssRq[name].value == "") {
			printLine("ISS: Cannot ECHO field:" + name
					+ " because it has not value in the request");
			return;
		}
		setVal(field, isoMessageIssRq[name].value)
		// printLine('ISS: ' + name + ':' + field.value)
	} else if (testCaseField.value == "**SYSTEM**") {
		setVal(field, build_system_field(name, field, testCaseField));
		//printLine("ISS: Field SYS:"+field.value);
	} else {
		setVal(field, currentIssuerTestCase[name].value)
	}
	if (field.bitmap_position>bitmapIss.length){
		printLine("ISS: extending Bitmap because of position:"+field.bitmap_position)
		bitmapIss=bitmapIss+getBits("0000000000000000");
		setIssBitON(1);
		}
	setIssBitON(field.bitmap_position);

}
function build_system_field(name, field, testCaseField) {
	//printLine("ISS: Field name:"+name);
	if (name == "F39_ActionCode") {
		var amount = isoMessageIssRs.F04_AmountTransaction.value;
		var amount = amount.slice(10, 12);
		printLine('ISS: Amount used in decision logic:' + amount);
		if (amount == "99")
			return "66";
		return amount;
		printLine('ISS: Action code set:' + field.value);
	} else if (name == "F55_ICCData") {
		cryptogramToValidate.GeneratedArpc.value = generateARPC();
		build_F55(name, field, testCaseField);
	} else if (name == "F38_ApprovalCode") {
		return getRandomInt(100000, 999999);
	} else if (name == "F07_TransmissionDateTime") {
		//printLine("ISS: set F7:"+getDate("MMddHHmmss"))
		return getDate("MMddHHmmss");
	} else if (name == "F123_Reserved") {
		//printLine("ISS: F123:"+currentIssuerTestCase.F123_Tags.value);
		return currentIssuerTestCase.F123_Tags.value;
	} else if (name == "F62_Reserved") {
		//printLine("ISS: F123:"+currentIssuerTestCase.F62_tags.value);
		return currentIssuerTestCase.F62_tags.value;
	} else
		printLine("ISS: System Field not populated:"+name);
}
function build_F55(name, field, testCaseField) {

	isoMessageIssRs.F55_ICCData.value = ''

	if (currentIssuerTestCase.F55_91.value == "**SYSTEM**") {
		var F55_91 = Cryptogram.GeneratedArpc.value + '0'
				+ isoMessageIssRs.F39_ActionCode.value
		isoMessageIssRs.F55_ICCData.value = '91' + F55_91.length / 2 + F55_91
	}

	if (currentIssuerTestCase.F55_71.value != "**NOVALUE**") {
		isoMessageIssRs.F55_ICCData.value = isoMessageIssRs.F55_ICCData.value
				+ "71" + currentIssuerTestCase.F55_71.value.length / 2
				+ currentIssuerTestCase.F55_71.value
	}

	if (currentIssuerTestCase.F55_72.value != "**NOVALUE**") {
		isoMessageIssRs.F55_ICCData.value = isoMessageIssRs.F55_ICCData.value
				+ '72' + currentIssuerTestCase.F55_72.value.length / 2,
				currentIssuerTestCase.F55_72.value
	}
	// printLine('ISS: F55 rs:' + isoMessageIssRs.F55_ICCData.value)

	// printLine('ISS: bit55:' + field.bitmap_position)
}

function generateARPC() {
	if (currentCard.EMVStandard.value == "**EMV2000**") {
		var IV = "00000000000000000000000000000000"
		printLine('ISS: emv standard:' + currentCard.EMVStandard.value)
		return generateArpc(cryptogramToValidate.ATC.value, IV,
				cryptogramToValidate.MK.value,
				isoMessageIssRs.F39_ActionCode.value,
				cryptogramToValidate.GeneratedArqc.value,
				cryptogramToValidate.PAN.value,
				cryptogramToValidate.PanSequenceNumber.value,
				currentCard.EMVStandard.value)
	}
}

function findIssuerData(isoMessageIssRq) {
	resetFile(IssuerDataFile);
	var MTI = isoMessageIssRq.MessageType.value;
	var F02 = isoMessageIssRq.F02_PAN.value;
	var F03 = isoMessageIssRq.F03_ProcessingCode.value;
	var F04 = isoMessageIssRq.F04_AmountTransaction.value;
	var F42 = isoMessageIssRq.F42_CardAcceptorIdentificationCode.value;
	var searchIssBool = 0;
	// skip 2 lines of header

	issuerDataFromCsv = receive(IssuerTestData, IssuerDataFile, true);
	issuerDataFromCsv = receive(IssuerTestData, IssuerDataFile, true);

	while ((searchIssBool == 0) && (issuerDataFromCsv != null)) {

		var csvMTI = issuerDataFromCsv.RequestMTI.value;
		var csvF02 = issuerDataFromCsv.RequestF02.value;
		var csvF03 = issuerDataFromCsv.RequestF03.value;
		var csvF04 = issuerDataFromCsv.RequestF04.value;
		var csvF42 = issuerDataFromCsv.RequestF42.value;

		// start the logic

		if (match(csvMTI,MTI))
			if (match(csvF02,F02))
				if (match(csvF03,F03))
					if (match(csvF04,F04))
						if (match(csvF42,F42)) {
							printLine("ISS: Match found in Issuer Test Cases: "+issuerDataFromCsv.ResponseId.value+"|"+issuerDataFromCsv.Description.value+"|"
									+ csvMTI + '|' + csvF02 + '|' + csvF03
									+ '|' + csvF04 + '|' + csvF42);
							currentIssuerTestCase = issuerDataFromCsv;
							searchIssBool = 1;
						}
		issuerDataFromCsv = receive(IssuerTestData, IssuerDataFile,true);
	}
	if (searchIssBool == 0)
		printLine('ISS: Match not found: ' + RequestMTI + '|' + RequestF02 + '|'
				+ RequestF03 + '|' + RequestF04 + '|' + RequestF42);
	return searchIssBool;
}

function validateIsoMessage(isoMessageIssRq) {
	resetFile(ValidationDataFile);


	bitmapIss = getBits(isoMessageIssRq.Bitmap.value);

	var MTI = isoMessageIssRq.MessageType.value;
	var search = 0;
	// skip 2 lines of header
	var validationDataFromCsv;
	validationDataFromCsv = receive(ValidationMsg, ValidationDataFile,true);
	validationDataFromCsv = receive(ValidationMsg, ValidationDataFile,true);
	// read 2 lines of length and numeric check
	var validationLengths = receive(ValidationMsg, ValidationDataFile,true);
	var validationNumeric = receive(ValidationMsg, ValidationDataFile,true);
	var validationFields = ""

	while ((search == "0") && (validationDataFromCsv != null)) {
		if (MTI == validationDataFromCsv.MTI.value) {
			search = "1"
			validationFields = validationDataFromCsv
		}
		validationDataFromCsv = receive(ValidationMsg, ValidationDataFile,true);
	}

	if (search == "0") {
		printLine("ISS: Unable to validate inbound message with MTI:" + MTI)
		return;
	}

	// we have the validation data loaded, performing the checks for length and
	// numeric
	for ( var itemKey in isoMessageIssRq) {
		if (('bitmap_position' in isoMessageIssRq[itemKey])
				&& (isBitOn(isoMessageIssRq[itemKey].bitmap_position, bitmapIss))) {
			var value = isoMessageIssRq[itemKey].value
			// printLine('ISS:' + itemKey + ':' +
			// isoMessageIssRq[itemKey].value)
			// printLine(itemKey + ':' + isoMessageIssRq[itemKey].value.length)

			// validating field lengths
			if (itemKey in validationLengths) {
				if (value.length != validationLengths[itemKey].value)
					printLine('ISS: Validation error: field ' + itemKey
							+ ' has a length of ' + value.length
							+ ', but expected '
							+ validationLengths[itemKey].value + ':[' + value
							+ ']')
					// printLine(itemKey + ':' +
					// validationLengths[itemKey].value)
					// printLine(itemKey + ':' +
					// validationNumeric[itemKey].value)
					// printLine(itemKey + ':' +
					// validationFields[itemKey].value)
			} else
				printLine('ISS: Warning: could not validate field:'
						+ itemKey
						+ '.It was not found in the lengths validation message!')

				// validating fields for numeric values
			if (itemKey in validationNumeric) {

				if ((!isNumeric(value))
						&& (validationNumeric[itemKey].value == 'Y'))
					printLine('ISS: Validation error: field ' + itemKey
							+ ' is expected to be numeric, but is not :['
							+ value + ']')
			} else
				printLine('ISS: Warning: could not validate field:'
						+ itemKey
						+ '.It was not found in the numeric validation message!')
		}

		// validating fields presence, iterating through ISO fields, which match
		// the Validation message fields (keys match)
		// Validate only the ones that start with F
		if ((itemKey.charAt(0) == 'F') && (itemKey in validationFields)) {

			// printLine('ISS: key:' + itemKey)
			var requiredField = validationFields[itemKey].value
			// this will be M if required
			// printLine('ISS: ' + itemKey + ':' +
			// isoMessageIssRq[itemKey].value)
			if (requiredField == 'M') {
				if (isoMessageIssRq[itemKey].value == "")
					printLine('ISS: Validation error: mandatory field '
							+ itemKey + ' missing')
			}
			if (requiredField == 'I') {
				if (isoMessageIssRq[itemKey].value != "")
					printLine('ISS: Validation error: field ' + itemKey
							+ ' is present and it should not be: '
							+ isoMessageIssRq[itemKey].value)
			}
			if (requiredField == 'E') {
				if ((itemKey in previousIsoMessage)
						&& (previousIsoMessage[itemKey].value != ""))
					if (previousIsoMessage[itemKey].value != isoMessageIssRq[itemKey].value)
						printLine('ISS: Validation error: field ' + itemKey
								+ ' should be echo of the previous request:'
								+ previousIsoMessage[itemKey].value)
			}
			if (requiredField == 'A') {
				if (!validateConditional(itemKey, isoMessageIssRq, 'ISS',
						currentCard))
					printLine('ISS: Validation error: conditional field validation failed')
			}
		}

	}

}

function findCard(PAN, Track2) {
	var search = 0;
	resetFile(CardDataFile);
	var CardData1 = receive(CardData, CardDataFile,true);
	while ((search == 0) && (CardData1 != null)) {
		if (displaySetValue)
			printLine("PAN:"+PAN+" PAN_match:"+CardData1.PAN.value)
		if (PAN == CardData1.PAN.value) {
			currentCard = CardData1;
			search = 1;
			if (displaySetValue)
				printLine("Card found:"+CardData1.PAN.value);
			return search;
		}
		CardData1 = receive(CardData, CardDataFile,true);
	}
	return search;
}

function findKey() {
	var search = 0;
	resetFile(EncryptionDataFile);
	var EncryptionData1 = receive(EncryptionData, EncryptionDataFile,true);
	while ((search == 0) && (EncryptionData1 != null)) {
		
		if (currentIssuerTestCase.EncryptionKey.value == EncryptionData1.KeyID.value) {
			currentKey = EncryptionData1;
			search = 1;
		}
		EncryptionData1 = receive(EncryptionData, EncryptionDataFile,true);
	}
	return search;
}

function setIssBitON(bitmap_position) {
	// bitmap starts from position 0, which must always be zero.
	// 01000010 - counting from the left, the second and seventh bits are 1,
	// indicating that fields 2 and 7 are present)
	if (!isNumeric(bitmap_position)) {
		printLine('ISS: error activating bitmap bit:' + bitmap_position)
		return;
	}

	// printLine('ACQ- activate bitmap:' + bitmap_position + '=>' + bitmapIss)
	bitmapIss = bitmapIss.substring(0, bitmap_position - 1) + '1'
			+ bitmapIss.substring(bitmap_position)
	// printLine('ACQ: bitmap update:' + bitmapIss)
}

function validateConditional(fieldName, isoMessagetoValidate, oScr, cardData) {
	if (fieldName == "F52_PINData") {
		return checkPIN(fieldName, isoMessagetoValidate, cardData);
	} else if (fieldName == "F55_ICCData") {
		check_F55_subfields(fieldName, isoMessagetoValidate, oScr, cardData)
	} else
		return true;
}

function check_F55_subfields(f55, isoMessagetoValidate, oScr, cardData) {

	cryptogramToValidate = Cryptogram // initiate with Cryptogram message
	// structure
	clearValues(cryptogramToValidate)// make sure there are no values in the
	// message
	var iccFieldValue = isoMessagetoValidate.F55_ICCData.value
	printLine(oScr + ': ICC:' + iccFieldValue)
	var fieldLength = iccFieldValue.length
	var passvalidation = true
	while (fieldLength > 3 && passvalidation) {
		var hextag1 = ""
		var hextag2 = ""
		var hexlen = ""
		hextag1 = iccFieldValue.slice(0, 2)
		if ((hextag1 == "9F") || (hextag1 == "5F")) {
			hextag2 = iccFieldValue.slice(2, 4)
			hexlen = iccFieldValue.slice(4, 6)
			iccFieldValue = iccFieldValue.slice(6)
		} else {
			hexlen = iccFieldValue.slice(2, 4)
			iccFieldValue = iccFieldValue.slice(4)
		}

		var subFiledLength = hexlen * 2

		// printLine(oScr + ': hextag1:' + hextag1)
		// printLine(oScr + ': hextag2:' + hextag2)
		// printLine(oScr + ': len :' + subFiledLength)
		var SubFieldContent = ""
		if (subFiledLength != undefined) {
			if ((subFiledLength < fieldLength) && (subFiledLength > 0)) {
				SubFieldContent = iccFieldValue.slice(0, subFiledLength)
				iccFieldValue = iccFieldValue.slice(subFiledLength)
				if (hextag1 == "9F") {
					if (hextag2 == "02") {
						if (subFiledLength == 12) {
							setVal(cryptogramToValidate.Amount, SubFieldContent)
						} else {
							printLine(oScr + ': ERROR - Tag 9F02 is invalid:'
									+ SubFieldContent + ', length:'
									+ subFiledLength)
							return false
						}
					} else if (hextag2 == "03") {
						if (subFiledLength == 12) {
							setVal(cryptogramToValidate.AmountOther,
									SubFieldContent)
						} else {
							printLine(oScr + ': ERROR - Tag 9F03 is invalid:'
									+ SubFieldContent + ', length:'
									+ subFiledLength)
							return false
						}
					} else if (hextag2 == "09") {
						if (subFiledLength != 4) {
							printLine(oScr + ': ERROR - Tag 9F09 is invalid:'
									+ SubFieldContent + ', length:'
									+ subFiledLength)
							return false
						}
					} else if (hextag2 == "10") {
						if (subFiledLength < 64) {
							if (cardData.EMVStandard.value == "**MC96**")
								setVal(cryptogramToValidate.CVR,
										SubFieldContent.slice(4, 12))
							else if (cardData.EMVStandard.value == "**VISA96**")
								setVal(cryptogramToValidate.CVR,
										SubFieldContent.slice(6, 14))
							else
								setVal(cryptogramToValidate.CVR,
										SubFieldContent.slice(4, 16))
						} else {
							printLine(oScr + ': ERROR - Tag 9F10 is invalid:'
									+ SubFieldContent + ', length:'
									+ subFiledLength)
							return false
						}
					} else if (hextag2 == "1A") {
						if (subFiledLength == 4)
							setVal(cryptogramToValidate.CtryCode,
									SubFieldContent)
						else {
							printLine(oScr + ': ERROR - Tag 9F1A is invalid:'
									+ SubFieldContent + ', length:'
									+ subFiledLength)
							return false
						}
					} else if (hextag2 == "1E") {
						if (subFiledLength != 16) {
							printLine(oScr + ': ERROR - Tag 9F1E is invalid:'
									+ SubFieldContent + ', length:'
									+ subFiledLength)
							return false
						}
					} else if (hextag2 == "26") {
						if (subFiledLength == 16)
							setVal(cryptogramToValidate.ARQC, SubFieldContent)
						else {
							printLine(oScr + ': ERROR - Tag 9F26 is invalid:'
									+ SubFieldContent + ', length:'
									+ subFiledLength)
							return false
						}
					} else if (hextag2 == "27") {
						if (subFiledLength != 2) {
							printLine(oScr + ': ERROR - Tag 9F27 is invalid:'
									+ SubFieldContent + ', length:'
									+ subFiledLength)
							return false
						}
					} else if (hextag2 == "33") {
						if (subFiledLength != 6) {
							printLine(oScr + ': ERROR - Tag 9F33 is invalid:'
									+ SubFieldContent + ', length:'
									+ subFiledLength)
							return false
						}
					} else if (hextag2 == "34") {
						if (subFiledLength != 6) {
							printLine(oScr + ': ERROR - Tag 9F34 is invalid:'
									+ SubFieldContent + ', length:'
									+ subFiledLength)
							return false
						}
					} else if (hextag2 == "35") {
						if (subFiledLength != 2) {
							printLine(oScr + ': ERROR - Tag 9F35 is invalid:'
									+ SubFieldContent + ', length:'
									+ subFiledLength)
							return false
						}
					} else if (hextag2 == "36") {
						if (subFiledLength == 4) {
							// printLine('ISS: tag 9f36:' + SubFieldContent)
							setVal(cryptogramToValidate.ATC, SubFieldContent)
						} else {
							printLine(oScr + ': ERROR - Tag 9F36 is invalid:'
									+ SubFieldContent + ', length:'
									+ subFiledLength)
							return false
						}
					} else if (hextag2 == "37") {
						if (subFiledLength == 8)
							setVal(cryptogramToValidate.UN, SubFieldContent)
						else {
							printLine(oScr + ': ERROR - Tag 9F37 is invalid:'
									+ SubFieldContent + ', length:'
									+ subFiledLength)
							return false
						}
					} else if (hextag2 == "41") {
						if (subFiledLength > 10)
							printLine(oScr + ': ERROR - Tag 9F41 is invalid:'
									+ SubFieldContent + ', length:'
									+ subFiledLength)
					} else if (hextag2 == "53") {
						if (subFiledLength != 2) {
							printLine(oScr + ': ERROR - Tag 9F53 is invalid:'
									+ SubFieldContent + ', length:'
									+ subFiledLength)
							return false
						}
					}

				} else if (hextag1 == "5F") {
					if (hextag2 == "2A") {
						if (subFiledLength == 4)
							setVal(cryptogramToValidate.CncyCode,
									SubFieldContent)
						else {
							printLine(oScr + ': ERROR - Tag 5F2A is invalid:'
									+ SubFieldContent + ', length:'
									+ subFiledLength)
							return false
						}
					}
				} else if (hextag1 == "82") {
					if (subFiledLength == 4)
						setVal(cryptogramToValidate.AIP, SubFieldContent)
					else {
						printLine(oScr + ': ERROR - Tag 82 is invalid:'
								+ SubFieldContent + ', length:'
								+ subFiledLength)
						return false
					}
				} else if (hextag1 == "84") {
					if (subFiledLength > 34) {
						printLine(oScr + ': ERROR - Tag 84 is invalid:'
								+ SubFieldContent + ', length:'
								+ subFiledLength)
						return false
					}
				} else if (hextag1 == "95") {
					if (subFiledLength == 10)
						setVal(cryptogramToValidate.TVR, SubFieldContent)
					else {
						printLine(oScr + ': ERROR - Tag 95 is invalid:'
								+ SubFieldContent + ', length:'
								+ subFiledLength)
						return false
					}
				} else if (hextag1 == "9A") {
					if (subFiledLength == 6)
						setVal(cryptogramToValidate.TxnDate, SubFieldContent)
					else {
						printLine(oScr + ': ERROR - Tag 9A is invalid:'
								+ SubFieldContent + ', length:'
								+ subFiledLength)
						return false
					}
				} else if (hextag1 == "9C") {
					if (subFiledLength == 2)
						setVal(cryptogramToValidate.TxnType, SubFieldContent)
					else {
						printLine(oScr + ': ERROR - Tag 9C is invalid:'
								+ SubFieldContent + ', length:'
								+ subFiledLength)
						return false
					}
				}

			}

		}
		// printLine(oScr+': value:' + SubFieldContent)
		fieldLength = iccFieldValue.length
		// printLine(oScr+': f55 content left:" + iccFieldValue)
	}
	return validateCryptogram(cryptogramToValidate, isoMessagetoValidate, oScr,
			cardData)

}

function validateCryptogram(cryptogramToValidate, isoMessagetoValidate, oScr,
		cardData) {
	setVal(cryptogramToValidate.ARQCInputData,
			getBase16(cryptogramToValidate.Amount.value) + // 9F02
			getBase16(cryptogramToValidate.AmountOther.value) + // 9F03
			getBase16(cryptogramToValidate.CtryCode.value) + // 9F1A
			cryptogramToValidate.TVR.value + // 95
			getBase16(cryptogramToValidate.CncyCode.value) + // 5F2A
			cryptogramToValidate.TxnDate.value + // 9A
			cryptogramToValidate.TxnType.value + // 9C
			cryptogramToValidate.UN.value + // 9F37
			cryptogramToValidate.AIP.value + // 82
			cryptogramToValidate.ATC.value + // 9F36
			cryptogramToValidate.CVR.value // CVR from 9F10
	)
	// printLine('validate crypt: arqc input:'
	// + cryptogramToValidate.ARQCInputData.value)

	if (isoMessagetoValidate.F02_PAN.value != undefined) {
		setVal(cryptogramToValidate.PAN, isoMessagetoValidate.F02_PAN.value)
	} else if (isoMessagetoValidate.F35_Track2Data.value != undefined) {
		var track2 = isoMessagetoValidate.F35_Track2Data.value
		var Pos = isoMessagetoValidate.F35_Track2Data.value.indexOf('=')

		if (Pos != 0)
			setVal(cryptogramToValidate.PAN, track2.slice(Pos))
		else {
			printLine(oScr + ': ERROR: Cannot get PAN from track 2!'
					+ isoMessagetoValidate.F02_PAN.value)
			return false
		}
	}
	printLine(oScr + ': MTI and amount of message:'
			+ isoMessagetoValidate.MessageType.value + '|'
			+ isoMessagetoValidate.F04_AmountTransaction.value)

	setVal(cryptogramToValidate.PanSequenceNumber,
			isoMessagetoValidate.F23_CardSequenceNumber.value)

	if (emvScheme == "VISA") {
		cryptogramToValidate.MK.value = currentKey.EMV2000MKPartOne.value
				+ currentKey.EMV2000MKPartTwo.value
		cryptogramToValidate.IV = currentKey.InitVectorPartOne.value
				+ currentKey.InitVectorPartTwo.value
		//cryptogramToValidate.GeneratedArqc.value = calculateEmv2000Arqc(
		//		cryptogramToValidate, oScr)
	}
    
	//else if (emvScheme == "M/CHIP") {
	//	cryptogramToValidate.MK.value = currentKey.MC96MKPartOne.value
	//			+ currentKey.MC96MKPartTwo.value
	//	calculateEmvMC96Arqc(cryptogramToValidate, oScr)
	//}
    //
	//else if (emvScheme == "**VISA96**") {
	//	cryptogramToValidate.MK.value = currentKey.VISA96MKPartOne.value
	//			+ currentKey.VISA96MKPartTwo.value
	//	calculateEmvVISA96Arqc(cryptogramToValidate, oScr)
	//}
	// if (displayICC == true)
	// printMessage('ISS: F55_ICC:' + cryptogramToValidate)
    //
	//if (cryptogramToValidate.GeneratedArqc.value != cryptogramToValidate.ARQC.value) {
	//	printLine(oScr + ': Validation Error: Cryptogram mismatch!')
	//	return false;
	//}

	return true
}

function calculateEmv2000Arqc(cryptogramToValidate, oScr) {
	var len = cryptogramToValidate.ARQCInputData.value.length
	// printLine(oScr+': ARQC input:' +
	// cryptogramToValidate.ARQCInputData.value)

	var padchars = 8 - len % 8
	if (padchars > 0) {
		cryptogramToValidate.ARQCInputData.value = cryptogramToValidate.ARQCInputData.value
				+ "8"
		padchars--
	}
	printLine(oScr + ': ARQC input:' + cryptogramToValidate.ARQCInputData.value)
	while (padchars > 0) {
		cryptogramToValidate.ARQCInputData.value = cryptogramToValidate.ARQCInputData.value
				+ "0"
		padchars--
	}
	// printObject('ISS: crypt:', cryptogramToValidate)
	cryptogramToValidate.MK.value = calculateMK(cryptogramToValidate)

	// printLine('ISS: MK :' + cryptogramToValidate.MK.value)
	// printLine('ISS: ATC:' + cryptogramToValidate.ATC.value)

	return generateArqc(cryptogramToValidate.ARQCInputData.value,
			cryptogramToValidate.ATC.value, cryptogramToValidate.IV.value,
			cryptogramToValidate.MK.value, "EMV2000")
}

function calculateMK(cryptogramToValidate) {
	var IMK = cryptogramToValidate.MK.value;
	var len = cryptogramToValidate.PAN.length;
	var panData = cryptogramToValidate.PAN.value.slice(-14);
			+ cryptogramToValidate.PanSequenceNumber.value
	var invertedPan = invert(panData);
	// printLine('ISS: panData|IMK:' + panData + '|' + IMK)
	panData = encrypt(panData, IMK);
	invertedPan = encrypt(invertedPan, IMK);
	var cardKey = panData + invertedPan;
	 cardKey = setParity(cardKey, '0');
	return cardKey

}
function calculateEmvMC96Arqc() {
}
function calculateEmvVISA96Arqc() {
}

function checkPIN(fieldName, isoMessagetoValidate, cardData) {
	printLine("ISS: Starting PIN validation with Key:"+currentKey.Description.value);
	var bitmapHere = getBits(isoMessagetoValidate.Bitmap.value);
	if (!isBitOn(isoMessagetoValidate.F52_PINData.bitmap_position, bitmapHere)){
		printLine('ISS: PIN field not present - not validated!!')
		return false;
		}
	var pinBlock = isoMessagetoValidate.F52_PINData.value;
	var String1 = decrypt(pinBlock, currentKey.PPKPartOne.value);
	var pinBlock = encrypt(String1, currentKey.PPKPartTwo.value);
	String1 = decrypt(pinBlock, currentKey.PPKPartOne.value);

	var pbFormat = cardData.PBFormat.value
	var PIN = ""
	if (pbFormat == "**ISO-0**") {
		var PANLength = isoMessagetoValidate.F02_PAN.value.length
		var String2 = "0000"
				+ isoMessagetoValidate.F02_PAN.value.slice(PANLength - 13,
						PANLength - 1)
		var PINData = xorHex(String1, String2)
		var PINLength = PINData.slice(0, 2)
		PIN = PINData.slice(2, parseInt(PINLength) + 2)
	}

	if (PIN != cardData.PIN.value) {
		printLine('ISS: PIN validation failed!')
		return false;
	} else {
		printLine('ISS: PIN validation passed')
		return true;
	}
}
