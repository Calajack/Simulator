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
 
 
var fileExtension=".csv";
var fileNameIncrement="-" + getDate("YYMMddHHmm");
var isoMessage=ISOMessage;
var line = {
	text : {
		name : "text",
		length_type : "delimited `",
		data_type : "ascii",
		value : ""
	}
}

var transactionCounterCSV = 1;// initialize counter;
writeCSVHeader();
function writeCSVLogRowIss(isoMessage, testCase) {
	var analyticsRow=transactionCounterCSV+",";
	var pass=false;
	if (testCase.F39_ActionCode.value!="**SYSTEM**"){
		if (isoMessage.F39_ActionCode.value === testCase.F39_ActionCode.value) {
			analyticsRow=analyticsRow+"PASS,";
		} else {
			analyticsRow=analyticsRow+"FAIL,";
		}
	} else {
		analyticsRow=analyticsRow+"PASS,";
	}
		
	for ( var ItemName in isoMessage) {
		analyticsRow=analyticsRow + isoMessage[ItemName].value + ",";
	}
	analyticsRow=analyticsRow+"**END**";
	var csvRowMessage=line;
	csvRowMessage.text.value=analyticsRow;
	send(csvRowMessage, CSVLogFile);
	transactionCounterCSV++;

}
function writeCSVLogRow(isoMessage, testCase) {
	var analyticsRow=transactionCounterCSV+",";
	var pass=false;
	if (isoMessage.F39_ActionCode.value === testCase.ExpectedRC.value) {
		analyticsRow=analyticsRow+"PASS,";
	} else {
		analyticsRow=analyticsRow+"FAIL,";
	}

	for ( var ItemName in isoMessage) {
		analyticsRow=analyticsRow + isoMessage[ItemName].value + ",";
	}
	analyticsRow=analyticsRow+"**END**";
	var csvRowMessage=line;
	csvRowMessage.text.value=analyticsRow;
	send(csvRowMessage, CSVLogFile);
	transactionCounterCSV++;

}
function writeCSVHeader() {
	CSVLogFile.path = CSVLogFile.path + fileNameIncrement + fileExtension;
	printLine("CSV: CsvLog location:" + AnalyticsFile.path);
	updateConnection(CSVLogFile);
	clearFile(CSVLogFile);
	var headerLine="NO#,Status,";
	for ( var ItemName in isoMessage) {
		headerLine=headerLine + ItemName + ",";
	}

	var csvRowMessage=line;
	csvRowMessage.text.value=headerLine;
	send(csvRowMessage, CSVLogFile);
}
